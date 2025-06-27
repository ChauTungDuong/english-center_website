const userUpdateFields = (updateData) => {
  const userFields = [
    "email",
    "name",
    "passwordBeforeHash",
    "phoneNumber",
    "address",
    "gender",
    "isActive",
  ];
  const filteredData = {};

  userFields.forEach((field) => {
    if (updateData[field] !== undefined && updateData[field] !== null) {
      filteredData[field] = updateData[field];
    }
  });
  return filteredData;
};

const studentUpdateFields = (updateData) => {
  // Note: classId removed - use POST /students/{id}/enroll or /withdraw for class management
  const studentFields = ["parentId"];
  const filteredData = {};

  studentFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      filteredData[field] = updateData[field];
    }
  });

  return filteredData;
};

const parentUpdateFields = (updateData) => {
  // ❌ childId removed - use PATCH /parents/:id/children for relationship management
  const parentFields = ["canSeeTeacher"];
  const filteredData = {};

  parentFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      filteredData[field] = updateData[field];
    }
  });

  return filteredData;
};
const teacherUpdateFields = (updateData) => {
  const teacherFields = ["classId", "wagePerLesson"];
  const filteredData = {};

  teacherFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      filteredData[field] = updateData[field];
    }
  });

  return filteredData;
};
module.exports = {
  userUpdateFields,
  studentUpdateFields,
  parentUpdateFields,
  teacherUpdateFields,
};
