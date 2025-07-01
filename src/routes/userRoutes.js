const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticate, authorize } = require("../core/middleware");

// Lấy danh sách user (chỉ Admin) - Now uses service-based pagination like other routes
router.get("/", authenticate, authorize(["Admin"]), userController.getUserList);

// Admin: Update user status
router.patch(
  "/:userId/status",
  authenticate,
  authorize(["Admin"]),
  userController.updateUserStatus
);

module.exports = router;
