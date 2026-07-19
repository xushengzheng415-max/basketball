const ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/';
const ICON_ROOT = ROOT + 'common/campus-manager/';
const TEAM_ROOT = ROOT + 'pages/team/';

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
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
  onLoad() {
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
    this.setData({ navTop, navHeight, navSpacer: navTop + navHeight + 14 });
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
    wx.navigateTo({ url: '/pages/campus-manager/class-edit/index?mode=edit&id=u10' });
  },
  adjustStudents() {
    wx.navigateTo({ url: '/pages/campus-manager/class-students/index?id=u10' });
  },
  replaceCoach() {
    wx.showToast({ title: '教练更换申请已打开', icon: 'none' });
  },
  showInfo(event) {
    wx.showToast({ title: event.currentTarget.dataset.message || '详情功能开发中', icon: 'none' });
  }
});
