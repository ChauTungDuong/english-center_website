const router = require("./authRoutes");
const userRouter = require("./userRoutes");
const classRouter = require("./classRoutes");
const attendanceRouter = require("./attendanceRoutes");
const teacherRouter = require("./teacherRoutes");
const studentRouter = require("./studentRoutes");
const parentRouter = require("./parentRoutes");
const paymentRouter = require("./paymentRoutes");
const advertisementRouter = require("./advertisementRoutes");
// const notificationRouter = require("./notificationRoutes");
const teacherWageRouter = require("./teacherWageRoutes");
const statisticRouter = require("./statisticsRoutes");
const parentPaymentRequestRouter = require("./parentPaymentRequestRoutes");
module.exports = {
  router,
  userRouter,
  classRouter,
  attendanceRouter,
  teacherRouter,
  studentRouter,
  parentRouter,
  paymentRouter,
  advertisementRouter,
  // notificationRouter,
  teacherWageRouter,
  statisticRouter,
  parentPaymentRequestRouter,
};
