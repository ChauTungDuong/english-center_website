const User = require("../../models/User");
const { hashing } = require("../hashPassGen");
const { userUpdateFields } = require("./updateFields");
const userService = {
  async create(userData, userRole, session = null) {
    try {
      const { email, passwordBeforeHash, name, gender, phoneNumber, address } =
        userData;
      const role = userRole;
      // Kiểm tra email đã tồn tại
      if (!email || !passwordBeforeHash || !name) {
        throw new Error("Thiếu thông tin bắt buộc: email, password hoặc name");
      }

      if (!["Student", "Teacher", "Parent", "Admin"].includes(role)) {
        throw new Error("Vai trò không hợp lệ");
      }

      const existingUser = session
        ? await User.findOne({ email: email }).session(session)
        : await User.findOne({ email });

      if (existingUser) {
        throw new Error("Email đã tồn tại");
      }

      const createData = {
        email: email,
        password: await hashing(passwordBeforeHash),
        name: name,
        gender: gender,
        phoneNumber: phoneNumber,
        address: address,
        role: role,
      };
      if (session) {
        const user = await User.create([createData], { session });
        return user[0];
      } else {
        return await User.create(createData);
      }
    } catch (error) {
      throw new Error(`Lỗi khi tạo người dùng: ${error.message}`);
    }
  },

  async getUserById(userId, session = null) {
    try {
      if (!userId) {
        throw new Error("Thiếu thông tin bắt buộc: userId");
      }
      const user = session
        ? await User.findById(userId).session(session)
        : await User.findById(userId);
      if (!user) {
        throw new Error("Không tìm thấy người dùng");
      }
      return user;
    } catch (error) {
      throw new Error(`Lỗi khi lấy người dùng: ${error.message}`);
    }
  },

  async update(userId, updateData, session = null) {
    try {
      if (!userId || !updateData) {
        throw new Error("Thiếu thông tin bắt buộc: userId hoặc updateData");
      }
      const updateFields = userUpdateFields(updateData);
      const options = { new: true, runValidators: true };
      if (session) {
        options.session = session;
      }
      if (updateFields.email) {
        const existingUser = session
          ? await User.findOne({
              email: updateFields.email,
              _id: { $ne: userId },
            }).session(session)
          : await User.findOne({
              email: updateFields.email,
              _id: { $ne: userId },
            });

        if (existingUser) {
          throw new Error("Email đã được sử dụng");
        }
      }
      return await User.findByIdAndUpdate(
        userId,
        { $set: updateFields },
        options
      );
    } catch (error) {
      throw new Error(`Lỗi khi cập nhật người dùng: ${error.message}`);
    }
  },

  async delete(userId, session = null) {
    try {
      if (session) {
        return await User.findByIdAndDelete(userId, { session });
      } else {
        return await User.findByIdAndDelete(userId);
      }
    } catch (error) {
      throw new Error(`Lỗi khi xóa người dùng: ${error.message}`);
    }
  },

  /**
   * Lấy danh sách tất cả người dùng với phân trang và filter
   * @param {Object} filter - Điều kiện filter (optional)
   * @param {Object} options - Tùy chọn pagination, sort (optional)
   * @returns {Object} Danh sách người dùng và thông tin phân trang
   */
  async getAll(filter = {}, options = {}) {
    try {
      const { page = 1, limit = 10, sort, isActive } = options;

      const skip = (page - 1) * limit;

      // Thêm filter cho isActive nếu được chỉ định
      const finalFilter = { ...filter };
      if (isActive !== undefined) {
        finalFilter.isActive = isActive;
      }

      // Thực hiện query với filter và pagination
      const users = await User.find(finalFilter)
        .select("-password") // Loại bỏ password khỏi kết quả
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();

      // Fetch role data cho tất cả users
      if (users.length > 0) {
        const { Student, Teacher, Parent } = require("../../models");
        const userIds = users.map((user) => user._id);

        // Parallel queries cho tất cả role types
        const [students, teachers, parents] = await Promise.all([
          Student.find({ userId: { $in: userIds } })
            .select("userId")
            .lean(),
          Teacher.find({ userId: { $in: userIds } })
            .select("userId")
            .lean(),
          Parent.find({ userId: { $in: userIds } })
            .select("userId")
            .lean(),
        ]);

        // Tạo lookup map
        const roleMap = {};
        students.forEach((s) => (roleMap[s.userId] = s._id));
        teachers.forEach((t) => (roleMap[t.userId] = t._id));
        parents.forEach((p) => (roleMap[p.userId] = p._id));

        // Thêm roleId vào users
        users.forEach((user) => {
          user.roleId = roleMap[user._id] || null;
        });
      }

      // Đếm tổng số documents
      const totalUsers = await User.countDocuments(finalFilter);
      const totalPages = Math.ceil(totalUsers / limit);

      return {
        users,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalUsers,
          itemsPerPage: limit,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy danh sách người dùng: ${error.message}`);
    }
  },
};

module.exports = userService;
