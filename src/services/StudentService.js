const { Student, User } = require("../models");
const { BaseService } = require("../core/utils");
const { NotFoundError, ValidationError } = require("../core/errors/AppError");
const RelationshipService = require("../core/utils/RelationshipService");

/**
 * Student Management Service
 * Handles basic CRUD operations for students
 */
class StudentService extends BaseService {
  constructor() {
    super(Student);
  }

  /**
   * Create new student with user account
   */
  async createStudent(studentData) {
    return await this.withTransaction(async (session) => {
      const { name, email, password, gender, phoneNumber, address, parentId } =
        studentData;

      // Create user account
      const user = await User.create(
        [
          {
            name,
            email,
            password,
            gender,
            phoneNumber,
            address,
            role: "Student",
            isActive: true,
          },
        ],
        { session }
      );

      // Create student profile
      const student = await Student.create(
        [
          {
            userId: user[0]._id,
            parentId: parentId || null,
            classId: [],
          },
        ],
        { session }
      );

      // Link with parent if provided
      if (parentId) {
        await RelationshipService.linkParentStudent(
          parentId,
          student[0]._id,
          session
        );
      }

      return await this.getStudentById(student[0]._id);
    });
  }

  /**
   * Get student by ID with full details
   */
  async getStudentById(studentId) {
    const student = await this.findById(studentId, [
      {
        path: "userId",
        select: "name email gender phoneNumber address role isActive",
      },
      {
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
      },
      {
        path: "parentId",
        select: "userId canSeeTeacher",
        populate: {
          path: "userId",
          select: "name email phoneNumber isActive",
        },
      },
    ]);

    if (!student) {
      throw new NotFoundError("Học sinh");
    }

    if (!student.userId || !student.userId.isActive) {
      throw new ValidationError("Học sinh đã bị vô hiệu hóa");
    }

    return student;
  }

  /**
   * Update student information
   */
  async updateStudent(studentId, updateData) {
    return await this.withTransaction(async (session) => {
      const student = await Student.findById(studentId).session(session);
      if (!student) {
        throw new NotFoundError("Học sinh");
      }

      const { parentId, ...userFields } = updateData;

      // Update user information
      if (Object.keys(userFields).length > 0) {
        await User.findByIdAndUpdate(student.userId, userFields, {
          session,
          runValidators: true,
        });
      }

      // Handle parent relationship change
      if (parentId !== undefined && parentId !== student.parentId?.toString()) {
        await RelationshipService.transferStudentToNewParent(
          studentId,
          student.parentId,
          parentId,
          session
        );
      }

      return await this.getStudentById(studentId);
    });
  }

  /**
   * Delete student and user account
   */
  async deleteStudent(studentId) {
    return await this.withTransaction(async (session) => {
      const student = await Student.findById(studentId).session(session);
      if (!student) {
        throw new NotFoundError("Học sinh");
      }

      // Remove from all classes
      if (student.classId && student.classId.length > 0) {
        for (const classId of student.classId) {
          await RelationshipService.removeStudentFromClass(
            studentId,
            classId,
            session
          );
        }
      }

      // Remove parent relationship
      if (student.parentId) {
        await RelationshipService.unlinkParentStudent(
          student.parentId,
          studentId,
          session
        );
      }

      // Delete student record
      await Student.findByIdAndDelete(studentId).session(session);

      // Delete user account
      await User.findByIdAndDelete(student.userId).session(session);

      return { message: "Xóa học sinh thành công" };
    });
  }

  /**
   * Soft delete student (deactivate)
   */
  async deactivateStudent(studentId) {
    const student = await Student.findById(studentId).populate("userId");
    if (!student) {
      throw new NotFoundError("Học sinh");
    }

    await User.findByIdAndUpdate(
      student.userId._id,
      { isActive: false },
      { runValidators: true }
    );

    return {
      id: student._id,
      userId: student.userId._id,
      email: student.userId.email,
      name: student.userId.name,
      isActive: false,
    };
  }

  /**
   * Get all students with filters and pagination
   */
  async getAllStudents(filters = {}, options = {}) {
    const { isActive, ...studentFilters } = filters;

    // Build user match condition for isActive filter
    let userMatch = {};
    if (isActive !== undefined) {
      userMatch.isActive = isActive;
    }

    const populateOptions = [
      {
        path: "userId",
        select: "name email gender phoneNumber address role isActive",
        match: userMatch,
      },
      {
        path: "parentId",
        select: "userId",
        populate: {
          path: "userId",
          select: "name email phoneNumber isActive",
          match: userMatch,
        },
      },
      {
        path: "classId",
        select: "className grade year feePerLesson isAvailable",
      },
    ];

    const result = await this.findAll(studentFilters, {
      ...options,
      populate: populateOptions,
    });

    // Filter out students with null userId (due to isActive filter)
    const filteredStudents = result.documents.filter(
      (student) => student.userId !== null
    );

    return {
      students: filteredStudents,
      pagination: result.pagination,
    };
  }
}

module.exports = StudentService;
