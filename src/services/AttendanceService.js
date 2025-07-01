const {
  Attendance,
  Class,
  Student,
  Payment,
  TeacherWage,
} = require("../models");
const BaseService = require("../core/utils/BaseService");
const RelationshipService = require("../core/utils/RelationshipService");
const AppError = require("../core/errors/AppError");
const withTransaction = require("../utils/session");

class AttendanceService extends BaseService {
  constructor() {
    super(Attendance);
    this.relationships = new RelationshipService({
      class: {
        model: Class,
        field: "classId",
        inverse: null,
      },
      students: {
        model: Student,
        field: "studentList.studentId",
        inverse: null,
      },
    });
  }

  /**
   * Create new attendance record
   * @param {Object} attendanceData - Attendance data
   * @returns {Object} Created attendance
   */
  async create(attendanceData) {
    return await withTransaction(async (session) => {
      const { classId, date, lessonNumber, studentList = [] } = attendanceData;

      // Validate required fields
      if (!classId || !date) {
        throw new AppError("Missing required fields: classId, date", 400);
      }

      // Validate class exists and is available
      const classData = await Class.findById(classId)
        .populate("studentList")
        .populate("teacherId")
        .session(session);

      if (!classData) {
        throw new AppError("Class not found", 404);
      }

      if (!classData.isAvailable) {
        throw new AppError("Class is not available", 400);
      }

      // Validate attendance date matches class schedule
      await this.validateAttendanceDate(classData, this.parseDateSafely(date));

      // Check if attendance already exists for this date
      const attendanceDate = this.parseDateSafely(date);
      const startOfDay = new Date(attendanceDate.getTime());
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(attendanceDate.getTime());
      endOfDay.setHours(23, 59, 59, 999);

      const existingAttendance = await this.model
        .findOne({
          classId,
          date: {
            $gte: startOfDay,
            $lte: endOfDay,
          },
        })
        .session(session);

      if (existingAttendance) {
        throw new AppError("Attendance already exists for this date", 409);
      }

      // Prepare student list with default absent status
      let attendanceStudentList = [];
      if (studentList.length > 0) {
        // Use provided student list
        attendanceStudentList = studentList.map((student) => ({
          studentId: student.studentId,
          status: student.status || "absent",
          note: student.note || "",
        }));
      } else {
        // Auto-populate with all students in class
        attendanceStudentList = classData.studentList.map((student) => ({
          studentId: student._id,
          status: "absent",
          note: "",
        }));
      }

      // Create attendance record
      const attendance = await this.model.create(
        [
          {
            classId,
            date: attendanceDate,
            lessonNumber: lessonNumber || 1,
            studentList: attendanceStudentList,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        { session }
      );

      return attendance[0];
    });
  }

  /**
   * Mark class attendance and update payments/wages
   * @param {String} attendanceId - Attendance ID
   * @param {Array} studentAttendance - Student attendance data
   * @returns {Object} Updated attendance
   */
  async markAttendance(attendanceId, studentAttendance) {
    return await withTransaction(async (session) => {
      const attendance = await this.model
        .findById(attendanceId)
        .populate({
          path: "classId",
          populate: {
            path: "teacherId",
            select: "wagePerLesson",
          },
        })
        .session(session);

      if (!attendance) {
        throw new AppError("Attendance record not found", 404);
      }

      // Update student attendance
      const updatedStudentList = attendance.studentList.map((student) => {
        const attendanceUpdate = studentAttendance.find(
          (update) =>
            update.studentId.toString() === student.studentId.toString()
        );

        if (attendanceUpdate) {
          return {
            ...student.toObject(),
            status: attendanceUpdate.status,
            note: attendanceUpdate.note || student.note,
          };
        }
        return student;
      });

      // Update attendance record
      await this.model.findByIdAndUpdate(
        attendanceId,
        {
          studentList: updatedStudentList,
          updatedAt: new Date(),
        },
        { session }
      );

      // Update payment records for present students
      await this.updatePaymentRecords(attendance, updatedStudentList, session);

      // Update teacher wage
      await this.updateTeacherWage(attendance, updatedStudentList, session);

      return await this.getById(attendanceId);
    });
  }

  /**
   * Get attendance by ID with populated data
   * @param {String} attendanceId - Attendance ID
   * @returns {Object} Attendance data
   */
  async getById(attendanceId) {
    if (!attendanceId) {
      throw new AppError("Attendance ID is required", 400);
    }

    const attendance = await this.model
      .findById(attendanceId)
      .populate({
        path: "classId",
        select: "className grade year feePerLesson",
        populate: {
          path: "teacherId",
          select: "userId wagePerLesson",
          populate: {
            path: "userId",
            select: "name email",
          },
        },
      })
      .populate({
        path: "studentList.studentId",
        select: "userId",
        populate: {
          path: "userId",
          select: "name email phoneNumber",
        },
      });

    if (!attendance) {
      throw new AppError("Attendance not found", 404);
    }

    return attendance;
  }

  /**
   * Get all attendance records with filtering
   * @param {Object} filter - Filter criteria
   * @param {Object} options - Query options
   * @returns {Object} Attendance data with pagination
   */
  async getAll(filter = {}, options = {}) {
    const {
      page = 1,
      limit = 10,
      populate = true,
      sortBy = "date",
      sortOrder = "desc",
    } = options;

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    let query = this.model
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    if (populate) {
      query = query.populate([
        {
          path: "classId",
          select: "className grade year feePerLesson",
        },
        {
          path: "studentList.studentId",
          select: "userId",
          populate: {
            path: "userId",
            select: "name email",
          },
        },
      ]);
    }

    const attendanceRecords = await query;
    const total = await this.model.countDocuments(filter);

    return {
      attendanceRecords,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get attendance by class ID
   * @param {String} classId - Class ID
   * @param {Object} options - Query options
   * @returns {Array} Attendance records
   */
  async getByClassId(classId, options = {}) {
    const { startDate, endDate, page = 1, limit = 10 } = options;

    const filter = { classId };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    return await this.getAll(filter, { page, limit });
  }

  /**
   * Get attendance statistics for a class
   * @param {String} classId - Class ID
   * @param {Object} options - Options
   * @returns {Object} Attendance statistics
   */
  async getAttendanceStats(classId, options = {}) {
    const { startDate, endDate } = options;

    const matchStage = { classId: classId };
    if (startDate || endDate) {
      matchStage.date = {};
      if (startDate) matchStage.date.$gte = new Date(startDate);
      if (endDate) matchStage.date.$lte = new Date(endDate);
    }

    const stats = await this.model.aggregate([
      { $match: matchStage },
      { $unwind: "$studentList" },
      {
        $group: {
          _id: "$studentList.studentId",
          totalSessions: { $sum: 1 },
          presentSessions: {
            $sum: {
              $cond: [{ $eq: ["$studentList.status", "present"] }, 1, 0],
            },
          },
          absentSessions: {
            $sum: { $cond: [{ $eq: ["$studentList.status", "absent"] }, 1, 0] },
          },
        },
      },
      {
        $addFields: {
          attendanceRate: {
            $round: [
              {
                $multiply: [
                  { $divide: ["$presentSessions", "$totalSessions"] },
                  100,
                ],
              },
              2,
            ],
          },
        },
      },
      {
        $lookup: {
          from: "students",
          localField: "_id",
          foreignField: "_id",
          as: "student",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "student.userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $project: {
          studentId: "$_id",
          studentName: { $arrayElemAt: ["$user.name", 0] },
          totalSessions: 1,
          presentSessions: 1,
          absentSessions: 1,
          attendanceRate: 1,
        },
      },
    ]);

    return stats;
  }

  /**
   * Update payment records for present students
   * @param {Object} attendance - Attendance record
   * @param {Array} studentList - Updated student list
   * @param {Object} session - Database session
   */
  async updatePaymentRecords(attendance, studentList, session) {
    const presentStudents = studentList.filter(
      (student) => student.status === "present"
    );
    const classData = attendance.classId;

    for (const student of presentStudents) {
      await Payment.findOneAndUpdate(
        {
          studentId: student.studentId,
          classId: attendance.classId._id,
          month: attendance.date.getMonth() + 1,
          year: attendance.date.getFullYear(),
        },
        {
          $inc: {
            totalAttended: 1,
            totalAmount: classData.feePerLesson,
          },
          $setOnInsert: {
            studentId: student.studentId,
            classId: attendance.classId._id,
            month: attendance.date.getMonth() + 1,
            year: attendance.date.getFullYear(),
            totalLessons: 0,
            isPaid: false,
            createdAt: new Date(),
          },
          updatedAt: new Date(),
        },
        { upsert: true, session }
      );
    }
  }

  /**
   * Update teacher wage for the lesson
   * @param {Object} attendance - Attendance record
   * @param {Array} studentList - Updated student list
   * @param {Object} session - Database session
   */
  async updateTeacherWage(attendance, studentList, session) {
    const classData = attendance.classId;
    const presentCount = studentList.filter(
      (student) => student.status === "present"
    ).length;

    if (classData.teacherId && presentCount > 0) {
      const wageAmount = classData.teacherId.wagePerLesson;

      await TeacherWage.findOneAndUpdate(
        {
          teacherId: classData.teacherId._id,
          classId: attendance.classId._id,
          month: attendance.date.getMonth() + 1,
          year: attendance.date.getFullYear(),
        },
        {
          $inc: {
            totalLessons: 1,
            totalAmount: wageAmount,
          },
          $setOnInsert: {
            teacherId: classData.teacherId._id,
            classId: attendance.classId._id,
            month: attendance.date.getMonth() + 1,
            year: attendance.date.getFullYear(),
            isPaid: false,
            createdAt: new Date(),
          },
          updatedAt: new Date(),
        },
        { upsert: true, session }
      );
    }
  }

  /**
   * Validate attendance date against class schedule
   * @param {Object} classData - Class data
   * @param {Date} attendanceDate - Attendance date
   */
  async validateAttendanceDate(classData, attendanceDate) {
    if (!classData.schedule || classData.schedule.length === 0) {
      return; // No schedule validation needed
    }

    const dayOfWeek = attendanceDate.toLocaleDateString("en-US", {
      weekday: "long",
    });
    const hasScheduleForDay = classData.schedule.some(
      (schedule) => schedule.day === dayOfWeek
    );

    if (!hasScheduleForDay) {
      throw new AppError(`Class does not have schedule for ${dayOfWeek}`, 400);
    }
  }

  /**
   * Safely parse date string
   * @param {String|Date} dateInput - Date input
   * @returns {Date} Parsed date
   */
  parseDateSafely(dateInput) {
    if (dateInput instanceof Date) {
      return dateInput;
    }

    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      throw new AppError("Invalid date format", 400);
    }

    return date;
  }

  /**
   * Delete attendance record
   * @param {String} attendanceId - Attendance ID
   * @returns {Object} Success message
   */
  async deleteById(attendanceId) {
    return await withTransaction(async (session) => {
      const attendance = await this.findById(attendanceId);
      if (!attendance) {
        throw new AppError("Attendance record not found", 404);
      }

      // Note: You might want to handle payment/wage rollback here
      // depending on business requirements

      await this.model.findByIdAndDelete(attendanceId, { session });
      return { message: "Attendance record deleted successfully" };
    });
  }
}

module.exports = AttendanceService;
