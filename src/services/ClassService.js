const { Class, Teacher, Student, Attendance } = require("../models");
const BaseService = require("../core/utils/BaseService");
const RelationshipService = require("../core/utils/RelationshipService");
const AppError = require("../core/errors/AppError");
const withTransaction = require("../utils/session");

class ClassService extends BaseService {
  constructor() {
    super(Class);
    this.relationships = new RelationshipService({
      teacher: {
        model: Teacher,
        field: "teacherId",
        inverse: "classId",
      },
      students: {
        model: Student,
        field: "studentList",
        inverse: "classId",
      },
    });
  }

  /**
   * Create a new class with relationships
   * @param {Object} classData - Class data
   * @returns {Object} Created class
   */
  async create(classData) {
    return await withTransaction(async (session) => {
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
        throw new AppError(
          "Missing required fields: className, year, grade",
          400
        );
      }

      // Check if class already exists
      const existingClass = await this.findOne({
        className,
        year,
        grade,
      });

      if (existingClass) {
        throw new AppError(
          "Class already exists with this name, year and grade",
          409
        );
      }

      // Create the class
      const newClass = await this.model.create(
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

      const classInstance = newClass[0];

      // Handle teacher relationship
      if (teacherId) {
        await this.relationships.addRelationship(
          "teacher",
          classInstance._id,
          teacherId,
          session
        );
      }

      // Handle student relationships
      if (studentList.length > 0) {
        await this.relationships.addManyRelationships(
          "students",
          classInstance._id,
          studentList,
          session
        );
      }

      return classInstance;
    });
  }

  /**
   * Get class by ID with optional populated data
   * @param {String} classId - Class ID
   * @param {Object} options - Population options
   * @returns {Object} Class data
   */
  async getById(classId, options = {}) {
    if (!classId) {
      throw new AppError("Class ID is required", 400);
    }

    const {
      schedule = false,
      students = false,
      attendance = false,
      detailed = false,
      scheduleOnly = false,
    } = options;

    // Convert string booleans to actual booleans
    const opts = {
      schedule: schedule === true || schedule === "true",
      students: students === true || students === "true",
      attendance: attendance === true || attendance === "true",
      detailed: detailed === true || detailed === "true",
      scheduleOnly: scheduleOnly === true || scheduleOnly === "true",
    };

    if (opts.scheduleOnly) {
      const classData = await this.model
        .findById(classId)
        .select("className schedule");
      if (!classData) {
        throw new AppError("Class not found", 404);
      }
      return classData;
    }

    let query = this.model.findById(classId);

    // Select fields based on options
    let selectFields =
      "_id className year grade isAvailable feePerLesson teacherId studentList createdAt updatedAt";
    if (opts.schedule || opts.detailed) {
      selectFields += " schedule";
    }

    query = query.select(selectFields);

    // Always populate teacher info
    query = query.populate({
      path: "teacherId",
      select: "userId wagePerLesson",
      populate: {
        path: "userId",
        select: "name email phoneNumber",
      },
    });

    // Populate students if requested
    if (opts.students) {
      const studentPopulate = {
        path: "studentList",
        select: "userId parentId",
        populate: [
          {
            path: "userId",
            select: "name email phoneNumber",
          },
        ],
      };

      // Add parent info if detailed
      if (opts.detailed) {
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
      throw new AppError("Class not found", 404);
    }

    // Add attendance stats if requested
    if (opts.attendance) {
      const attendanceStats = await this.getAttendanceStats(classId);
      classData.attendanceStats = attendanceStats;
    }

    return classData;
  }

  /**
   * Update class with relationship management
   * @param {String} classId - Class ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated class
   */
  async updateById(classId, updateData) {
    return await withTransaction(async (session) => {
      const existingClass = await this.getById(classId);
      if (!existingClass) {
        throw new AppError("Class not found", 404);
      }

      const { teacherId, studentList, ...otherUpdates } = updateData;

      // Update basic fields
      if (Object.keys(otherUpdates).length > 0) {
        await this.model.findByIdAndUpdate(classId, otherUpdates, { session });
      }

      // Handle teacher relationship changes
      if (teacherId !== undefined) {
        if (
          existingClass.teacherId &&
          teacherId !== existingClass.teacherId.toString()
        ) {
          // Remove old teacher relationship
          await this.relationships.removeRelationship(
            "teacher",
            classId,
            existingClass.teacherId,
            session
          );
        }

        if (teacherId) {
          // Add new teacher relationship
          await this.relationships.addRelationship(
            "teacher",
            classId,
            teacherId,
            session
          );
        }

        await this.model.findByIdAndUpdate(classId, { teacherId }, { session });
      }

      // Handle student list changes
      if (studentList !== undefined) {
        const currentStudentIds = existingClass.studentList.map(
          (s) => s._id?.toString() || s.toString()
        );
        const newStudentIds = studentList.map((s) => s.toString());

        // Remove students no longer in the list
        const studentsToRemove = currentStudentIds.filter(
          (id) => !newStudentIds.includes(id)
        );
        for (const studentId of studentsToRemove) {
          await this.relationships.removeRelationship(
            "students",
            classId,
            studentId,
            session
          );
        }

        // Add new students
        const studentsToAdd = newStudentIds.filter(
          (id) => !currentStudentIds.includes(id)
        );
        for (const studentId of studentsToAdd) {
          await this.relationships.addRelationship(
            "students",
            classId,
            studentId,
            session
          );
        }

        await this.model.findByIdAndUpdate(
          classId,
          { studentList },
          { session }
        );
      }

      return await this.getById(classId);
    });
  }

  /**
   * Delete class and handle relationships
   * @param {String} classId - Class ID
   * @returns {Object} Success message
   */
  async deleteById(classId) {
    return await withTransaction(async (session) => {
      const classData = await this.getById(classId);
      if (!classData) {
        throw new AppError("Class not found", 404);
      }

      // Remove teacher relationship
      if (classData.teacherId) {
        await this.relationships.removeRelationship(
          "teacher",
          classId,
          classData.teacherId._id,
          session
        );
      }

      // Remove student relationships
      if (classData.studentList && classData.studentList.length > 0) {
        for (const student of classData.studentList) {
          await this.relationships.removeRelationship(
            "students",
            classId,
            student._id,
            session
          );
        }
      }

      await this.model.findByIdAndDelete(classId, { session });
      return { message: "Class deleted successfully" };
    });
  }

  /**
   * Get all classes with optional filters and population
   * @param {Object} filter - Filter criteria
   * @param {Object} options - Query options
   * @returns {Object} Classes data with pagination
   */
  async getAll(filter = {}, options = {}) {
    const {
      page = 1,
      limit = 10,
      populate = false,
      sortBy = "createdAt",
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
          path: "teacherId",
          select: "userId wagePerLesson",
          populate: {
            path: "userId",
            select: "name email phoneNumber",
          },
        },
        {
          path: "studentList",
          select: "userId",
          populate: {
            path: "userId",
            select: "name email phoneNumber",
          },
        },
      ]);
    }

    const classes = await query;
    const total = await this.model.countDocuments(filter);

    return {
      classes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Add student to class
   * @param {String} classId - Class ID
   * @param {String} studentId - Student ID
   * @returns {Object} Updated class
   */
  async addStudent(classId, studentId) {
    return await withTransaction(async (session) => {
      const classExists = await this.findById(classId);
      if (!classExists) {
        throw new AppError("Class not found", 404);
      }

      const studentExists = await Student.findById(studentId);
      if (!studentExists) {
        throw new AppError("Student not found", 404);
      }

      if (classExists.studentList.includes(studentId)) {
        throw new AppError("Student already in this class", 409);
      }

      await this.relationships.addRelationship(
        "students",
        classId,
        studentId,
        session
      );

      await this.model.findByIdAndUpdate(
        classId,
        { $addToSet: { studentList: studentId } },
        { session }
      );

      return await this.getById(classId, { students: true });
    });
  }

  /**
   * Remove student from class
   * @param {String} classId - Class ID
   * @param {String} studentId - Student ID
   * @returns {Object} Updated class
   */
  async removeStudent(classId, studentId) {
    return await withTransaction(async (session) => {
      const classExists = await this.findById(classId);
      if (!classExists) {
        throw new AppError("Class not found", 404);
      }

      if (!classExists.studentList.includes(studentId)) {
        throw new AppError("Student not in this class", 404);
      }

      await this.relationships.removeRelationship(
        "students",
        classId,
        studentId,
        session
      );

      await this.model.findByIdAndUpdate(
        classId,
        { $pull: { studentList: studentId } },
        { session }
      );

      return await this.getById(classId, { students: true });
    });
  }

  /**
   * Get attendance statistics for a class
   * @param {String} classId - Class ID
   * @returns {Object} Attendance statistics
   */
  async getAttendanceStats(classId) {
    const attendanceRecords = await Attendance.find({ classId });

    if (!attendanceRecords.length) {
      return {
        totalSessions: 0,
        averageAttendance: 0,
        attendanceByStudent: {},
      };
    }

    const totalSessions = attendanceRecords.length;
    let totalAttendees = 0;
    const attendanceByStudent = {};

    attendanceRecords.forEach((record) => {
      record.studentList.forEach((student) => {
        const studentId = student.studentId.toString();
        if (!attendanceByStudent[studentId]) {
          attendanceByStudent[studentId] = {
            present: 0,
            total: 0,
            percentage: 0,
          };
        }

        attendanceByStudent[studentId].total++;
        if (student.status === "present") {
          attendanceByStudent[studentId].present++;
          totalAttendees++;
        }
      });
    });

    // Calculate percentages
    Object.keys(attendanceByStudent).forEach((studentId) => {
      const stats = attendanceByStudent[studentId];
      stats.percentage = Math.round((stats.present / stats.total) * 100);
    });

    const averageAttendance =
      totalSessions > 0
        ? Math.round(
            (totalAttendees /
              (Object.keys(attendanceByStudent).length * totalSessions)) *
              100
          )
        : 0;

    return {
      totalSessions,
      averageAttendance,
      attendanceByStudent,
    };
  }

  /**
   * Get classes by teacher ID
   * @param {String} teacherId - Teacher ID
   * @returns {Array} Classes taught by the teacher
   */
  async getByTeacherId(teacherId) {
    return await this.model.find({ teacherId }).populate({
      path: "studentList",
      select: "userId",
      populate: {
        path: "userId",
        select: "name email phoneNumber",
      },
    });
  }

  /**
   * Get classes by student ID
   * @param {String} studentId - Student ID
   * @returns {Array} Classes the student is enrolled in
   */
  async getByStudentId(studentId) {
    return await this.model.find({ studentList: studentId }).populate({
      path: "teacherId",
      select: "userId wagePerLesson",
      populate: {
        path: "userId",
        select: "name email phoneNumber",
      },
    });
  }
}

module.exports = ClassService;
