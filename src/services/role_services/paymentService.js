const { Payment, Class, Attendance, Student, Parent } = require("../../models");
const withTransaction = require("../../utils/session");

const paymentService = {
  /**
   * Tạo payment mới
   * @param {Object} paymentData - Dữ liệu payment
   * @param {Object} session - MongoDB session (optional)
   * @returns {Object} Payment đã được tạo
   */
  async create(paymentData, session = null) {
    try {
      const {
        studentId,
        classId,
        parentId,
        month,
        year,
        discountPercentage = 0,
      } = paymentData;

      if (!studentId || !classId || !month || !year) {
        throw new Error(
          "Thiếu thông tin bắt buộc: studentId, classId, month, year"
        );
      }

      // Validate student exists
      const student = session
        ? await Student.findById(studentId).session(session)
        : await Student.findById(studentId);

      if (!student) {
        throw new Error("Không tìm thấy học sinh");
      }

      // Validate class exists
      const classData = session
        ? await Class.findById(classId).session(session)
        : await Class.findById(classId);

      if (!classData) {
        throw new Error("Không tìm thấy lớp học");
      }

      // Check if payment already exists
      const existingPayment = session
        ? await Payment.findOne({ studentId, classId, month, year }).session(
            session
          )
        : await Payment.findOne({ studentId, classId, month, year });

      if (existingPayment) {
        throw new Error("Đã có payment cho tháng này");
      }

      // Calculate lessons and amounts
      const attendance = session
        ? await Attendance.findOne({ classId }).session(session)
        : await Attendance.findOne({ classId });

      let totalLessons = 0;
      let attendedLessons = 0;

      if (attendance && attendance.records) {
        const monthRecords = attendance.records.filter((record) => {
          const date = new Date(record.date);
          return (
            date.getMonth() + 1 === parseInt(month) &&
            date.getFullYear() === parseInt(year)
          );
        });

        totalLessons = monthRecords.length;

        monthRecords.forEach((record) => {
          const studentRecord = record.students.find(
            (s) => s.studentId.toString() === studentId
          );
          if (!studentRecord || !studentRecord.isAbsent) {
            attendedLessons++;
          }
        });
      }

      const originalAmount = attendedLessons * classData.feePerLesson;
      const discountAmount = (originalAmount * discountPercentage) / 100;
      const afterDiscountAmount = originalAmount - discountAmount;

      const createData = {
        studentId,
        classId,
        parentId: parentId || student.parentId,
        month: parseInt(month),
        year: parseInt(year),
        discountPercentage,
        originalAmount,
        afterDiscountAmount,
        amountDue: afterDiscountAmount,
        amountPaid: 0,
        totalLessons,
        attendedLessons,
        absentLessons: totalLessons - attendedLessons,
        paymentHistory: [],
      };

      if (session) {
        const payment = await Payment.create([createData], { session });
        return payment[0];
      } else {
        return await Payment.create(createData);
      }
    } catch (error) {
      throw new Error(`Lỗi khi tạo payment: ${error.message}`);
    }
  },

  /**
   * Lấy payment theo ID
   * @param {String} paymentId - ID của payment
   * @param {Object} options - Tùy chọn populate
   * @returns {Object} Payment data
   */
  async getById(paymentId, options = {}) {
    try {
      if (!paymentId) {
        throw new Error("Thiếu thông tin paymentId");
      }

      let query = Payment.findById(paymentId);

      // Default populations
      query = query
        .populate("studentId", "userId")
        .populate({
          path: "studentId",
          populate: { path: "userId", select: "name email phoneNumber" },
        })
        .populate("classId", "className grade year feePerLesson")
        .populate("parentId", "userId")
        .populate({
          path: "parentId",
          populate: { path: "userId", select: "name email phoneNumber" },
        });

      const payment = await query;

      if (!payment) {
        throw new Error("Không tìm thấy payment");
      }

      return payment;
    } catch (error) {
      throw new Error(`Lỗi khi lấy payment: ${error.message}`);
    }
  },

  /**
   * Cập nhật payment
   * @param {String} paymentId - ID của payment
   * @param {Object} updateData - Dữ liệu cập nhật
   * @returns {Object} Payment đã được cập nhật
   */
  async update(paymentId, updateData) {
    return await withTransaction(async (session) => {
      try {
        if (!paymentId) {
          throw new Error("Thiếu thông tin paymentId");
        }

        const payment = await Payment.findById(paymentId).session(session);
        if (!payment) {
          throw new Error("Không tìm thấy payment");
        }

        // Update fields
        Object.keys(updateData).forEach((key) => {
          if (updateData[key] !== undefined) {
            payment[key] = updateData[key];
          }
        });

        await payment.save({ session });

        return await Payment.findById(paymentId)
          .populate("studentId", "userId")
          .populate({
            path: "studentId",
            populate: { path: "userId", select: "name email phoneNumber" },
          })
          .populate("classId", "className grade")
          .populate("parentId", "userId")
          .session(session);
      } catch (error) {
        throw new Error(`Lỗi khi cập nhật payment: ${error.message}`);
      }
    });
  },

  /**
   * Xóa payment
   * @param {String} paymentId - ID của payment
   * @param {Boolean} hardDelete - Xóa vĩnh viễn hay soft delete
   * @returns {Object} Kết quả xóa
   */
  async delete(paymentId, hardDelete = false) {
    return await withTransaction(async (session) => {
      try {
        if (!paymentId) {
          throw new Error("Thiếu thông tin paymentId");
        }

        const payment = await Payment.findById(paymentId).session(session);
        if (!payment) {
          throw new Error("Không tìm thấy payment");
        }

        if (hardDelete) {
          await Payment.findByIdAndDelete(paymentId, { session });
          return { message: "Xóa payment thành công", hardDeleted: true };
        } else {
          // Soft delete - mark as inactive
          payment.isActive = false;
          payment.deletedAt = new Date();
          await payment.save({ session });
          return {
            message: "Vô hiệu hóa payment thành công",
            softDeleted: true,
          };
        }
      } catch (error) {
        throw new Error(`Lỗi khi xóa payment: ${error.message}`);
      }
    });
  },

  /**
   * Lấy danh sách payments với filter và pagination
   * @param {Object} filter - Bộ lọc
   * @param {Object} options - Tùy chọn pagination, sort (optional)
   * @returns {Object} Danh sách payments và pagination info
   */
  async getAll(filter = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sort = { createdAt: -1 },
        populate = true,
      } = options;

      const skip = (page - 1) * limit;

      // Build query
      let query = Payment.find(filter);

      if (populate) {
        query = query
          .populate("studentId", "userId")
          .populate({
            path: "studentId",
            populate: { path: "userId", select: "name email phoneNumber" },
          })
          .populate("classId", "className grade year")
          .populate("parentId", "userId")
          .populate({
            path: "parentId",
            populate: { path: "userId", select: "name email phoneNumber" },
          });
      }

      const [payments, totalItems] = await Promise.all([
        query.sort(sort).skip(skip).limit(limit),
        Payment.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(totalItems / limit);

      return {
        payments,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          limit,
        },
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy danh sách payments: ${error.message}`);
    }
  },

  /**
   * Thêm payment vào payment history
   * @param {String} paymentId - ID của payment
   * @param {Object} paymentData - Dữ liệu thanh toán mới
   * @returns {Object} Payment đã được cập nhật
   */
  async addPaymentRecord(paymentId, paymentData) {
    return await withTransaction(async (session) => {
      try {
        const { amount, paymentMethod = "cash", note = "" } = paymentData;

        if (!amount || amount <= 0) {
          throw new Error("Số tiền thanh toán không hợp lệ");
        }

        const payment = await Payment.findById(paymentId).session(session);
        if (!payment) {
          throw new Error("Không tìm thấy payment");
        }

        const remainingAmount = payment.amountDue - payment.amountPaid;
        if (remainingAmount <= 0) {
          throw new Error("Payment đã được thanh toán đủ");
        }

        // Calculate new amount paid
        const actualPaymentAmount = Math.min(amount, remainingAmount);
        const newAmountPaid = payment.amountPaid + actualPaymentAmount;

        // Add to payment history
        payment.paymentHistory.push({
          amount: actualPaymentAmount,
          paymentMethod,
          note,
          date: new Date(),
        });

        payment.amountPaid = newAmountPaid;
        payment.paymentDate = new Date();

        await payment.save({ session });

        return await Payment.findById(paymentId)
          .populate("studentId", "userId")
          .populate("classId", "className")
          .populate("parentId", "userId")
          .session(session);
      } catch (error) {
        throw new Error(`Lỗi khi thêm payment record: ${error.message}`);
      }
    });
  },

  /**
   * Lấy payment summary theo filter
   * @param {Object} filter - Bộ lọc
   * @returns {Object} Summary data
   */
  async getPaymentSummary(filter = {}) {
    try {
      const payments = await Payment.find(filter)
        .populate("studentId", "userId")
        .populate("classId", "className grade")
        .populate("parentId", "userId");

      const summary = {
        totalPayments: payments.length,
        totalOriginalAmount: 0,
        totalAfterDiscountAmount: 0,
        totalPaidAmount: 0,
        totalDueAmount: 0,
        totalDiscount: 0,
        pendingPayments: 0,
        completedPayments: 0,
        paymentsByClass: {},
        paymentsByStudent: {},
      };

      payments.forEach((payment) => {
        summary.totalOriginalAmount += payment.originalAmount || 0;
        summary.totalAfterDiscountAmount += payment.afterDiscountAmount || 0;
        summary.totalPaidAmount += payment.amountPaid || 0;
        summary.totalDueAmount += payment.amountDue || 0;
        summary.totalDiscount +=
          payment.originalAmount - payment.afterDiscountAmount || 0;

        if (payment.amountPaid >= payment.amountDue) {
          summary.completedPayments++;
        } else {
          summary.pendingPayments++;
        }

        // Group by class
        const classId = payment.classId._id.toString();
        if (!summary.paymentsByClass[classId]) {
          summary.paymentsByClass[classId] = {
            className: payment.classId.className,
            count: 0,
            totalAmount: 0,
            totalPaid: 0,
          };
        }
        summary.paymentsByClass[classId].count++;
        summary.paymentsByClass[classId].totalAmount += payment.amountDue;
        summary.paymentsByClass[classId].totalPaid += payment.amountPaid;

        // Group by student
        const studentId = payment.studentId._id.toString();
        if (!summary.paymentsByStudent[studentId]) {
          summary.paymentsByStudent[studentId] = {
            studentName: payment.studentId.userId?.name || "Unknown",
            count: 0,
            totalAmount: 0,
            totalPaid: 0,
          };
        }
        summary.paymentsByStudent[studentId].count++;
        summary.paymentsByStudent[studentId].totalAmount += payment.amountDue;
        summary.paymentsByStudent[studentId].totalPaid += payment.amountPaid;
      });

      summary.collectionRate =
        summary.totalDueAmount > 0
          ? ((summary.totalPaidAmount / summary.totalDueAmount) * 100).toFixed(
              2
            )
          : 100;

      summary.discountRate =
        summary.totalOriginalAmount > 0
          ? (
              (summary.totalDiscount / summary.totalOriginalAmount) *
              100
            ).toFixed(2)
          : 0;

      return summary;
    } catch (error) {
      throw new Error(`Lỗi khi lấy payment summary: ${error.message}`);
    }
  },

  /**
   * Lấy payments của student cụ thể
   * @param {String} studentId - ID của student
   * @param {Object} filters - Bộ lọc
   * @returns {Array} Danh sách payments
   */
  async getStudentPayments(studentId, filters = {}) {
    try {
      const filter = { studentId };

      if (filters.month) filter.month = parseInt(filters.month);
      if (filters.year) filter.year = parseInt(filters.year);
      if (filters.classId) filter.classId = filters.classId;

      const payments = await Payment.find(filter)
        .populate("classId", "className grade")
        .populate("parentId", "userId")
        .sort({ year: -1, month: -1 });

      return payments;
    } catch (error) {
      throw new Error(`Lỗi khi lấy payments của student: ${error.message}`);
    }
  },
};

module.exports = paymentService;
