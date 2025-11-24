/**
 * Centralized application configuration
 * All environment variables are managed here
 */
module.exports = {
  // Environment
  env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 3000,

  // Database
  database: {
    uri: process.env.DB_URI || "mongodb://localhost:27017/english_center",
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || "your-secret-key",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  // Email
  email: {
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT) || 587,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.FROM_EMAIL || "noreply@englishcenter.com",
  },

  // Frontend
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",

  // Security
  security: {
    bcryptRounds: 10,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
    },
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || "info",
  },
};
