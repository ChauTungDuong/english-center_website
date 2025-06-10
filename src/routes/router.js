const express = require("express");
const {
  login,
  createNewClass,
  getAllClasses,
  createNewUser,
} = require("../controllers");
const verify = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/login", login);
router.post("/user", verify(["Admin"]), createNewUser);
router.post("/class", verify(["Admin"]), createNewClass);
router.get("/class", verify(["Admin"]), getAllClasses);

module.exports = router;
