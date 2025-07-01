const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const userController = require("../controllers/userController");
const { authenticate } = require("../core/middleware");

// ========== AUTHENTICATION ROUTES ==========

// Login
router.post("/login", authController.login);

// Register (if needed - might be admin only)
// router.post("/register", authController.register);

// Logout (requires token)
router.post("/logout", authenticate, authController.logout);

// ========== PASSWORD RESET ROUTES ==========

// Request password reset (send 6-digit code via email)
router.post("/forgot-password", authController.forgotPassword);

// Verify reset code
router.post("/verify-reset-code", authController.verifyResetCode);

// Reset password with code directly
router.post("/reset-password", authController.resetPasswordWithCode);

// Verify reset code and get temporary token
router.post(
  "/verify-code-get-token",
  authController.verifyResetCodeAndCreateToken
);

// Reset password with temporary token
router.post("/reset-with-token", authController.resetPasswordWithToken);

// Change password (for logged in users)
router.post("/change-password", authenticate, authController.changePassword);

// Refresh token
router.post("/refresh-token", authController.refreshToken);

// ========== USER PROFILE ROUTES ==========

// Get current user profile
router.get("/profile", authenticate, userController.getProfile);

// Update current user profile
router.patch("/profile", authenticate, userController.updateProfile);

// Verify token (for frontend to check token validity)
router.get("/verify-token", authController.verifyToken);

module.exports = router;
