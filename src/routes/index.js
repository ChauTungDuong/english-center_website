const router = require("./authRoutes");
const userRouter = require("./userRoutes");
const classRouter = require("./classRoutes");
const attendanceRouter = require("./attendanceRoutes");
const teacherRouter = require("./teacherRoutes");
const studentRouter = require("./studentRoutes");
const parentRouter = require("./parentRoutes");
const paymentRouter = require("./paymentRoutes");
const announcementRouter = require("./announcementRoutes");
const statisticsRouter = require("./statisticsRoutes");

module.exports = {
  router,
  userRouter,
  classRouter,
  attendanceRouter,
  teacherRouter,
  studentRouter,
  parentRouter,
  paymentRouter,
  announcementRouter,
  statisticsRouter,
};
