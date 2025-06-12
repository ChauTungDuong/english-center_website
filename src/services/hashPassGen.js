const bcrypt = require("bcrypt");

const hashing = async (password) => {
  return bcrypt.hash(password, 10);
};

const hashCompare = async (pass, hashPass) => {
  return bcrypt.compare(pass, hashPass);
};

module.exports = {
  hashing,
  hashCompare,
};
