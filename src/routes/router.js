const express = require("express");
const {
  login,
  createNewClass,
  getAllClasses,
  createNewUser,
  getUserList,
  deleteUser,
  updateUser,
  getUserInfo,
  getProfile,
  getClassDetails,
  updateClass,
  deleteClass,
  getClassSchedule,
} = require("../controllers");
const {
  studentOverview,
  teacherOverview,
  classOverview,
  classDetails,
  userOverview,
} = require("../services/filterOptions");

const { User, Class } = require("../models");
const { verifyRole, checkToken } = require("../middleware/authMiddleware");
const paginate = require("../middleware/pagination");
const router = express.Router();
//router for user management
router.post("/login", login);
router.post("/user", verifyRole(["Admin"]), createNewUser);
router.delete("/user/:id", verifyRole(["Admin"]), deleteUser);
router.patch("/user/:id", verifyRole(["Admin"]), updateUser);
router.get("/user/:id", verifyRole(["Admin"]), getUserInfo);
router.get(
  "/user",
  verifyRole(["Admin"]),
  paginate(User, userOverview),
  getUserList
);
//router for class management
router.post("/class", verifyRole(["Admin"]), createNewClass);
router.get(
  "/class",
  verifyRole(["Admin"]),
  paginate(Class, classOverview),
  getAllClasses
);

router.get(
  "/class/:classId",
  verifyRole(["Admin"]),
  paginate(Class, classDetails),
  getClassDetails
);

router.get("/class/:classId/schedule", checkToken, getClassSchedule);
router.patch("/class/:classId", verifyRole(["Admin"]), updateClass);

router.delete("/class/:classId", verifyRole(["Admin"]), deleteClass);

router.get("/profile", checkToken, getProfile);
module.exports = router;
