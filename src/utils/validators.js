const { AppError } = require("../core/errors/AppError");

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @throws {AppError} If email is invalid
 */
const validateEmail = (email) => {
  if (!email) {
    throw new AppError("Email is required", 400);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AppError("Email phải có định dạng hợp lệ (phải có @)", 400);
  }
};

/**
 * Validate Vietnamese phone number format
 * @param {string} phoneNumber - Phone number to validate
 * @throws {AppError} If phone number is invalid
 */
const validatePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) {
    throw new AppError("Số điện thoại là bắt buộc", 400);
  }

  // Remove spaces and dashes
  const cleanPhone = phoneNumber.replace(/[\s-]/g, "");

  // Check if phone number starts with 0 and has exactly 10 digits
  const phoneRegex = /^0\d{9}$/;
  if (!phoneRegex.test(cleanPhone)) {
    throw new AppError(
      "Số điện thoại phải bắt đầu bằng 0 và có đúng 10 chữ số",
      400
    );
  }
};

/**
 * Validate password complexity
 * @param {string} password - Password to validate
 * @throws {AppError} If password is invalid
 */
const validatePassword = (password) => {
  if (!password) {
    throw new AppError("Mật khẩu là bắt buộc", 400);
  }

  if (password.length < 8) {
    throw new AppError("Mật khẩu phải có ít nhất 8 ký tự", 400);
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    throw new AppError("Mật khẩu phải có ít nhất 1 chữ cái viết hoa", 400);
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    throw new AppError("Mật khẩu phải có ít nhất 1 chữ cái viết thường", 400);
  }

  // Check for at least one digit
  if (!/\d/.test(password)) {
    throw new AppError("Mật khẩu phải có ít nhất 1 chữ số", 400);
  }

  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    throw new AppError(
      "Mật khẩu phải có ít nhất 1 ký tự đặc biệt (!@#$%^&*)",
      400
    );
  }
};

/**
 * Validate name field
 * @param {string} name - Name to validate
 * @throws {AppError} If name is invalid
 */
const validateName = (name) => {
  if (!name || name.trim().length === 0) {
    throw new AppError("Họ tên là bắt buộc", 400);
  }

  if (name.trim().length < 2) {
    throw new AppError("Họ tên phải có ít nhất 2 ký tự", 400);
  }

  if (name.trim().length > 100) {
    throw new AppError("Họ tên không được vượt quá 100 ký tự", 400);
  }
};

/**
 * Validate gender field
 * @param {string} gender - Gender to validate
 * @throws {AppError} If gender is invalid
 */
const validateGender = (gender) => {
  const validGenders = ["Nam", "Nữ", "Khác"];
  if (gender && !validGenders.includes(gender)) {
    throw new AppError("Giới tính phải là 'Nam', 'Nữ' hoặc 'Khác'", 400);
  }
};

/**
 * Comprehensive user data validation
 * @param {Object} userData - User data to validate
 * @param {Object} options - Validation options
 */
const validateUserData = (userData, options = {}) => {
  const {
    validateEmailField = true,
    validatePhoneField = true,
    validatePasswordField = true,
    validateNameField = true,
    validateGenderField = true,
  } = options;

  if (validateNameField && userData.name) {
    validateName(userData.name);
  }

  if (validateEmailField && userData.email) {
    validateEmail(userData.email);
  }

  if (validatePhoneField && userData.phoneNumber) {
    validatePhoneNumber(userData.phoneNumber);
  }

  if (validatePasswordField && userData.passwordBeforeHash) {
    validatePassword(userData.passwordBeforeHash);
  }

  if (validateGenderField && userData.gender) {
    validateGender(userData.gender);
  }
};

module.exports = {
  validateEmail,
  validatePhoneNumber,
  validatePassword,
  validateName,
  validateGender,
  validateUserData,
};
