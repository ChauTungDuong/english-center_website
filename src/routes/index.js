// Temporary simplified routes for testing
const router = require("./authRoutes");
const studentRouter = require("./studentRoutes");
const attendanceRouter = require("./attendanceRoutes");
const classRouter = require("./classRoutes");
const parentRouter = require("./parentRoutes");
const teacherRouter = require("./teacherRoutes");
const userRouter = require("./userRoutes");
const paymentRouter = require("./paymentRoutes");

// Enable all working routes
const advertisementRouter = require("./advertisementRoutes");
const notificationRouter = require("./notificationRoutes");
const teacherWageRouter = require("./teacherWageRoutes");
const statisticRouter = require("./statisticsRoutes");
const parentPaymentRequestRouter = require("./parentPaymentRequestRoutes");

module.exports = {
  router,
  studentRouter,
  attendanceRouter,
  classRouter,
  parentRouter,
  teacherRouter,
  userRouter,
  paymentRouter,
  advertisementRouter,
  notificationRouter,
  teacherWageRouter,
  statisticRouter,
  parentPaymentRequestRouter,
};
