const { Class } = require("../models");

const createNewClass = async (req, res) => {
  let { className, year, availability, feePerLesson, schedule } = req.body;
  await Class.create({
    className: className,
    year: year,
    isAvailable: availability,
    feePerLesson: feePerLesson,
    schedule: {
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      daysOfLessonInWeek: schedule.daysOfLessonInWeek.map((day) =>
        parseInt(day)
      ),
    },
    studentList: req.body.studentList,
  });
  res.status(200).json({
    msg: "Tạo lớp thành công",
  });
};

const getAllClasses = async (req, res) => {
  try {
    const classes = await Class.find()
      .populate({
        path: "teacherId",
        populate: {
          path: "userId",
          select: "name email phoneNumber",
        },
      })
      .populate({
        path: "studentList",
        populate: {
          path: "userId",
          select: "name email phoneNumber",
        },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách lớp thành công",
      data: classes,
      total: classes.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách lớp",
      error: error.message,
    });
  }
};

module.exports = {
  createNewClass,
  getAllClasses,
};
