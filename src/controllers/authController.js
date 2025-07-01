const { catchAsync } = require('../core/middleware');
const { ApiResponse } = require('../core/utils');
const authService = require("../services/role_services/authService");

const authController = {
  // Login
  login: catchAsync(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    return ApiResponse.success(res, result, result.message);
  }),

  // Register
  register: catchAsync(async (req, res) => {
    const result = await authService.register(req.body);
    return ApiResponse.success(res, result, result.message, 201);
  }),

  // Logout
  logout: catchAsync(async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { id: userId } = req.user;
    
    const result = await authService.logout(token, userId);
    return ApiResponse.success(res, result, result.message);
  }),

  // Forgot password - Send reset code
  forgotPassword: catchAsync(async (req, res) => {
    const { email } = req.body;
    const result = await authService.createResetPasswordCode(email);
    return ApiResponse.success(res, result, result.message);
  }),

  // Verify reset code
  verifyResetCode: catchAsync(async (req, res) => {
    const { email, code } = req.body;
    const result = await authService.verifyResetCode(email, code);
    return ApiResponse.success(res, result, result.message);
  }),

  // Reset password with code
  resetPasswordWithCode: catchAsync(async (req, res) => {
    const { email, code, newPassword } = req.body;
    const result = await authService.resetPasswordWithCode(email, code, newPassword);
    return ApiResponse.success(res, result, result.message);
  }),

  // Verify reset code and create temporary token
  verifyResetCodeAndCreateToken: catchAsync(async (req, res) => {
    const { email, code } = req.body;
    const result = await authService.verifyResetCodeAndCreateToken(email, code);
    return ApiResponse.success(res, result, result.message);
  }),

  // Reset password with temporary token
  resetPasswordWithToken: catchAsync(async (req, res) => {
    const { resetToken, newPassword } = req.body;
    const result = await authService.resetPasswordWithToken(resetToken, newPassword);
    return ApiResponse.success(res, result, result.message);
  }),

  // Change password for authenticated user
  changePassword: catchAsync(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const { id: userId } = req.user;
    
    const result = await authService.changePassword(userId, oldPassword, newPassword);
    return ApiResponse.success(res, result, result.message);
  }),

  // Refresh JWT token
  refreshToken: catchAsync(async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const result = await authService.refreshToken(token);
    return ApiResponse.success(res, result, result.message);
  }),

  // Get user profile
  getProfile: catchAsync(async (req, res) => {
    const { id: userId } = req.user;
    const user = await authService.getProfile(userId);
    return ApiResponse.success(res, user, "Profile retrieved successfully");
  }),

  // Update user profile
  updateProfile: catchAsync(async (req, res) => {
    const { id: userId } = req.user;
    const user = await authService.updateProfile(userId, req.body);
    return ApiResponse.success(res, user, "Profile updated successfully");
  }),

  // Verify token (for middleware)
  verifyToken: catchAsync(async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const result = await authService.verifyToken(token);
    return ApiResponse.success(res, result, "Token is valid");
  }),
};

module.exports = authController;
