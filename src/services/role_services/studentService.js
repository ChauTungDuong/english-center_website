const { Student, Parent, Class, Attendance } = require("../../models");
const userService = require("./userService");
const studentParentRelationshipService = require("../relationship_services/studentParentRelationshipService");

const { userUpdateFields, studentUpdateFields } = require("./updateFields");
const withTransaction = require("../../utils/session");
const studentService = {
  async create(studentData) {
    return await withTransaction(async (session) => {
      try {
        const userFields = userUpdateFields(studentData);
        if (!userFields.email || !userFields.passwordBeforeHash) {
          throw new Error("Thiếu thông tin bắt buộc: email hoặc password");
        }
        const studentFields = studentUpdateFields(studentData);
        const user = await userService.create(userFields, "Student", session);
        if (user.role !== "Student") {
          throw new Error("Vai trò không hợp lệ");
        }

        // Tạo student với classId là mảng rỗng - sẽ sử dụng API /enroll sau để đăng ký lớp
        // Không nên thiết lập parentId ở đây mà nên sử dụng API /student/:id/parent sau
        const student = await Student.create(
          [
            {
              userId: user._id,
              classId: [], // Luôn là array rỗng khi tạo mới, sử dụng API /enroll để thêm lớp sau
              parentId: null, // Không thiết lập parentId khi tạo mới, sử dụng API /student/:id/parent để cập nhật sau
            },
          ],
          { session }
        );

        // Cập nhật mối quan hệ với parent nếu được chỉ định
        if (studentFields.parentId) {
          // Sử dụng service chuyên biệt để cập nhật mối quan hệ
          await studentParentRelationshipService.updateStudentParentRelationship(
            student[0]._id,
            studentFields.parentId,
            session
          );

          // Trả về student đã tạo với populate cơ bản
          const createdStudent = await Student.findById(student[0]._id)
            .session(session)
            .populate({
              path: "userId",
              select: "name email gender phoneNumber address role isActive",
            })
            .populate({
              path: "parentId",
              select: "userId canSeeTeacher",
              populate: {
                path: "userId",
                select: "name email phoneNumber",
              },
            });

          return createdStudent;
        }

        return student[0];
      } catch (error) {
        throw new Error(`Lỗi khi tạo học sinh: ${error.message}`);
      }
    });
  },
  async update(studentId, updateData) {
    return await withTransaction(async (session) => {
      try {
        if (!studentId || !updateData) {
          throw new Error(
            "Thiếu thông tin bắt buộc: studentId hoặc updateData"
          );
        }
        if (updateData.userId) {
          throw new Error("Không thể cập nhật userId của học sinh");
        }
        const userFields = userUpdateFields(updateData);
        const studentFields = studentUpdateFields(updateData);

        const student = await Student.findById(studentId).session(session);
        if (!student) {
          throw new Error("Không tìm thấy học sinh");
        }
        if (Object.keys(userFields).length > 0) {
          await userService.update(student.userId, userFields, session);
        }

        if (
          studentFields.parentId !== undefined &&
          studentFields.parentId !== student.parentId?.toString()
        ) {
          // Sử dụng service chuyên biệt để cập nhật mối quan hệ
          await studentParentRelationshipService.updateStudentParentRelationship(
            studentId,
            studentFields.parentId,
            session
          );
        } // ❌ REMOVED: classId handling - use specialized APIs instead
        // Use POST /students/{id}/enroll or POST /students/{id}/withdraw

        if (Object.keys(studentFields).length > 0) {
          await Student.findByIdAndUpdate(
            studentId,
            { $set: studentFields },
            { new: true, runValidators: true, session }
          );
        }

        // Trả về thông tin học sinh đã được cập nhật
        return await this.getById(studentId);
      } catch (error) {
        throw new Error(`Lỗi khi cập nhật học sinh: ${error.message}`);
      }
    });
  },
  async delete(studentId) {
    return await withTransaction(async (session) => {
      try {
        if (!studentId) {
          throw new Error("Thiếu thông tin bắt buộc: studentId");
        }
        const student = await Student.findById(studentId).session(session);
        if (!student) {
          throw new Error("Không có học sinh này / học sinh đã bị xóa");
        }
        const userId = student.userId;

        if (student.classId && student.classId.length > 0) {
          await Class.updateMany(
            { _id: { $in: student.classId } },
            { $pull: { studentList: student._id } },
            { session }
          );
        }
        if (student.parentId) {
          await Parent.findByIdAndUpdate(
            student.parentId,
            { $pull: { childId: student._id } },
            { session }
          );
        }
        await Student.findByIdAndDelete(studentId).session(session);
        await userService.delete(userId).session(session);
      } catch (error) {
        throw new Error(`Lỗi khi xóa học sinh: ${error.message}`);
      }
    });
  },
  async getById(studentId) {
    try {
      if (!studentId) {
        throw new Error("Thiếu thông tin bắt buộc: studentId");
      }

      // Lấy thông tin cơ bản của học sinh với populate đầy đủ
      const student = await Student.findById(studentId)
        .populate({
          path: "userId",
          select: "name email gender phoneNumber address role isActive",
        })
        .populate({
          path: "classId",
          select: "className grade year feePerLesson isAvailable schedule",
          populate: {
            path: "teacherId",
            select: "userId wagePerLesson",
            populate: {
              path: "userId",
              select: "name email phoneNumber isActive",
            },
          },
        })
        .populate({
          path: "parentId",
          select: "userId canSeeTeacher",
          populate: {
            path: "userId",
            select: "name email phoneNumber isActive",
          },
        });

      if (!student) {
        throw new Error("Không tìm thấy học sinh");
      }

      // Kiểm tra user có active không
      if (!student.userId || !student.userId.isActive) {
        throw new Error("Học sinh đã bị vô hiệu hóa");
      }

      // Lấy thông tin điểm danh nếu học sinh có lớp học
      let attendanceInfo = null;
      if (student.classId && student.classId.length > 0) {
        // Xử lý thông tin điểm danh cho lớp đầu tiên (hoặc có thể lặp qua tất cả các lớp nếu cần)
        const classId = student.classId[0]._id || student.classId[0];

        const attendance = await Attendance.findOne({
          classId: classId,
        });

        if (attendance) {
          let totalLessons = attendance.records.length;
          let absentLessons = 0;
          let attendedLessons = 0;

          // Đếm số buổi học và buổi nghỉ
          attendance.records.forEach((record) => {
            const studentRecord = record.students.find(
              (s) => s.studentId.toString() === studentId
            );

            if (studentRecord && studentRecord.isAbsent) {
              absentLessons++;
            } else {
              attendedLessons++;
            }
          });

          attendanceInfo = {
            totalLessons,
            attendedLessons,
            absentLessons,
            attendanceRate:
              totalLessons > 0
                ? ((attendedLessons / totalLessons) * 100).toFixed(2) + "%"
                : "0%",
          };
        } else {
          attendanceInfo = {
            totalLessons: 0,
            attendedLessons: 0,
            absentLessons: 0,
            attendanceRate: "0%",
          };
        }
      }

      // Trả về thông tin đầy đủ
      return {
        ...student.toObject(),
        attendanceInfo,
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy thông tin học sinh: ${error.message}`);
    }
  },

  // ❌ REMOVED: updateParentRelationship method - now handled by studentParentRelationshipService
  // Use studentParentRelationshipService.updateStudentParentRelationship() instead

  // ❌ REMOVED: updateClassRelationship method
  // Class enrollment/withdrawal now handled by specialized APIs:
  // - POST /students/{id}/enroll
  // - POST /students/{id}/withdraw

  /**
   * Lấy danh sách tất cả học sinh
   * @param {Object} filter - Bộ lọc (optional)
   * @param {Object} options - Tùy chọn pagination, sort (optional)
   * @returns {Array} Danh sách học sinh
   */
  async getAll(filter = {}, options = {}) {
    try {
      const { page = 1, limit = 10, sort, populate = true, isActive } = options;

      const skip = (page - 1) * limit;

      let query = Student.find(filter).skip(skip).limit(limit).sort(sort);

      if (populate) {
        // Tạo match condition cho isActive
        let userMatch = {};
        if (isActive !== undefined) {
          userMatch.isActive = isActive;
        }

        query = query
          .populate({
            path: "userId",
            select: "name email gender phoneNumber address role isActive",
            match: userMatch,
          })
          .populate({
            path: "parentId",
            select: "userId",
            populate: {
              path: "userId",
              select: "name email phoneNumber isActive",
              match: userMatch,
            },
          })
          .populate({
            path: "classId",
            select: "className grade year feePerLesson isAvailable",
          });
      }

      const students = await query;

      // Lọc bỏ students có userId null (do user không match với isActive filter)
      const filteredStudents = students.filter(
        (student) => student.userId !== null
      );

      // Note: Total count là tổng số Student records, không tính filter isActive của User
      // Vì thế currentPage có thể có ít items hơn limit nếu có filter isActive
      const total = await Student.countDocuments(filter);

      return {
        students: filteredStudents,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: filteredStudents.length,
          totalRecords: total,
        },
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy danh sách học sinh: ${error.message}`);
    }
  },

  /**
   * Lấy danh sách lớp học mà student có thể tham gia
   * @param {String} studentId - ID học sinh
   * @param {Object} filters - Bộ lọc
   * @returns {Array} Danh sách lớp có thể tham gia
   */
  async getAvailableClassesForStudent(studentId, filters = {}) {
    try {
      if (!studentId) {
        throw new Error("Thiếu thông tin studentId");
      }

      // Lấy thông tin student
      const student = await Student.findById(studentId).populate("classId");
      if (!student) {
        throw new Error("Không tìm thấy học sinh");
      }

      // Lấy danh sách classId mà student đã tham gia
      const enrolledClassIds = student.classId || [];

      // Build filter cho classes
      const classFilter = {
        _id: { $nin: enrolledClassIds }, // Loại trừ các lớp đã tham gia
        isAvailable: true, // Chỉ lấy lớp còn hoạt động
      };

      // Thêm filters tùy chọn
      if (filters.year) classFilter.year = parseInt(filters.year);
      if (filters.grade) classFilter.grade = filters.grade;

      // Lấy danh sách lớp
      const availableClasses = await Class.find(classFilter)
        .populate("teacherId", "userId")
        .populate({
          path: "teacherId",
          populate: { path: "userId", select: "name email" },
        })
        .sort({ year: -1, grade: 1, className: 1 });

      // Format response với thông tin chi tiết
      const formattedClasses = availableClasses.map((cls) => ({
        _id: cls._id,
        className: cls.className,
        year: cls.year,
        grade: cls.grade,
        feePerLesson: cls.feePerLesson,
        currentStudents: cls.studentList ? cls.studentList.length : 0,
        maxStudents: cls.maxStudents || 30,
        teacher: {
          name: cls.teacherId?.userId?.name || "Chưa phân công",
          email: cls.teacherId?.userId?.email || "",
        },
        schedule: cls.schedule,
        startDate: cls.schedule?.startDate,
        endDate: cls.schedule?.endDate,
        status: this.getClassStatus(cls),
        canEnroll: this.canStudentEnroll(cls, student),
      }));

      return formattedClasses;
    } catch (error) {
      throw new Error(
        `Lỗi khi lấy danh sách lớp có thể tham gia: ${error.message}`
      );
    }
  },

  /**
   * Helper: Kiểm tra trạng thái lớp học
   */
  getClassStatus(classInfo) {
    const now = new Date();
    const startDate = new Date(classInfo.schedule?.startDate);
    const endDate = new Date(classInfo.schedule?.endDate);

    if (!startDate || !endDate) return "draft";
    if (now < startDate) return "upcoming";
    if (now > endDate) return "completed";
    return "ongoing";
  },

  /**
   * Helper: Kiểm tra student có thể đăng ký lớp không
   */ canStudentEnroll(classInfo, student) {
    const now = new Date();
    const startDate = new Date(classInfo.schedule?.startDate);
    const endDate = new Date(classInfo.schedule?.endDate);
    const currentStudents = classInfo.studentList
      ? classInfo.studentList.length
      : 0;
    const maxStudents = classInfo.maxStudents || 30;

    // Kiểm tra các điều kiện
    const conditions = {
      isAvailable: classInfo.isAvailable,
      notEnded: !endDate || now < endDate, // ✅ Cho phép đăng ký nếu chưa kết thúc
      hasSpace: currentStudents < maxStudents,
      notAlreadyEnrolled: !classInfo.studentList.some(
        (id) => id.toString() === student._id.toString()
      ),
    };

    return Object.values(conditions).every((condition) => condition === true);
  },

  /**
   * Enroll student to classes with automatic payment creation
   * @param {String} studentId - ID học sinh
   * @param {Array} classesWithDiscount - [{ classId, discountPercentage }]
   * @returns {Object} Student info with enrollment results
   */
  async enrollToClassesWithPayments(studentId, classesWithDiscount) {
    return await withTransaction(async (session) => {
      try {
        // Validate input
        if (
          !studentId ||
          !Array.isArray(classesWithDiscount) ||
          classesWithDiscount.length === 0
        ) {
          throw new Error(
            "Thiếu thông tin: studentId và danh sách lớp với discount"
          );
        }

        // Kiểm tra student tồn tại
        const student = await Student.findById(studentId).session(session);
        if (!student) {
          throw new Error("Học sinh không tồn tại");
        }

        const { Payment } = require("../../models");
        const enrollmentResults = [];

        for (const classData of classesWithDiscount) {
          const { classId, discountPercentage = 0 } = classData;

          if (!classId) {
            throw new Error("Thiếu classId");
          } // Validate discount percentage
          if (discountPercentage < 0 || discountPercentage > 100) {
            throw new Error(
              `Discount percentage phải từ 0-100%, nhận được: ${discountPercentage}%`
            );
          }

          // Kiểm tra class tồn tại
          const classInfo = await Class.findById(classId).session(session);
          if (!classInfo) {
            throw new Error(`Lớp học ${classId} không tồn tại`);
          }

          // 🔥 KIỂM TRA ENROLLMENT ELIGIBILITY
          const student = await Student.findById(studentId).session(session);

          // Kiểm tra các điều kiện cụ thể
          const now = new Date();
          const startDate = new Date(classInfo.schedule?.startDate);
          const endDate = new Date(classInfo.schedule?.endDate);
          const currentStudents = classInfo.studentList
            ? classInfo.studentList.length
            : 0;
          const maxStudents = classInfo.maxStudents || 30;
          const isAlreadyEnrolled = classInfo.studentList.some(
            (id) => id.toString() === studentId.toString()
          );

          // Kiểm tra từng điều kiện và throw error với thông báo cụ thể
          if (isAlreadyEnrolled) {
            throw new Error(
              `${classInfo.className}: Học sinh đã có trong lớp này`
            );
          }

          if (!classInfo.isAvailable) {
            throw new Error(
              `${classInfo.className}: Lớp học không còn hoạt động`
            );
          }

          if (endDate && now >= endDate) {
            throw new Error(`${classInfo.className}: Lớp học đã kết thúc`);
          }
          if (currentStudents >= maxStudents) {
            throw new Error(
              `${classInfo.className}: Lớp học đã đầy (${currentStudents}/${maxStudents})`
            );
          }

          // Thêm student vào class và tạo payment
          await Class.findByIdAndUpdate(
            classId,
            { $addToSet: { studentList: studentId } },
            { session }
          );

          // Thêm class vào student
          await Student.findByIdAndUpdate(
            studentId,
            { $addToSet: { classId: classId } },
            { session }
          );

          const action = "enrolled"; // Tạo payment records cho enrollment
          const paymentResults = await this.createPaymentRecordsForStudentClass(
            studentId,
            classId,
            discountPercentage,
            session
          );

          enrollmentResults.push({
            classId,
            className: classInfo.className,
            grade: classInfo.grade,
            year: classInfo.year,
            discountPercentage,
            action,
            paymentsCreated: paymentResults.length,
            paymentMonths: paymentResults.map((p) => `${p.month}/${p.year}`),
          });
        }

        // Trả về thông tin student với enrollment results
        const updatedStudent = await this.getById(studentId);

        return {
          ...(updatedStudent.toObject
            ? updatedStudent.toObject()
            : updatedStudent),
          enrollmentResults,
          enrollmentSummary: {
            enrolled: enrollmentResults.filter((r) => r.action === "enrolled")
              .length,
            totalPaymentsCreated: enrollmentResults.reduce(
              (sum, r) => sum + r.paymentsCreated,
              0
            ),
          },
        };
      } catch (error) {
        throw new Error(`Lỗi khi đăng ký lớp cho học sinh: ${error.message}`);
      }
    });
  },

  /**
   * Tạo payment records cho student-class combination
   * @param {String} studentId
   * @param {String} classId
   * @param {Number} discountPercentage
   * @param {Object} session
   * @returns {Array} Payment records đã tạo
   */
  async createPaymentRecordsForStudentClass(
    studentId,
    classId,
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
   * Helper: Ước tính số buổi học trong tháng
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

  /**
   * Loại học sinh khỏi các lớp học
   * @param {String} studentId - ID học sinh
   * @param {Array} classIds - Array các classId cần loại khỏi
   * @returns {Object} Kết quả withdrawal
   */
  async withdrawFromClasses(studentId, classIds) {
    return await withTransaction(async (session) => {
      try {
        // Validate input
        if (!studentId || !Array.isArray(classIds) || classIds.length === 0) {
          throw new Error("Thiếu thông tin: studentId và danh sách classIds");
        }

        // Kiểm tra student tồn tại
        const student = await Student.findById(studentId).session(session);
        if (!student) {
          throw new Error("Học sinh không tồn tại");
        }

        const withdrawalResults = [];

        for (const classId of classIds) {
          // Kiểm tra class tồn tại
          const classInfo = await Class.findById(classId).session(session);
          if (!classInfo) {
            withdrawalResults.push({
              classId,
              className: "Unknown",
              action: "class_not_found",
              error: "Lớp học không tồn tại",
            });
            continue;
          }

          // Kiểm tra student có trong lớp không
          const isInClass = classInfo.studentList.some(
            (id) => id.toString() === studentId.toString()
          );

          if (!isInClass) {
            withdrawalResults.push({
              classId,
              className: classInfo.className,
              action: "not_enrolled",
              error: "Học sinh không có trong lớp này",
            });
            continue;
          }

          // Loại student khỏi class
          await Class.findByIdAndUpdate(
            classId,
            { $pull: { studentList: studentId } },
            { session }
          );

          // Loại class khỏi student
          await Student.findByIdAndUpdate(
            studentId,
            { $pull: { classId: classId } },
            { session }
          );

          // 🔥 Xử lý payment records (mark as withdrawn hoặc delete)
          const paymentResult = await this.handlePaymentOnWithdrawal(
            studentId,
            classId,
            session
          );

          withdrawalResults.push({
            classId,
            className: classInfo.className,
            grade: classInfo.grade,
            year: classInfo.year,
            action: "withdrawn",
            paymentsHandled: paymentResult.handled,
            paymentAction: paymentResult.action,
          });
        }

        // Trả về kết quả
        const updatedStudent = await this.getById(studentId);

        return {
          studentId,
          studentName: updatedStudent.userId?.name || "Unknown",
          classesProcessed: withdrawalResults.length,
          results: withdrawalResults,
          summary: {
            withdrawn: withdrawalResults.filter((r) => r.action === "withdrawn")
              .length,
            notEnrolled: withdrawalResults.filter(
              (r) => r.action === "not_enrolled"
            ).length,
            errors: withdrawalResults.filter(
              (r) => r.action === "class_not_found"
            ).length,
          },
        };
      } catch (error) {
        throw new Error(`Lỗi khi loại học sinh khỏi lớp: ${error.message}`);
      }
    });
  },

  /**
   * Xử lý payment records khi học sinh withdraw khỏi lớp
   * @param {String} studentId
   * @param {String} classId
   * @param {Object} session
   * @returns {Object} Payment handling result
   */
  async handlePaymentOnWithdrawal(studentId, classId, session) {
    try {
      const { Payment } = require("../../models");

      // Tìm tất cả payment records cho student-class
      const paymentRecords = await Payment.find({
        studentId,
        classId,
      }).session(session);

      let handledCount = 0;
      let action = "none";

      for (const payment of paymentRecords) {
        // Chỉ xử lý payments chưa được thanh toán hoặc thanh toán một phần
        if (payment.amountPaid === 0) {
          // Chưa thanh toán gì → Xóa payment record
          await Payment.findByIdAndDelete(payment._id).session(session);
          handledCount++;
          action = "deleted_unpaid";
        } else if (payment.amountPaid < payment.amountDue) {
          // Thanh toán một phần → Mark as withdrawn, giữ lại record
          await Payment.findByIdAndUpdate(
            payment._id,
            {
              $set: {
                status: "withdrawn",
                withdrawnAt: new Date(),
                notes: "Student withdrawn from class",
              },
            },
            { session }
          );
          handledCount++;
          action = "marked_withdrawn";
        } else {
          // Đã thanh toán đủ → Giữ nguyên record
          action = "kept_paid";
        }
      }

      return {
        handled: handledCount,
        action,
        totalRecords: paymentRecords.length,
      };
    } catch (error) {
      console.error("Error handling payments on withdrawal:", error);
      return {
        handled: 0,
        action: "error",
        error: error.message,
      };
    }
  },

  // Soft delete student
  async softDelete(studentId) {
    try {
      if (!studentId) {
        throw new Error("Thiếu thông tin bắt buộc: studentId");
      }

      const student = await Student.findById(studentId).populate("userId");
      if (!student) {
        throw new Error("Không tìm thấy student");
      }

      // Vô hiệu hóa user tương ứng
      const updatedUser = await userService.update(student.userId._id, {
        isActive: false,
      });

      return {
        id: student._id,
        userId: student.userId._id,
        email: updatedUser.email,
        name: updatedUser.name,
        isActive: updatedUser.isActive, // Lấy từ database thực tế
      };
    } catch (error) {
      throw new Error(`Lỗi khi soft delete student: ${error.message}`);
    }
  },
};

module.exports = studentService;
