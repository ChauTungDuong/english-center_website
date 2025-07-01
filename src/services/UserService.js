const { BaseService } = require("../core/utils");
const {
  ValidationError,
  NotFoundError,
  ConflictError,
} = require("../core/errors/AppError");
const User = require("../models/User");
const { hashing } = require("./hashPassGen");

class UserService extends BaseService {
  constructor() {
    super(User);
  }

  /**
   * Create new user
   */
  async createUser(userData, userRole, session = null) {
    const { email, passwordBeforeHash, name, gender, phoneNumber, address } =
      userData;
    const role = userRole;

    // Validate required fields
    if (!email || !passwordBeforeHash || !name) {
      throw new ValidationError(
        "Missing required fields: email, password, or name"
      );
    }

    if (!["Student", "Teacher", "Parent", "Admin"].includes(role)) {
      throw new ValidationError("Invalid role");
    }

    // Check if email already exists
    const existingUser = session
      ? await User.findOne({ email }).session(session)
      : await User.findOne({ email });

    if (existingUser) {
      throw new ConflictError("Email already exists");
    }

    const createData = {
      email,
      password: await hashing(passwordBeforeHash),
      name,
      gender,
      phoneNumber,
      address,
      role,
      isActive: true,
    };

    if (session) {
      const user = await User.create([createData], { session });
      return user[0];
    } else {
      return await this.create(createData);
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId, session = null) {
    if (!userId) {
      throw new ValidationError("User ID is required");
    }

    const user = session
      ? await User.findById(userId).session(session)
      : await User.findById(userId);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return user;
  }

  /**
   * Update user information
   */
  async updateUser(userId, updateData, session = null) {
    if (!userId) {
      throw new ValidationError("User ID is required");
    }

    // Remove sensitive fields that shouldn't be updated directly
    const { password, role, ...allowedUpdates } = updateData;

    // If password needs to be updated, hash it
    if (password) {
      allowedUpdates.password = await hashing(password);
    }

    const user = session
      ? await User.findByIdAndUpdate(userId, allowedUpdates, {
          new: true,
          runValidators: true,
          session,
        })
      : await User.findByIdAndUpdate(userId, allowedUpdates, {
          new: true,
          runValidators: true,
        });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return user;
  }

  /**
   * Delete user (soft delete - set isActive to false)
   */
  async deleteUser(userId, session = null) {
    if (!userId) {
      throw new ValidationError("User ID is required");
    }

    const user = session
      ? await User.findByIdAndUpdate(
          userId,
          { isActive: false },
          { new: true, session }
        )
      : await User.findByIdAndUpdate(
          userId,
          { isActive: false },
          { new: true }
        );

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return user;
  }

  /**
   * Get all users with pagination and filters
   */
  async getAllUsers(options = {}) {
    const {
      page = 1,
      limit = 20,
      role,
      isActive,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;

    const filter = {};

    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    return await this.findWithPagination(filter, {
      page,
      limit,
      sort,
      select: "-password", // Exclude password from results
    });
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role) {
    if (!role) {
      throw new ValidationError("Role is required");
    }

    return await User.find({ role, isActive: true }).select("-password");
  }

  /**
   * Check if email exists
   */
  async checkEmailExists(email, excludeUserId = null) {
    const filter = { email };
    if (excludeUserId) {
      filter._id = { $ne: excludeUserId };
    }

    const user = await User.findOne(filter);
    return !!user;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email) {
    if (!email) {
      throw new ValidationError("Email is required");
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    return user;
  }

  /**
   * Update user role (Admin only)
   */
  async updateUserRole(userId, newRole, session = null) {
    if (!userId || !newRole) {
      throw new ValidationError("User ID and new role are required");
    }

    if (!["Student", "Teacher", "Parent", "Admin"].includes(newRole)) {
      throw new ValidationError("Invalid role");
    }

    const user = session
      ? await User.findByIdAndUpdate(
          userId,
          { role: newRole },
          { new: true, session }
        )
      : await User.findByIdAndUpdate(userId, { role: newRole }, { new: true });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return user;
  }

  /**
   * Update user status (Admin only)
   */
  async updateUserStatus(userId, isActive, session = null) {
    if (!userId || isActive === undefined) {
      throw new ValidationError("User ID and status are required");
    }

    const user = session
      ? await User.findByIdAndUpdate(
          userId,
          { isActive },
          { new: true, session }
        )
      : await User.findByIdAndUpdate(userId, { isActive }, { new: true });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return user;
  }

  /**
   * Get user statistics
   */
  async getUserStatistics() {
    const stats = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
          active: {
            $sum: {
              $cond: ["$isActive", 1, 0],
            },
          },
        },
      },
    ]);

    const totalUsers = await User.countDocuments({});
    const activeUsers = await User.countDocuments({ isActive: true });

    return {
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
      byRole: stats.reduce((acc, stat) => {
        acc[stat._id] = {
          total: stat.count,
          active: stat.active,
          inactive: stat.count - stat.active,
        };
        return acc;
      }, {}),
    };
  }
}

module.exports = UserService;
