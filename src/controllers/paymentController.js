const { Payment, Class, Attendance, Student } = require("../models");
const generateMonthlyPayment = async (req, res) => {
  try {
    const { studentId, classId, month, year } = req.body;

    // Kiểm tra xem đã có payment chưa
    const existingPayment = await Payment.findOne({
      studentId,
      classId,
      month,
      year,
    });

    if (existingPayment) {
      return res.status(400).json({
        msg: "Đã tồn tại học phí cho tháng này",
      });
    }

    // Lấy thông tin lớp học và attendance
    const classData = await Class.findById(classId);
    const attendance = await Attendance.findOne({ classId });

    if (!classData || !attendance) {
      return res.status(404).json({
        msg: "Không tìm thấy thông tin lớp học hoặc điểm danh",
      });
    }

    // Tính toán số buổi học và vắng trong tháng
    const monthRecords = attendance.records.filter((record) => {
      const date = new Date(record.date);
      return (
        date.getMonth() + 1 === parseInt(month) &&
        date.getFullYear() === parseInt(year)
      );
    });

    let totalLessons = monthRecords.length;
    let absentLessons = 0;

    monthRecords.forEach((record) => {
      const studentRecord = record.students.find(
        (s) => s.studentId.toString() === studentId
      );

      if (studentRecord && studentRecord.isAbsent) {
        absentLessons++;
      }
    });

    const attendedLessons = totalLessons - absentLessons;

    // Lấy thông tin học sinh (cho giảm giá)
    const student = await Student.findById(studentId);
    const discountPercentage = student.discountPercentage || 0;

    // Tính học phí
    const originalAmount = attendedLessons * classData.feePerLesson;
    const discountAmount = (originalAmount * discountPercentage) / 100;
    const amountDue = originalAmount - discountAmount;

    // Tạo payment mới
    const newPayment = await Payment.create({
      studentId,
      classId,
      parentId: student.parentId,
      month,
      year,
      discountPercentage,
      originalAmount,
      afterDiscountAmount: amountDue,
      amountDue,
      amountPaid: 0,
      totalLessons,
      attendedLessons,
      absentLessons,
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
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        msg: "Số tiền thanh toán không hợp lệ",
      });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        msg: "Không tìm thấy thông tin học phí",
      });
    }

    // Cập nhật số tiền đã đóng
    const newAmountPaid = payment.amountPaid + amount;

    // Thêm vào lịch sử thanh toán
    payment.paymentHistory.push({
      amount,
      date: new Date(),
    });

    payment.amountPaid = newAmountPaid;
    await payment.save();

    return res.status(200).json({
      msg: "Ghi nhận thanh toán thành công",
      data: payment,
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Lỗi khi ghi nhận thanh toán",
      error: error.message,
    });
  }
};

const calculateTeacherWage = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { month, year } = req.body;

    // Tìm các lớp giáo viên dạy
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ msg: "Không tìm thấy giáo viên" });
    }

    // Tính số buổi dạy trong tháng
    let totalLessons = 0;
    let wageAmount = 0;

    // Duyệt qua từng lớp của giáo viên
    for (const classId of teacher.classId) {
      const attendance = await Attendance.findOne({ classId });
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

    // Tính lương dựa trên số buổi và mức lương/buổi
    wageAmount = totalLessons * teacher.wagePerLesson;

    // Tạo bản ghi lương
    const wage = await TeacherWage.create({
      teacherId,
      amount: wageAmount,
      lessonTaught: totalLessons,
      month: parseInt(month),
      year: parseInt(year),
      paymentDate: new Date(),
    });

    return res.status(201).json({
      msg: "Tính lương giáo viên thành công",
      data: wage,
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Lỗi khi tính lương giáo viên",
      error: error.message,
    });
  }
};

const getTeacherWages = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { month, year } = req.query;

    // Xác thực quyền (nếu là giáo viên, chỉ được xem lương của bản thân)
    if (req.user.role === "Teacher" && req.user._id !== teacherId) {
      return res.status(403).json({
        msg: "Không có quyền xem thông tin lương của giáo viên khác",
      });
    }

    // Tạo filter để tìm kiếm
    const filter = { teacherId };

    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);

    // Lấy lịch sử lương
    const wages = await TeacherWage.find(filter).sort({ year: -1, month: -1 });

    // Tính tổng lương
    const totalAmount = wages.reduce((sum, wage) => sum + wage.amount, 0);

    return res.status(200).json({
      msg: "Lấy thông tin lương thành công",
      data: {
        wages,
        totalAmount,
      },
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Lỗi khi lấy thông tin lương",
      error: error.message,
    });
  }
};
const getPaymentOverview = async (req, res) => {
  try {
    const { month, year } = req.query;

    // Lọc theo tháng/năm nếu có
    const filter = {};
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);

    const payments = await Payment.find(filter)
      .populate("studentId", "userId")
      .populate("classId", "className");

    // Tính toán số liệu thống kê
    const totalDue = payments.reduce((sum, p) => sum + p.amountDue, 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);
    const totalDiscount = payments.reduce(
      (sum, p) => sum + (p.originalAmount - p.afterDiscountAmount),
      0
    );

    return res.status(200).json({
      msg: "Lấy thống kê học phí thành công",
      data: {
        payments,
        overview: {
          totalDue,
          totalPaid,
          totalDiscount,
          remainingDue: totalDue - totalPaid,
          paymentRate:
            totalDue > 0 ? ((totalPaid / totalDue) * 100).toFixed(2) : 0,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Lỗi khi lấy thống kê học phí",
      error: error.message,
    });
  }
};
module.exports = {
  generateMonthlyPayment,
  recordPayment,
  calculateTeacherWage,
  getPaymentOverview,
  getTeacherWages,
};
