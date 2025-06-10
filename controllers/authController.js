const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { pool } = require("../config/database");

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Register new user
const register = async (req, res) => {
  const {
    email,
    password,
    firstName,
    lastName,
    userType = "voter",
    walletAddress,
  } = req.body;

  try {
    // Check if user already exists
    const [existingUsers] = await pool.execute(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Check if wallet address is already used (if provided)
    if (walletAddress) {
      const [existingWallet] = await pool.execute(
        "SELECT id FROM users WHERE wallet_address = ?",
        [walletAddress]
      );

      if (existingWallet.length > 0) {
        return res.status(400).json({
          success: false,
          message: "This wallet address is already registered",
        });
      }
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const [result] = await pool.execute(
      "INSERT INTO users (email, password, first_name, last_name, user_type, wallet_address) VALUES (?, ?, ?, ?, ?, ?)",
      [email, hashedPassword, firstName, lastName, userType, walletAddress]
    );

    // Generate token
    const token = generateToken(result.insertId);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: {
          id: result.insertId,
          email,
          firstName,
          lastName,
          userType,
          walletAddress,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during registration",
    });
  }
};

// Login user
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const [users] = await pool.execute(
      "SELECT id, email, password, first_name, last_name, user_type, wallet_address, is_active FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated. Please contact administrator.",
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate token
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          userType: user.user_type,
          walletAddress: user.wallet_address,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during login",
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = req.user;

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          userType: user.user_type,
          walletAddress: user.wallet_address,
        },
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Logout (client-side token removal, but we can blacklist token if needed)
const logout = async (req, res) => {
  res.json({
    success: true,
    message: "Logout successful",
  });
};

// ==== VOTER AUTHENTICATION FUNCTIONS ====

// Verify voter registration token
const verifyRegistrationToken = async (req, res) => {
  const { token } = req.params;

  try {
    // Find user with registration token
    const [users] = await pool.execute(
      `SELECT id, email, first_name, last_name, registration_token, 
       registration_token_expires, is_registered 
       FROM users 
       WHERE registration_token = ? AND user_type = 'voter'`,
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid registration token",
      });
    }

    const user = users[0];

    // Check if token has expired
    if (new Date() > new Date(user.registration_token_expires)) {
      return res.status(400).json({
        success: false,
        message: "Registration token has expired",
      });
    }

    // Check if user is already registered
    if (user.is_registered) {
      return res.status(400).json({
        success: false,
        message: "User is already registered",
      });
    }

    res.json({
      success: true,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
    });
  } catch (error) {
    console.error("Verify registration token error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Complete voter registration
const completeVoterRegistration = async (req, res) => {
  const { token, password, walletAddress, firstName, lastName } = req.body;

  try {
    // Validate input
    if (!token || !password || !walletAddress) {
      return res.status(400).json({
        success: false,
        message: "Token, password, and wallet address are required",
      });
    }

    // Find user with registration token
    const [users] = await pool.execute(
      `SELECT id, email, registration_token_expires, is_registered 
       FROM users 
       WHERE registration_token = ? AND user_type = 'voter'`,
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid registration token",
      });
    }

    const user = users[0];

    // Check if token has expired
    if (new Date() > new Date(user.registration_token_expires)) {
      return res.status(400).json({
        success: false,
        message: "Registration token has expired",
      });
    }

    // Check if user is already registered
    if (user.is_registered) {
      return res.status(400).json({
        success: false,
        message: "User is already registered",
      });
    }

    // Check if wallet address is already used
    const [existingWallet] = await pool.execute(
      "SELECT id FROM users WHERE wallet_address = ? AND id != ?",
      [walletAddress, user.id]
    );

    if (existingWallet.length > 0) {
      return res.status(400).json({
        success: false,
        message: "This wallet address is already registered",
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update user with registration data
    await pool.execute(
      `UPDATE users SET 
       password_hash = ?, 
       wallet_address = ?, 
       first_name = ?, 
       last_name = ?, 
       is_registered = TRUE,
       registration_token = NULL,
       registration_token_expires = NULL,
       updated_at = NOW()
       WHERE id = ?`,
      [hashedPassword, walletAddress, firstName, lastName, user.id]
    );

    res.json({
      success: true,
      message: "Registration completed successfully",
    });
  } catch (error) {
    console.error("Complete voter registration error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Voter login with email/password
const voterLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user
    const [users] = await pool.execute(
      `SELECT id, email, password_hash, first_name, last_name, 
       wallet_address, user_type, is_active, is_registered
       FROM users 
       WHERE email = ? AND user_type = 'voter'`,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = users[0];

    // Check if user is registered
    if (!user.is_registered) {
      return res.status(401).json({
        success: false,
        message: "Please complete your registration first",
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated. Contact administrator.",
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate token
    const token = generateToken(user.id);

    // Update last login
    await pool.execute("UPDATE users SET last_login = NOW() WHERE id = ?", [
      user.id,
    ]);

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        wallet_address: user.wallet_address,
        user_type: user.user_type,
      },
    });
  } catch (error) {
    console.error("Voter login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Voter login with wallet
const voterWalletLogin = async (req, res) => {
  const { walletAddress } = req.body;

  try {
    // Validate input
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: "Wallet address is required",
      });
    }

    // Find user by wallet address
    const [users] = await pool.execute(
      `SELECT id, email, first_name, last_name, 
       wallet_address, user_type, is_active, is_registered
       FROM users 
       WHERE wallet_address = ? AND user_type = 'voter'`,
      [walletAddress]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Wallet address not found or not registered",
      });
    }

    const user = users[0];

    // Check if user is registered
    if (!user.is_registered) {
      return res.status(401).json({
        success: false,
        message: "Please complete your registration first",
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated. Contact administrator.",
      });
    }

    // Generate token
    const token = generateToken(user.id);

    // Update last login
    await pool.execute("UPDATE users SET last_login = NOW() WHERE id = ?", [
      user.id,
    ]);

    res.json({
      success: true,
      message: "Wallet login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        wallet_address: user.wallet_address,
        user_type: user.user_type,
      },
    });
  } catch (error) {
    console.error("Voter wallet login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get voter profile
const getVoterProfile = async (req, res) => {
  try {
    const user = req.user;

    if (user.user_type !== "voter") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        wallet_address: user.wallet_address,
        user_type: user.user_type,
        created_at: user.created_at,
        last_login: user.last_login,
      },
    });
  } catch (error) {
    console.error("Get voter profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update voter profile
const updateVoterProfile = async (req, res) => {
  const { firstName, lastName, currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    if (req.user.user_type !== "voter") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    let updateFields = [];
    let updateValues = [];

    // Update name fields if provided
    if (firstName) {
      updateFields.push("first_name = ?");
      updateValues.push(firstName);
    }
    if (lastName) {
      updateFields.push("last_name = ?");
      updateValues.push(lastName);
    }

    // Update password if provided
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password is required to set new password",
        });
      }

      // Verify current password
      const [users] = await pool.execute(
        "SELECT password_hash FROM users WHERE id = ?",
        [userId]
      );

      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        users[0].password_hash
      );

      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      updateFields.push("password_hash = ?");
      updateValues.push(hashedNewPassword);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    // Add updated_at and user ID
    updateFields.push("updated_at = NOW()");
    updateValues.push(userId);

    // Update user
    await pool.execute(
      `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`,
      updateValues
    );

    res.json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Update voter profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Voter logout
const voterLogout = async (req, res) => {
  res.json({
    success: true,
    message: "Logout successful",
  });
};

// Generate registration token for voter (used by admin when creating voters)
const generateRegistrationToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

module.exports = {
  register,
  login,
  getProfile,
  logout,
  // Voter auth functions
  verifyRegistrationToken,
  completeVoterRegistration,
  voterLogin,
  voterWalletLogin,
  getVoterProfile,
  updateVoterProfile,
  voterLogout,
  generateRegistrationToken,
};
