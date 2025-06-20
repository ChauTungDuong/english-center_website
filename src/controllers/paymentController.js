const {
  Payment,
  Class,
  Attendance,
  Student,
  Teacher,
  TeacherWage,
} = require("../models");
const withTransaction = require("../utils/session");
const paymentService = require("../services/role_services/paymentService");

const paymentController = {
  // Tạo payment mới
  async createPayment(req, res) {
    try {
      const newPayment = await paymentService.create(req.body);
      return res.status(201).json({
        msg: "Tạo payment thành công",
        data: newPayment,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi tạo payment",
        error: error.message,
      });
    }
  },

  // Lấy payment theo ID
  async getPaymentById(req, res) {
    try {
      const payment = await paymentService.getById(req.params.paymentId);
      return res.status(200).json({
        msg: "Lấy thông tin payment thành công",
        data: payment,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy thông tin payment",
        error: error.message,
      });
    }
  },

  // Cập nhật payment
  async updatePayment(req, res) {
    try {
      const updatedPayment = await paymentService.update(
        req.params.paymentId,
        req.body
      );
      return res.status(200).json({
        msg: "Cập nhật payment thành công",
        data: updatedPayment,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi cập nhật payment",
        error: error.message,
      });
    }
  },

  // Xóa payment
  async deletePayment(req, res) {
    try {
      const { hardDelete } = req.query;
      const result = await paymentService.delete(
        req.params.paymentId,
        hardDelete === "true"
      );
      return res.status(200).json({
        msg: result.message,
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi xóa payment",
        error: error.message,
      });
    }
  },

  // Lấy danh sách payments
  async getAllPayments(req, res) {
    try {
      const { page, limit, studentId, classId, month, year, status } =
        req.query;

      // Build filter
      const filter = {};
      if (studentId) filter.studentId = studentId;
      if (classId) filter.classId = classId;
      if (month) filter.month = parseInt(month);
      if (year) filter.year = parseInt(year);

      // Filter by payment status
      if (status === "completed") {
        filter.$expr = { $gte: ["$amountPaid", "$amountDue"] };
      } else if (status === "pending") {
        filter.$expr = { $lt: ["$amountPaid", "$amountDue"] };
      }

      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        sort: { createdAt: -1 },
        populate: true,
      };

      const result = await paymentService.getAll(filter, options);
      return res.status(200).json({
        msg: "Lấy danh sách payments thành công",
        data: result.payments,
        pagination: result.pagination,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy danh sách payments",
        error: error.message,
      });
    }
  },

  // Thêm thanh toán vào payment
  async addPaymentRecord(req, res) {
    try {
      const updatedPayment = await paymentService.addPaymentRecord(
        req.params.paymentId,
        req.body
      );
      return res.status(200).json({
        msg: "Thêm thanh toán thành công",
        data: updatedPayment,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi thêm thanh toán",
        error: error.message,
      });
    }
  },

  // Lấy payment summary
  async getPaymentSummary(req, res) {
    try {
      const { month, year, classId } = req.query;

      const filter = {};
      if (month) filter.month = parseInt(month);
      if (year) filter.year = parseInt(year);
      if (classId) filter.classId = classId;

      const summary = await paymentService.getPaymentSummary(filter);
      return res.status(200).json({
        msg: "Lấy payment summary thành công",
        data: summary,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy payment summary",
        error: error.message,
      });
    }
  },

  // Lấy payments của học sinh
  async getStudentPayments(req, res) {
    try {
      const { studentId } = req.params;
      const { month, year, classId } = req.query;

      const payments = await paymentService.getStudentPayments(studentId, {
        month,
        year,
        classId,
      });

      return res.status(200).json({
        msg: "Lấy payments của học sinh thành công",
        data: payments,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Lỗi khi lấy payments của học sinh",
        error: error.message,
      });
    }
  },
};

// Legacy functions for backward compatibility - using old logic but will be deprecated
const generateMonthlyPayment = async (req, res) => {
  try {
    const { studentId, classId, month, year, discountPercentage } = req.body;

    if (!studentId || !classId || !month || !year) {
      return res.status(400).json({
        msg: "Dữ liệu đầu vào không đầy đủ",
        detail: "Cần cung cấp studentId, classId, month và year",
      });
    }

    const newPayment = await paymentService.create({
      studentId,
      classId,
      month: parseInt(month),
      year: parseInt(year),
      discountPercentage: discountPercentage || 0,
    });

    return res.status(201).json({
      msg: "Tạo học phí thành công",
      data: newPayment,
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Lỗi khi tạo học phí",
      error: error.message,
    });
  }
};

const recordPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount, paymentMethod = "cash", note = "" } = req.body;

    const updatedPayment = await paymentService.addPaymentRecord(paymentId, {
      amount,
      paymentMethod,
      note,
    });

    return res.status(200).json({
      msg: "Cập nhật thanh toán thành công",
      data: updatedPayment,
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Lỗi khi cập nhật thanh toán",
      error: error.message,
    });
  }
};

const getPaymentOverview = async (req, res) => {
  try {
    const { month, year } = req.query;

    const filter = {};
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);

    const summary = await paymentService.getPaymentSummary(filter);
    const payments = await paymentService.getAll(filter, { limit: 50 });

    return res.status(200).json({
      msg: "Lấy thống kê học phí thành công",
      data: {
        totalPayments: summary.totalPayments,
        pendingPayments: summary.pendingPayments,
        completedPayments: summary.completedPayments,
        totalDue: summary.totalDueAmount,
        totalPaid: summary.totalPaidAmount,
        remainingDue: summary.totalDueAmount - summary.totalPaidAmount,
        paymentRate: parseFloat(summary.collectionRate),
        payments: payments.payments.map((p) => ({
          _id: p._id,
          student: p.studentId?.userId?.name || "Unknown",
          class: p.classId?.className || "Unknown",
          month: p.month,
          year: p.year,
          amountDue: p.amountDue,
          amountPaid: p.amountPaid,
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Lỗi khi lấy thống kê học phí",
      error: error.message,
    });
  }
};

// Teacher wage functions - separate logic that should be in a teacherWageService
const calculateTeacherWage = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { month, year } = req.body;
    if (!teacherId) {
      return res.status(400).json({
        msg: "Thiếu thông tin id giáo viên",
      });
    }
    if (!month || !year) {
      return res.status(400).json({
        msg: "Cần cung cấp tháng và năm để tính lương",
      });
    }
    return await withTransaction(async (session) => {
      const teacher = await Teacher.findById(teacherId);
      if (!teacher) {
        return res.status(404).json({ msg: "Không tìm thấy giáo viên" });
      }
      const existingWage = await TeacherWage.findOne({
        teacherId,
        month: parseInt(month),
        year: parseInt(year),
      }).session(session);

      if (existingWage) {
        return res.status(400).json({
          msg: "Đã tính lương cho tháng này",
          data: existingWage,
        });
      }
      // Tính số buổi dạy trong tháng
      let totalLessons = 0;

      // Kiểm tra teacher.classId có tồn tại và là array không
      if (
        teacher.classId &&
        Array.isArray(teacher.classId) &&
        teacher.classId.length > 0
      ) {
        for (const classId of teacher.classId) {
          // Kiểm tra classId không null/undefined
          if (!classId) continue;

          const attendance = await Attendance.findOne({ classId }).session(
            session
          );
          if (!attendance) continue;

          // Đếm số buổi dạy trong tháng
          const lessons = attendance.records.filter((record) => {
            const recordDate = new Date(record.date);
            return (
              recordDate.getMonth() + 1 === parseInt(month) &&
              recordDate.getFullYear() === parseInt(year)
            );
          }).length;

          totalLessons += lessons;
        }
      }

      // Tính lương dựa trên số buổi và mức lương/buổi
      const wageAmount = totalLessons * (teacher.wagePerLesson || 0);

      // Tạo bản ghi lương (thậm chí khi totalLessons = 0)
      const wage = await TeacherWage.create(
        [
          {
            teacherId,
            amount: wageAmount,
            lessonTaught: totalLessons,
            month: parseInt(month),
            year: parseInt(year),
            paymentDate: new Date(),
          },
        ],
        { session }
      );

      return res.status(201).json({
        msg:
          totalLessons > 0
            ? "Tính lương giáo viên thành công"
            : "Giáo viên không có buổi dạy nào trong tháng này",
        data: wage[0],
      });
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Lỗi khi tính toán lương giáo viên",
      error: error.message,
    });
  }
};

const getTeacherWages = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { month, year } = req.query;

    // Kiểm tra quyền truy cập
    if (req.user.role === "Teacher" && req.user._id.toString() !== teacherId) {
      return res.status(403).json({
        msg: "Bạn chỉ có thể xem lương của chính mình",
      });
    }

    if (!teacherId) {
      return res.status(400).json({
        msg: "Thiếu thông tin teacherId",
      });
    }

    if (!month || !year) {
      return res.status(400).json({
        msg: "Cần cung cấp tháng và năm để tính lương",
      });
    }

    // Tìm thông tin giáo viên
    const teacher = await Teacher.findById(teacherId).populate(
      "userId",
      "name email phoneNumber"
    );
    if (!teacher) {
      return res.status(404).json({
        msg: "Không tìm thấy giáo viên",
      });
    }

    // Tính toán lương dựa trên số buổi dạy thực tế
    let totalLessons = 0;
    let classDetails = [];

    // Kiểm tra giáo viên có lớp nào không
    if (
      teacher.classId &&
      Array.isArray(teacher.classId) &&
      teacher.classId.length > 0
    ) {
      for (const classId of teacher.classId) {
        if (!classId) continue;

        // Lấy thông tin lớp học
        const classInfo = await Class.findById(classId);
        if (!classInfo) continue;

        // Lấy thông tin điểm danh
        const attendance = await Attendance.findOne({ classId });
        if (!attendance) {
          classDetails.push({
            classId: classId,
            className: classInfo.className,
            grade: classInfo.grade,
            lessonsInMonth: 0,
            note: "Chưa có dữ liệu điểm danh",
          });
          continue;
        }

        // Đếm số buổi dạy trong tháng
        const lessonsInMonth = attendance.records.filter((record) => {
          const recordDate = new Date(record.date);
          return (
            recordDate.getMonth() + 1 === parseInt(month) &&
            recordDate.getFullYear() === parseInt(year)
          );
        }).length;

        totalLessons += lessonsInMonth;

        classDetails.push({
          classId: classId,
          className: classInfo.className,
          grade: classInfo.grade,
          lessonsInMonth: lessonsInMonth,
          studentCount: classInfo.studentList
            ? classInfo.studentList.length
            : 0,
        });
      }
    }

    // Tính lương dựa trên số buổi và mức lương/buổi
    const wagePerLesson = teacher.wagePerLesson || 0;
    const totalWageAmount = totalLessons * wagePerLesson;

    // Kiểm tra xem đã có bản ghi lương chính thức chưa
    const existingWageRecord = await TeacherWage.findOne({
      teacherId,
      month: parseInt(month),
      year: parseInt(year),
    });

    return res.status(200).json({
      msg: "Lấy thông tin lương giáo viên thành công",
      data: {
        teacherInfo: {
          teacherId: teacher._id,
          name: teacher.userId?.name || "Unknown",
          email: teacher.userId?.email || "",
          phone: teacher.userId?.phoneNumber || "",
          wagePerLesson: wagePerLesson,
        },
        period: {
          month: parseInt(month),
          year: parseInt(year),
        },
        wageCalculation: {
          totalClasses: teacher.classId ? teacher.classId.length : 0,
          totalLessons: totalLessons,
          wagePerLesson: wagePerLesson,
          totalWageAmount: totalWageAmount,
          isOfficiallyCalculated: !!existingWageRecord,
          officialAmount: existingWageRecord ? existingWageRecord.amount : null,
          paymentDate: existingWageRecord
            ? existingWageRecord.paymentDate
            : null,
        },
        classDetails: classDetails,
        summary: {
          hasClasses: classDetails.length > 0,
          hasLessons: totalLessons > 0,
          status: totalLessons > 0 ? "Có buổi dạy" : "Không có buổi dạy",
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Lỗi khi lấy thông tin lương giáo viên",
      error: error.message,
    });
  }
};

// Legacy functions for backward compatibility (will be deprecated)
const createPayment = paymentController.createPayment;
const getStudentPayments = paymentController.getStudentPayments;
const getPaymentSummary = paymentController.getPaymentSummary;
const addPayment = paymentController.addPaymentRecord;

module.exports = {
  // New unified controller methods
  ...paymentController,

  // Legacy methods for backward compatibility
  generateMonthlyPayment,
  recordPayment,
  getPaymentOverview,
  calculateTeacherWage,
  getTeacherWages,
  createPayment,
  getStudentPayments,
  getPaymentSummary,
  addPayment,
};
