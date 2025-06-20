const express = require("express");
require("dotenv").config();
// const path = require("path");
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
  announcementRouter,
  statisticsRouter,
} = require("./routes");

const parentPaymentRequestRouter = require("./routes/parentPaymentRequestRoutes");
const { connection, createAdminIfNotExist } = require("./config/dbConnect");

// app.use(express.static(path.join("./src", "public")));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes với prefix /v1/api/
app.use("/v1/api/", router);
app.use("/v1/api/users", userRouter);
app.use("/v1/api/classes", classRouter);
app.use("/v1/api/attendance", attendanceRouter);
app.use("/v1/api/teachers", teacherRouter);
app.use("/v1/api/students", studentRouter);
app.use("/v1/api/parents", parentRouter);
app.use("/v1/api/payments", paymentRouter);
app.use("/v1/api/announcements", announcementRouter);
app.use("/v1/api/statistics", statisticsRouter);
app.use("/v1/api/parent-payment-requests", parentPaymentRequestRouter);

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
    app.listen(port, () => {
      console.log(`App listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.log("Error while connecting to database\n", error);
  }
})();
