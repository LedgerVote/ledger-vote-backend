const express = require("express");
const {
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
} = require("../controllers/authController");
const { validateLogin, validateRegister } = require("../middleware/validation");
const { authenticateToken } = require("../middleware/auth");
const { authenticateVoterToken } = require("../middleware/voterAuth");

const router = express.Router();

// Public routes
router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);

// Protected routes
router.get("/profile", authenticateToken, getProfile);
router.post("/logout", authenticateToken, logout);

// Voter authentication routes
router.get("/voter/verify-token/:token", verifyRegistrationToken);
router.post("/voter/complete-registration", completeVoterRegistration);
router.post("/voter/login", voterLogin);
router.post("/voter/wallet-login", voterWalletLogin);
router.get("/voter/profile", authenticateVoterToken, getVoterProfile);
router.put("/voter/profile", authenticateVoterToken, updateVoterProfile);
router.post("/voter/logout", authenticateVoterToken, voterLogout);

module.exports = router;
