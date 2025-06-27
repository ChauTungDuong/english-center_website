const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { verifyRole, checkToken } = require("../middleware/authMiddleware");

// Lấy danh sách user (chỉ Admin) - Now uses service-based pagination like other routes
router.get("/", verifyRole(["Admin"]), userController.getUserList);

// Admin: Toggle user status
router.patch(
  "/:userId/status",
  verifyRole(["Admin"]),
  userController.toggleUserStatus
);

module.exports = router;
