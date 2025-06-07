const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access denied. No token provided.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const [users] = await pool.execute(
      "SELECT id, email, first_name, last_name, user_type, wallet_address, is_active FROM users WHERE id = ? AND is_active = 1",
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User not found or inactive.",
      });
    }

    req.user = users[0];
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Invalid token.",
    });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.user_type !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required.",
    });
  }
  next();
};

const requireVoter = (req, res, next) => {
  if (req.user.user_type !== "voter") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Voter privileges required.",
    });
  }
  next();
};

module.exports = {
  authenticateToken,
  authMiddleware: authenticateToken, // Alias for consistency
  requireAdmin,
  adminOnly: requireAdmin, // Alias for consistency
  requireVoter,
};
