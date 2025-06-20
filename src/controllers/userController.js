require("dotenv").config();
const { User, Teacher, Parent, Student } = require("../models");
const { hashing, getModelByRole } = require("../services");
const userService = require("../services/role_services/userService");

const userController = {
  async getUserList(req, res) {
    try {
      const { page, limit, sort, email, name, role } = req.query;

      // Build filter object
      const filter = {};
      if (email && email.trim())
        filter.email = { $regex: email, $options: "i" };
      if (name && name.trim()) filter.name = { $regex: name, $options: "i" };
      if (role && role.trim()) filter.role = role;

      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        sort: sort ? JSON.parse(sort) : { createdAt: -1 },
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
};
module.exports = userController;
