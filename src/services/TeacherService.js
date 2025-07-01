const { Teacher, User, Class } = require("../models");
const BaseService = require("../core/utils/BaseService");
const RelationshipService = require("../core/utils/RelationshipService");
const AppError = require("../core/errors/AppError");
const withTransaction = require("../utils/session");

class TeacherService extends BaseService {
  constructor() {
    super(Teacher);
    this.relationships = new RelationshipService({
      user: {
        model: User,
        field: "userId",
        inverse: null,
      },
      classes: {
        model: Class,
        field: "classId",
        inverse: "teacherId",
      },
    });
  }

  /**
   * Create a new teacher with user account
   * @param {Object} teacherData - Teacher data including user info
   * @returns {Object} Created teacher
   */
  async create(teacherData) {
    return await withTransaction(async (session) => {
      const {
        name,
        email,
        password,
        phoneNumber,
        address,
        gender,
        wagePerLesson = 0,
        classId = [],
      } = teacherData;

      // Validate required fields
      if (!name || !email || !password) {
        throw new AppError(
          "Missing required fields: name, email, password",
          400
        );
      }

      // Check if email already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new AppError("Email already exists", 409);
      }

      // Create user account
      const user = await User.create(
        [
          {
            name,
            email,
            password, // Will be hashed by pre-save middleware
            phoneNumber,
            address,
            gender,
            role: "Teacher",
            isActive: true,
          },
        ],
        { session }
      );

      // Create teacher record
      const teacher = await this.model.create(
        [
          {
            userId: user[0]._id,
            classId: Array.isArray(classId)
              ? classId
              : classId
              ? [classId]
              : [],
            wagePerLesson,
          },
        ],
        { session }
      );

      // Handle class relationships
      if (classId && classId.length > 0) {
        const classIds = Array.isArray(classId) ? classId : [classId];

        // Validate classes exist
        const validClasses = await Class.find({
          _id: { $in: classIds },
        }).session(session);

        if (validClasses.length !== classIds.length) {
          throw new AppError("Some classes do not exist", 404);
        }

        // Update class relationships
        for (const classIdItem of classIds) {
          await this.relationships.addRelationship(
            "classes",
            teacher[0]._id,
            classIdItem,
            session
          );
        }
      }

      return teacher[0];
    });
  }

  /**
   * Get teacher by ID with populated data
   * @param {String} teacherId - Teacher ID
   * @param {Object} options - Population options
   * @returns {Object} Teacher data
   */
  async getById(teacherId, options = {}) {
    if (!teacherId) {
      throw new AppError("Teacher ID is required", 400);
    }

    const { includeClasses = true, includeUser = true } = options;

    let query = this.model.findById(teacherId);

    if (includeUser) {
      query = query.populate({
        path: "userId",
        select: "name email gender phoneNumber address role isActive",
      });
    }

    if (includeClasses) {
      query = query.populate({
        path: "classId",
        select: "className grade year feePerLesson isAvailable studentList",
        populate: {
          path: "studentList",
          select: "userId",
          populate: {
            path: "userId",
            select: "name email phoneNumber",
          },
        },
      });
    }

    const teacher = await query;
    if (!teacher) {
      throw new AppError("Teacher not found", 404);
    }

    if (includeUser && (!teacher.userId || !teacher.userId.isActive)) {
      throw new AppError("Teacher account is disabled", 403);
    }

    return teacher;
  }

  /**
   * Update teacher information
   * @param {String} teacherId - Teacher ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated teacher
   */
  async updateById(teacherId, updateData) {
    return await withTransaction(async (session) => {
      const teacher = await this.getById(teacherId, { includeUser: false });
      if (!teacher) {
        throw new AppError("Teacher not found", 404);
      }

      const {
        name,
        email,
        phoneNumber,
        address,
        gender,
        wagePerLesson,
        classId,
        isActive,
        ...otherUpdates
      } = updateData;

      // Update user information if provided
      if (
        name ||
        email ||
        phoneNumber ||
        address ||
        gender ||
        isActive !== undefined
      ) {
        const userUpdates = {};
        if (name) userUpdates.name = name;
        if (email) userUpdates.email = email;
        if (phoneNumber) userUpdates.phoneNumber = phoneNumber;
        if (address) userUpdates.address = address;
        if (gender) userUpdates.gender = gender;
        if (isActive !== undefined) userUpdates.isActive = isActive;

        await User.findByIdAndUpdate(teacher.userId, userUpdates, { session });
      }

      // Update teacher-specific fields
      const teacherUpdates = {};
      if (wagePerLesson !== undefined)
        teacherUpdates.wagePerLesson = wagePerLesson;
      if (Object.keys(otherUpdates).length > 0) {
        Object.assign(teacherUpdates, otherUpdates);
      }

      if (Object.keys(teacherUpdates).length > 0) {
        await this.model.findByIdAndUpdate(teacherId, teacherUpdates, {
          session,
        });
      }

      // Handle class relationships
      if (classId !== undefined) {
        const newClassIds = Array.isArray(classId)
          ? classId
          : classId
          ? [classId]
          : [];
        const currentClassIds = teacher.classId.map((id) => id.toString());

        // Remove old class relationships
        const classesToRemove = currentClassIds.filter(
          (id) => !newClassIds.includes(id)
        );
        for (const classIdItem of classesToRemove) {
          await this.relationships.removeRelationship(
            "classes",
            teacherId,
            classIdItem,
            session
          );
        }

        // Add new class relationships
        const classesToAdd = newClassIds.filter(
          (id) => !currentClassIds.includes(id)
        );
        for (const classIdItem of classesToAdd) {
          await this.relationships.addRelationship(
            "classes",
            teacherId,
            classIdItem,
            session
          );
        }

        // Update teacher's classId array
        await this.model.findByIdAndUpdate(
          teacherId,
          { classId: newClassIds },
          { session }
        );
      }

      return await this.getById(teacherId);
    });
  }

  /**
   * Delete teacher and handle relationships
   * @param {String} teacherId - Teacher ID
   * @returns {Object} Success message
   */
  async deleteById(teacherId) {
    return await withTransaction(async (session) => {
      const teacher = await this.getById(teacherId, { includeUser: false });
      if (!teacher) {
        throw new AppError("Teacher not found", 404);
      }

      // Remove class relationships
      if (teacher.classId && teacher.classId.length > 0) {
        for (const classIdItem of teacher.classId) {
          await this.relationships.removeRelationship(
            "classes",
            teacherId,
            classIdItem,
            session
          );
        }
      }

      // Delete teacher record
      await this.model.findByIdAndDelete(teacherId, { session });

      // Deactivate user account instead of deleting
      await User.findByIdAndUpdate(
        teacher.userId,
        { isActive: false },
        { session }
      );

      return { message: "Teacher deleted successfully" };
    });
  }

  /**
   * Get all teachers with filtering and pagination
   * @param {Object} filter - Filter criteria
   * @param {Object} options - Query options
   * @returns {Object} Teachers data with pagination
   */
  async getAll(filter = {}, options = {}) {
    const {
      page = 1,
      limit = 10,
      populate = true,
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
          path: "userId",
          select: "name email gender phoneNumber address isActive",
        },
        {
          path: "classId",
          select: "className grade year feePerLesson isAvailable",
        },
      ]);
    }

    const teachers = await query;
    const total = await this.model.countDocuments(filter);

    return {
      teachers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get available teachers (not assigned to classes)
   * @returns {Array} Available teachers
   */
  async getAvailableTeachers() {
    return await this.model
      .find({
        $or: [{ classId: { $exists: false } }, { classId: { $size: 0 } }],
      })
      .populate({
        path: "userId",
        select: "name email phoneNumber",
        match: { isActive: true },
      });
  }

  /**
   * Get teacher by user ID
   * @param {String} userId - User ID
   * @returns {Object} Teacher data
   */
  async getByUserId(userId) {
    const teacher = await this.model
      .findOne({ userId })
      .populate({
        path: "userId",
        select: "name email gender phoneNumber address role isActive",
      })
      .populate({
        path: "classId",
        select: "className grade year feePerLesson isAvailable",
      });

    if (!teacher) {
      throw new AppError("Teacher not found", 404);
    }

    return teacher;
  }

  /**
   * Assign teacher to class
   * @param {String} teacherId - Teacher ID
   * @param {String} classId - Class ID
   * @returns {Object} Updated teacher
   */
  async assignToClass(teacherId, classId) {
    return await withTransaction(async (session) => {
      const teacher = await this.findById(teacherId);
      if (!teacher) {
        throw new AppError("Teacher not found", 404);
      }

      const classExists = await Class.findById(classId);
      if (!classExists) {
        throw new AppError("Class not found", 404);
      }

      if (teacher.classId.includes(classId)) {
        throw new AppError("Teacher already assigned to this class", 409);
      }

      await this.relationships.addRelationship(
        "classes",
        teacherId,
        classId,
        session
      );

      await this.model.findByIdAndUpdate(
        teacherId,
        { $addToSet: { classId: classId } },
        { session }
      );

      return await this.getById(teacherId);
    });
  }

  /**
   * Remove teacher from class
   * @param {String} teacherId - Teacher ID
   * @param {String} classId - Class ID
   * @returns {Object} Updated teacher
   */
  async removeFromClass(teacherId, classId) {
    return await withTransaction(async (session) => {
      const teacher = await this.findById(teacherId);
      if (!teacher) {
        throw new AppError("Teacher not found", 404);
      }

      if (!teacher.classId.includes(classId)) {
        throw new AppError("Teacher not assigned to this class", 404);
      }

      await this.relationships.removeRelationship(
        "classes",
        teacherId,
        classId,
        session
      );

      await this.model.findByIdAndUpdate(
        teacherId,
        { $pull: { classId: classId } },
        { session }
      );

      return await this.getById(teacherId);
    });
  }
}

module.exports = TeacherService;
