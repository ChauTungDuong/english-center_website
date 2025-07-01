const { Parent, User, Student } = require("../models");
const { BaseService } = require("../core/utils");
const { NotFoundError, ValidationError } = require("../core/errors/AppError");
const RelationshipService = require("../core/utils/RelationshipService");

/**
 * Parent Management Service
 * Handles parent-related operations and child relationships
 */
class ParentService extends BaseService {
  constructor() {
    super(Parent);
    this.relationships = new RelationshipService({
      user: {
        model: User,
        field: "userId",
        inverse: null,
      },
      children: {
        model: Student,
        field: "childId",
        inverse: "parentId",
      },
    });
  }

  /**
   * Create new parent with user account
   */
  async createParent(parentData) {
    return await this.withTransaction(async (session) => {
      const {
        name,
        email,
        password,
        gender,
        phoneNumber,
        address,
        childId,
        canSeeTeacher,
      } = parentData;

      // Create user account
      const user = await User.create(
        [
          {
            name,
            email,
            password,
            role: "Parent",
            gender,
            phoneNumber,
            address,
            isActive: true,
          },
        ],
        { session }
      );

      // Handle childId array to ensure it's always an array (can be empty)
      let childIds = [];
      if (childId) {
        childIds = Array.isArray(childId) ? childId : [childId];
      }

      // Create parent profile
      const parent = await Parent.create(
        [
          {
            userId: user[0]._id,
            childId: childIds,
            canSeeTeacher: canSeeTeacher || false,
          },
        ],
        { session }
      );

      // Validate and update students if childIds exist
      if (childIds.length > 0) {
        const validChildren = await Student.find({
          _id: { $in: childIds },
        }).session(session);

        if (validChildren.length !== childIds.length) {
          throw new ValidationError("Một số học sinh không tồn tại");
        }

        // Update students with parent reference
        await Student.updateMany(
          { _id: { $in: childIds } },
          { $set: { parentId: parent[0]._id } },
          { session }
        );
      }

      return await this.getById(parent[0]._id.toString(), session);
    });
  }

  /**
   * Get parent by ID with populated data
   */
  async getById(parentId, session = null) {
    const parent = await Parent.findById(parentId)
      .populate("userId", "name email phoneNumber address gender isActive")
      .populate("childId", "userId")
      .session(session);

    if (!parent) {
      throw new NotFoundError("Phụ huynh không tồn tại");
    }

    // Populate student user data
    if (parent.childId && parent.childId.length > 0) {
      await Parent.populate(parent, {
        path: "childId.userId",
        select: "name email phoneNumber gender",
      });
    }

    return parent;
  }

  /**
   * Update parent information
   */
  async updateParent(parentId, updateData) {
    return await this.withTransaction(async (session) => {
      const parent = await Parent.findById(parentId).session(session);
      if (!parent) {
        throw new NotFoundError("Phụ huynh không tồn tại");
      }

      // Update user information if provided
      const userFields = {};
      const parentFields = {};

      // Separate user and parent fields
      const userUpdateableFields = [
        "name",
        "email",
        "phoneNumber",
        "address",
        "gender",
      ];
      const parentUpdateableFields = ["childId", "canSeeTeacher"];

      Object.keys(updateData).forEach((key) => {
        if (userUpdateableFields.includes(key)) {
          userFields[key] = updateData[key];
        } else if (parentUpdateableFields.includes(key)) {
          parentFields[key] = updateData[key];
        }
      });

      // Update user if there are user fields to update
      if (Object.keys(userFields).length > 0) {
        await User.findByIdAndUpdate(parent.userId, userFields, {
          session,
          new: true,
        });
      }

      // Handle child ID updates
      if (parentFields.childId !== undefined) {
        const oldChildIds = parent.childId || [];
        const newChildIds = Array.isArray(parentFields.childId)
          ? parentFields.childId
          : [parentFields.childId];

        // Remove parent reference from old children
        if (oldChildIds.length > 0) {
          await Student.updateMany(
            { _id: { $in: oldChildIds } },
            { $unset: { parentId: 1 } },
            { session }
          );
        }

        // Validate new children exist
        if (newChildIds.length > 0) {
          const validChildren = await Student.find({
            _id: { $in: newChildIds },
          }).session(session);

          if (validChildren.length !== newChildIds.length) {
            throw new ValidationError("Một số học sinh không tồn tại");
          }

          // Add parent reference to new children
          await Student.updateMany(
            { _id: { $in: newChildIds } },
            { $set: { parentId: parentId } },
            { session }
          );
        }
      }

      // Update parent fields
      if (Object.keys(parentFields).length > 0) {
        await Parent.findByIdAndUpdate(parentId, parentFields, {
          session,
          new: true,
        });
      }

      return await this.getById(parentId, session);
    });
  }

  /**
   * Get all parents with pagination
   */
  async getAllParents(filter = {}, options = {}) {
    const {
      page = 1,
      limit = 10,
      sort = { createdAt: -1 },
      isActive,
    } = options;

    // Build aggregation pipeline
    const pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "students",
          localField: "childId",
          foreignField: "_id",
          as: "children",
        },
      },
    ];

    // Add isActive filter if specified
    if (isActive !== undefined) {
      pipeline.push({
        $match: { "user.isActive": isActive },
      });
    }

    // Add other filters
    if (Object.keys(filter).length > 0) {
      pipeline.push({ $match: filter });
    }

    // Get total count
    const totalPipeline = [...pipeline, { $count: "total" }];
    const totalResult = await Parent.aggregate(totalPipeline);
    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    // Add pagination and sorting
    pipeline.push(
      { $sort: sort },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    );

    // Execute query
    const parents = await Parent.aggregate(pipeline);

    return {
      parents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Add child to parent
   */
  async addChildToParent(parentId, studentId) {
    return await this.withTransaction(async (session) => {
      // Validate parent exists
      const parent = await Parent.findById(parentId).session(session);
      if (!parent) {
        throw new NotFoundError("Phụ huynh không tồn tại");
      }

      // Validate student exists
      const student = await Student.findById(studentId).session(session);
      if (!student) {
        throw new NotFoundError("Học sinh không tồn tại");
      }

      // Check if student is already a child of this parent
      if (parent.childId.includes(studentId)) {
        throw new ValidationError("Học sinh đã là con của phụ huynh này");
      }

      // Add student to parent's children list
      await Parent.findByIdAndUpdate(
        parentId,
        { $addToSet: { childId: studentId } },
        { session, new: true }
      );

      // Update student's parent reference
      await Student.findByIdAndUpdate(
        studentId,
        { $set: { parentId: parentId } },
        { session, new: true }
      );

      return await this.getById(parentId, session);
    });
  }

  /**
   * Remove child from parent
   */
  async removeChildFromParent(parentId, studentId) {
    return await this.withTransaction(async (session) => {
      // Remove student from parent's children list
      await Parent.findByIdAndUpdate(
        parentId,
        { $pull: { childId: studentId } },
        { session, new: true }
      );

      // Remove parent reference from student
      await Student.findByIdAndUpdate(
        studentId,
        { $unset: { parentId: 1 } },
        { session, new: true }
      );

      return await this.getById(parentId, session);
    });
  }

  /**
   * Get parent's children information
   */
  async getParentChildren(parentId) {
    const parent = await Parent.findById(parentId).populate({
      path: "childId",
      populate: {
        path: "userId",
        select: "name email phoneNumber gender",
      },
    });

    if (!parent) {
      throw new NotFoundError("Phụ huynh không tồn tại");
    }

    return parent.childId || [];
  }

  /**
   * Soft delete parent (admin only)
   */
  async softDeleteParent(parentId) {
    return await this.withTransaction(async (session) => {
      const parent = await Parent.findById(parentId).session(session);
      if (!parent) {
        throw new NotFoundError("Phụ huynh không tồn tại");
      }

      // Soft delete user account
      await User.findByIdAndUpdate(
        parent.userId,
        { $set: { isActive: false } },
        { session, new: true }
      );

      return { message: "Xóa mềm phụ huynh thành công" };
    });
  }
}

module.exports = ParentService;
