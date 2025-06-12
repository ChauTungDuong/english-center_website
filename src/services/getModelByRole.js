const { Student, Teacher, Parent } = require("../models");
const getModelByRole = (role) => {
  const models = {
    Student,
    Teacher,
    Parent,
  };
  return models[role] || null;
};

module.exports = { getModelByRole };
