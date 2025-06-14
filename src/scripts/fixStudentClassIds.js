const mongoose = require("mongoose");
const { Student } = require("../models");
require("dotenv").config();

async function fixStudentDatabase() {
  try {
    // Kết nối database
    await mongoose.connect(process.env.DB_URI);
    console.log("Đã kết nối đến MongoDB");

    // Tìm tất cả học sinh có classId là null
    const studentsWithNullClassId = await Student.find({ classId: null });
    console.log(
      `Tìm thấy ${studentsWithNullClassId.length} học sinh có classId = null`
    );

    // Cập nhật từng học sinh
    for (const student of studentsWithNullClassId) {
      student.classId = [];
      await student.save();
      console.log(`Đã sửa student ${student._id}`);
    }

    console.log("Hoàn tất sửa database!");
    process.exit(0);
  } catch (error) {
    console.error("Lỗi:", error);
    process.exit(1);
  }
}

fixStudentDatabase();
