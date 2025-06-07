const express = require("express");
const router = express.Router();
const {
  createSession,
  getAdminSessions,
  getSessionDetails,
  uploadVoters,
  upload,
  getAllVoters,
  approveVoters,
  toggleVoterStatus,
  updateSession,
} = require("../controllers/sessionController");
const { authMiddleware, adminOnly } = require("../middleware/auth");
const { validateSession } = require("../middleware/validation");

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(adminOnly);

// Session management routes
router.post("/", validateSession, createSession);
router.get("/", getAdminSessions);
router.get("/:sessionId", getSessionDetails);
router.put("/:sessionId", updateSession);

// Voter management routes
router.post(
  "/:sessionId/voters/upload",
  upload.single("votersFile"),
  uploadVoters
);
router.get("/voters/all", getAllVoters);
router.post("/voters/approve", approveVoters);
router.patch("/voters/:voterId/status", toggleVoterStatus);

module.exports = router;
