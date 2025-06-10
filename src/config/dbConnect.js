const { default: mongoose } = require("mongoose");

require("dotenv").config();
const connection = async () => {
  try {
    await mongoose.connect(process.env.DB_URI);
    console.log("Ket noi toi DB thanh cong");
  } catch (err) {
    console.log("Error : ", err);
  }
};

module.exports = connection;
