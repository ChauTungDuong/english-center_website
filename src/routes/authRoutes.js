const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const userController = require("../controllers/userController");
const { checkToken } = require("../middleware/authMiddleware");
const {
  authLimiter,
  passwordResetLimiter,
} = require("../middleware/rateLimiter");

// ========== AUTHENTICATION ROUTES ==========

// Đăng nhập (with rate limiting to prevent brute force)
router.post("/login", authLimiter, authController.login);

// Đăng xuất (yêu cầu token)
router.post("/logout", checkToken, authController.logout);

// ========== PASSWORD RESET ROUTES ==========

// Yêu cầu reset password (gửi mã 6 số qua email)
router.post(
  "/forgot-password",
  passwordResetLimiter,
  authController.requestResetPassword
);

// Xác thực mã 6 số reset password (tùy chọn - để kiểm tra mã trước)
router.post("/verify-reset-code", authLimiter, authController.verifyResetCode);

// Reset password bằng mã 6 số trực tiếp (phương thức chính)
router.post(
  "/reset-password",
  authLimiter,
  authController.resetPasswordWithCode
);

// Đổi mật khẩu (cho user đã đăng nhập)
router.post("/change-password", checkToken, authController.changePassword);

// ========== USER PROFILE ROUTES ==========

// Lấy thông tin profile người dùng hiện tại
router.get("/profile", checkToken, userController.getProfile);

// Người dùng bất kì sửa đổi thông tin cá nhân của mình
router.patch("/profile", checkToken, userController.updateProfile);

module.exports = router;
