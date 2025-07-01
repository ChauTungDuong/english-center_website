const { Student, Parent, Class, Teacher } = require("../../models");
const { ValidationError, NotFoundError } = require("../errors/AppError");

/**
 * Relationship Service
 * Handles relationships between entities (Student-Class, Parent-Student, etc.)
 */
class RelationshipService {
  /**
   * Add student to class
   */
  static async addStudentToClass(studentId, classId, session = null) {
    const options = session ? { session } : {};

    // Validate student exists
    const student = await Student.findById(studentId).session(session);
    if (!student) {
      throw new NotFoundError("Học sinh");
    }

    // Validate class exists
    const classInfo = await Class.findById(classId).session(session);
    if (!classInfo) {
      throw new NotFoundError("Lớp học");
    }

    // Check if student already in class
    if (classInfo.studentList.includes(studentId)) {
      throw new ValidationError("Học sinh đã có trong lớp này");
    }

    // Check class capacity
    const maxStudents = classInfo.maxStudents || 30;
    if (classInfo.studentList.length >= maxStudents) {
      throw new ValidationError(
        `Lớp học đã đầy (${classInfo.studentList.length}/${maxStudents})`
      );
    }

    // Add student to class
    await Class.findByIdAndUpdate(
      classId,
      { $addToSet: { studentList: studentId } },
      { session, new: true }
    );

    // Add class to student
    await Student.findByIdAndUpdate(
      studentId,
      { $addToSet: { classId: classId } },
      { session, new: true }
    );

    return { studentId, classId, action: "added" };
  }

  /**
   * Remove student from class
   */
  static async removeStudentFromClass(studentId, classId, session = null) {
    const options = session ? { session } : {};

    // Remove student from class
    await Class.findByIdAndUpdate(
      classId,
      { $pull: { studentList: studentId } },
      options
    );

    // Remove class from student
    await Student.findByIdAndUpdate(
      studentId,
      { $pull: { classId: classId } },
      options
    );

    return { studentId, classId, action: "removed" };
  }

  /**
   * Link parent to student
   */
  static async linkParentStudent(parentId, studentId, session = null) {
    const options = session ? { session } : {};

    // Validate parent exists
    const parent = await Parent.findById(parentId).session(session);
    if (!parent) {
      throw new NotFoundError("Phụ huynh");
    }

    // Validate student exists
    const student = await Student.findById(studentId).session(session);
    if (!student) {
      throw new NotFoundError("Học sinh");
    }

    // Add student to parent's children list
    await Parent.findByIdAndUpdate(
      parentId,
      { $addToSet: { childId: studentId } },
      options
    );

    // Set parent for student
    await Student.findByIdAndUpdate(studentId, { parentId }, options);

    return { parentId, studentId, action: "linked" };
  }

  /**
   * Unlink parent from student
   */
  static async unlinkParentStudent(parentId, studentId, session = null) {
    const options = session ? { session } : {};

    // Remove student from parent's children list
    await Parent.findByIdAndUpdate(
      parentId,
      { $pull: { childId: studentId } },
      options
    );

    // Remove parent from student
    await Student.findByIdAndUpdate(
      studentId,
      { $unset: { parentId: 1 } },
      options
    );

    return { parentId, studentId, action: "unlinked" };
  }

  /**
   * Assign teacher to class
   */
  static async assignTeacherToClass(teacherId, classId, session = null) {
    const options = session ? { session } : {};

    // Validate teacher exists
    const teacher = await Teacher.findById(teacherId).session(session);
    if (!teacher) {
      throw new NotFoundError("Giáo viên");
    }

    // Validate class exists
    const classInfo = await Class.findById(classId).session(session);
    if (!classInfo) {
      throw new NotFoundError("Lớp học");
    }

    // Assign teacher to class
    await Class.findByIdAndUpdate(classId, { teacherId }, options);

    return { teacherId, classId, action: "assigned" };
  }

  /**
   * Remove teacher from class
   */
  static async removeTeacherFromClass(classId, session = null) {
    const options = session ? { session } : {};

    await Class.findByIdAndUpdate(
      classId,
      { $unset: { teacherId: 1 } },
      options
    );

    return { classId, action: "teacher_removed" };
  }

  /**
   * Transfer student to new parent
   */
  static async transferStudentToNewParent(
    studentId,
    oldParentId,
    newParentId,
    session = null
  ) {
    // Remove from old parent
    if (oldParentId) {
      await this.unlinkParentStudent(oldParentId, studentId, session);
    }

    // Add to new parent
    if (newParentId) {
      await this.linkParentStudent(newParentId, studentId, session);
    }

    return {
      studentId,
      oldParentId,
      newParentId,
      action: "transferred",
    };
  }

  /**
   * Bulk operations
   */
  static async addMultipleStudentsToClass(studentIds, classId, session = null) {
    const results = [];

    for (const studentId of studentIds) {
      try {
        const result = await this.addStudentToClass(
          studentId,
          classId,
          session
        );
        results.push(result);
      } catch (error) {
        results.push({
          studentId,
          classId,
          action: "failed",
          error: error.message,
        });
      }
    }

    return results;
  }

  static async removeMultipleStudentsFromClass(
    studentIds,
    classId,
    session = null
  ) {
    const results = [];

    for (const studentId of studentIds) {
      try {
        const result = await this.removeStudentFromClass(
          studentId,
          classId,
          session
        );
        results.push(result);
      } catch (error) {
        results.push({
          studentId,
          classId,
          action: "failed",
          error: error.message,
        });
      }
    }

    return results;
  }
}

module.exports = RelationshipService;
