const generateLessonDates = (startDate, endDate, daysOfLessonInWeek) => {
  const dateOfLessons = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  let current = new Date(start);
  while (current <= end) {
    if (daysOfLessonInWeek.includes(current.getDay())) {
      dateOfLessons.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return dateOfLessons;
};

const formatClassSchedule = (classData) => {
  if (
    !classData ||
    !classData.schedule ||
    !classData.schedule.startDate ||
    !classData.schedule.endDate ||
    !classData.schedule.daysOfLessonInWeek
  ) {
    return { error: "Thông tin lịch học không đầy đủ" };
  }
  const { startDate, endDate, daysOfLessonInWeek } = classData.schedule;
  const lessonDates = generateLessonDates(
    startDate,
    endDate,
    daysOfLessonInWeek
  );
  const days = [
    "Chủ Nhật",
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
  ];
  const lessonDay = daysOfLessonInWeek.map((day) => days[day]);
  const lessonsByMonth = {};
  lessonDates.forEach((date) => {
    const month = date.getMonth();
    const year = date.getFullYear();
    const key = `${year}-${month + 1}`; // format as yyyy-mm
    if (!lessonsByMonth[key]) {
      lessonsByMonth[key] = [];
    }
    lessonsByMonth[key].push(date.toISOString());
  });
  return {
    className: classData.name,
    totalLessons: lessonDates.length,
    lessonDay,
    lessonDates: lessonDates.map((date) => date.toISOString()),
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    lessonsByMonth,
  };
};

module.exports = {
  generateLessonDates,
  formatClassSchedule,
};
