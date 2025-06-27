require("dotenv").config();
const { User, Teacher, Parent, Student } = require("../models");
const { hashing, getModelByRole } = require("../services");
const userService = require("../services/role_services/userService");

const userController = {
  async getUserList(req, res) {
    try {
      const { page, limit, sort, email, name, role, isActive } = req.query;

      // Build filter object
      const filter = {};
      if (email && email.trim())
        filter.email = { $regex: email, $options: "i" };
      if (name && name.trim()) filter.name = { $regex: name, $options: "i" };
      if (role && role.trim()) filter.role = role;

      // Parse isActive để có logic rõ ràng: true, false, hoặc undefined
      let parsedIsActive;
      if (isActive === "true") {
        parsedIsActive = true;
      } else if (isActive === "false") {
        parsedIsActive = false;
      }
      // Nếu isActive không có hoặc không phải "true"/"false" thì để undefined

      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        sort: sort ? JSON.parse(sort) : { createdAt: -1 },
        isActive: parsedIsActive,
      };

      const result = await userService.getAll(filter, options);

      return res.status(200).json({
        msg: "Lấy danh sách người dùng thành công",
        data: result.users,
        pagination: result.pagination,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy danh sách người dùng",
        error: error.message,
      });
    }
  },

  async getProfile(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId).select("-password");
      const model = getModelByRole(user.role);
      let roleId = null;
      let roleData = null;
      if (model) {
        roleData = await model.findOne({ userId: userId });
        if (roleData) {
          roleId = roleData._id;
        }
      }
      const data = {
        ...user.toObject(),
        roleId: roleId,
        roleData: roleData,
      };
      if (!user) {
        return res.status(404).json({
          msg: "Người dùng không tồn tại",
        });
      }
      return res.status(200).json({
        msg: "Lấy thông tin người dùng thành công",
        data: data,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy thông tin người dùng",
        error: error.message,
      });
    }
  },
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { email, name, gender, phoneNumber, address } = req.body;
      if (email) {
        const existingUser = await User.findOne({
          email: email,
          _id: { $ne: userId },
        });
        if (existingUser || req.user.email === email) {
          return res.status(400).json({
            msg: "Email đã được sử dụng",
          });
        }
      }
      if (!["Nam", "Nữ", "Khác"].includes(gender) && gender !== undefined) {
        return res.status(400).json({
          msg: "Giới tính không hợp lệ",
        });
      }
      const user = await User.findByIdAndUpdate(
        userId,
        { email, name, gender, phoneNumber, address },
        { new: true, runValidators: true }
      ).select("-password");

      return res.status(200).json({
        msg: "Cập nhật thông tin thành công",
        data: user,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi cập nhật thông tin người dùng",
        error: error.message,
      });
    }
  },

  // Admin: Toggle user status (active/inactive)
  async toggleUserStatus(req, res) {
    try {
      // Chỉ admin mới có quyền
      if (req.user.role !== "Admin") {
        return res.status(403).json({
          msg: "Chỉ Admin mới có quyền thực hiện thao tác này",
        });
      }

      const { userId } = req.params;
      let { isActive } = req.body;

      // Convert string to boolean if needed
      if (typeof isActive === "string") {
        isActive = isActive.toLowerCase() === "true";
      }

      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          msg: "isActive phải là boolean (true/false) hoặc string ('true'/'false')",
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          msg: "Không tìm thấy user",
        });
      }

      // Không cho phép vô hiệu hóa admin
      if (user.role === "Admin" && !isActive) {
        return res.status(403).json({
          msg: "Không thể vô hiệu hóa tài khoản Admin",
        });
      }

      await User.findByIdAndUpdate(userId, { isActive });

      return res.status(200).json({
        msg: `${isActive ? "Kích hoạt" : "Vô hiệu hóa"} user thành công`,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive,
        },
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi cập nhật trạng thái user",
        error: error.message,
      });
    }
  },

  // ...existing code...
};
module.exports = userController;
