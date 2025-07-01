const express = require("express");
const cors = require("cors");
require("dotenv").config();
const path = require("path");
const app = express();
const port = process.env.PORT || 3000;

const {
  router,
  userRouter,
  classRouter,
  attendanceRouter,
  teacherRouter,
  studentRouter,
  parentRouter,
  paymentRouter,
  advertisementRouter,
  notificationRouter,
  teacherWageRouter,
  statisticRouter,
  parentPaymentRequestRouter,
} = require("./routes");

const { connection, createAdminIfNotExist } = require("./config/dbConnect");
const notificationScheduler = require("./utils/notificationScheduler");
const { globalErrorHandler, handleNotFound } = require("./core/middleware");

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Enable CORS for all origins (for development)
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// app.use(express.static(path.join("./src", "public")));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes với prefix /v1/api/
app.use("/v1/api", router);
if (studentRouter) app.use("/v1/api/students", studentRouter);
if (attendanceRouter) app.use("/v1/api/attendance", attendanceRouter);
if (classRouter) app.use("/v1/api/classes", classRouter);
if (parentRouter) app.use("/v1/api/parents", parentRouter);
if (teacherRouter) app.use("/v1/api/teachers", teacherRouter);
if (userRouter) app.use("/v1/api/users", userRouter);
if (paymentRouter) app.use("/v1/api/payments", paymentRouter);

// Enable all working routes
if (advertisementRouter) app.use("/v1/api/advertisements", advertisementRouter);
if (notificationRouter) app.use("/v1/api/notifications", notificationRouter);
if (teacherWageRouter) app.use("/v1/api/teacher-wages", teacherWageRouter);
if (parentPaymentRequestRouter)
  app.use("/v1/api/parent-payment-requests", parentPaymentRequestRouter);
if (statisticRouter) app.use("/v1/api/statistics", statisticRouter);

// 404 handler - must come before error handler
app.use(handleNotFound);

// Global error handling middleware - must be last
app.use(globalErrorHandler);

(async () => {
  try {
    await connection();
    await createAdminIfNotExist();

    // Start notification scheduler
    notificationScheduler.start();

    app.listen(port, () => {
      console.log(`App listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.log("Error while connecting to database\n", error);
  }
})();
