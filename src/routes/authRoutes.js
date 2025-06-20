const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const userController = require("../controllers/userController");
const { checkToken } = require("../middleware/authMiddleware");

// Đăng nhập
router.post("/login", authController.login);

// Lấy thông tin profile người dùng hiện tại
router.get("/profile", checkToken, userController.getProfile);

// Người dùng bất kì sửa đổi thông tin cá nhân của mình
router.patch("/profile", checkToken, userController.updateProfile);
module.exports = router;
