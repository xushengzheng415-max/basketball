const CLOUD_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/';
const MANAGER_ICON_ROOT = CLOUD_ROOT + 'common/campus-manager/';

const COURSE_SOURCE = [
  {
    id: 'course-0900', start: '09:00', end: '10:30', title: 'U8篮球启蒙班', tag: 'U8 / 启蒙', venue: '1号馆',
    coach: '王教练', avatar: CLOUD_ROOT + 'pages/campus-manager/m02/coach-avatar-wang.png', attendance: '12 / 12',
    timeState: '进行中', timeStateClass: 'running', businessState: '进行中', businessStateClass: 'running', filterKey: 'running'
  },
  {
    id: 'course-1045', start: '10:45', end: '12:15', title: 'U12进阶训练班', tag: 'U12 / 进阶', venue: '2号馆',
    coach: '李教练', avatar: CLOUD_ROOT + 'pages/team/avatar-zhaozimo.png', attendance: '15 / 13',
    timeState: '进行中', timeStateClass: 'running', businessState: '待点名', businessStateClass: 'pending', filterKey: 'running'
  },
  {
    id: 'course-1330', start: '13:30', end: '15:00', title: '成人篮球基础班', tag: '成人 / 基础', venue: '3号馆',
    coach: '王教练', avatar: CLOUD_ROOT + 'pages/campus-manager/m02/coach-avatar-wang.png', attendance: '16 / 11',
    timeState: '未开始', timeStateClass: 'upcoming', businessState: '未开始', businessStateClass: 'upcoming', filterKey: 'upcoming'
  },
  {
    id: 'course-1515', start: '15:15', end: '16:45', title: 'U8篮球启蒙班', tag: 'U8 / 启蒙', venue: '1号馆',
    coach: '李教练', avatar: CLOUD_ROOT + 'pages/team/avatar-zhaozimo.png', attendance: '12 / 12',
    timeState: '已完成', timeStateClass: 'complete', businessState: '已完成', businessStateClass: 'complete', filterKey: 'complete'
  },
  {
    id: 'course-1700', start: '17:00', end: '18:30', title: 'U12进阶训练班', tag: 'U12 / 进阶', venue: '2号馆',
    coach: '王教练', avatar: CLOUD_ROOT + 'pages/campus-manager/m02/coach-avatar-wang.png', attendance: '15 / —',
    timeState: '未开始', timeStateClass: 'upcoming', businessState: '未开始', businessStateClass: 'upcoming', filterKey: 'upcoming'
  }
];

const FILTER_SOURCE = [
  { key: 'all', label: '全部', hasBadge: false },
  { key: 'upcoming', label: '未开始', hasBadge: false },
  { key: 'running', label: '进行中', hasBadge: false },
  { key: 'complete', label: '已完成', hasBadge: false },
  { key: 'exception', label: '异常', hasBadge: true }
];

const WEEK_SOURCE = [
  { key: '12', weekday: '日', day: '12' }, { key: '13', weekday: '一', day: '13' },
  { key: '14', weekday: '二', day: '14' }, { key: '15', weekday: '三', day: '15' },
  { key: '16', weekday: '四', day: '16' }, { key: '17', weekday: '五', day: '17' },
  { key: '18', weekday: '六', day: '18' }
];

function buildFilters(activeKey) {
  return FILTER_SOURCE.map((item) => Object.assign({}, item, { activeClass: item.key === activeKey ? 'active' : '' }));
}

function buildWeek(activeKey) {
  return WEEK_SOURCE.map((item) => Object.assign({}, item, {
    activeClass: item.key === activeKey ? 'active' : '', markerText: item.key === activeKey ? '今天' : '●'
  }));
}

function filterCourses(activeKey) {
  if (activeKey === 'all') return COURSE_SOURCE.slice();
  if (activeKey === 'exception') return [];
  return COURSE_SOURCE.filter((item) => item.filterKey === activeKey);
}

function formatDate(value) {
  const parts = String(value || '').split('-');
  if (parts.length !== 3) return value;
  return parts[0] + '年' + Number(parts[1]) + '月' + Number(parts[2]) + '日';
}

Page({
  data: {
    navTop: 20, navHeight: 44, navSpacer: 76,
    campuses: ['浦东校区', '徐汇校区', '静安校区'], campusIndex: 0, campusText: '浦东校区',
    dateValue: '2026-07-15', dateText: '2026年7月15日', activeDay: '15', activeFilter: 'all',
    weekDays: buildWeek('15'), filters: buildFilters('all'), courses: filterCourses('all'), emptyVisible: false,
    assets: {
      background: CLOUD_ROOT + 'pages/campus-manager/m02/brand-basketball-background.png',
      back: MANAGER_ICON_ROOT + 'icon-back-orange-256.png', calendar: MANAGER_ICON_ROOT + 'icon-calendar-orange-256.png',
      location: MANAGER_ICON_ROOT + 'icon-location-orange-256.png', clock: MANAGER_ICON_ROOT + 'icon-clock-orange-256.png',
      user: MANAGER_ICON_ROOT + 'icon-user-orange-256.png', warning: MANAGER_ICON_ROOT + 'icon-warning-orange-256.png',
      chevron: MANAGER_ICON_ROOT + 'icon-chevron-orange-256.png', check: MANAGER_ICON_ROOT + 'icon-check-orange-256.png',
      course: CLOUD_ROOT + 'pages/education/icon-course-schedule.png'
    },
    metrics: [
      { label: '全部课程', value: '18', suffix: '节', tone: 'default', icon: CLOUD_ROOT + 'pages/education/icon-course-schedule.png', visualClass: '' },
      { label: '进行中', value: '2', suffix: '节', tone: 'green', icon: '', visualClass: 'play' },
      { label: '待点名', value: '3', suffix: '节', tone: 'orange', icon: MANAGER_ICON_ROOT + 'icon-user-orange-256.png', visualClass: '' },
      { label: '有变更', value: '1', suffix: '节', tone: 'orange', icon: MANAGER_ICON_ROOT + 'icon-warning-orange-256.png', visualClass: '' }
    ],
    reminders: [
      { id: 'conflict', title: '排课冲突', titleClass: 'danger', meta: '2号馆  17:00–18:30 与校内活动冲突', note: '建议调整场地或时间', action: '去处理', route: '/pages/campus-manager/schedule-conflict/index', icon: MANAGER_ICON_ROOT + 'icon-warning-orange-256.png' },
      { id: 'change', title: '变更提醒', titleClass: 'warning', meta: 'U12进阶训练班  15:15–16:45', note: '原定教练临时有事，已调整为李教练代课', action: '查看详情', route: '/pages/campus-manager/change-records/index', icon: MANAGER_ICON_ROOT + 'icon-clock-orange-256.png' }
    ]
  },
  onLoad() {
    let top = 20;
    let height = 44;
    try {
      const menu = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect();
      if (menu && menu.top) { top = menu.top; height = menu.height || 32; }
      else { const system = wx.getSystemInfoSync(); top = system.statusBarHeight || 20; }
    } catch (error) { console.warn('[campus-manager-courses] nav metrics unavailable', error); }
    this.setData({ navTop: top, navHeight: height, navSpacer: top + height + 8 });
  },
  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) { wx.navigateBack({ delta: 1 }); return; }
    wx.redirectTo({ url: '/pages/campus-manager/home/index', fail: () => wx.reLaunch({ url: '/pages/home/index' }) });
  },
  onCampusChange(event) {
    const index = Number(event.detail.value) || 0;
    this.setData({ campusIndex: index, campusText: this.data.campuses[index] });
  },
  onDateChange(event) {
    const value = event.detail.value;
    this.setData({ dateValue: value, dateText: formatDate(value) });
  },
  selectDay(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ activeDay: key, weekDays: buildWeek(key) });
  },
  selectFilter(event) {
    const key = event.currentTarget.dataset.key;
    const courses = filterCourses(key);
    this.setData({ activeFilter: key, filters: buildFilters(key), courses, emptyVisible: courses.length === 0 });
  },
  handleCourseAction(event) {
    const action = event.currentTarget.dataset.action;
    const id = event.currentTarget.dataset.id;
    const routes = {
      detail: '/pages/campus-manager/course-detail/index?id=' + id,
      reschedule: '/pages/campus-manager/course-change/index?id=' + id + '&action=reschedule',
      cancel: '/pages/campus-manager/course-change/index?id=' + id + '&action=cancel'
    };
    if (routes[action]) wx.navigateTo({ url: routes[action] });
  },
  openAttendance(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/campus-manager/attendance-overview/index?id=' + id });
  },
  openReminder(event) {
    const route = event.currentTarget.dataset.route;
    if (route) wx.navigateTo({ url: route });
  }
});
