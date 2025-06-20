const {
  Attendance,
  Class,
  Student,
  Payment,
  TeacherWage,
} = require("../../models");
const withTransaction = require("../../utils/session");

const attendanceService = {
  /**
   * Tạo buổi điểm danh mới (chỉ tạo record, chưa update Payment/TeacherWage)
   * @param {Object} attendanceData - Dữ liệu điểm danh
   * @returns {Object} Attendance đã được tạo   * @note Payment và TeacherWage sẽ được update khi gọi markClassAttendance()
   */ async create(attendanceData) {
    return await withTransaction(async (session) => {
      try {
        const { classId, date, lessonNumber } = attendanceData;

        if (!classId || !date) {
          throw new Error("Thiếu thông tin bắt buộc: classId, date");
        }

        // Validate class exists and is available
        const classData = await Class.findById(classId)
          .populate("studentList")
          .populate("teacherId")
          .session(session);

        if (!classData) {
          throw new Error("Không tìm thấy lớp học");
        }

        if (!classData.isAvailable) {
          throw new Error("Lớp học không còn hoạt động");
        }

        // Validate attendance date matches class schedule
        await this.validateAttendanceDate(
          classData,
          this.parseDateSafely(date)
        ); // Check if attendance already exists for this date
        const attendanceDate = this.parseDateSafely(date);
        const startOfDay = new Date(attendanceDate.getTime());
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(attendanceDate.getTime());
        endOfDay.setHours(23, 59, 59, 999);

        const existingAttendance = await Attendance.findOne({
          classId,
          date: {
            $gte: startOfDay,
            $lte: endOfDay,
          },
        }).session(session);
        if (existingAttendance) {
          throw new Error("Đã có điểm danh cho ngày này");
        }

        // Create attendance record with all students present by default
        const attendanceRecord = {
          classId,
          date: this.parseDateSafely(date),
          lessonNumber: lessonNumber || 1,
          students: classData.studentList.map((student) => ({
            studentId: student._id,
            isAbsent: false,
          })),
        };
        const attendance = await Attendance.create([attendanceRecord], {
          session,
        });

        // NOTE: Payment và TeacherWage sẽ được update khi thực hiện điểm danh (markClassAttendance)
        // Không update ở đây để tránh duplicate và cho phép flexible workflow

        return attendance[0];
      } catch (error) {
        throw new Error(`Lỗi khi tạo điểm danh: ${error.message}`);
      }
    });
  },

  /**
   * Lấy thông tin điểm danh theo ID
   * @param {String} attendanceId - ID của điểm danh
   * @returns {Object} Thông tin điểm danh đầy đủ
   */
  async getById(attendanceId) {
    try {
      if (!attendanceId) {
        throw new Error("Thiếu thông tin bắt buộc: attendanceId");
      }

      const attendance = await Attendance.findById(attendanceId)
        .populate({
          path: "classId",
          select: "className grade year",
        })
        .populate({
          path: "students.studentId",
          select: "userId",
          populate: {
            path: "userId",
            select: "name email",
          },
        });

      if (!attendance) {
        throw new Error("Không tìm thấy điểm danh");
      }

      return attendance;
    } catch (error) {
      throw new Error(`Lỗi khi lấy thông tin điểm danh: ${error.message}`);
    }
  },

  /**
   * Cập nhật điểm danh
   * @deprecated Hàm này đã được thay thế bởi markClassAttendance()
   * @note Không khuyến khích sử dụng vì duplicate logic với markClassAttendance
   * @param {String} attendanceId - ID của điểm danh
   * @param {Object} updateData - Dữ liệu cập nhật
   * @returns {Object} Điểm danh đã được cập nhật
   */
  /*
  async update(attendanceId, updateData) {
    return await withTransaction(async (session) => {
      try {
        if (!attendanceId || !updateData) {
          throw new Error(
            "Thiếu thông tin bắt buộc: attendanceId hoặc updateData"
          );
        }

        const attendance = await Attendance.findById(attendanceId).session(
          session
        );
        if (!attendance) {
          throw new Error("Không tìm thấy điểm danh");
        } // Filter allowed update fields (only students to prevent data inconsistency)
        const allowedFields = ["students"]; // Only allow updating students attendance
        const updateFields = Object.keys(updateData)
          .filter((key) => allowedFields.includes(key))
          .reduce((obj, key) => {
            obj[key] = updateData[key];
            return obj;
          }, {});

        // Require students field for update
        if (!updateFields.students) {
          throw new Error("Chỉ cho phép cập nhật thông tin điểm danh học sinh");
        }

        // Validate students array is not empty
        if (
          !Array.isArray(updateFields.students) ||
          updateFields.students.length === 0
        ) {
          throw new Error("Danh sách điểm danh học sinh không được rỗng");
        }

        // If updating students attendance, need to sync Payment records
        if (updateFields.students) {
          await this.validateStudentsData(
            attendance.classId,
            updateFields.students,
            session
          );

          // Get class data for Payment sync
          const classData = await Class.findById(attendance.classId)
            .populate("studentList")
            .session(session);

          // Compare old vs new attendance status and update Payment records
          for (const newStudentData of updateFields.students) {
            const oldStudentData = attendance.students.find(
              (s) => s.studentId.toString() === newStudentData.studentId
            ); // If attendance status changed, update Payment record
            if (
              oldStudentData &&
              oldStudentData.isAbsent !== newStudentData.isAbsent
            ) {
              // updatePaymentRecord already handles status changes internally
              await this.updatePaymentRecord(
                newStudentData.studentId,
                attendance.classId,
                attendance.date,
                newStudentData.isAbsent,
                session
              );
            }
          }
        }

        const updatedAttendance = await Attendance.findByIdAndUpdate(
          attendanceId,
          { $set: updateFields },
          { new: true, runValidators: true, session }
        );

        return updatedAttendance;
      } catch (error) {
        throw new Error(`Lỗi khi cập nhật điểm danh: ${error.message}`);
      }
    });
  },
  */

  /**
   * Xóa điểm danh
   * @param {String} attendanceId - ID của điểm danh
   */
  async delete(attendanceId) {
    return await withTransaction(async (session) => {
      try {
        if (!attendanceId) {
          throw new Error("Thiếu thông tin bắt buộc: attendanceId");
        }

        const attendance = await Attendance.findById(attendanceId).session(
          session
        );
        if (!attendance) {
          throw new Error("Không tìm thấy điểm danh");
        }

        await Attendance.findByIdAndDelete(attendanceId).session(session);

        return { message: "Xóa điểm danh thành công" };
      } catch (error) {
        throw new Error(`Lỗi khi xóa điểm danh: ${error.message}`);
      }
    });
  },

  /**
   * Lấy danh sách tất cả điểm danh
   * @param {Object} filter - Bộ lọc (optional)
   * @param {Object} options - Tùy chọn pagination, sort (optional)
   * @returns {Array} Danh sách điểm danh
   */
  async getAll(filter = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sort = { date: -1 },
        populate = true,
      } = options;

      const skip = (page - 1) * limit;

      let query = Attendance.find(filter).skip(skip).limit(limit).sort(sort);

      if (populate) {
        query = query
          .populate({
            path: "classId",
            select: "className grade year",
          })
          .populate({
            path: "students.studentId",
            select: "userId",
            populate: {
              path: "userId",
              select: "name email",
            },
          });
      }

      const attendances = await query;
      const total = await Attendance.countDocuments(filter);

      return {
        attendances,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: attendances.length,
          totalRecords: total,
        },
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy danh sách điểm danh: ${error.message}`);
    }
  },

  /**
   * Lấy điểm danh theo lớp học
   * @param {String} classId - ID của lớp học
   * @param {Object} options - Tùy chọn filter và pagination
   * @returns {Array} Danh sách điểm danh của lớp
   */
  async getByClass(classId, options = {}) {
    try {
      if (!classId) {
        throw new Error("Thiếu thông tin bắt buộc: classId");
      }

      const filter = { classId };

      // Add date range filter if provided
      if (options.startDate || options.endDate) {
        filter.date = {};
        if (options.startDate) {
          filter.date.$gte = new Date(options.startDate);
        }
        if (options.endDate) {
          filter.date.$lte = new Date(options.endDate);
        }
      }

      return await this.getAll(filter, options);
    } catch (error) {
      throw new Error(`Lỗi khi lấy điểm danh theo lớp học: ${error.message}`);
    }
  },

  /**
   * Lấy thống kê điểm danh của lớp
   * @param {String} classId - ID của lớp học
   * @returns {Object} Thống kê điểm danh
   */
  async getClassAttendanceStats(classId) {
    try {
      if (!classId) {
        throw new Error("Thiếu thông tin bắt buộc: classId");
      }

      const attendances = await Attendance.find({ classId });

      if (attendances.length === 0) {
        return {
          totalLessons: 0,
          totalStudents: 0,
          attendanceRate: "0%",
          studentStats: [],
        };
      }

      const totalLessons = attendances.length;
      const allStudents = new Set();
      const studentAttendance = {};

      // Collect all student attendance data
      attendances.forEach((attendance) => {
        attendance.students.forEach((student) => {
          const studentId = student.studentId.toString();
          allStudents.add(studentId);

          if (!studentAttendance[studentId]) {
            studentAttendance[studentId] = {
              totalLessons: 0,
              absentLessons: 0,
            };
          }

          studentAttendance[studentId].totalLessons++;
          if (student.isAbsent) {
            studentAttendance[studentId].absentLessons++;
          }
        });
      });

      // Calculate stats for each student
      const studentStats = [];
      let totalAttendanceRate = 0;

      for (const studentId of allStudents) {
        const stats = studentAttendance[studentId];
        const attendedLessons = stats.totalLessons - stats.absentLessons;
        const attendanceRate = (attendedLessons / stats.totalLessons) * 100;

        studentStats.push({
          studentId,
          totalLessons: stats.totalLessons,
          attendedLessons,
          absentLessons: stats.absentLessons,
          attendanceRate: attendanceRate.toFixed(2) + "%",
        });

        totalAttendanceRate += attendanceRate;
      }

      const overallAttendanceRate = totalAttendanceRate / allStudents.size;

      return {
        totalLessons,
        totalStudents: allStudents.size,
        attendanceRate: overallAttendanceRate.toFixed(2) + "%",
        studentStats,
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy thống kê điểm danh: ${error.message}`);
    }
  },
  /**
   * Cập nhật điểm danh cho học sinh cụ thể
   * @param {String} attendanceId - ID của điểm danh
   * @param {String} studentId - ID của học sinh
   * @param {Object} studentData - Dữ liệu điểm danh của học sinh
   */
  async updateStudentAttendance(attendanceId, studentId, studentData) {
    return await withTransaction(async (session) => {
      try {
        const attendance = await Attendance.findById(attendanceId)
          .populate("classId")
          .session(session);

        if (!attendance) {
          throw new Error("Không tìm thấy điểm danh");
        }

        // Validate attendance date matches class schedule
        await this.validateAttendanceDate(attendance.classId, attendance.date);

        const studentIndex = attendance.students.findIndex(
          (s) => s.studentId.toString() === studentId
        );

        if (studentIndex === -1) {
          throw new Error("Học sinh không có trong danh sách điểm danh");
        }

        const previousAttendanceStatus =
          attendance.students[studentIndex].isAbsent;

        // Update student attendance data
        attendance.students[studentIndex] = {
          ...attendance.students[studentIndex],
          ...studentData,
        };

        await attendance.save({ session });

        // Update payment records if attendance status changed
        if (previousAttendanceStatus !== studentData.isAbsent) {
          await this.updatePaymentRecord(
            studentId,
            attendance.classId._id,
            attendance.date,
            studentData.isAbsent,
            session
          );
        }

        // Update teacher wage record
        await this.updateTeacherWageRecord(
          attendance.classId.teacherId,
          attendance.classId._id,
          attendance.date,
          session
        );

        return attendance;
      } catch (error) {
        throw new Error(
          `Lỗi khi cập nhật điểm danh học sinh: ${error.message}`
        );
      }
    });
  },
  /**
   * Validate students data
   * @param {String} classId - ID của lớp học
   * @param {Array} studentsData - Dữ liệu học sinh
   * @param {Object} session - MongoDB session
   */
  async validateStudentsData(classId, studentsData, session) {
    const classData = await Class.findById(classId)
      .populate("studentList")
      .session(session);

    if (!classData) {
      throw new Error("Không tìm thấy lớp học");
    }

    const classStudentIds = classData.studentList.map((s) => s._id.toString());
    const attendanceStudentIds = studentsData.map((s) => s.studentId);

    // Check if all students in attendance data belong to the class
    const invalidStudents = attendanceStudentIds.filter(
      (id) => !classStudentIds.includes(id)
    );

    if (invalidStudents.length > 0) {
      throw new Error(
        `Một số học sinh không thuộc lớp học này: ${invalidStudents.join(", ")}`
      );
    }
  },
  /**
   * Validate attendance date matches class schedule
   * @param {Object} classData - Class data
   * @param {Date} attendanceDate - Date of attendance
   */ async validateAttendanceDate(classData, attendanceDate) {
    if (!classData.schedule) {
      return; // Skip validation if no schedule is set
    }

    const { startDate, endDate, daysOfLessonInWeek } = classData.schedule;

    const attendanceDateOnly = new Date(
      Date.UTC(
        attendanceDate.getUTCFullYear(),
        attendanceDate.getUTCMonth(),
        attendanceDate.getUTCDate()
      )
    );

    // Check if attendance date is within class schedule period
    if (startDate) {
      const classStartDateParsed = this.parseDateSafely(startDate);
      const startDateOnly = new Date(
        Date.UTC(
          classStartDateParsed.getUTCFullYear(),
          classStartDateParsed.getUTCMonth(),
          classStartDateParsed.getUTCDate()
        )
      );

      if (attendanceDateOnly.getTime() < startDateOnly.getTime()) {
        throw new Error(
          `Ngày điểm danh không thể trước ngày bắt đầu lớp học. Điểm danh: ${
            attendanceDateOnly.toISOString().split("T")[0]
          }, Bắt đầu: ${startDateOnly.toISOString().split("T")[0]}`
        );
      }
    }
    if (endDate) {
      const classEndDateParsed = this.parseDateSafely(endDate);
      const endDateOnly = new Date(
        Date.UTC(
          classEndDateParsed.getUTCFullYear(),
          classEndDateParsed.getUTCMonth(),
          classEndDateParsed.getUTCDate()
        )
      );

      if (attendanceDateOnly.getTime() > endDateOnly.getTime()) {
        throw new Error(
          `Ngày điểm danh không thể sau ngày kết thúc lớp học. Điểm danh: ${
            attendanceDateOnly.toISOString().split("T")[0]
          }, Kết thúc: ${endDateOnly.toISOString().split("T")[0]}`
        );
      }
    } // Check if attendance date matches class schedule days
    if (daysOfLessonInWeek && daysOfLessonInWeek.length > 0) {
      const dayOfWeek = attendanceDate.getUTCDay(); // 0 = Sunday, 1 = Monday, ...

      if (!daysOfLessonInWeek.includes(dayOfWeek)) {
        const dayNames = [
          "Chủ nhật",
          "Thứ hai",
          "Thứ ba",
          "Thứ tư",
          "Thứ năm",
          "Thứ sáu",
          "Thứ bảy",
        ];
        throw new Error(
          `Ngày điểm danh (${dayNames[dayOfWeek]}) không khớp với lịch học của lớp`
        );
      }
    }
  },

  /**
   * Update payment record when attendance is marked
   * @param {String} studentId - ID của học sinh
   * @param {String} classId - ID của lớp học
   * @param {Date} attendanceDate - Ngày điểm danh
   * @param {Boolean} isAbsent - Trạng thái vắng mặt
   * @param {Object} session - MongoDB session
   */
  async updatePaymentRecord(
    studentId,
    classId,
    attendanceDate,
    isAbsent,
    session
  ) {
    try {
      const month = attendanceDate.getMonth() + 1;
      const year = attendanceDate.getFullYear();

      // Find or create payment record for this month
      let payment = await Payment.findOne({
        studentId,
        classId,
        month,
        year,
      }).session(session);

      if (!payment) {
        // Create new payment record if it doesn't exist
        const classData = await Class.findById(classId).session(session);
        payment = new Payment({
          studentId,
          classId,
          month,
          year,
          originalAmount: classData.feePerLesson || 0,
          afterDiscountAmount: classData.feePerLesson || 0,
          amountDue: classData.feePerLesson || 0,
          totalLessons: 0,
          attendedLessons: 0,
          absentLessons: 0,
        });
      }

      // Update attendance counters based on new status
      if (isAbsent) {
        payment.absentLessons += 1;
        // Decrease attended lessons if previously marked as present
        if (payment.attendedLessons > 0) {
          payment.attendedLessons -= 1;
        }
      } else {
        payment.attendedLessons += 1;
        // Decrease absent lessons if previously marked as absent
        if (payment.absentLessons > 0) {
          payment.absentLessons -= 1;
        }
      }

      // Update total lessons
      payment.totalLessons = payment.attendedLessons + payment.absentLessons;

      await payment.save({ session });

      return payment;
    } catch (error) {
      throw new Error(`Lỗi khi cập nhật bản ghi thanh toán: ${error.message}`);
    }
  },

  /**
   * Update teacher wage record when attendance is marked
   * @param {String} teacherId - ID của giáo viên
   * @param {String} classId - ID của lớp học
   * @param {Date} attendanceDate - Ngày điểm danh
   * @param {Object} session - MongoDB session
   */
  async updateTeacherWageRecord(teacherId, classId, attendanceDate, session) {
    try {
      if (!teacherId) {
        return; // Skip if no teacher assigned
      }

      const month = attendanceDate.getMonth() + 1;
      const year = attendanceDate.getFullYear();

      // Find or create teacher wage record for this month
      let teacherWage = await TeacherWage.findOne({
        teacherId,
        classId,
        month,
        year,
      }).session(session);

      if (!teacherWage) {
        // Create new wage record if it doesn't exist
        const classData = await Class.findById(classId).session(session);
        teacherWage = new TeacherWage({
          teacherId,
          classId,
          month,
          year,
          amount: classData.feePerLesson || 0, // Base wage per lesson
          lessonTaught: 0,
        });
      }

      // Increment lessons taught (each attendance session counts as one lesson)
      teacherWage.lessonTaught += 1;

      await teacherWage.save({ session });

      return teacherWage;
    } catch (error) {
      throw new Error(
        `Lỗi khi cập nhật bản ghi lương giáo viên: ${error.message}`
      );
    }
  },
  /**   * Thực hiện điểm danh cho lớp học (tạo mới nếu chưa có, cập nhật Payment và TeacherWage)
   * @param {String} classId - ID của lớp học
   * @param {Date} date - Ngày điểm danh
   * @param {Array} studentsAttendance - Danh sách điểm danh học sinh
   * @param {Number} lessonNumber - Số buổi học
   * @returns {Object} Attendance record đã được tạo/cập nhật
   * @note Hàm này sẽ auto-update Payment records và TeacherWage records
   */
  async markClassAttendance(
    classId,
    date,
    studentsAttendance,
    lessonNumber = 1
  ) {
    return await withTransaction(async (session) => {
      try {
        if (!classId || !date || !studentsAttendance) {
          throw new Error(
            "Thiếu thông tin bắt buộc: classId, date, studentsAttendance"
          );
        }

        // Validate studentsAttendance is not empty
        if (
          !Array.isArray(studentsAttendance) ||
          studentsAttendance.length === 0
        ) {
          throw new Error("Danh sách điểm danh học sinh không được rỗng");
        }

        // Validate class exists and is available
        const classData = await Class.findById(classId)
          .populate("studentList")
          .populate("teacherId")
          .session(session);

        if (!classData) {
          throw new Error("Không tìm thấy lớp học");
        }

        if (!classData.isAvailable) {
          throw new Error("Lớp học không còn hoạt động");
        } // Validate attendance date matches class schedule
        await this.validateAttendanceDate(
          classData,
          this.parseDateSafely(date)
        );

        // Check if attendance already exists for this date
        const attendanceDate = this.parseDateSafely(date);
        const startOfDay = new Date(attendanceDate.getTime());
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(attendanceDate.getTime());
        endOfDay.setHours(23, 59, 59, 999);

        let attendance = await Attendance.findOne({
          classId,
          date: {
            $gte: startOfDay,
            $lte: endOfDay,
          },
        }).session(session);

        const isNewAttendance = !attendance;
        if (!attendance) {
          // Create new attendance record
          attendance = new Attendance({
            classId,
            date: this.parseDateSafely(date),
            lessonNumber,
            students: [],
          });
        } // Update attendance for each student
        for (const studentAttendance of studentsAttendance) {
          const { studentId, isAbsent = false } = studentAttendance;

          // Validate student belongs to class
          const studentInClass = classData.studentList.find(
            (s) => s._id.toString() === studentId
          );
          if (!studentInClass) {
            throw new Error(`Học sinh ${studentId} không thuộc lớp học này`);
          }

          const existingStudentIndex = attendance.students.findIndex(
            (s) => s.studentId.toString() === studentId
          );

          const previousAttendanceStatus =
            existingStudentIndex >= 0
              ? attendance.students[existingStudentIndex].isAbsent
              : null;
          if (existingStudentIndex >= 0) {
            // Update existing student record
            attendance.students[existingStudentIndex].isAbsent = isAbsent;
          } else {
            // Add new student record
            attendance.students.push({
              studentId,
              isAbsent,
            });
          } // Update payment record if attendance status changed or new attendance
          if (isNewAttendance || previousAttendanceStatus !== isAbsent) {
            await this.updatePaymentRecord(
              studentId,
              classId,
              this.parseDateSafely(date),
              isAbsent,
              session
            );
          }
        }
        await attendance.save({ session });

        // Update teacher wage record (only for new attendance sessions)
        if (classData.teacherId && isNewAttendance) {
          await this.updateTeacherWageRecord(
            classData.teacherId._id,
            classId,
            this.parseDateSafely(date),
            session
          );
        }

        return attendance.populate([
          {
            path: "classId",
            select: "className grade year",
          },
          {
            path: "students.studentId",
            select: "userId",
            populate: {
              path: "userId",
              select: "name email",
            },
          },
        ]);
      } catch (error) {
        throw new Error(`Lỗi khi điểm danh lớp học: ${error.message}`);
      }
    });
  },

  /**
   * Get attendance summary for teacher's classes
   * @param {String} teacherId - ID của giáo viên
   * @param {Object} options - Filter và pagination options
   * @returns {Object} Attendance summary
   */
  async getTeacherAttendanceSummary(teacherId, options = {}) {
    try {
      const { month, year, page = 1, limit = 10 } = options;

      // Find all classes taught by this teacher
      const classes = await Class.find({ teacherId, isAvailable: true }).select(
        "_id className grade year"
      );

      if (classes.length === 0) {
        return {
          classes: [],
          attendances: [],
          summary: {
            totalClasses: 0,
            totalSessions: 0,
            totalStudents: 0,
            averageAttendanceRate: 0,
          },
          pagination: {
            page: 1,
            totalPages: 0,
            totalCount: 0,
            hasNext: false,
            hasPrev: false,
          },
        };
      }

      const classIds = classes.map((c) => c._id);

      // Build date filter
      let dateFilter = {};
      if (month && year) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        dateFilter = {
          date: {
            $gte: startDate,
            $lte: endDate,
          },
        };
      }

      // Get attendance records
      const skip = (page - 1) * limit;
      const attendances = await Attendance.find({
        classId: { $in: classIds },
        ...dateFilter,
      })
        .populate({
          path: "classId",
          select: "className grade year",
        })
        .populate({
          path: "students.studentId",
          select: "userId",
          populate: {
            path: "userId",
            select: "name",
          },
        })
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit);

      const totalCount = await Attendance.countDocuments({
        classId: { $in: classIds },
        ...dateFilter,
      });

      // Calculate summary statistics
      const allAttendances = await Attendance.find({
        classId: { $in: classIds },
        ...dateFilter,
      });

      let totalStudents = 0;
      let totalPresent = 0;
      let totalSessions = allAttendances.length;

      allAttendances.forEach((attendance) => {
        totalStudents += attendance.students.length;
        totalPresent += attendance.students.filter((s) => !s.isAbsent).length;
      });

      const averageAttendanceRate =
        totalStudents > 0
          ? ((totalPresent / totalStudents) * 100).toFixed(2)
          : 0;

      return {
        classes: classes,
        attendances: attendances,
        summary: {
          totalClasses: classes.length,
          totalSessions: totalSessions,
          totalStudents: totalStudents,
          totalPresent: totalPresent,
          averageAttendanceRate: parseFloat(averageAttendanceRate),
        },
        pagination: {
          page: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount: totalCount,
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      throw new Error(
        `Lỗi khi lấy tổng quan điểm danh giáo viên: ${error.message}`
      );
    }
  },

  /**
   * Helper function to parse date safely regardless of timezone
   * @param {String|Date} dateInput - Date input
   * @returns {Date} Parsed date
   */
  parseDateSafely(dateInput) {
    if (!dateInput) return null;

    // If already a Date object
    if (dateInput instanceof Date) {
      return dateInput;
    }

    // If string, try different parsing methods
    let date; // Try parsing common formats
    if (typeof dateInput === "string") {
      // Format: "2025/08/11" or "2025-08-11"
      if (dateInput.match(/^\d{4}[/-]\d{2}[/-]\d{2}$/)) {
        const parts = dateInput.split(/[/-]/);
        // Create date in UTC to avoid timezone issues
        date = new Date(
          Date.UTC(
            parseInt(parts[0]),
            parseInt(parts[1]) - 1,
            parseInt(parts[2])
          )
        );
      } else {
        // Use standard Date parsing
        date = new Date(dateInput);
      }
    } else {
      date = new Date(dateInput);
    }

    return date;
  },
};

module.exports = attendanceService;
