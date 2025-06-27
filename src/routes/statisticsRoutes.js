const express = require("express");
const router = express.Router();
const statisticController = require("../controllers/statisticController");
const { verifyRole } = require("../middleware/authMiddleware");

// API thống kê tổng hợp duy nhất cho Admin
// Thay thế tất cả các API statistics cũ
router.get("/", verifyRole(["Admin"]), statisticController.getAllStatistics);

module.exports = router;
