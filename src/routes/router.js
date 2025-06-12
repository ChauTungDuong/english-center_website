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
} = require("../controllers");

const { User } = require("../models");
const { verifyRole, checkToken } = require("../middleware/authMiddleware");
const pagination = require("../middleware/pagination");
const router = express.Router();

router.post("/login", login);
router.post("/user", verifyRole(["Admin"]), createNewUser);
router.post("/class", verifyRole(["Admin"]), createNewClass);
router.get("/class", verifyRole(["Admin"]), getAllClasses);

router.get("/user", verifyRole(["Admin"]), pagination(User), getUserList);
router.delete("/user/:id", verifyRole(["Admin"]), deleteUser);
router.patch("/user/:id", verifyRole(["Admin"]), updateUser);

router.get("/user/:id", verifyRole(["Admin"]), getUserInfo);

router.get("/profile", checkToken, getProfile);
module.exports = router;
