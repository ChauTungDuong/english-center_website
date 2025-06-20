const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { verifyRole } = require("../middleware/authMiddleware");

// Lấy danh sách user (chỉ Admin) - Now uses service-based pagination like other routes
router.get("/", verifyRole(["Admin"]), userController.getUserList);

module.exports = router;
