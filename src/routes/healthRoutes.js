const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

/**
 * Health check endpoint
 * Returns system status and health information
 */
router.get("/health", async (req, res) => {
  try {
    // Check database connection
    const dbStatus =
      mongoose.connection.readyState === 1 ? "connected" : "disconnected";

    // System health info
    const healthInfo = {
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      database: {
        status: dbStatus,
        name: mongoose.connection.name || "N/A",
      },
      memory: {
        total:
          Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + " MB",
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
      },
      version: process.env.npm_package_version || "1.0.0",
    };

    res.status(200).json({
      success: true,
      data: healthInfo,
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: "ERROR",
      message: "Service unavailable",
      error: error.message,
    });
  }
});

/**
 * Liveness probe - for Kubernetes/Docker health checks
 */
router.get("/health/live", (req, res) => {
  res.status(200).json({ status: "alive" });
});

/**
 * Readiness probe - checks if app is ready to serve traffic
 */
router.get("/health/ready", async (req, res) => {
  const isReady = mongoose.connection.readyState === 1;

  if (isReady) {
    res.status(200).json({ status: "ready" });
  } else {
    res.status(503).json({ status: "not ready" });
  }
});

module.exports = router;
