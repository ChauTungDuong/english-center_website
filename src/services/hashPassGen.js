const bcrypt = require("bcrypt");

const hashing = async (password) => {
  return await bcrypt.hash(password, 10);
};

const hashCompare = async (pass, hashPass) => {
  return await bcrypt.compare(pass, hashPass);
};

module.exports = {
  hashing,
  hashCompare,
};
