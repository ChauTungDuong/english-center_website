const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
require("dotenv").config();
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// Import routes
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
const healthRouter = require("./routes/healthRoutes");

// Import middleware
const { apiLimiter } = require("./middleware/rateLimiter");
const { errorHandler, notFound } = require("./middleware/errorHandler");
const logger = require("./utils/logger");

// Import config and utils
const { connection, createAdminIfNotExist } = require("./config/dbConnect");
const notificationScheduler = require("./utils/notificationScheduler");

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Security Middleware
// Set security HTTP headers
app.use(helmet());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Enable CORS for all origins (for development)
// In production, specify exact origins
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Body parser middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Apply rate limiting to all API routes
app.use("/v1/api", apiLimiter);

// Health check routes (no rate limiting)
app.use("/", healthRouter);

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

// Handle undefined routes (404)
app.use(notFound);

// Global error handling middleware (must be last)
app.use(errorHandler);

(async () => {
  try {
    await connection();
    await createAdminIfNotExist();

    // Start notification scheduler
    notificationScheduler.start();

    app.listen(port, () => {
      logger.info(`Server started on port ${port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info(`Health check available at: http://localhost:${port}/health`);
      console.log(`App listening on http://localhost:${port}`);
    });
  } catch (error) {
    logger.error("Error while connecting to database", error);
    console.log("Error while connecting to database\n", error);
    process.exit(1);
  }
})();
