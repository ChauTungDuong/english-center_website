require("dotenv").config();
const { User, Teacher, Parent, Student } = require("../models");
const { hashing } = require("../services/hashPassGen");
const createNewUser = async (req, res) => {
  const {
    email,
    passwordBeforeHash,
    name,
    gender,
    phoneNumber,
    address,
    role,
  } = req.body;

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
      discountPercentage: req.body.discountPercentage || null,
    });
  } else if (newUser.role === "Teacher") {
    await Teacher.create({
      userId: newUser.id,
      classId: req.body.classId || null,
      wagePerLesson: req.body.wagePerLesson || null,
    });
  } else if (newUser.role === "Parent") {
    await Parent.create({
      userId: newUser.id,
      childId: req.body.childId || null,
      canSeeTeacher: req.body.canSeeTeacher === "Yes" || null,
    });
  }

  res.status(200).json({
    msg: "Tạo người dùng thành công",
  });
};

const updateUser = async (req, res) => {};

module.exports = {
  createNewUser,
};
