const { Class, Student, Teacher } = require("../models");

const withTransaction = require("../utils/session");

const addStudentToClass = async (classId, studentId) => {
  try {
    return await withTransaction(async (session) => {
      const classExists = await Class.findById(classId).session(session);
      if (!classExists) {
        throw new Error("Lớp học không tồn tại");
      }
      const studentExists = await Student.findById(studentId).session(session);
      if (!studentExists) {
        throw new Error("Học sinh không tồn tại");
      }
      if (!classExists.isAvailable) {
        throw new Error("Lớp học không còn hoạt động");
      }
      if (classExists.studentList.includes(studentId)) {
        throw new Error("Học sinh đã có trong lớp học này");
      }
      if (
        studentExists.classId &&
        studentExists.classId.some((id) => id.toString() === classId.toString())
      ) {
        throw new Error("Học sinh đã đăng ký lớp học này");
      }
      classExists.studentList.push(studentId);

      if (!studentExists.classId) {
        studentExists.classId = [];
      }
      studentExists.classId.push(classId);

      await Promise.all([
        studentExists.save({ session }),
        classExists.save({ session }),
      ]);
      return {
        msg: "Thêm học sinh vào lớp thành công",
      };
    });
  } catch (error) {
    throw new Error(`Lỗi khi thêm học sinh vào lớp: ${error.message}`);
  }
};

const removeStudentFromClass = async (classId, studentId) => {
  try {
    return await withTransaction(async (session) => {
      const classExists = await Class.findById(classId).session(session);
      const studentExists = await Student.findById(studentId).session(session);
      if (!classExists) {
        throw new Error("Lớp học không tồn tại");
      }
      if (!studentExists) {
        throw new Error("Học sinh không tồn tại");
      }
      if (
        !classExists.studentList.some(
          (id) => id.toString() === studentId.toString()
        )
      ) {
        throw new Error("Học sinh không có trong lớp học này");
      }
      if (
        !studentExists.classId ||
        !studentExists.classId.some(
          (id) => id.toString() === classId.toString()
        )
      ) {
        throw new Error("Học sinh không học lớp này");
      }
      classExists.studentList = classExists.studentList.filter(
        (id) => id.toString() !== studentId.toString()
      );

      if (studentExists.classId && studentExists.classId.length > 0) {
        studentExists.classId = studentExists.classId.filter(
          (id) => id.toString() !== classId.toString()
        );
      }
      await Promise.all([
        studentExists.save({ session }),
        classExists.save({ session }),
      ]);
      return {
        msg: "Xoá học sinh khỏi lớp thành công",
      };
    });
  } catch (error) {
    throw new Error(`Lỗi khi xoá học sinh khỏi lớp: ${error.message}`);
  }
};
const addTeacherToClass = async (classId, teacherId) => {
  try {
    return await withTransaction(async (session) => {
      const classExists = await Class.findById(classId).session(session);
      const teacherExists = await Teacher.findById(teacherId).session(session);
      if (!classExists) {
        throw new Error("Lớp học không tồn tại");
      }
      if (!teacherExists) {
        throw new Error("Giáo viên không tồn tại");
      }
      if (!classExists.isAvailable) {
        throw new Error("Lớp học không còn hoạt động");
      }
      if (classExists.teacherId) {
        throw new Error("Lớp học đã có giáo viên khác dạy");
      }
      if (teacherExists.classId && teacherExists.classId.length >= 5) {
        throw new Error("Giáo viên đã dạy tối đa 5 lớp học");
      }

      classExists.teacherId = teacherId;

      if (!teacherExists.classId) {
        teacherExists.classId = [];
      }
      teacherExists.classId.push(classId);
      await Promise.all([
        classExists.save({ session }),
        teacherExists.save({ session }),
      ]);
      return {
        msg: "Thêm giáo viên vào lớp thành công",
      };
    });
  } catch (error) {
    throw new Error(`Lỗi khi thêm giáo viên vào lớp: ${error.message}`);
  }
};
const removeTeacherFromClass = async (classId, teacherId) => {
  try {
    return await withTransaction(async (session) => {
      const classExists = await Class.findById(classId).session(session);
      const teacherExists = await Teacher.findById(teacherId).session(session);
      if (!classExists) {
        throw new Error("Lớp học không tồn tại");
      }
      if (!teacherExists) {
        throw new Error("Giáo viên không tồn tại");
      }
      if (!classExists.teacherId) {
        throw new Error("Lớp không có giáo viên nào");
      }
      if (classExists.teacherId.toString() !== teacherExists._id.toString()) {
        throw new Error("Giáo viên không phải là giáo viên của lớp này");
      }
      if (teacherExists.classId && teacherExists.classId.length > 0) {
        teacherExists.classId = teacherExists.classId.filter(
          (id) => id.toString() !== classId.toString()
        );
      }
      classExists.teacherId = null;

      await Promise.all([
        classExists.save({ session }),
        teacherExists.save({ session }),
      ]);
      return {
        msg: "Xoá giáo viên khỏi lớp thành công",
      };
    });
  } catch (error) {
    throw new Error(`Lỗi khi xoá giáo viên khỏi lớp: ${error.message}`);
  }
};
module.exports = {
  addStudentToClass,
  removeStudentFromClass,
  addTeacherToClass,
  removeTeacherFromClass,
};
