const express = require("express");
const router = express.Router();
const {
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
} = require("../controllers/sessionController");
const { authMiddleware, adminOnly } = require("../middleware/auth");
const { authenticateVoterToken } = require("../middleware/voterAuth");
const { validateSession } = require("../middleware/validation");

// Voter routes (require voter authentication)
router.get("/voter/sessions", authenticateVoterToken, getVoterSessions);

// Admin routes (require admin authentication)
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

// Enhanced voter management routes
router.get("/:sessionId/voters", getSessionVoters);
router.get("/voters/all", getAllVoters);
router.post("/voters/approve", approveVoters);
router.post("/voters/bulk", bulkVoterActions);
router.get("/voters/export", exportVoters);
router.get("/voters/:voterId/audit", getVoterAuditLog);
router.patch("/voters/:voterId/status", toggleVoterStatus);

module.exports = router;
