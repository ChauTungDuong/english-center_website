const { BaseService } = require("../core/utils");
const { ValidationError, NotFoundError } = require("../core/errors/AppError");
const { Payment, Student, Class, Parent } = require("../models");

class PaymentService extends BaseService {
  constructor() {
    super(Payment);
  }

  /**
   * Get payment summary and statistics (Admin financial statistics)
   */
  async getPaymentSummary(filter = {}) {
    const matchFilter = {};

    if (filter.month) matchFilter.month = parseInt(filter.month);
    if (filter.year) matchFilter.year = parseInt(filter.year);
    if (filter.startDate && filter.endDate) {
      matchFilter.createdAt = {
        $gte: new Date(filter.startDate),
        $lte: new Date(filter.endDate),
      };
    }

    const payments = await Payment.find(matchFilter)
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
        ? ((summary.totalPaidAmount / summary.totalDueAmount) * 100).toFixed(2)
        : 100;

    summary.discountRate =
      summary.totalOriginalAmount > 0
        ? ((summary.totalDiscount / summary.totalOriginalAmount) * 100).toFixed(
            2
          )
        : 0;

    return summary;
  }

  /**
   * Get payments for specific student (Parents/students view payment history)
   */
  async getStudentPayments(studentId, filters = {}) {
    if (!studentId) {
      throw new ValidationError("Student ID is required");
    }

    const filter = { studentId };

    if (filters.month) filter.month = parseInt(filters.month);
    if (filters.year) filter.year = parseInt(filters.year);
    if (filters.status) filter.status = filters.status;

    return await Payment.find(filter)
      .populate("classId", "className grade")
      .populate("parentId", "userId")
      .sort({ year: -1, month: -1, createdAt: -1 });
  }

  /**
   * Create new payment record
   */
  async createPayment(paymentData) {
    const {
      studentId,
      classId,
      parentId,
      month,
      year,
      originalAmount,
      discountAmount = 0,
      afterDiscountAmount,
      amountPaid = 0,
      paymentMethod = "cash",
      description = "",
    } = paymentData;

    // Validate required fields
    if (!studentId || !classId || !month || !year || !originalAmount) {
      throw new ValidationError(
        "Missing required fields: studentId, classId, month, year, originalAmount"
      );
    }

    // Validate that student exists
    const student = await Student.findById(studentId);
    if (!student) {
      throw new NotFoundError("Student not found");
    }

    // Validate that class exists
    const classData = await Class.findById(classId);
    if (!classData) {
      throw new NotFoundError("Class not found");
    }

    // Check if payment already exists for this student, class, month, year
    const existingPayment = await Payment.findOne({
      studentId,
      classId,
      month,
      year,
    });

    if (existingPayment) {
      throw new ValidationError(
        "Payment already exists for this student, class, month, and year"
      );
    }

    // Calculate amounts
    const finalAfterDiscountAmount =
      afterDiscountAmount || originalAmount - discountAmount;
    const amountDue = finalAfterDiscountAmount - amountPaid;

    const payment = await this.create({
      studentId,
      classId,
      parentId: parentId || student.parentId,
      month,
      year,
      originalAmount,
      discountAmount,
      afterDiscountAmount: finalAfterDiscountAmount,
      amountPaid,
      amountDue,
      paymentMethod,
      description,
      status: amountDue <= 0 ? "completed" : "pending",
      paymentDate: amountPaid > 0 ? new Date() : null,
    });

    return await Payment.findById(payment._id)
      .populate("studentId", "userId")
      .populate("classId", "className grade")
      .populate("parentId", "userId");
  }

  /**
   * Update payment record
   */
  async updatePayment(paymentId, updateData) {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new NotFoundError("Payment not found");
    }

    // Recalculate amounts if necessary
    if (
      updateData.originalAmount !== undefined ||
      updateData.discountAmount !== undefined ||
      updateData.amountPaid !== undefined
    ) {
      const originalAmount =
        updateData.originalAmount || payment.originalAmount;
      const discountAmount =
        updateData.discountAmount || payment.discountAmount;
      const amountPaid = updateData.amountPaid || payment.amountPaid;

      updateData.afterDiscountAmount = originalAmount - discountAmount;
      updateData.amountDue = updateData.afterDiscountAmount - amountPaid;
      updateData.status = updateData.amountDue <= 0 ? "completed" : "pending";

      if (amountPaid > payment.amountPaid) {
        updateData.paymentDate = new Date();
      }
    }

    const updatedPayment = await this.update(paymentId, updateData);

    return await Payment.findById(paymentId)
      .populate("studentId", "userId")
      .populate("classId", "className grade")
      .populate("parentId", "userId");
  }

  /**
   * Delete payment record
   */
  async deletePayment(paymentId) {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new NotFoundError("Payment not found");
    }

    return await this.delete(paymentId);
  }

  /**
   * Get all payments with pagination and filters
   */
  async getAllPayments(options = {}) {
    const {
      page = 1,
      limit = 20,
      month,
      year,
      status,
      classId,
      studentId,
      parentId,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;

    const filter = {};
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    if (status) filter.status = status;
    if (classId) filter.classId = classId;
    if (studentId) filter.studentId = studentId;
    if (parentId) filter.parentId = parentId;

    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    return await this.findWithPagination(filter, {
      page,
      limit,
      sort,
      populate: [
        {
          path: "studentId",
          select: "userId",
          populate: { path: "userId", select: "name email" },
        },
        { path: "classId", select: "className grade" },
        {
          path: "parentId",
          select: "userId",
          populate: { path: "userId", select: "name email" },
        },
      ],
    });
  }

  /**
   * Get payment statistics by class
   */
  async getPaymentStatsByClass(classId) {
    if (!classId) {
      throw new ValidationError("Class ID is required");
    }

    const payments = await Payment.find({ classId });

    const stats = {
      totalPayments: payments.length,
      totalAmount: 0,
      totalPaid: 0,
      totalDue: 0,
      completedPayments: 0,
      pendingPayments: 0,
      collectionRate: 0,
    };

    payments.forEach((payment) => {
      stats.totalAmount += payment.afterDiscountAmount || 0;
      stats.totalPaid += payment.amountPaid || 0;
      stats.totalDue += payment.amountDue || 0;

      if (payment.status === "completed") {
        stats.completedPayments++;
      } else {
        stats.pendingPayments++;
      }
    });

    stats.collectionRate =
      stats.totalAmount > 0
        ? ((stats.totalPaid / stats.totalAmount) * 100).toFixed(2)
        : 0;

    return stats;
  }

  /**
   * Get payment statistics by student
   */
  async getPaymentStatsByStudent(studentId) {
    if (!studentId) {
      throw new ValidationError("Student ID is required");
    }

    const payments = await Payment.find({ studentId });

    const stats = {
      totalPayments: payments.length,
      totalAmount: 0,
      totalPaid: 0,
      totalDue: 0,
      completedPayments: 0,
      pendingPayments: 0,
      paymentHistory: payments.map((p) => ({
        month: p.month,
        year: p.year,
        amount: p.afterDiscountAmount,
        paid: p.amountPaid,
        due: p.amountDue,
        status: p.status,
        paymentDate: p.paymentDate,
      })),
    };

    payments.forEach((payment) => {
      stats.totalAmount += payment.afterDiscountAmount || 0;
      stats.totalPaid += payment.amountPaid || 0;
      stats.totalDue += payment.amountDue || 0;

      if (payment.status === "completed") {
        stats.completedPayments++;
      } else {
        stats.pendingPayments++;
      }
    });

    return stats;
  }

  /**
   * Get overdue payments
   */
  async getOverduePayments() {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    return await Payment.find({
      status: "pending",
      $or: [
        { year: { $lt: currentYear } },
        { year: currentYear, month: { $lt: currentMonth } },
      ],
    })
      .populate("studentId", "userId")
      .populate("classId", "className grade")
      .populate("parentId", "userId")
      .sort({ year: 1, month: 1 });
  }

  /**
   * Generate payment report
   */
  async generatePaymentReport(filters = {}) {
    const summary = await this.getPaymentSummary(filters);
    const overduePayments = await this.getOverduePayments();

    return {
      summary,
      overduePayments,
      generatedAt: new Date(),
      filters,
    };
  }
}

module.exports = PaymentService;
