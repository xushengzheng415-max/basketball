const ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/';
const ICON_ROOT = ROOT + 'common/campus-manager/';
const TEAM_ROOT = ROOT + 'pages/team/';

const CLASS_DETAILS = {
  u8: { id: 'u8', badge: 'U8', title: 'U8篮球启蒙班', venue: '浦东校区 · 1号馆', students: '16', capacity: '16', attendance: '100', code: 'U8-2024-001', createdAt: '2024-03-10', stage: '启蒙训练', schedule: '每周二、周四 17:00-18:00', scheduleTime: '17:00-18:00' },
  u10: { id: 'u10', badge: 'U10', title: 'U10基础训练班', venue: '浦东校区 · 2号馆', students: '18', capacity: '18', attendance: '94', code: 'U10-2024-002', createdAt: '2024-05-20', stage: '基础训练', schedule: '每周三 18:30、周六 09:00', scheduleTime: '周三18:30 / 周六09:00' },
  u12: { id: 'u12', badge: 'U12', title: 'U12进阶训练班', venue: '浦东校区 · 3号馆', students: '18', capacity: '20', attendance: '80', code: 'U12-2024-003', createdAt: '2024-06-12', stage: '进阶训练', schedule: '每周一、周五 18:30-20:00', scheduleTime: '18:30-20:00' },
  adult: { id: 'adult', badge: 'ADULT', title: '成人篮球基础班', venue: '浦东校区 · 4号馆', students: '14', capacity: '18', attendance: '72', code: 'ADULT-2024-001', createdAt: '2024-08-01', stage: '成人基础', schedule: '每周三、周日 20:00-21:30', scheduleTime: '20:00-21:30' }
};

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    classInfo: CLASS_DETAILS.u10,
    icons: {
      back: ICON_ROOT + 'icon-back-orange-256.png',
      user: ICON_ROOT + 'icon-user-orange-256.png',
      coach: ICON_ROOT + 'icon-coach-orange-256.png',
      calendar: ICON_ROOT + 'icon-calendar-orange-256.png',
      location: ICON_ROOT + 'icon-location-orange-256.png',
      clock: ICON_ROOT + 'icon-clock-orange-256.png',
      warning: ICON_ROOT + 'icon-warning-orange-256.png',
      edit: ICON_ROOT + 'icon-class-orange-256.png',
      chevron: ICON_ROOT + 'icon-chevron-gray-256.png'
    },
    coaches: [
      { name: '陈教练', role: '主教练', level: 'B级教练', years: '6年', avatar: TEAM_ROOT + 'avatar-zhaozimo.png' },
      { name: '王助教', role: '助教', level: 'C级教练', years: '2年', avatar: TEAM_ROOT + 'avatar-wang.png' }
    ],
    students: [
      { name: '张宇轩', avatar: TEAM_ROOT + 'avatar-linhao.png' },
      { name: '李昊然', avatar: TEAM_ROOT + 'avatar-liuyuchen.png' },
      { name: '王一凡', avatar: TEAM_ROOT + 'avatar-zhangzixuan.png' },
      { name: '刘泽宇', avatar: TEAM_ROOT + 'avatar-zhaozimo.png' },
      { name: '陈思远', avatar: TEAM_ROOT + 'avatar-liaoran.png' }
    ],
    recentCourses: [
      { date: '07-16', day: '周二 14:00', title: '基础训练课：运球与投篮', attendance: '出勤：17/18' },
      { date: '07-11', day: '周四 14:00', title: '基础训练课：传球与配合', attendance: '出勤：16/18' }
    ],
    warnings: [
      { icon: '!', title: '出勤率连续 3 周低于 85%', note: '建议关注学员出勤情况', count: '2人', tone: 'warning' },
      { icon: '人', title: '学员未完成体测', note: '建议尽快安排补测', count: '1人', tone: 'orange' }
    ]
  },
  onLoad(options) {
    let navTop = 20;
    let navHeight = 44;
    try {
      const menu = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect();
      if (menu && menu.top) {
        navTop = menu.top;
        navHeight = menu.height || 32;
      } else {
        navTop = wx.getSystemInfoSync().statusBarHeight || 20;
      }
    } catch (error) {
      console.warn('[class-detail] nav metrics unavailable', error);
    }
    const id = options && CLASS_DETAILS[options.id] ? options.id : 'u10';
    this.setData({ navTop, navHeight, navSpacer: navTop + navHeight + 14, classInfo: CLASS_DETAILS[id] });
  },
  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.redirectTo({
      url: '/pages/campus-manager/classes/index',
      fail: () => wx.reLaunch({ url: '/pages/campus-manager/home/index' })
    });
  },
  editClass() {
    wx.navigateTo({ url: '/pages/campus-manager/class-edit/index?mode=edit&id=' + this.data.classInfo.id });
  },
  adjustStudents() {
    wx.navigateTo({ url: '/pages/campus-manager/class-students/index?id=' + this.data.classInfo.id });
  },
  replaceCoach() {
    wx.showToast({ title: '教练更换申请已打开', icon: 'none' });
  },
  showInfo(event) {
    wx.showToast({ title: event.currentTarget.dataset.message || '详情功能开发中', icon: 'none' });
  }
});
