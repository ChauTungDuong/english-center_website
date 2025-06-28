const User = require("./User");
const Student = require("./Student");
const Parent = require("./Parent");
const Teacher = require("./Teacher");
const Class = require("./Class");
const Attendance = require("./Attendance");
const Payment = require("./Payments");
const TeacherWage = require("./TeacherWage");
const Advertisement = require("./Advertisement"); // Advertisement model with image support
const Notification = require("./Notification"); // New Notification model
const ParentPaymentRequest = require("./ParentPaymentRequest");
const Token = require("./Token");

module.exports = {
  User,
  Student,
  Parent,
  Teacher,
  Class,
  Attendance,
  Payment,
  TeacherWage,
  Advertisement, // Changed from Announcement
  Notification, // New
  ParentPaymentRequest,
  Token,
};
