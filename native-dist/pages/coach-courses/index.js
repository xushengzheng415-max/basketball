const WEEK_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const CALENDAR_WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
const DEFAULT_DATE = '2025-05-23';

const COURSE_TEMPLATES = {
  0: [{ key: 'u10', time: '18:30', end: '20:00', title: 'U10 提高班', level: '进阶', venue: '2号馆', students: '15/16' }],
  3: [{ key: 'u8', time: '09:30', end: '10:40', title: 'U8 启蒙班', level: '少儿', venue: '1号馆', students: '10/12' }],
  5: [
    { key: 'u10', time: '18:30', end: '20:00', title: 'U10 提高班', level: '进阶', venue: '2号馆', students: '15/16' },
    { key: 'u12', time: '20:10', end: '21:30', title: 'U12 精英班', level: '精英', venue: '1号馆', students: '12/14' }
  ],
  6: [{ key: 'u8', time: '09:30', end: '10:40', title: 'U8 启蒙班', level: '少儿', venue: '1号馆', students: '10/12' }]
};

function pad(value) {
  return String(value).padStart(2, '0');
}

function toISO(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function fromISO(iso) {
  const parts = iso.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function getCourses(iso) {
  const date = fromISO(iso);
  const templates = COURSE_TEMPLATES[date.getDay()] || [];
  return templates.map((item, index) => {
    let status = '待上课';
    let statusClass = 'next';
    let action = '进入课堂';
    if (iso < DEFAULT_DATE) {
      status = '已完成';
      statusClass = 'done';
      action = '查看记录';
    } else if (iso === DEFAULT_DATE && index === templates.length - 1) {
      status = '待备课';
      statusClass = 'todo';
      action = '去备课';
    }
    return { ...item, id: iso + '-' + item.key, status, statusClass, action };
  });
}

function buildWeek(selectedISO) {
  const selected = fromISO(selectedISO);
  const mondayOffset = selected.getDay() === 0 ? -6 : 1 - selected.getDay();
  const monday = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index);
    const iso = toISO(date);
    return {
      iso,
      week: WEEK_LABELS[date.getDay()],
      day: date.getDate(),
      activeClass: iso === selectedISO ? 'active' : '',
      courseClass: getCourses(iso).length ? 'has-course' : ''
    };
  });
}

function buildCalendar(year, month, selectedISO) {
  const first = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0).getDate();
  const leading = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const cells = [];
  for (let index = 0; index < leading; index += 1) {
    cells.push({ key: 'empty-' + index, day: '', iso: '', emptyClass: 'empty', activeClass: '', courseClass: '', courseCount: '' });
  }
  for (let day = 1; day <= lastDay; day += 1) {
    const iso = year + '-' + pad(month) + '-' + pad(day);
    const count = getCourses(iso).length;
    cells.push({ key: iso, day, iso, emptyClass: '', activeClass: iso === selectedISO ? 'active' : '', courseClass: count ? 'has-course' : '', courseCount: count ? count + '节' : '' });
  }
  return cells;
}

function decorateCourses(courses, activeFilter) {
  if (activeFilter === 'all') return courses;
  return courses.filter((item) => item.statusClass === activeFilter);
}

Page({
  data: {
    selectedISO: DEFAULT_DATE,
    displayYear: 2025,
    displayMonth: 5,
    monthLabel: '2025年5月',
    monthExpanded: false,
    monthArrow: '⌄',
    monthToggleText: '展开整月课程计划',
    weekdayLabels: CALENDAR_WEEK_LABELS,
    dates: [],
    calendarDays: [],
    selectedDateLabel: '',
    summary: [],
    filters: [],
    courses: [],
    emptyVisible: false,
    activeFilter: 'all'
  },

  onLoad(options) {
    this.refreshDate((options && options.date) || DEFAULT_DATE, 'all');
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.reLaunch({ url: '/pages/education/index' });
  },

  refreshDate(iso, activeFilter) {
    const date = fromISO(iso);
    const allCourses = getCourses(iso);
    const courses = decorateCourses(allCourses, activeFilter);
    const pendingLessons = allCourses.filter((item) => item.statusClass === 'next').length;
    const pendingPlans = allCourses.filter((item) => item.statusClass === 'todo').length;
    const pendingEvaluations = allCourses.filter((item) => item.statusClass === 'done').length * 10;
    const filters = [
      { key: 'all', label: '全部 ' + allCourses.length },
      { key: 'todo', label: '待备课 ' + pendingPlans },
      { key: 'next', label: '待上课 ' + pendingLessons },
      { key: 'done', label: '已完成 ' + allCourses.filter((item) => item.statusClass === 'done').length }
    ].map((item) => ({ ...item, activeClass: item.key === activeFilter ? 'active' : '' }));
    this._allCourses = allCourses;
    this.setData({
      selectedISO: iso,
      displayYear: date.getFullYear(),
      displayMonth: date.getMonth() + 1,
      monthLabel: date.getFullYear() + '年' + (date.getMonth() + 1) + '月',
      dates: buildWeek(iso),
      calendarDays: buildCalendar(date.getFullYear(), date.getMonth() + 1, iso),
      selectedDateLabel: (date.getMonth() + 1) + '月' + date.getDate() + '日 ' + WEEK_LABELS[date.getDay()],
      summary: [
        { value: String(allCourses.length), label: '今日课程' },
        { value: String(allCourses.reduce((total, item) => total + Number(item.students.split('/')[0]), 0)), label: '应到学员' },
        { value: String(pendingPlans), label: '待备课' },
        { value: String(pendingEvaluations), label: '待评价' }
      ],
      filters,
      courses,
      emptyVisible: courses.length === 0,
      activeFilter
    });
  },

  selectDate(event) {
    this.refreshDate(event.currentTarget.dataset.iso, 'all');
  },

  toggleMonthView() {
    const monthExpanded = !this.data.monthExpanded;
    this.setData({ monthExpanded, monthArrow: monthExpanded ? '⌃' : '⌄', monthToggleText: monthExpanded ? '收起整月课程计划' : '展开整月课程计划' });
  },

  selectMonthDate(event) {
    const iso = event.currentTarget.dataset.iso;
    if (!iso) return;
    this.refreshDate(iso, 'all');
  },

  previousMonth() {
    this.shiftMonth(-1);
  },

  nextMonth() {
    this.shiftMonth(1);
  },

  shiftMonth(offset) {
    const date = new Date(this.data.displayYear, this.data.displayMonth - 1 + offset, 1);
    this.refreshDate(toISO(date), 'all');
    this.setData({ monthExpanded: true, monthArrow: '⌃', monthToggleText: '收起整月课程计划' });
  },

  selectFilter(event) {
    const activeFilter = event.currentTarget.dataset.key;
    const courses = decorateCourses(this._allCourses || [], activeFilter);
    this.setData({
      activeFilter,
      courses,
      emptyVisible: courses.length === 0,
      filters: this.data.filters.map((item) => ({ ...item, activeClass: item.key === activeFilter ? 'active' : '' }))
    });
  },

  openCourse(event) {
    const id = event.currentTarget.dataset.id;
    const course = (this._allCourses || []).find((item) => item.id === id);
    if (!course) return;
    const target = course.statusClass === 'todo' ? '/pages/coach-course-plan/index' : '/pages/coach-course-detail/index';
    wx.navigateTo({ url: target + '?id=' + encodeURIComponent(id) + '&date=' + this.data.selectedISO });
  }
});
