const express = require("express");
const router = express.Router();
const statisticController = require("../controllers/statisticController");
const { verifyRole } = require("../middleware/authMiddleware");

// Lấy thống kê học sinh (chỉ Admin)
router.get(
  "/students",
  verifyRole(["Admin"]),
  statisticController.getStudentStatistics
);

module.exports = router;
