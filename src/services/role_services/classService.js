const { Class, Teacher, Student } = require("../../models");
const withTransaction = require("../../utils/session");

const classService = {
  /**
   * Tạo lớp học mới
   * @param {Object} classData - Dữ liệu lớp học
   * @returns {Object} Class đã được tạo
   */
  async create(classData) {
    return await withTransaction(async (session) => {
      try {
        const {
          className,
          year,
          grade,
          isAvailable = true,
          feePerLesson,
          schedule,
          teacherId,
          studentList = [],
        } = classData;

        // Validate required fields
        if (!className || !year || !grade) {
          throw new Error("Thiếu thông tin bắt buộc: className, year, grade");
        }

        // Check if class already exists
        const existingClass = await Class.findOne({
          className,
          year,
          grade,
        }).session(session);

        if (existingClass) {
          throw new Error("Lớp học đã tồn tại với tên, năm và khối này");
        }

        // Validate teacher if provided
        if (teacherId) {
          const teacher = await Teacher.findById(teacherId).session(session);
          if (!teacher) {
            throw new Error("Giáo viên không tồn tại");
          }

          // Check if teacher already has this class
          if (teacher.classId && teacher.classId.includes(teacherId)) {
            throw new Error("Giáo viên đã được gán cho lớp học này");
          }
        }

        // Validate students if provided
        if (studentList.length > 0) {
          const validStudents = await Student.find({
            _id: { $in: studentList },
          }).session(session);

          if (validStudents.length !== studentList.length) {
            throw new Error("Một số học sinh không tồn tại");
          }
        }

        // Create class
        const newClass = await Class.create(
          [
            {
              className,
              year,
              grade,
              isAvailable,
              feePerLesson: feePerLesson || 0,
              schedule: schedule || [],
              teacherId: teacherId || null,
              studentList,
            },
          ],
          { session }
        );

        // Update teacher's classId if teacherId provided
        if (teacherId) {
          await Teacher.findByIdAndUpdate(
            teacherId,
            { $addToSet: { classId: newClass[0]._id } },
            { session }
          );
        }

        // Update students' classId if studentList provided
        if (studentList.length > 0) {
          await Student.updateMany(
            { _id: { $in: studentList } },
            { $set: { classId: newClass[0]._id } },
            { session }
          );
        }

        return newClass[0];
      } catch (error) {
        throw new Error(`Lỗi khi tạo lớp học: ${error.message}`);
      }
    });
  },
  /**
   * Lấy thông tin lớp học theo ID
   * @param {String} classId - ID của lớp học
   * @param {Object} options - Tùy chọn include data
   * @returns {Object} Thông tin lớp học
   */ async getById(classId, options = {}) {
    try {
      if (!classId) {
        throw new Error("Thiếu thông tin bắt buộc: classId");
      }
      const {
        schedule = false,
        students = false,
        attendance = false,
        detailed = false,
        scheduleOnly = false,
      } = options;

      // Convert empty strings to false (fix for query params)
      const normalizedOptions = {
        schedule: schedule === true || schedule === "true",
        students: students === true || students === "true",
        attendance: attendance === true || attendance === "true",
        detailed: detailed === true || detailed === "true",
        scheduleOnly: scheduleOnly === true || scheduleOnly === "true",
      };

      if (normalizedOptions.scheduleOnly) {
        const classData = await Class.findById(classId).select(
          "className schedule"
        );
        if (!classData) {
          throw new Error("Không tìm thấy lớp học");
        }
        return classData;
      }
      let query = Class.findById(classId); // Select fields based on options
      let selectFields =
        "_id className year grade isAvailable feePerLesson teacherId studentList createdAt updatedAt";
      if (normalizedOptions.schedule || normalizedOptions.detailed) {
        selectFields += " schedule";
      }

      query = query.select(selectFields);

      // Always populate teacher info (basic requirement)
      query = query.populate({
        path: "teacherId",
        select: "userId wagePerLesson",
        populate: {
          path: "userId",
          select: "name email phoneNumber",
        },
      }); // Populate students if requested
      if (normalizedOptions.students) {
        const studentPopulate = {
          path: "studentList",
          select: "userId parentId",
          populate: [
            {
              path: "userId",
              select: "name email phoneNumber",
            },
          ],
        }; // Add parent info if detailed
        if (normalizedOptions.detailed) {
          studentPopulate.populate.push({
            path: "parentId",
            select: "userId",
            populate: {
              path: "userId",
              select: "name phoneNumber",
            },
          });
        }
        query = query.populate(studentPopulate);
      } else {
        // Just get student IDs for counting
        query = query.populate({
          path: "studentList",
          select: "_id",
        });
      }

      const classData = await query;

      if (!classData) {
        throw new Error("Không tìm thấy lớp học");
      } // Add attendance stats if requested
      if (normalizedOptions.attendance) {
        // Import Attendance here to avoid circular dependency
        const { Attendance } = require("../../models");
        const attendanceStats = await this.getAttendanceStats(
          classId,
          Attendance
        );
        classData._doc.attendanceStats = attendanceStats;
      } // Add detailed formatting if requested
      if (normalizedOptions.detailed) {
        // Format response with additional computed fields
        const formattedData = {
          ...classData._doc,
          studentCount: classData.studentList
            ? classData.studentList.length
            : 0,
          hasTeacher: !!classData.teacherId,
        };

        // Only add scheduleFormatted if schedule data exists
        if (classData.schedule && classData.schedule.daysOfLessonInWeek) {
          formattedData.scheduleFormatted = {
            ...classData.schedule,
            daysFormatted: classData.schedule.daysOfLessonInWeek
              .map((day) => {
                const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
                return dayNames[day];
              })
              .join(", "),
          };
        }

        return formattedData;
      }

      return classData;
    } catch (error) {
      throw new Error(`Lỗi khi lấy thông tin lớp học: ${error.message}`);
    }
  },

  /**
   * Lấy thống kê điểm danh của lớp
   * @param {String} classId - ID của lớp học
   * @param {Object} AttendanceModel - Attendance model
   * @returns {Object} Thống kê điểm danh
   */
  async getAttendanceStats(classId, AttendanceModel) {
    try {
      const attendances = await AttendanceModel.find({ classId });

      if (attendances.length === 0) {
        return {
          totalLessons: 0,
          averageAttendanceRate: "0%",
        };
      }

      let totalPresent = 0;
      let totalPossible = 0;

      attendances.forEach((attendance) => {
        attendance.students.forEach((student) => {
          totalPossible++;
          if (!student.isAbsent) {
            totalPresent++;
          }
        });
      });

      const averageRate =
        totalPossible > 0 ? (totalPresent / totalPossible) * 100 : 0;

      return {
        totalLessons: attendances.length,
        averageAttendanceRate: averageRate.toFixed(2) + "%",
      };
    } catch (error) {
      return {
        totalLessons: 0,
        averageAttendanceRate: "0%",
      };
    }
  },

  /**
   * Cập nhật thông tin lớp học
   * @param {String} classId - ID của lớp học
   * @param {Object} updateData - Dữ liệu cập nhật
   * @returns {Object} Lớp học đã được cập nhật
   */
  async update(classId, updateData) {
    return await withTransaction(async (session) => {
      try {
        if (!classId || !updateData) {
          throw new Error("Thiếu thông tin bắt buộc: classId hoặc updateData");
        }

        const classData = await Class.findById(classId).session(session);
        if (!classData) {
          throw new Error("Không tìm thấy lớp học");
        }

        // Filter allowed update fields
        const allowedFields = [
          "className",
          "year",
          "grade",
          "isAvailable",
          "feePerLesson",
          "schedule",
          "teacherId",
          "studentList",
        ];

        const updateFields = Object.keys(updateData)
          .filter((key) => allowedFields.includes(key))
          .reduce((obj, key) => {
            obj[key] = updateData[key];
            return obj;
          }, {});

        // Handle teacher assignment change
        if (updateFields.teacherId !== undefined) {
          await this.updateTeacherRelationship(
            classData,
            updateFields.teacherId,
            session
          );
        }

        // Handle student list change
        if (updateFields.studentList !== undefined) {
          await this.updateStudentRelationship(
            classData,
            updateFields.studentList,
            session
          );
        }

        // Update class
        const updatedClass = await Class.findByIdAndUpdate(
          classId,
          { $set: updateFields },
          { new: true, runValidators: true, session }
        );

        return updatedClass;
      } catch (error) {
        throw new Error(`Lỗi khi cập nhật lớp học: ${error.message}`);
      }
    });
  },

  /**
   * Xóa lớp học (soft delete - set isAvailable = false)
   * @param {String} classId - ID của lớp học
   * @param {Boolean} hardDelete - Có xóa hoàn toàn không
   */
  async delete(classId, hardDelete = false) {
    return await withTransaction(async (session) => {
      try {
        if (!classId) {
          throw new Error("Thiếu thông tin bắt buộc: classId");
        }

        const classData = await Class.findById(classId).session(session);
        if (!classData) {
          throw new Error("Không tìm thấy lớp học");
        }

        if (hardDelete) {
          // Hard delete - remove all relationships
          // Remove from teacher's classId array
          if (classData.teacherId) {
            await Teacher.findByIdAndUpdate(
              classData.teacherId,
              { $pull: { classId: classId } },
              { session }
            );
          }

          // Set students' classId to null
          if (classData.studentList.length > 0) {
            await Student.updateMany(
              { _id: { $in: classData.studentList } },
              { $unset: { classId: "" } },
              { session }
            );
          }

          // Delete class
          await Class.findByIdAndDelete(classId).session(session);

          return { message: "Lớp học đã được xóa hoàn toàn" };
        } else {
          // Soft delete - set isAvailable = false
          await Class.findByIdAndUpdate(
            classId,
            { $set: { isAvailable: false } },
            { session }
          );

          return { message: "Lớp học đã được đóng (soft delete)" };
        }
      } catch (error) {
        throw new Error(`Lỗi khi xóa lớp học: ${error.message}`);
      }
    });
  },
  /**
   * Lấy danh sách tất cả lớp học
   * @param {Object} filter - Bộ lọc (optional)
   * @param {Object} options - Tùy chọn pagination, sort (optional)
   * @returns {Array} Danh sách lớp học
   */
  async getAll(filter = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sort = { createdAt: -1 },
        populate = true,
        summary = false, // Nếu true, chỉ trả về thông tin cơ bản cho list view
      } = options;

      const skip = (page - 1) * limit;
      let query = Class.find(filter).skip(skip).limit(limit).sort(sort);

      if (populate && !summary) {
        // Full populate cho detail view
        query = query
          .populate({
            path: "teacherId",
            select: "userId wagePerLesson",
            populate: {
              path: "userId",
              select: "name email",
            },
          })
          .populate({
            path: "studentList",
            select: "userId",
            populate: {
              path: "userId",
              select: "name email",
            },
          });
      } else if (populate && summary) {
        // Lightweight populate cho list view
        query = query
          .populate({
            path: "teacherId",
            select: "userId",
            populate: {
              path: "userId",
              select: "name",
            },
          })
          .populate({
            path: "studentList",
            select: "_id", // Chỉ lấy ID để đếm
          });
      }

      const classes = await query;
      const total = await Class.countDocuments(filter);

      let formattedClasses;

      if (summary) {
        // Format tối ưu cho list view
        formattedClasses = classes.map((cls) => ({
          _id: cls._id,
          className: cls.className,
          year: cls.year,
          grade: cls.grade,
          isAvailable: cls.isAvailable,
          feePerLesson: cls.feePerLesson,
          studentCount: cls.studentList ? cls.studentList.length : 0,
          teacherName: cls.teacherId?.userId?.name || "Chưa có giáo viên",
          scheduleCount:
            cls.schedule && cls.schedule.daysOfLessonInWeek
              ? cls.schedule.daysOfLessonInWeek.length
              : 0,
          schedulePreview:
            cls.schedule &&
            cls.schedule.daysOfLessonInWeek &&
            Array.isArray(cls.schedule.daysOfLessonInWeek) &&
            cls.schedule.daysOfLessonInWeek.length > 0
              ? (() => {
                  const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
                  const days = cls.schedule.daysOfLessonInWeek
                    .map((day) => dayNames[day])
                    .join(", ");
                  const startDate = cls.schedule.startDate
                    ? new Date(cls.schedule.startDate).toLocaleDateString(
                        "vi-VN"
                      )
                    : "";
                  const endDate = cls.schedule.endDate
                    ? new Date(cls.schedule.endDate).toLocaleDateString("vi-VN")
                    : "";
                  return `${days} (${startDate} - ${endDate})`;
                })()
              : "Chưa có lịch",
          createdAt: cls.createdAt,
          updatedAt: cls.updatedAt,
        }));
      } else {
        // Format đầy đủ cho detail view
        formattedClasses = classes.map((cls) => {
          console.log(
            "🔍 Processing class:",
            cls.className,
            "schedule:",
            cls.schedule
          );
          return {
            _id: cls._id,
            className: cls.className,
            year: cls.year,
            grade: cls.grade,
            isAvailable: cls.isAvailable,
            feePerLesson: cls.feePerLesson,
            studentCount: cls.studentList ? cls.studentList.length : 0,
            teacher: cls.teacherId
              ? {
                  _id: cls.teacherId._id,
                  name: cls.teacherId.userId?.name || "Chưa có giáo viên",
                  email: cls.teacherId.userId?.email,
                  wagePerLesson: cls.teacherId.wagePerLesson,
                }
              : null,
            students: cls.studentList
              ? cls.studentList.map((student) => ({
                  _id: student._id,
                  name: student.userId?.name,
                  email: student.userId?.email,
                }))
              : [],
            scheduleOverview:
              cls.schedule &&
              cls.schedule.daysOfLessonInWeek &&
              Array.isArray(cls.schedule.daysOfLessonInWeek)
                ? cls.schedule.daysOfLessonInWeek.map((day) => {
                    const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
                    return {
                      dayOfWeek: day,
                      dayName: dayNames[day],
                      startDate: cls.schedule.startDate,
                      endDate: cls.schedule.endDate,
                    };
                  })
                : [],
            createdAt: cls.createdAt,
            updatedAt: cls.updatedAt,
          };
        });
      }

      return {
        classes: formattedClasses,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: classes.length,
          totalRecords: total,
        },
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy danh sách lớp học: ${error.message}`);
    }
  },

  /**
   * Lấy thống kê tổng quan các lớp học cho dashboard
   * @returns {Object} Thống kê tổng quan
   */
  async getClassesOverview() {
    try {
      const totalClasses = await Class.countDocuments();
      const activeClasses = await Class.countDocuments({ isAvailable: true });
      const inactiveClasses = totalClasses - activeClasses;

      // Thống kê theo khối
      const gradeStats = await Class.aggregate([
        {
          $group: {
            _id: "$grade",
            count: { $sum: 1 },
            totalStudents: { $sum: { $size: "$studentList" } },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // Thống kê theo năm học
      const yearStats = await Class.aggregate([
        {
          $group: {
            _id: "$year",
            count: { $sum: 1 },
            activeCount: {
              $sum: { $cond: [{ $eq: ["$isAvailable", true] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: -1 } },
      ]);

      // Thống kê teacher coverage
      const classesWithTeacher = await Class.countDocuments({
        teacherId: { $ne: null },
      });
      const classesWithoutTeacher = totalClasses - classesWithTeacher;

      return {
        totals: {
          totalClasses,
          activeClasses,
          inactiveClasses,
          classesWithTeacher,
          classesWithoutTeacher,
        },
        gradeDistribution: gradeStats,
        yearDistribution: yearStats,
        teacherCoverage: {
          covered: classesWithTeacher,
          uncovered: classesWithoutTeacher,
          coverageRate:
            totalClasses > 0
              ? Math.round((classesWithTeacher / totalClasses) * 100)
              : 0,
        },
      };
    } catch (error) {
      throw new Error(
        `Lỗi khi lấy thống kê tổng quan lớp học: ${error.message}`
      );
    }
  },

  /**
   * Cập nhật relationship giữa Class và Teacher
   * @param {Object} classData - Class object hiện tại
   * @param {String} newTeacherId - Teacher ID mới
   * @param {Object} session - MongoDB session
   */
  async updateTeacherRelationship(classData, newTeacherId, session) {
    const oldTeacherId = classData.teacherId; // Remove from old teacher
    if (oldTeacherId && oldTeacherId.toString() !== newTeacherId) {
      await this.safeUpdateTeacherClassId(
        oldTeacherId,
        classData._id,
        "remove",
        session
      );
    }

    // Add to new teacher
    if (newTeacherId && newTeacherId !== oldTeacherId?.toString()) {
      const teacher = await Teacher.findById(newTeacherId).session(session);
      if (!teacher) {
        throw new Error("Giáo viên không tồn tại");
      }

      await this.safeUpdateTeacherClassId(
        newTeacherId,
        classData._id,
        "add",
        session
      );
    }
  },

  /**
   * Cập nhật relationship giữa Class và Students
   * @param {Object} classData - Class object hiện tại
   * @param {Array} newStudentList - Student IDs mới
   * @param {Object} session - MongoDB session
   */
  async updateStudentRelationship(classData, newStudentList, session) {
    const oldStudentList = classData.studentList.map((id) => id.toString());
    const newStudentListArray = Array.isArray(newStudentList)
      ? newStudentList.map((id) => id.toString())
      : [];

    // Students to remove
    const studentsToRemove = oldStudentList.filter(
      (oldId) => !newStudentListArray.includes(oldId)
    );

    if (studentsToRemove.length > 0) {
      await Student.updateMany(
        { _id: { $in: studentsToRemove } },
        { $unset: { classId: "" } },
        { session }
      );
    }

    // Students to add
    const studentsToAdd = newStudentListArray.filter(
      (newId) => !oldStudentList.includes(newId)
    );

    if (studentsToAdd.length > 0) {
      const validStudents = await Student.find({
        _id: { $in: studentsToAdd },
      }).session(session);

      if (validStudents.length !== studentsToAdd.length) {
        throw new Error("Một số học sinh không tồn tại");
      }

      await Student.updateMany(
        { _id: { $in: studentsToAdd } },
        { $set: { classId: classData._id } },
        { session }
      );
    }
  },

  /**
   * Thêm học sinh vào lớp
   * @param {String} classId - ID của lớp học
   * @param {String} studentId - ID của học sinh
   */
  async addStudent(classId, studentId) {
    return await withTransaction(async (session) => {
      try {
        const classData = await Class.findById(classId).session(session);
        if (!classData) {
          throw new Error("Không tìm thấy lớp học");
        }

        if (!classData.isAvailable) {
          throw new Error("Lớp học không còn hoạt động");
        }

        const student = await Student.findById(studentId).session(session);
        if (!student) {
          throw new Error("Không tìm thấy học sinh");
        }

        if (classData.studentList.includes(studentId)) {
          throw new Error("Học sinh đã có trong lớp");
        }

        // Add student to class
        await Class.findByIdAndUpdate(
          classId,
          { $addToSet: { studentList: studentId } },
          { session }
        );

        // Update student's classId
        await Student.findByIdAndUpdate(
          studentId,
          { $set: { classId: classId } },
          { session }
        );

        return { message: "Thêm học sinh vào lớp thành công" };
      } catch (error) {
        throw new Error(`Lỗi khi thêm học sinh vào lớp: ${error.message}`);
      }
    });
  },

  /**
   * Xóa học sinh khỏi lớp
   * @param {String} classId - ID của lớp học
   * @param {String} studentId - ID của học sinh
   */
  async removeStudent(classId, studentId) {
    return await withTransaction(async (session) => {
      try {
        const classData = await Class.findById(classId).session(session);
        if (!classData) {
          throw new Error("Không tìm thấy lớp học");
        }

        if (!classData.studentList.includes(studentId)) {
          throw new Error("Học sinh không có trong lớp");
        }

        // Remove student from class
        await Class.findByIdAndUpdate(
          classId,
          { $pull: { studentList: studentId } },
          { session }
        );

        // Update student's classId
        await Student.findByIdAndUpdate(
          studentId,
          { $unset: { classId: "" } },
          { session }
        );

        return { message: "Xóa học sinh khỏi lớp thành công" };
      } catch (error) {
        throw new Error(`Lỗi khi xóa học sinh khỏi lớp: ${error.message}`);
      }
    });
  },

  /**
   * Thêm nhiều học sinh vào lớp cùng lúc
   * @param {String} classId - ID lớp học
   * @param {Array} studentIds - Danh sách ID học sinh
   * @returns {Object} Kết quả cập nhật
   */
  async addMultipleStudents(classId, studentIds) {
    return await withTransaction(async (session) => {
      try {
        // Kiểm tra lớp học tồn tại
        const classInfo = await Class.findById(classId).session(session);
        if (!classInfo) {
          throw new Error("Không tìm thấy lớp học");
        }

        // Kiểm tra tất cả học sinh tồn tại
        const students = await Student.find({
          _id: { $in: studentIds },
        }).session(session);

        if (students.length !== studentIds.length) {
          throw new Error("Một số học sinh không tồn tại");
        }

        // Kiểm tra học sinh nào đã có trong lớp
        const existingStudents = studentIds.filter((id) =>
          classInfo.studentList.includes(id)
        );

        if (existingStudents.length > 0) {
          throw new Error("Một số học sinh đã có trong lớp");
        }

        // Thêm học sinh vào lớp
        await Class.findByIdAndUpdate(
          classId,
          { $addToSet: { studentList: { $each: studentIds } } },
          { session }
        );

        // Cập nhật classId cho tất cả học sinh
        await Student.updateMany(
          { _id: { $in: studentIds } },
          { $set: { classId: classId } },
          { session }
        );

        return {
          message: `Thêm ${studentIds.length} học sinh vào lớp thành công`,
          addedCount: studentIds.length,
          studentIds: studentIds,
        };
      } catch (error) {
        throw new Error(`Lỗi khi thêm học sinh: ${error.message}`);
      }
    });
  },

  /**
   * Loại bỏ nhiều học sinh khỏi lớp cùng lúc
   * @param {String} classId - ID lớp học
   * @param {Array} studentIds - Danh sách ID học sinh
   * @returns {Object} Kết quả cập nhật
   */
  async removeMultipleStudents(classId, studentIds) {
    return await withTransaction(async (session) => {
      try {
        // Kiểm tra lớp học tồn tại
        const classInfo = await Class.findById(classId).session(session);
        if (!classInfo) {
          throw new Error("Không tìm thấy lớp học");
        }

        // Loại bỏ học sinh khỏi lớp
        await Class.findByIdAndUpdate(
          classId,
          { $pull: { studentList: { $in: studentIds } } },
          { session }
        );

        // Cập nhật classId cho tất cả học sinh
        await Student.updateMany(
          { _id: { $in: studentIds } },
          { $unset: { classId: 1 } },
          { session }
        );

        return {
          message: `Loại bỏ ${studentIds.length} học sinh khỏi lớp thành công`,
          removedCount: studentIds.length,
          studentIds: studentIds,
        };
      } catch (error) {
        throw new Error(`Lỗi khi loại bỏ học sinh: ${error.message}`);
      }
    });
  },

  /**
   * Lấy danh sách giáo viên available (không bị trùng lớp)
   * @param {Object} filter - Bộ lọc
   * @param {String} excludeClassId - Loại trừ lớp hiện tại
   * @returns {Array} Danh sách giáo viên available
   */
  async getAvailableTeachers(excludeClassId = null) {
    try {
      const filter = {};

      // Nếu có excludeClassId, loại trừ giáo viên đang dạy lớp đó
      if (excludeClassId) {
        filter.classId = { $ne: excludeClassId };
      }

      // Chỉ lấy giáo viên chưa có lớp hoặc có thể dạy thêm lớp
      const teachers = await Teacher.find(filter)
        .populate({
          path: "userId",
          select: "name email phoneNumber",
        })
        .populate({
          path: "classId",
          select: "className",
        })
        .sort({ createdAt: -1 });

      return teachers.map((teacher) => ({
        _id: teacher._id,
        name: teacher.userId?.name,
        email: teacher.userId?.email,
        phoneNumber: teacher.userId?.phoneNumber,
        wagePerLesson: teacher.wagePerLesson,
        currentClasses: teacher.classId ? teacher.classId.length : 0,
        classNames: teacher.classId
          ? teacher.classId.map((c) => c.className).join(", ")
          : "Chưa có lớp",
      }));
    } catch (error) {
      throw new Error(
        `Lỗi khi lấy danh sách giáo viên available: ${error.message}`
      );
    }
  },

  /**
   * Gán giáo viên cho lớp học
   * @param {String} classId - ID lớp học
   * @param {String} teacherId - ID giáo viên
   * @returns {Object} Kết quả cập nhật
   */
  async assignTeacher(classId, teacherId) {
    return await withTransaction(async (session) => {
      try {
        // Kiểm tra lớp học tồn tại
        const classInfo = await Class.findById(classId).session(session);
        if (!classInfo) {
          throw new Error("Không tìm thấy lớp học");
        }

        // Kiểm tra giáo viên tồn tại
        const teacher = await Teacher.findById(teacherId).session(session);
        if (!teacher) {
          throw new Error("Không tìm thấy giáo viên");
        } // Nếu lớp đã có giáo viên cũ, remove khỏi classId của teacher cũ
        if (classInfo.teacherId) {
          await this.safeUpdateTeacherClassId(
            classInfo.teacherId,
            classId,
            "remove",
            session
          );
        }

        // Update lớp học với giáo viên mới
        await Class.findByIdAndUpdate(
          classId,
          { teacherId: teacherId },
          { session }
        );

        // Update giáo viên với lớp mới
        await this.safeUpdateTeacherClassId(teacherId, classId, "add", session);

        return {
          message: "Gán giáo viên cho lớp thành công",
          classId: classId,
          teacherId: teacherId,
        };
      } catch (error) {
        throw new Error(`Lỗi khi gán giáo viên: ${error.message}`);
      }
    });
  },

  /**
   * Loại bỏ giáo viên khỏi lớp học
   * @param {String} classId - ID lớp học
   * @returns {Object} Kết quả cập nhật
   */
  async removeTeacher(classId) {
    return await withTransaction(async (session) => {
      try {
        // Kiểm tra lớp học tồn tại
        const classInfo = await Class.findById(classId).session(session);
        if (!classInfo) {
          throw new Error("Không tìm thấy lớp học");
        }

        if (!classInfo.teacherId) {
          throw new Error("Lớp học chưa có giáo viên");
        } // Remove lớp khỏi classId của teacher
        await this.safeUpdateTeacherClassId(
          classInfo.teacherId,
          classId,
          "remove",
          session
        );

        // Remove teacher khỏi lớp
        await Class.findByIdAndUpdate(
          classId,
          { $unset: { teacherId: 1 } },
          { session }
        );

        return {
          message: "Loại bỏ giáo viên khỏi lớp thành công",
          classId: classId,
        };
      } catch (error) {
        throw new Error(`Lỗi khi loại bỏ giáo viên: ${error.message}`);
      }
    });
  },

  /**
   * Lấy danh sách học sinh available (chưa có trong lớp này)
   * @param {String} excludeClassId - Loại trừ học sinh đã có trong lớp này
   * @returns {Array} Danh sách học sinh available
   */
  async getAvailableStudents(excludeClassId = null) {
    try {
      const filter = {};

      // Nếu có excludeClassId, loại trừ học sinh đang học lớp đó
      if (excludeClassId) {
        filter.classId = { $ne: excludeClassId };
      }

      const students = await Student.find(filter)
        .populate({
          path: "userId",
          select: "name email phoneNumber",
        })
        .populate({
          path: "parentId",
          select: "userId",
          populate: {
            path: "userId",
            select: "name phoneNumber",
          },
        })
        .populate({
          path: "classId",
          select: "className",
        })
        .sort({ createdAt: -1 });

      return students.map((student) => ({
        _id: student._id,
        name: student.userId?.name,
        email: student.userId?.email,
        phoneNumber: student.userId?.phoneNumber,
        parentName: student.parentId?.userId?.name || "Chưa có phụ huynh",
        parentPhone: student.parentId?.userId?.phoneNumber,
        currentClass: student.classId?.className || "Chưa có lớp",
        hasClass: !!student.classId,
      }));
    } catch (error) {
      throw new Error(
        `Lỗi khi lấy danh sách học sinh available: ${error.message}`
      );
    }
  },

  /**
   * Utility method để safely update classId array trong Teacher
   * @param {String} teacherId - ID giáo viên
   * @param {String} classId - ID lớp học
   * @param {String} operation - 'add' hoặc 'remove'
   * @param {Object} session - MongoDB session
   */
  async safeUpdateTeacherClassId(teacherId, classId, operation, session) {
    const teacher = await Teacher.findById(teacherId).session(session);
    if (!teacher) {
      throw new Error("Không tìm thấy giáo viên");
    }

    if (operation === "add") {
      // Nếu classId là null/undefined, khởi tạo với array mới
      if (teacher.classId === null || teacher.classId === undefined) {
        await Teacher.findByIdAndUpdate(
          teacherId,
          { $set: { classId: [classId] } },
          { session }
        );
      } else if (Array.isArray(teacher.classId)) {
        // Nếu đã là array, dùng addToSet
        await Teacher.findByIdAndUpdate(
          teacherId,
          { $addToSet: { classId: classId } },
          { session }
        );
      } else {
        // Nếu không phải array, convert thành array
        await Teacher.findByIdAndUpdate(
          teacherId,
          { $set: { classId: [teacher.classId, classId] } },
          { session }
        );
      }
    } else if (operation === "remove") {
      // Chỉ remove nếu classId là array
      if (Array.isArray(teacher.classId)) {
        await Teacher.findByIdAndUpdate(
          teacherId,
          { $pull: { classId: classId } },
          { session }
        );
      }
    }
  },

  /**
   * Lấy danh sách lớp học của một giáo viên với thống kê chi tiết
   * @param {String} teacherId - ID giáo viên
   * @returns {Array} Danh sách lớp học với stats
   */
  async getTeacherClasses(teacherId) {
    try {
      const classes = await Class.find({ teacherId })
        .populate({
          path: "studentList",
          select: "userId",
          populate: {
            path: "userId",
            select: "name email phoneNumber",
          },
        })
        .sort({ createdAt: -1 });

      // Thêm thống kê cho mỗi lớp
      const classesWithStats = await Promise.all(
        classes.map(async (cls) => {
          // Đếm số buổi học đã diễn ra
          const { Attendance } = require("../../models");
          const totalLessons = await Attendance.countDocuments({
            classId: cls._id,
          });
          const completedLessons = await Attendance.countDocuments({
            classId: cls._id,
            status: "completed",
          });

          // Tính schedule summary
          let scheduleInfo = "Chưa có lịch";
          if (cls.schedule && cls.schedule.daysOfLessonInWeek) {
            const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
            const days = cls.schedule.daysOfLessonInWeek
              .map((day) => dayNames[day])
              .join(", ");
            scheduleInfo = `${days} (${
              cls.schedule.startDate
                ? new Date(cls.schedule.startDate).toLocaleDateString("vi-VN")
                : ""
            } - ${
              cls.schedule.endDate
                ? new Date(cls.schedule.endDate).toLocaleDateString("vi-VN")
                : ""
            })`;
          }

          return {
            _id: cls._id,
            className: cls.className,
            year: cls.year,
            grade: cls.grade,
            isAvailable: cls.isAvailable,
            feePerLesson: cls.feePerLesson,
            studentCount: cls.studentList ? cls.studentList.length : 0,
            students: cls.studentList
              ? cls.studentList.map((student) => ({
                  _id: student._id,
                  name: student.userId?.name,
                  email: student.userId?.email,
                  phoneNumber: student.userId?.phoneNumber,
                }))
              : [],
            lessonStats: {
              totalPlanned: totalLessons,
              completed: completedLessons,
              remaining: Math.max(0, totalLessons - completedLessons),
            },
            schedule: cls.schedule,
            scheduleInfo,
            createdAt: cls.createdAt,
            updatedAt: cls.updatedAt,
          };
        })
      );

      return {
        totalClasses: classesWithStats.length,
        classes: classesWithStats,
        summary: {
          totalStudents: classesWithStats.reduce(
            (sum, cls) => sum + cls.studentCount,
            0
          ),
          activeClasses: classesWithStats.filter((cls) => cls.isAvailable)
            .length,
          totalLessonsCompleted: classesWithStats.reduce(
            (sum, cls) => sum + cls.lessonStats.completed,
            0
          ),
        },
      };
    } catch (error) {
      throw new Error(
        `Lỗi khi lấy danh sách lớp của giáo viên: ${error.message}`
      );
    }
  },

  /**
   * Kiểm tra quyền của teacher đối với một lớp học
   * @param {String} teacherId - ID giáo viên
   * @param {String} classId - ID lớp học
   * @returns {Boolean} Có quyền hay không
   */
  async checkTeacherClassPermission(teacherId, classId) {
    try {
      const classInfo = await Class.findById(classId);
      return (
        classInfo &&
        classInfo.teacherId &&
        classInfo.teacherId.toString() === teacherId
      );
    } catch (error) {
      return false;
    }
  },

  /**
   * Thêm học sinh vào lớp với discount percentage và tự động tạo payment records
   * @param {String} classId - ID lớp học
   * @param {Array} studentsWithDiscount - [{ studentId, discountPercentage }]
   * @returns {Object} Kết quả
   */
  async addStudentsWithDiscount(classId, studentsWithDiscount) {
    return await withTransaction(async (session) => {
      try {
        // Validate input
        if (
          !classId ||
          !Array.isArray(studentsWithDiscount) ||
          studentsWithDiscount.length === 0
        ) {
          throw new Error(
            "Thiếu thông tin: classId và danh sách học sinh với discount"
          );
        }

        // Kiểm tra class tồn tại
        const classInfo = await Class.findById(classId).session(session);
        if (!classInfo) {
          throw new Error("Lớp học không tồn tại");
        }

        if (!classInfo.isAvailable) {
          throw new Error("Lớp học không còn hoạt động");
        }

        const results = [];
        const { Payment } = require("../../models");

        for (const studentData of studentsWithDiscount) {
          const { studentId, discountPercentage = 0 } = studentData;

          if (!studentId) {
            throw new Error("Thiếu studentId");
          }

          // Validate discount percentage
          if (discountPercentage < 0 || discountPercentage > 100) {
            throw new Error(
              `Discount percentage phải từ 0-100%, nhận được: ${discountPercentage}%`
            );
          }

          // Kiểm tra student tồn tại
          const student = await Student.findById(studentId).session(session);
          if (!student) {
            throw new Error(`Học sinh ${studentId} không tồn tại`);
          }

          // Kiểm tra student đã có trong lớp chưa
          const isAlreadyInClass = classInfo.studentList.some(
            (id) => id.toString() === studentId.toString()
          );

          let action = "";

          if (!isAlreadyInClass) {
            // Thêm student vào class
            await Class.findByIdAndUpdate(
              classId,
              { $addToSet: { studentList: studentId } },
              { session }
            );

            // Update student's classId array
            await Student.findByIdAndUpdate(
              studentId,
              { $addToSet: { classId: classId } },
              { session }
            );

            action = "added";
          } else {
            action = "already_in_class";
          }

          // 🔥 TỰ ĐỘNG TẠO PAYMENT RECORDS cho toàn bộ khóa học
          const paymentResults = await this.createPaymentRecordsForStudent(
            classId,
            studentId,
            discountPercentage,
            session
          );

          results.push({
            studentId,
            studentName: student.userId?.name || "Unknown",
            discountPercentage,
            action,
            paymentsCreated: paymentResults.length,
            paymentMonths: paymentResults.map((p) => `${p.month}/${p.year}`),
          });
        }

        return {
          classId,
          className: classInfo.className,
          studentsProcessed: results.length,
          results,
          summary: {
            added: results.filter((r) => r.action === "added").length,
            alreadyExists: results.filter(
              (r) => r.action === "already_in_class"
            ).length,
            totalPaymentsCreated: results.reduce(
              (sum, r) => sum + r.paymentsCreated,
              0
            ),
          },
        };
      } catch (error) {
        throw new Error(`Lỗi khi thêm học sinh với discount: ${error.message}`);
      }
    });
  },

  /**
   * Tạo payment records cho student trong suốt khóa học
   * @param {String} classId
   * @param {String} studentId
   * @param {Number} discountPercentage
   * @param {Object} session
   * @returns {Array} Payment records đã tạo
   */
  async createPaymentRecordsForStudent(
    classId,
    studentId,
    discountPercentage,
    session
  ) {
    try {
      const { Payment } = require("../../models");

      const classInfo = await Class.findById(classId).session(session);
      if (!classInfo || !classInfo.schedule) {
        throw new Error("Lớp học không có thông tin lịch học");
      }

      const { startDate, endDate } = classInfo.schedule;
      if (!startDate || !endDate) {
        throw new Error("Lớp học chưa có ngày bắt đầu/kết thúc");
      }

      // Tính các tháng trong khóa học
      const startMonth = new Date(startDate).getMonth() + 1;
      const startYear = new Date(startDate).getFullYear();
      const endMonth = new Date(endDate).getMonth() + 1;
      const endYear = new Date(endDate).getFullYear();

      const paymentRecords = [];
      let currentMonth = startMonth;
      let currentYear = startYear;

      // Tạo payment cho từng tháng
      while (
        currentYear < endYear ||
        (currentYear === endYear && currentMonth <= endMonth)
      ) {
        // Kiểm tra đã có payment record chưa
        const existingPayment = await Payment.findOne({
          studentId,
          classId,
          month: currentMonth,
          year: currentYear,
        }).session(session);

        if (!existingPayment) {
          // Ước tính số buổi học trong tháng
          const estimatedLessons = this.estimateLessonsInMonth(
            classInfo.schedule,
            currentMonth,
            currentYear
          );

          // Tính toán amounts
          const baseAmount = estimatedLessons * (classInfo.feePerLesson || 0);
          const discountAmount = (baseAmount * discountPercentage) / 100;
          const finalAmount = baseAmount - discountAmount;

          const paymentData = {
            studentId,
            classId,
            month: currentMonth,
            year: currentYear,
            totalLessons: estimatedLessons,
            attendedLessons: 0, // Sẽ được cập nhật từ attendance
            absentLessons: 0,
            discountPercentage,
            originalAmount: baseAmount,
            afterDiscountAmount: finalAmount,
            amountDue: finalAmount,
            amountPaid: 0,
            paymentHistory: [],
          };

          const payment = await Payment.create([paymentData], { session });
          paymentRecords.push(payment[0]);
        }

        // Chuyển sang tháng tiếp theo
        currentMonth++;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
      }

      console.log(
        `✅ Created ${paymentRecords.length} payment records for student ${studentId} in class ${classId}`
      );
      return paymentRecords;
    } catch (error) {
      throw new Error(`Lỗi khi tạo payment records: ${error.message}`);
    }
  },

  /**
   * Ước tính số buổi học trong tháng dựa trên class schedule
   * @param {Object} schedule - Class schedule
   * @param {Number} month - Tháng (1-12)
   * @param {Number} year - Năm
   * @returns {Number} Số buổi học ước tính
   */
  estimateLessonsInMonth(schedule, month, year) {
    try {
      const { daysOfLessonInWeek } = schedule;
      if (!daysOfLessonInWeek || daysOfLessonInWeek.length === 0) {
        return 4; // Default fallback: 4 buổi/tháng
      }

      // Đếm số ngày học trong tháng
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);
      let lessonCount = 0;

      for (
        let date = new Date(firstDay);
        date <= lastDay;
        date.setDate(date.getDate() + 1)
      ) {
        const dayOfWeek = date.getDay();
        if (daysOfLessonInWeek.includes(dayOfWeek)) {
          lessonCount++;
        }
      }

      return lessonCount > 0 ? lessonCount : 4; // Fallback nếu không tính được
    } catch (error) {
      console.error("Error estimating lessons:", error);
      return 4; // Default fallback: 4 buổi/tháng
    }
  },
};

module.exports = classService;
