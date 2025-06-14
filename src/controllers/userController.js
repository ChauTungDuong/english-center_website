require("dotenv").config();
const { User, Teacher, Parent, Student } = require("../models");
const { hashing, getModelByRole } = require("../services");
const { pagination } = require("../middleware/pagination");
const createNewUser = async (req, res) => {
  try {
    const {
      email,
      passwordBeforeHash,
      name,
      gender,
      phoneNumber,
      address,
      role,
    } = req.body;

    if (!email || !passwordBeforeHash || !name) {
      return res.status(400).json({
        msg: "Email, mật khẩu và tên là bắt buộc",
      });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        msg: "Email đã được sử dụng",
      });
    }
    const newUser = await User.create({
      email: email,
      password: await hashing(passwordBeforeHash),
      name: name,
      gender: gender,
      phoneNumber: phoneNumber,
      address: address,
      role: role,
    });
    if (newUser.role === "Student") {
      await Student.create({
        userId: newUser.id,
        classId: req.body.classId || null,
        parentId: req.body.parentId || null,
        discountPercentage: req.body.discountPercentage || 0,
      });
    } else if (newUser.role === "Teacher") {
      await Teacher.create({
        userId: newUser.id,
        classId: req.body.classId || null,
        wagePerLesson: req.body.wagePerLesson || 0,
      });
    } else if (newUser.role === "Parent") {
      await Parent.create({
        userId: newUser.id,
        childId: req.body.childId || null,
        canSeeTeacher: req.body.canSeeTeacher === "Yes",
      });
    }
    res.status(200).json({
      msg: "Tạo người dùng thành công",
    });
  } catch (error) {
    res.status(500).json({
      msg: "Lỗi khi tạo người dùng",
      error: error.message,
    });
  }
};

const getUserList = (req, res) => {
  try {
    if (res.paginatedResults.totalItems === 0) {
      return res.status(404).json({
        msg: "Không có người dùng nào",
      });
    }
    return res.status(200).json({
      msg: "Lấy danh sách người dùng thành công",
      data: res.paginatedResults.data,
      pagination: {
        totalItems: res.paginatedResults.totalItems,
        totalPages: res.paginatedResults.totalPages,
        currentPage: res.paginatedResults.currentPage,
        hasNext: res.paginatedResults.hasNext,
        hasPrev: res.paginatedResults.hasPrev,
      },
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Lỗi khi lấy danh sách người dùng",
      error: error.message,
    });
  }
};

const deleteUser = async (req, res) => {
  const userId = req.params.id;
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      msg: "Người dùng không tồn tại",
    });
  }
  try {
    const model = getModelByRole(user.role);
    if (!model) {
      return res.status(400).json({
        msg: "Không tìm thấy model tương ứng với vai trò người dùng",
      });
    }
    await model.deleteOne({ userId: userId });
    await User.findByIdAndDelete(userId);
    return res.status(200).json({
      msg: "Xoá người dùng thành công",
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Lỗi khi xoá người dùng",
      error: error.message,
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const userAfterUpdated = await User.findByIdAndUpdate(userId, req.body, {
      new: true,
    });
    return res.status(200).json({
      msg: "Cập nhật người dùng thành công",
      data: userAfterUpdated,
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Lỗi khi cập nhật người dùng",
      error: error.message,
    });
  }
};

const getUserInfo = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({
        msg: "Người dùng không tồn tại",
      });
    }
    return res.status(200).json({
      msg: "Lấy thông tin người dùng thành công",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Lỗi khi lấy thông tin người dùng",
      error: error.message,
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({
        msg: "Người dùng không tồn tại",
      });
    }
    return res.status(200).json({
      msg: "Lấy thông tin người dùng thành công",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Lỗi khi lấy thông tin người dùng",
      error: error.message,
    });
  }
};
module.exports = {
  createNewUser,
  getUserList,
  deleteUser,
  updateUser,
  getUserInfo,
  getProfile,
};
