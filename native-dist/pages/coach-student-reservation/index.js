const WEEK_OPTIONS = [
  { name: '本周', range: '5/19–5/25' },
  { name: '下周', range: '5/26–6/1' },
  { name: '第三周', range: '6/2–6/8' }
];

const WEEK_COURSES = [
  [
    { id: 'r1', date: '5月24日 周六', time: '09:30–10:40', title: 'U10 提高班', topic: '控球强化与变向突破', venue: '2号馆', capacity: '13 / 16', available: '剩余3席' },
    { id: 'r2', date: '5月25日 周日', time: '18:30–20:00', title: 'U10 提高班', topic: '传切配合与攻防转换', venue: '1号馆', capacity: '15 / 16', available: '剩余1席' }
  ],
  [
    { id: 'r3', date: '5月28日 周三', time: '18:30–20:00', title: 'U10 提高班', topic: '弱侧手控球专项', venue: '2号馆', capacity: '12 / 16', available: '剩余4席' },
    { id: 'r4', date: '6月1日 周日', time: '18:30–20:00', title: 'U10 提高班', topic: '实战对抗与快速决策', venue: '1号馆', capacity: '14 / 16', available: '剩余2席' }
  ],
  [
    { id: 'r5', date: '6月4日 周三', time: '18:30–20:00', title: 'U10 提高班', topic: '投篮脚步与出手节奏', venue: '2号馆', capacity: '11 / 16', available: '剩余5席' }
  ]
];

function decorateWeeks(activeIndex) {
  return WEEK_OPTIONS.map((item, index) => ({ ...item, index, activeClass: index === activeIndex ? 'active' : '' }));
}

function decorateCourses(courses, selectedId) {
  return courses.map((item) => ({ ...item, activeClass: item.id === selectedId ? 'active' : '', selectText: item.id === selectedId ? '已选择' : '选择课程' }));
}

Page({
  data: { studentId: 'student-1', activeWeek: 0, weeks: decorateWeeks(0), courses: decorateCourses(WEEK_COURSES[0], ''), selectedId: '', confirmText: '请选择一节课程', confirmClass: '' },

  onLoad(options) {
    this.setData({ studentId: (options && options.studentId) || 'student-1' });
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.redirectTo({ url: '/pages/coach-student-detail/index?id=' + this.data.studentId });
  },

  selectWeek(event) {
    const activeWeek = Number(event.currentTarget.dataset.index);
    this.setData({ activeWeek, weeks: decorateWeeks(activeWeek), courses: decorateCourses(WEEK_COURSES[activeWeek], ''), selectedId: '', confirmText: '请选择一节课程', confirmClass: '' });
  },

  selectCourse(event) {
    const selectedId = event.currentTarget.dataset.id;
    this.setData({ selectedId, courses: decorateCourses(WEEK_COURSES[this.data.activeWeek], selectedId), confirmText: '确认预约下一课', confirmClass: 'ready' });
  },

  confirmReservation() {
    if (!this.data.selectedId) {
      wx.showToast({ title: '请先选择课程', icon: 'none' });
      return;
    }
    const course = WEEK_COURSES[this.data.activeWeek].find((item) => item.id === this.data.selectedId);
    wx.setStorageSync('sxf_student_reservation_' + this.data.studentId, course);
    wx.showModal({
      title: '预约成功',
      content: course.date + ' ' + course.time + '\n' + course.title + ' · ' + course.venue,
      showCancel: false,
      success: () => wx.navigateBack({ delta: 1 })
    });
  }
});
