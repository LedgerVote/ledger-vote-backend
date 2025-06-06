const express = require("express");
const {
  register,
  login,
  getProfile,
  logout,
} = require("../controllers/authController");
const { validateLogin, validateRegister } = require("../middleware/validation");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Public routes
router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);

// Protected routes
router.get("/profile", authenticateToken, getProfile);
router.post("/logout", authenticateToken, logout);

module.exports = router;
