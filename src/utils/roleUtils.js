const { Teacher, Student, Parent } = require("../models");

/**
 * Get roleId based on user's role and userId
 * @param {String} userId - User ID
 * @param {String} role - User role (Teacher, Student, Parent, Admin)
 * @returns {String|null} Role-specific ID or null for Admin
 */
const getRoleId = async (userId, role) => {
  try {
    switch (role) {
      case "Teacher": {
        const teacher = await Teacher.findOne({ userId });
        return teacher ? teacher._id : null;
      }
      case "Student": {
        const student = await Student.findOne({ userId });
        return student ? student._id : null;
      }
      case "Parent": {
        const parent = await Parent.findOne({ userId });
        return parent ? parent._id : null;
      }
      case "Admin":
        return null; // Admin không có roleId riêng biệt
      default:
        return null;
    }
  } catch (error) {
    console.error("Error getting roleId:", error);
    return null;
  }
};

module.exports = {
  getRoleId,
};
