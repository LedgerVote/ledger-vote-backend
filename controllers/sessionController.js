const { pool } = require("../config/database");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");

// Configure multer for CSV file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `voters-${uniqueSuffix}.csv`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Create a new voting session
const createSession = async (req, res) => {
  try {
    const { title, description, endDate } = req.body;
    const adminId = req.user.id;

    // Validate required fields
    if (!title || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Title and end date are required",
      });
    }

    // Validate end date is in the future
    const endDateTime = new Date(endDate);
    if (endDateTime <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "End date must be in the future",
      });
    }

    // Insert session into database
    const [result] = await pool.execute(
      `INSERT INTO voting_sessions (title, description, admin_id, end_date) 
       VALUES (?, ?, ?, ?)`,
      [title, description, adminId, endDate]
    );

    const sessionId = result.insertId;

    // Get the created session with admin info
    const [sessions] = await pool.execute(
      `SELECT vs.*, u.first_name, u.last_name 
       FROM voting_sessions vs
       JOIN users u ON vs.admin_id = u.id
       WHERE vs.id = ?`,
      [sessionId]
    );

    res.status(201).json({
      success: true,
      message: "Voting session created successfully",
      session: sessions[0],
    });
  } catch (error) {
    console.error("Create session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create voting session",
    });
  }
};

// Get all sessions for an admin
const getAdminSessions = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { page = 1, limit = 10, status = "all" } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = "WHERE vs.admin_id = ?";
    let queryParams = [adminId];

    if (status === "active") {
      whereClause += " AND vs.is_active = TRUE AND vs.end_date > NOW()";
    } else if (status === "ended") {
      whereClause += " AND vs.end_date <= NOW()";
    } else if (status === "inactive") {
      whereClause += " AND vs.is_active = FALSE";
    }

    // Get sessions with voter count
    const [sessions] = await pool.execute(
      `SELECT vs.*, 
              COUNT(DISTINCT sv.voter_id) as voter_count,
              COUNT(DISTINCT CASE WHEN sv.has_voted = TRUE THEN sv.voter_id END) as votes_cast
       FROM voting_sessions vs
       LEFT JOIN session_voters sv ON vs.id = sv.session_id
       ${whereClause}
       GROUP BY vs.id
       ORDER BY vs.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, parseInt(limit), parseInt(offset)]
    );

    // Get total count for pagination
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM voting_sessions vs ${whereClause}`,
      queryParams
    );

    res.json({
      success: true,
      sessions,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: countResult[0].total,
        total_pages: Math.ceil(countResult[0].total / limit),
      },
    });
  } catch (error) {
    console.error("Get admin sessions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sessions",
    });
  }
};

// Get session details with voters
const getSessionDetails = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const adminId = req.user.id;

    // Verify admin owns this session
    const [sessions] = await pool.execute(
      `SELECT vs.*, u.first_name, u.last_name 
       FROM voting_sessions vs
       JOIN users u ON vs.admin_id = u.id
       WHERE vs.id = ? AND vs.admin_id = ?`,
      [sessionId, adminId]
    );

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Session not found or access denied",
      });
    } // Get session voters
    const [rawVoters] = await pool.execute(
      `SELECT sv.*, u.first_name, u.last_name, u.email, u.is_verified, u.created_at
       FROM session_voters sv
       JOIN users u ON sv.voter_id = u.id
       WHERE sv.session_id = ?
       ORDER BY u.last_name, u.first_name`,
      [sessionId]
    );

    // Transform voters data to match frontend expectations
    const voters = rawVoters.map((voter) => ({
      id: voter.voter_id,
      name: `${voter.first_name} ${voter.last_name}`,
      email: voter.email,
      status: voter.is_verified ? "approved" : "pending",
      createdAt: voter.created_at,
      // Keep original fields for compatibility
      voter_id: voter.voter_id,
      first_name: voter.first_name,
      last_name: voter.last_name,
      is_verified: voter.is_verified,
      has_voted: voter.has_voted,
    }));

    // Get candidates for this session
    const [candidates] = await pool.execute(
      `SELECT * FROM candidates WHERE session_id = ? ORDER BY name`,
      [sessionId]
    );

    res.json({
      success: true,
      session: {
        ...sessions[0],
        voters,
        candidates,
      },
    });
  } catch (error) {
    console.error("Get session details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch session details",
    });
  }
};

// Upload voters from CSV
const uploadVoters = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const adminId = req.user.id;

    // Verify admin owns this session
    const [sessions] = await pool.execute(
      `SELECT id FROM voting_sessions WHERE id = ? AND admin_id = ?`,
      [sessionId, adminId]
    );

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Session not found or access denied",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No CSV file uploaded",
      });
    }

    const voters = [];
    const errors = [];
    let rowNumber = 1;

    // Parse CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (row) => {
          rowNumber++;

          // Validate required fields
          if (!row.email || !row.first_name || !row.last_name) {
            errors.push(
              `Row ${rowNumber}: Missing required fields (email, first_name, last_name)`
            );
            return;
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(row.email)) {
            errors.push(`Row ${rowNumber}: Invalid email format`);
            return;
          }

          voters.push({
            email: row.email.toLowerCase().trim(),
            first_name: row.first_name.trim(),
            last_name: row.last_name.trim(),
            wallet_address: row.wallet_address?.trim() || null,
          });
        })
        .on("end", resolve)
        .on("error", reject);
    });

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "CSV validation errors",
        errors,
      });
    }

    if (voters.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid voters found in CSV file",
      });
    }

    // Process voters and add to session
    const results = {
      added: 0,
      existing: 0,
      errors: [],
    };

    for (const voter of voters) {
      try {
        // Check if user exists, if not create them
        let [existingUsers] = await pool.execute(
          `SELECT id FROM users WHERE email = ?`,
          [voter.email]
        );

        let voterId;
        if (existingUsers.length === 0) {
          // Create new voter with default password
          const defaultPassword = "voter123"; // They should change this
          const bcrypt = require("bcryptjs");
          const hashedPassword = await bcrypt.hash(defaultPassword, 12);

          const [userResult] = await pool.execute(
            `INSERT INTO users (email, password, first_name, last_name, user_type, wallet_address) 
             VALUES (?, ?, ?, ?, 'voter', ?)`,
            [
              voter.email,
              hashedPassword,
              voter.first_name,
              voter.last_name,
              voter.wallet_address,
            ]
          );
          voterId = userResult.insertId;
        } else {
          voterId = existingUsers[0].id;
        }

        // Add voter to session (ignore if already exists)
        await pool.execute(
          `INSERT IGNORE INTO session_voters (session_id, voter_id) VALUES (?, ?)`,
          [sessionId, voterId]
        );

        // Check if it was actually inserted
        const [checkResult] = await pool.execute(
          `SELECT id FROM session_voters WHERE session_id = ? AND voter_id = ?`,
          [sessionId, voterId]
        );

        if (checkResult.length > 0) {
          results.added++;
        } else {
          results.existing++;
        }
      } catch (error) {
        results.errors.push(
          `Failed to process ${voter.email}: ${error.message}`
        );
      }
    }

    res.json({
      success: true,
      message: `Processed ${voters.length} voters`,
      results,
    });
  } catch (error) {
    console.error("Upload voters error:", error);

    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: "Failed to process CSV file",
    });
  }
};

// Get all voters for admin management
const getAllVoters = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status = "all" } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = "WHERE u.user_type = 'voter'";
    let queryParams = [];

    if (search) {
      whereClause +=
        " AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)";
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    if (status === "verified") {
      whereClause += " AND u.is_verified = TRUE";
    } else if (status === "unverified") {
      whereClause += " AND u.is_verified = FALSE";
    } else if (status === "active") {
      whereClause += " AND u.is_active = TRUE";
    } else if (status === "inactive") {
      whereClause += " AND u.is_active = FALSE";
    }

    // Get voters with their session participation count
    const [voters] = await pool.execute(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.is_verified, u.is_active, 
              u.wallet_address, u.created_at,
              COUNT(sv.session_id) as sessions_count,
              COUNT(CASE WHEN sv.has_voted = TRUE THEN 1 END) as votes_cast
       FROM users u
       LEFT JOIN session_voters sv ON u.id = sv.voter_id
       ${whereClause}
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, parseInt(limit), parseInt(offset)]
    );

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM users u ${whereClause}`,
      queryParams
    );

    res.json({
      success: true,
      voters,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: countResult[0].total,
        total_pages: Math.ceil(countResult[0].total / limit),
      },
    });
  } catch (error) {
    console.error("Get all voters error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch voters",
    });
  }
};

// Approve/verify voters
const approveVoters = async (req, res) => {
  try {
    const { voterIds, action = "approve" } = req.body;

    if (!Array.isArray(voterIds) || voterIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Voter IDs array is required",
      });
    }

    const isVerified = action === "approve" ? 1 : 0;
    const placeholders = voterIds.map(() => "?").join(",");

    const [result] = await pool.execute(
      `UPDATE users SET is_verified = ? WHERE id IN (${placeholders}) AND user_type = 'voter'`,
      [isVerified, ...voterIds]
    );

    res.json({
      success: true,
      message: `${result.affectedRows} voters ${
        action === "approve" ? "approved" : "unapproved"
      }`,
      affected_rows: result.affectedRows,
    });
  } catch (error) {
    console.error("Approve voters error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update voter status",
    });
  }
};

// Toggle voter active status
const toggleVoterStatus = async (req, res) => {
  try {
    const { voterId } = req.params;
    const { is_active } = req.body;

    const [result] = await pool.execute(
      `UPDATE users SET is_active = ? WHERE id = ? AND user_type = 'voter'`,
      [is_active ? 1 : 0, voterId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Voter not found",
      });
    }

    res.json({
      success: true,
      message: `Voter ${is_active ? "activated" : "deactivated"} successfully`,
    });
  } catch (error) {
    console.error("Toggle voter status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update voter status",
    });
  }
};

// Update session
const updateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { title, description, endDate, isActive } = req.body;
    const adminId = req.user.id;

    // Verify admin owns this session
    const [sessions] = await pool.execute(
      `SELECT id FROM voting_sessions WHERE id = ? AND admin_id = ?`,
      [sessionId, adminId]
    );

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Session not found or access denied",
      });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (title !== undefined) {
      updates.push("title = ?");
      values.push(title);
    }
    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description);
    }
    if (endDate !== undefined) {
      updates.push("end_date = ?");
      values.push(endDate);
    }
    if (isActive !== undefined) {
      updates.push("is_active = ?");
      values.push(isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    values.push(sessionId);

    await pool.execute(
      `UPDATE voting_sessions SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    res.json({
      success: true,
      message: "Session updated successfully",
    });
  } catch (error) {
    console.error("Update session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update session",
    });
  }
};

module.exports = {
  createSession,
  getAdminSessions,
  getSessionDetails,
  uploadVoters,
  upload,
  getAllVoters,
  approveVoters,
  toggleVoterStatus,
  updateSession,
};
