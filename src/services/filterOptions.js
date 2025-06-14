const classOverview = {
  filter: (req) => {
    const className = req.query.className || "";
    const year = req.query.year || "";
    const grade = req.query.grade || "";
    const filter = {};
    if (className) {
      filter.className = { $regex: className.trim(), $options: "i" };
    }
    if (year) {
      filter.year = parseInt(year);
    }
    if (grade) {
      filter.grade = parseInt(grade);
    }
    return filter;
  },
  select: "-attendanceId -studentList",
  populate: "",
};
const userOverview = {
  filter: (req) => {
    const name = req.query.name || "";
    const email = req.query.email || "";
    const role = req.query.role || "";
    const filter = {};
    if (name) {
      filter.name = { $regex: name.trim(), $options: "i" };
    }
    if (email) {
      filter.email = { $regex: email.trim(), $options: "i" };
    }
    if (role) {
      filter.role = role;
    }
    return filter;
  },
  select: "-password",
};

const teacherOverview = {
  filter: (req) => {
    const classId = req.query.classId || "";
    let filter = {};
    if (classId) {
      filter.classId = classId;
    }
    return filter;
  },
  select: "",
  populate: "",
};

const studentOverview = {
  filter: (req) => {
    const classId = req.query.classId || "";
    let filter = {};
    if (classId) {
      filter.classId = classId;
    }
    return filter;
  },
  select: "",
  populate: "",
};
const classDetails = {
  filter: (req) => {
    const classId = req.params.classId || "";
    let filter = {};
    if (classId) {
      filter._id = classId;
    }
    return filter;
  },
  select: "",
  populate: "",
};

module.exports = {
  classOverview,
  userOverview,
  teacherOverview,
  studentOverview,
  classDetails,
};
