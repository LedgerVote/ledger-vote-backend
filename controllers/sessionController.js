const { pool } = require("../config/database");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");
const { generateRegistrationToken } = require("./authController");
const { sendRegistrationEmail } = require("../services/emailService");

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
    //console.log(adminId);

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
    //console.log(endDate)

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

// Get all sessions for an admin (Alternative simpler version)
const getAdminSessions = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = "all" } = req.query;

    // Ensure valid numbers
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    let baseQuery = `
      SELECT vs.id, vs.title, vs.description, vs.admin_id, vs.start_date, 
             vs.end_date, vs.contract_address, vs.is_active, vs.created_at, vs.updated_at,
             COUNT(DISTINCT sv.voter_id) as voter_count,
             COUNT(DISTINCT CASE WHEN sv.has_voted = 1 THEN sv.voter_id END) as votes_cast
      FROM voting_sessions vs
      LEFT JOIN session_voters sv ON vs.id = sv.session_id`;

    let whereConditions = [];
    let queryParams = [];

    // Add status filters
    if (status === "active") {
      whereConditions.push("vs.is_active = 1");
      whereConditions.push("vs.end_date > NOW()");
    } else if (status === "ended") {
      whereConditions.push("vs.end_date <= NOW()");
    } else if (status === "inactive") {
      whereConditions.push("vs.is_active = 0");
    }

    // Build final query
    if (whereConditions.length > 0) {
      baseQuery += " WHERE " + whereConditions.join(" AND ");
    }

    baseQuery += `
      GROUP BY vs.id, vs.title, vs.description, vs.admin_id, vs.start_date, 
               vs.end_date, vs.contract_address, vs.is_active, vs.created_at, vs.updated_at
      ORDER BY vs.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}`;

    // Execute main query
    const [sessions] = await pool.execute(baseQuery, queryParams);

    // Get total count
    let countQuery =
      "SELECT COUNT(DISTINCT vs.id) as total FROM voting_sessions vs";
    if (whereConditions.length > 0) {
      countQuery += " WHERE " + whereConditions.join(" AND ");
    }

    const [countResult] = await pool.execute(countQuery, queryParams);

    res.json({
      success: true,
      sessions,
      pagination: {
        current_page: pageNum,
        per_page: limitNum,
        total: countResult[0].total,
        total_pages: Math.ceil(countResult[0].total / limitNum),
      },
    });
  } catch (error) {
    console.error("Get admin sessions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sessions",
      error: error.message,
    });
  }
};

// Get session details with voters
const getSessionDetails = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const adminId = req.user.id;

    // Admin users can access details for any session in the system
    const [sessions] = await pool.execute(
      `SELECT vs.*, u.first_name, u.last_name 
       FROM voting_sessions vs
       JOIN users u ON vs.admin_id = u.id
       WHERE vs.id = ?`,
      [sessionId]
    );

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
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
// ...existing code...

// Upload voters from CSV
// Upload voters from CSV
const uploadVoters = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const adminId = req.user.id;

    // Admin users can upload voters to any session in the system
    const [sessions] = await pool.execute(
      `SELECT id FROM voting_sessions WHERE id = ?`,
      [sessionId]
    );

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
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


// Get voters for a specific session
const getSessionVoters = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const {
      page = 1,
      limit = 50,
      search = "",
      status = "all",
      sortBy = "name",
      sortOrder = "asc",
    } = req.query;
    const offset = (page - 1) * limit;

    // Verify session exists
    const [sessions] = await pool.execute(
      `SELECT id FROM voting_sessions WHERE id = ?`,
      [sessionId]
    );

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    let whereClause = "WHERE sv.session_id = ?";
    let queryParams = [sessionId];

    if (search) {
      whereClause +=
        " AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)";
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    if (status === "approved") {
      whereClause += " AND u.is_verified = TRUE";
    } else if (status === "pending") {
      whereClause += " AND u.is_verified = FALSE";
    } else if (status === "active") {
      whereClause += " AND u.is_active = TRUE";
    } else if (status === "inactive") {
      whereClause += " AND u.is_active = FALSE";
    }

    // Define sorting
    let orderClause = "ORDER BY ";
    switch (sortBy) {
      case "name":
        orderClause += `u.first_name ${sortOrder}, u.last_name ${sortOrder}`;
        break;
      case "email":
        orderClause += `u.email ${sortOrder}`;
        break;
      case "status":
        orderClause += `u.is_verified ${sortOrder}`;
        break;
      case "created":
        orderClause += `u.created_at ${sortOrder}`;
        break;
      default:
        orderClause += "u.first_name ASC, u.last_name ASC";
    } // Get session voters with enhanced data
    const [voters] = await pool.execute(
      `SELECT sv.*, u.id as user_id, u.email, u.first_name, u.last_name, 
              u.is_verified, u.is_active, u.wallet_address, u.created_at,
              sv.has_voted, sv.voted_at,
              CASE 
                WHEN u.is_verified = TRUE THEN 'approved'
                ELSE 'pending'
              END as status
       FROM session_voters sv
       JOIN users u ON sv.voter_id = u.id
       ${whereClause}
       ${orderClause}
       LIMIT ? OFFSET ?`,
      [...queryParams, parseInt(limit), parseInt(offset)]
    );

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total 
       FROM session_voters sv
       JOIN users u ON sv.voter_id = u.id
       ${whereClause}`,
      queryParams
    ); // Transform data for frontend compatibility
    const transformedVoters = voters.map((voter) => ({
      id: voter.voter_id,
      user_id: voter.user_id,
      name: `${voter.first_name} ${voter.last_name}`,
      email: voter.email,
      status: voter.status,
      is_verified: voter.is_verified,
      is_active: voter.is_active,
      wallet_address: voter.wallet_address,
      has_voted: voter.has_voted,
      voted_at: voter.voted_at,
      createdAt: voter.created_at,
      // Keep original fields for compatibility
      voter_id: voter.voter_id,
      first_name: voter.first_name,
      last_name: voter.last_name,
    }));

    res.json({
      success: true,
      voters: transformedVoters,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: countResult[0].total,
        total_pages: Math.ceil(countResult[0].total / limit),
      },
    });
  } catch (error) {
    console.error("Get session voters error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch session voters",
    });
  }
};

// Get all voters for admin management
const getAllVoters = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "all",
      sortBy = "created",
      sortOrder = "desc",
    } = req.query;
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

    // Define sorting
    let orderClause = "ORDER BY ";
    switch (sortBy) {
      case "name":
        orderClause += `u.first_name ${sortOrder}, u.last_name ${sortOrder}`;
        break;
      case "email":
        orderClause += `u.email ${sortOrder}`;
        break;
      case "status":
        orderClause += `u.is_verified ${sortOrder}`;
        break;
      case "created":
        orderClause += `u.created_at ${sortOrder}`;
        break;
      default:
        orderClause += "u.created_at DESC";
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
       ${orderClause}
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

// Bulk actions for voters
const bulkVoterActions = async (req, res) => {
  try {
    const { action, voterIds, sessionId } = req.body;

    if (!Array.isArray(voterIds) || voterIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Voter IDs array is required",
      });
    }

    if (
      !["approve", "reject", "remove", "activate", "deactivate"].includes(
        action
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid action. Allowed: approve, reject, remove, activate, deactivate",
      });
    }

    let result;
    let message;

    switch (action) {
      case "approve":
        const placeholders = voterIds.map(() => "?").join(",");
        [result] = await pool.execute(
          `UPDATE users SET is_verified = 1 WHERE id IN (${placeholders}) AND user_type = 'voter'`,
          voterIds
        );
        message = `${result.affectedRows} voters approved`;
        break;

      case "reject":
        const placeholders2 = voterIds.map(() => "?").join(",");
        [result] = await pool.execute(
          `UPDATE users SET is_verified = 0 WHERE id IN (${placeholders2}) AND user_type = 'voter'`,
          voterIds
        );
        message = `${result.affectedRows} voters rejected`;
        break;

      case "activate":
        const placeholders3 = voterIds.map(() => "?").join(",");
        [result] = await pool.execute(
          `UPDATE users SET is_active = 1 WHERE id IN (${placeholders3}) AND user_type = 'voter'`,
          voterIds
        );
        message = `${result.affectedRows} voters activated`;
        break;

      case "deactivate":
        const placeholders4 = voterIds.map(() => "?").join(",");
        [result] = await pool.execute(
          `UPDATE users SET is_active = 0 WHERE id IN (${placeholders4}) AND user_type = 'voter'`,
          voterIds
        );
        message = `${result.affectedRows} voters deactivated`;
        break;

      case "remove":
        if (!sessionId) {
          return res.status(400).json({
            success: false,
            message: "Session ID is required for remove action",
          });
        }
        const placeholders5 = voterIds.map(() => "?").join(",");
        [result] = await pool.execute(
          `DELETE FROM session_voters WHERE session_id = ? AND voter_id IN (${placeholders5})`,
          [sessionId, ...voterIds]
        );
        message = `${result.affectedRows} voters removed from session`;
        break;
    }

    res.json({
      success: true,
      message,
      affected_rows: result.affectedRows,
    });
  } catch (error) {
    console.error("Bulk voter actions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to perform bulk action",
    });
  }
};

// Export voter data to CSV
const exportVoters = async (req, res) => {
  try {
    const { sessionId, format = "csv" } = req.query;

    let query;
    let queryParams = [];

    if (sessionId) {
      // Export voters for specific session
      query = `
        SELECT u.first_name, u.last_name, u.email, u.wallet_address,
               CASE WHEN u.is_verified = 1 THEN 'Approved' ELSE 'Pending' END as status,
               CASE WHEN u.is_active = 1 THEN 'Active' ELSE 'Inactive' END as account_status,
               sv.has_voted, sv.voted_at, u.created_at
        FROM session_voters sv
        JOIN users u ON sv.voter_id = u.id
        WHERE sv.session_id = ?
        ORDER BY u.last_name, u.first_name
      `;
      queryParams = [sessionId];
    } else {
      // Export all voters
      query = `
        SELECT u.first_name, u.last_name, u.email, u.wallet_address,
               CASE WHEN u.is_verified = 1 THEN 'Approved' ELSE 'Pending' END as status,
               CASE WHEN u.is_active = 1 THEN 'Active' ELSE 'Inactive' END as account_status,
               COUNT(sv.session_id) as sessions_count,
               COUNT(CASE WHEN sv.has_voted = 1 THEN 1 END) as votes_cast,
               u.created_at
        FROM users u
        LEFT JOIN session_voters sv ON u.id = sv.voter_id
        WHERE u.user_type = 'voter'
        GROUP BY u.id
        ORDER BY u.last_name, u.first_name
      `;
    }

    const [voters] = await pool.execute(query, queryParams);

    if (format === "csv") {
      // Generate CSV
      let csv = "";
      if (voters.length > 0) {
        // CSV headers
        const headers = Object.keys(voters[0]).join(",");
        csv += headers + "\n";

        // CSV data
        voters.forEach((voter) => {
          const row = Object.values(voter)
            .map((value) => {
              // Escape commas and quotes in CSV
              if (value === null || value === undefined) return "";
              const str = String(value);
              if (
                str.includes(",") ||
                str.includes('"') ||
                str.includes("\n")
              ) {
                return `"${str.replace(/"/g, '""')}"`;
              }
              return str;
            })
            .join(",");
          csv += row + "\n";
        });
      }

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="voters-${sessionId || "all"}-${
          new Date().toISOString().split("T")[0]
        }.csv"`
      );
      res.send(csv);
    } else {
      // Return JSON
      res.json({
        success: true,
        voters,
        total: voters.length,
        exported_at: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Export voters error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export voters",
    });
  }
};

// Get voter audit log
const getVoterAuditLog = async (req, res) => {
  try {
    const { voterId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Get audit log for voter (we'll need to create this table first)
    // For now, return basic activity data
    const [activities] = await pool.execute(
      `SELECT 
        'session_join' as action,
        vs.title as description,
        sv.created_at as timestamp,
        'info' as type
       FROM session_voters sv
       JOIN voting_sessions vs ON sv.session_id = vs.id
       WHERE sv.voter_id = ?
       
       UNION ALL
       
       SELECT 
        'vote_cast' as action,
        CONCAT('Voted in: ', vs.title) as description,
        sv.voted_at as timestamp,
        'success' as type
       FROM session_voters sv
       JOIN voting_sessions vs ON sv.session_id = vs.id
       WHERE sv.voter_id = ? AND sv.has_voted = 1
       
       ORDER BY timestamp DESC
       LIMIT ? OFFSET ?`,
      [voterId, voterId, parseInt(limit), parseInt(offset)]
    );

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT 
        (SELECT COUNT(*) FROM session_voters WHERE voter_id = ?) +
        (SELECT COUNT(*) FROM session_voters WHERE voter_id = ? AND has_voted = 1)
        as total`,
      [voterId, voterId]
    );

    res.json({
      success: true,
      activities,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: countResult[0].total,
        total_pages: Math.ceil(countResult[0].total / limit),
      },
    });
  } catch (error) {
    console.error("Get voter audit log error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch voter audit log",
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

    // Admin users can update any session in the system
    const [sessions] = await pool.execute(
      `SELECT id FROM voting_sessions WHERE id = ?`,
      [sessionId]
    );

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
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

// Get sessions for a voter
const getVoterSessions = async (req, res) => {
  try {
    const voterId = req.user.id;
    const { page = 1, limit = 10, status = "all" } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = "WHERE sv.voter_id = ? AND u.is_verified = TRUE";
    let queryParams = [voterId];

    if (status === "active") {
      whereClause += " AND vs.is_active = TRUE AND vs.end_date > NOW()";
    } else if (status === "upcoming") {
      whereClause += " AND vs.start_date > NOW()";
    } else if (status === "completed") {
      whereClause += " AND vs.end_date <= NOW()";
    }

    // Get sessions the voter is authorized for
    const [sessions] = await pool.execute(
      `SELECT vs.*, 
              u.first_name as admin_first_name, 
              u.last_name as admin_last_name,
              sv.has_voted,
              sv.voted_at,
              COUNT(DISTINCT sv2.voter_id) as total_voters,
              COUNT(DISTINCT CASE WHEN sv2.has_voted = TRUE THEN sv2.voter_id END) as votes_cast
       FROM voting_sessions vs
       JOIN session_voters sv ON vs.id = sv.session_id
       JOIN users u ON vs.admin_id = u.id
       LEFT JOIN session_voters sv2 ON vs.id = sv2.session_id
       ${whereClause}
       GROUP BY vs.id, sv.has_voted, sv.voted_at
       ORDER BY vs.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, parseInt(limit), parseInt(offset)]
    );

    // Get total count for pagination
    const [countResult] = await pool.execute(
      `SELECT COUNT(DISTINCT vs.id) as total 
       FROM voting_sessions vs
       JOIN session_voters sv ON vs.id = sv.session_id
       JOIN users u ON vs.admin_id = u.id
       ${whereClause}`,
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
    console.error("Get voter sessions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch voter sessions",
    });
  }
};

module.exports = {
  createSession,
  getAdminSessions,
  getVoterSessions,
  getSessionDetails,
  uploadVoters,
  upload,
  getSessionVoters,
  getAllVoters,
  approveVoters,
  toggleVoterStatus,
  updateSession,
  bulkVoterActions,
  exportVoters,
  getVoterAuditLog,
};
