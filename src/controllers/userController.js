const { catchAsync } = require("../core/middleware");
const { ApiResponse } = require("../core/utils");
const UserService = require("../services/UserService");

const userService = new UserService();

const userController = {
  // Get user list with pagination and filters (Admin only)
  getUserList: catchAsync(async (req, res) => {
    const { page, limit, role, isActive, search, sortBy, sortOrder } =
      req.query;

    const result = await userService.getAllUsers({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      role,
      isActive:
        isActive === "true" ? true : isActive === "false" ? false : undefined,
      search,
      sortBy,
      sortOrder,
    });

    return ApiResponse.success(res, result, "User list retrieved successfully");
  }),

  // Get current user profile
  getProfile: catchAsync(async (req, res) => {
    const { id: userId } = req.user;
    const user = await userService.getUserById(userId);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    return ApiResponse.success(
      res,
      userResponse,
      "Profile retrieved successfully"
    );
  }),

  // Update current user profile
  updateProfile: catchAsync(async (req, res) => {
    const { id: userId } = req.user;

    // Remove sensitive fields that users shouldn't update themselves
    const { role, isActive, password, ...allowedUpdates } = req.body;

    const user = await userService.updateUser(userId, allowedUpdates);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    return ApiResponse.success(
      res,
      userResponse,
      "Profile updated successfully"
    );
  }),

  // Get user by ID (Admin only)
  getUserById: catchAsync(async (req, res) => {
    const { id } = req.params;
    const user = await userService.getUserById(id);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    return ApiResponse.success(
      res,
      userResponse,
      "User retrieved successfully"
    );
  }),

  // Create new user (Admin only)
  createUser: catchAsync(async (req, res) => {
    const { role, ...userData } = req.body;
    const user = await userService.createUser(userData, role);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    return ApiResponse.success(
      res,
      userResponse,
      "User created successfully",
      201
    );
  }),

  // Update user (Admin only)
  updateUser: catchAsync(async (req, res) => {
    const { id } = req.params;
    const user = await userService.updateUser(id, req.body);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    return ApiResponse.success(res, userResponse, "User updated successfully");
  }),

  // Delete user (Admin only) - soft delete
  deleteUser: catchAsync(async (req, res) => {
    const { id } = req.params;
    await userService.deleteUser(id);

    return ApiResponse.success(res, null, "User deleted successfully");
  }),

  // Update user role (Admin only)
  updateUserRole: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    const user = await userService.updateUserRole(id, role);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    return ApiResponse.success(
      res,
      userResponse,
      "User role updated successfully"
    );
  }),

  // Update user status (Admin only)
  updateUserStatus: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await userService.updateUserStatus(id, isActive);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    return ApiResponse.success(
      res,
      userResponse,
      "User status updated successfully"
    );
  }),

  // Get users by role
  getUsersByRole: catchAsync(async (req, res) => {
    const { role } = req.params;
    const users = await userService.getUsersByRole(role);

    return ApiResponse.success(res, users, `${role}s retrieved successfully`);
  }),

  // Check if email exists
  checkEmailExists: catchAsync(async (req, res) => {
    const { email } = req.query;
    const { excludeUserId } = req.query;

    const exists = await userService.checkEmailExists(email, excludeUserId);

    return ApiResponse.success(res, { exists }, "Email existence checked");
  }),

  // Get user statistics (Admin only)
  getUserStatistics: catchAsync(async (req, res) => {
    const statistics = await userService.getUserStatistics();

    return ApiResponse.success(res, statistics, "User statistics retrieved");
  }),

  // Change user password (Admin or self)
  changeUserPassword: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    const { id: currentUserId, role } = req.user;

    // Check if user can change this password
    if (role !== "Admin" && currentUserId !== id) {
      return ApiResponse.error(
        res,
        "You can only change your own password",
        403
      );
    }

    await userService.updateUser(id, { password: newPassword });

    return ApiResponse.success(res, null, "Password changed successfully");
  }),
};

module.exports = userController;
