const { Class, Teacher, Student } = require("../models");
const withTransaction = require("../utils/session");
const {
  generateLessonDates,
  formatClassSchedule,
} = require("../utils/schedule");
const { addTeacherToClass } = require("../services/addOrRemove");
/**
 * Tạo lớp học mới sử dụng transaction
 */
const createNewClass = async (req, res) => {
  const {
    className,
    year,
    grade,
    isAvailable,
    feePerLesson,
    schedule,
    teacherId,
    studentList,
    attendanceId,
  } = req.body;

  try {
    // 1. Validation đầu vào
    const validationError = validateClassInput(
      className,
      year,
      grade,
      isAvailable,
      schedule
    );

    if (validationError) {
      return res.status(400).json({
        msg: validationError,
      });
    }

    // 2. Sử dụng transaction để đảm bảo tính nhất quán dữ liệu
    const result = await withTransaction(async (session) => {
      // Kiểm tra lớp tồn tại, sử dụng session
      const classExists = await Class.findOne({
        className: className.trim(),
        year: year,
        grade: grade,
      }).session(session);

      if (classExists) {
        throw new Error("Lớp học đã tồn tại");
      }

      // Kiểm tra giáo viên nếu có
      if (teacherId) {
        const classes = await Class.find({ teacherId }).session(session);
        if (classes.length >= 5) {
          throw new Error("Giáo viên đã dạy tối đa số lớp học");
        }

        // Kiểm tra giáo viên tồn tại
        const teacher = await Teacher.findById(teacherId).session(session);
        if (!teacher) {
          throw new Error("Giáo viên không tồn tại");
        }
      }

      // Tạo lớp mới sử dụng create với session
      const newClass = await Class.create(
        [
          {
            className: className.trim(),
            year: year,
            grade: grade,
            isAvailable: isAvailable,
            feePerLesson: feePerLesson || 0,
            schedule: {
              startDate: schedule.startDate,
              endDate: schedule.endDate,
              daysOfLessonInWeek: schedule.daysOfLessonInWeek.map((day) =>
                parseInt(day)
              ),
            },
            teacherId: teacherId || null,
            studentList: studentList || [],
            attendanceId: attendanceId || null,
          },
        ],
        { session } // Truyền session vào options
      );

      // Nếu có teacherId, cập nhật danh sách lớp của giáo viên
      if (teacherId) {
        await Teacher.findByIdAndUpdate(
          teacherId,
          { $push: { classId: newClass[0]._id } },
          { session }
        );
      }

      return newClass[0]; // Trả về class vừa tạo
    });

    // 3. Phản hồi thành công
    return res.status(201).json({
      msg: "Tạo lớp học thành công",
      classId: result._id,
      data: result,
    });
  } catch (error) {
    // 4. Xử lý lỗi - phân biệt lỗi validation và lỗi server
    if (
      error.message.includes("đã tồn tại") ||
      error.message.includes("tối đa số lớp") ||
      error.message.includes("không tồn tại")
    ) {
      return res.status(400).json({
        msg: error.message,
      });
    }

    return res.status(500).json({
      msg: "Lỗi khi tạo lớp học",
      error: error.message,
    });
  }
};

/**
 * Helper function để validate đầu vào
 */
function validateClassInput(className, year, grade, isAvailable, schedule) {
  if (!className || className.trim() === "") {
    return "Tên lớp không được để trống";
  }

  if (!year || typeof year !== "number") {
    return "Năm học không hợp lệ";
  }

  if (!grade || typeof grade !== "number") {
    return "Khối lớp không hợp lệ";
  }

  if (typeof isAvailable !== "boolean") {
    return "Trạng thái lớp học không hợp lệ";
  }

  if (!schedule || !schedule.startDate || !schedule.endDate) {
    return "Thông tin lịch học không đầy đủ";
  }

  if (new Date(schedule.startDate) >= new Date(schedule.endDate)) {
    return "Ngày bắt đầu phải trước ngày kết thúc";
  }

  return null;
}

/**
 * Lấy danh sách lớp học
 */
const getAllClasses = (req, res) => {
  try {
    // Destructuring để code sạch hơn
    const data = res.paginatedResults.data;

    if (!data || data.length === 0) {
      return res.status(404).json({
        msg: "Không có lớp học nào",
      });
    }

    return res.status(200).json({
      msg: "Lấy danh sách lớp học thành công",
      data: data,
      pagination: {
        totalItems: res.paginatedResults.totalItems,
        totalPages: res.paginatedResults.totalPages,
        currentPage: res.paginatedResults.currentPage,
        hasNext: res.paginatedResults.hasNext,
        hasPrev: res.paginatedResults.hasPrev,
      },
    });
  } catch (error) {
    res.status(500).json({
      msg: "Lỗi khi lấy danh sách lớp",
      error: error.message,
    });
  }
};

/**
 * Lấy thông tin chi tiết của lớp học
 */
const getClassDetails = (req, res) => {
  try {
    // Destructuring để code sạch hơn
    const data = res.paginatedResults.data;

    if (!data || data.length === 0) {
      return res.status(404).json({
        msg: "Không có thông tin lớp học",
      });
    }

    return res.status(200).json({
      msg: "Lấy thông tin lớp học thành công",
      data: data,
      pagination: {
        totalItems: res.paginatedResults.totalItems,
        totalPages: res.paginatedResults.totalPages,
        currentPage: res.paginatedResults.currentPage,
        hasNext: res.paginatedResults.hasNext,
        hasPrev: res.paginatedResults.hasPrev,
      },
    });
  } catch (error) {
    res.status(500).json({
      msg: "Lỗi khi lấy thông tin lớp học",
      error: error.message,
    });
  }
};

const updateClass = async (req, res) => {
  const classId = req.params.classId;
  const update = req.body;
  try {
    return await withTransaction(async (session) => {
      const classExists = await Class.findById(classId).session(session);
      if (!classExists) {
        return res.status(404).json({
          msg: "Lớp học không tồn tại",
        });
      }
      const updateFields = {};
      if (update.className) updateFields.className = update.className.trim();
      if (update.year) updateFields.year = update.year;
      if (update.grade) updateFields.grade = update.grade;
      if (update.isAvailable !== undefined) {
        updateFields.isAvailable = update.isAvailable;
      }
      if (update.feePerLesson) updateFields.feePerLesson = update.feePerLesson;
      if (update.attendanceId) updateFields.attendanceId = update.attendanceId;

      // Xử lý schedule
      if (update.schedule) {
        updateFields.schedule = {
          startDate:
            update.schedule.startDate || classExists.schedule?.startDate,
          endDate: update.schedule.endDate || classExists.schedule?.endDate,
          daysOfLessonInWeek: update.schedule.daysOfLessonInWeek
            ? update.schedule.daysOfLessonInWeek.map((day) => parseInt(day))
            : classExists.schedule?.daysOfLessonInWeek || [],
        };

        // Validate schedule
        if (
          new Date(updateFields.schedule.startDate) >=
          new Date(updateFields.schedule.endDate)
        ) {
          return res.status(400).json({
            msg: "Ngày bắt đầu phải trước ngày kết thúc",
          });
        }
      } // Xử lý thay đổi giáo viên
      if (
        update.teacherId &&
        update.teacherId !== classExists.teacherId?.toString()
      ) {
        // Xóa lớp khỏi giáo viên cũ
        if (classExists.teacherId) {
          await Teacher.updateOne(
            { _id: classExists.teacherId },
            { $pull: { classId: classId } },
            { session }
          );
        }

        // Kiểm tra giáo viên mới
        const newTeacher = await Teacher.findById(update.teacherId).session(
          session
        );
        if (!newTeacher) {
          return res.status(404).json({
            msg: "Không tìm thấy giáo viên",
          });
        }

        // Kiểm tra số lớp của giáo viên mới
        if (newTeacher.classId && newTeacher.classId.length >= 5) {
          return res.status(400).json({
            msg: "Giáo viên đã dạy tối đa 5 lớp học",
          });
        }

        // Thêm lớp vào giáo viên mới
        if (!newTeacher.classId) {
          newTeacher.classId = [];
        }
        if (!newTeacher.classId.includes(classId)) {
          newTeacher.classId.push(classId);
        }
        await newTeacher.save({ session });

        updateFields.teacherId = update.teacherId;
      } // Xử lý studentList nếu có
      if (update.studentList && update.studentList.action) {
        const { action, studentIds } = update.studentList;

        if (!Array.isArray(studentIds)) {
          return res.status(400).json({
            msg: "studentIds phải là một mảng",
          });
        }

        switch (action) {
          case "add":
            // Thêm học sinh vào lớp
            for (const studentId of studentIds) {
              const student = await Student.findById(studentId).session(
                session
              );
              if (!student) continue;

              // Đảm bảo classId là array
              if (!student.classId) {
                student.classId = [];
              }

              // Thêm classId nếu chưa có
              if (!student.classId.includes(classId)) {
                student.classId.push(classId);
                await student.save({ session });
              }
            }

            // Sử dụng findByIdAndUpdate thay vì updateFields với $addToSet
            await Class.findByIdAndUpdate(
              classId,
              { $addToSet: { studentList: { $each: studentIds } } },
              { session }
            );
            break;

          case "remove":
            // Xóa học sinh khỏi lớp
            for (const studentId of studentIds) {
              const student = await Student.findById(studentId).session(
                session
              );
              if (student && student.classId) {
                student.classId = student.classId.filter(
                  (id) => id.toString() !== classId
                );
                await student.save({ session });
              }
            }

            // Xóa khỏi danh sách lớp
            await Class.findByIdAndUpdate(
              classId,
              { $pull: { studentList: { $in: studentIds } } },
              { session }
            );
            break;

          case "set":
            // Gán lại toàn bộ danh sách học sinh
            const removedStudents = classExists.studentList.filter(
              (id) => !studentIds.includes(id.toString())
            );

            // Xóa lớp khỏi danh sách các học sinh bị loại bỏ
            for (const studentId of removedStudents) {
              const student = await Student.findById(studentId).session(
                session
              );
              if (student && student.classId) {
                student.classId = student.classId.filter(
                  (id) => id.toString() !== classId
                );
                await student.save({ session });
              }
            }

            // Thêm lớp vào danh sách của học sinh mới
            for (const studentId of studentIds) {
              const student = await Student.findById(studentId).session(
                session
              );
              if (!student) continue;

              // Đảm bảo classId là array
              if (!student.classId) {
                student.classId = [];
              }

              // Thêm classId nếu chưa có
              if (!student.classId.includes(classId)) {
                student.classId.push(classId);
                await student.save({ session });
              }
            }

            // Cập nhật danh sách học sinh của lớp
            updateFields.studentList = studentIds;
            break;

          default:
            return res.status(400).json({
              msg: "Hành động không hợp lệ cho studentList",
            });
        }
      } // Thực hiện cập nhật cho các trường thông thường
      if (Object.keys(updateFields).length > 0) {
        await Class.findByIdAndUpdate(classId, updateFields, {
          new: true,
          runValidators: true,
          session,
        });
      }

      // Lấy class đã được cập nhật để trả về
      const updatedClass = await Class.findById(classId)
        .populate("teacherId", "userId")
        .populate("studentList", "userId")
        .session(session);

      return res.status(200).json({
        msg: "Cập nhật lớp học thành công",
        data: updatedClass,
      });
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Lỗi khi cập nhật lớp học",
      error: error.message,
    });
  }
};

const deleteClass = async (req, res) => {
  const classId = req.params.classId;
  try {
    return await withTransaction(async (session) => {
      const classExists = await Class.findById(classId).session(session);
      if (!classExists) {
        return res.status(404).json({
          msg: "Lớp học không tồn tại",
        });
      }

      // Xóa lớp khỏi giáo viên nếu có
      if (classExists.teacherId) {
        await Teacher.updateOne(
          { _id: classExists.teacherId },
          { $pull: { classId: classId } },
          { session }
        );
      }

      // Xóa lớp khỏi danh sách học sinh
      for (const studentId of classExists.studentList) {
        await Student.updateOne(
          { _id: studentId },
          { $pull: { classId: classId } },
          { session }
        );
      }

      // Xóa lớp học
      await Class.findByIdAndDelete(classId, { session });

      return res.status(200).json({
        msg: "Xoá lớp học thành công",
      });
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Lỗi khi xoá lớp học",
      error: error.message,
    });
  }
};
const getClassSchedule = async (req, res) => {
  try {
    const classId = req.params.classId;
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({
        msg: "Không tìm thấy lớp học",
      });
    }
    const formattedSchedule = formatClassSchedule(classData);
    return res.status(200).json({
      msg: "Lấy lịch học thành công",
      data: formattedSchedule,
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Lỗi khi lấy lịch học",
      error: error.message,
    });
  }
};
module.exports = {
  createNewClass,
  getAllClasses,
  getClassDetails,
  updateClass,
  deleteClass,
  getClassSchedule,
};
