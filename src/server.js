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
app.use("/v1/api/users", userRouter);
app.use("/v1/api/classes", classRouter);
app.use("/v1/api/attendance", attendanceRouter);
app.use("/v1/api/teachers", teacherRouter);
app.use("/v1/api/students", studentRouter);
app.use("/v1/api/parents", parentRouter);
app.use("/v1/api/payments", paymentRouter);
app.use("/v1/api/advertisements", advertisementRouter);
app.use("/v1/api/notifications", notificationRouter);
app.use("/v1/api/teacher-wages", teacherWageRouter);
app.use("/v1/api/parent-payment-requests", parentPaymentRequestRouter);
app.use("/v1/api/statistics", statisticRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

(async () => {
  try {
    await connection();
    await createAdminIfNotExist();

    // // Start notification scheduler
    // notificationScheduler.start();

    app.listen(port, () => {
      console.log(`App listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.log("Error while connecting to database\n", error);
  }
})();
