const express = require("express");
const router = express.Router();
const statisticController = require("../controllers/statisticController");
const { authenticate, authorize } = require("../core/middleware");

// API thống kê tổng hợp duy nhất cho Admin
// Thay thế tất cả các API statistics cũ
router.get(
  "/",
  authenticate,
  authorize(["Admin"]),
  statisticController.getAllStatistics
);

module.exports = router;
