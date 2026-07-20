const CLOUD_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/';
const COMMON_ROOT = CLOUD_ROOT + 'common/campus-manager/';

const STUDENT_DETAILS = {
  liu: { id: 'liu', name: '刘承宇', gender: '♂', age: '10岁', className: 'U10 提高班', lessons: '24', nextDate: '07-30', nextDay: '周二', nextTime: '18:30-20:00', location: '1号馆 · 1号场', attendance: '3', attendanceTotal: '4', reportStatus: '未查看', risk: '正常', riskCaption: '当前无需重点关注', avatar: CLOUD_ROOT + 'pages/team/avatar-linhao.png' },
  lin: { id: 'lin', name: '林子轩', gender: '♂', age: '9岁', className: 'U9 基础班', lessons: '6', nextDate: '08-01', nextDay: '周四', nextTime: '18:00-19:30', location: '2号馆 · 1号场', attendance: '2', attendanceTotal: '4', reportStatus: '待发送', risk: '高风险', riskCaption: '课时较少且近期缺勤', avatar: CLOUD_ROOT + 'pages/team/avatar-zhaozimo.png' },
  chen: { id: 'chen', name: '陈雨桐', gender: '♀', age: '8岁', className: 'U8 启蒙班', lessons: '18', nextDate: '08-03', nextDay: '周六', nextTime: '09:00-10:00', location: '1号馆 · 启蒙区', attendance: '4', attendanceTotal: '4', reportStatus: '已查看', risk: '正常', riskCaption: '学习状态稳定', avatar: CLOUD_ROOT + 'pages/team/avatar-zhangzixuan.png' },
  wang: { id: 'wang', name: '王皓然', gender: '♂', age: '11岁', className: 'U11 提高班', lessons: '30', nextDate: '08-04', nextDay: '周日', nextTime: '10:30-12:00', location: '3号馆 · 提高区', attendance: '4', attendanceTotal: '4', reportStatus: '已查看', risk: '正常', riskCaption: '课时与出勤正常', avatar: CLOUD_ROOT + 'pages/team/avatar-liuyuchen.png' }
};

function buildQuickEntries(id) {
  return [
    { label: '课包课消', icon: COMMON_ROOT + 'icon-check-orange-256.png', route: '/pages/campus-manager/student-package/index?student=' + id },
    { label: '成长记录', icon: COMMON_ROOT + 'icon-download-orange-256.png', route: '/pages/campus-manager/parent-growth-report/index?student=' + id },
    { label: '家长反馈', icon: COMMON_ROOT + 'icon-user-orange-256.png', route: '/pages/campus-manager/parent-service/index?student=' + id },
    { label: '跟进记录', icon: COMMON_ROOT + 'icon-calendar-orange-256.png', route: '/pages/campus-manager/renewal-followup/index?student=' + id }
  ];
}

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    student: STUDENT_DETAILS.liu,
    avatar: CLOUD_ROOT + 'pages/team/avatar-linhao.png',
    icons: {
      back: COMMON_ROOT + 'icon-back-orange-256.png',
      clock: COMMON_ROOT + 'icon-clock-orange-256.png',
      calendar: COMMON_ROOT + 'icon-calendar-orange-256.png',
      location: COMMON_ROOT + 'icon-location-orange-256.png',
      check: COMMON_ROOT + 'icon-check-orange-256.png',
      warning: COMMON_ROOT + 'icon-warning-orange-256.png',
      user: COMMON_ROOT + 'icon-user-orange-256.png',
      download: COMMON_ROOT + 'icon-download-orange-256.png',
      chevron: COMMON_ROOT + 'icon-chevron-orange-256.png'
    },
    quickEntries: buildQuickEntries('liu')
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
      console.warn('[campus-manager-student-detail] nav metrics unavailable', error);
    }
    const id = options && STUDENT_DETAILS[options.id] ? options.id : 'liu';
    const student = STUDENT_DETAILS[id];
    this.setData({ navTop, navHeight, navSpacer: navTop + navHeight + 14, student, avatar: student.avatar, quickEntries: buildQuickEntries(id) });
  },
  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.redirectTo({
      url: '/pages/campus-manager/students/index',
      fail: () => wx.reLaunch({ url: '/pages/campus-manager/home/index' })
    });
  },
  openEntry(event) {
    const route = event.currentTarget.dataset.route;
    if (route) wx.navigateTo({ url: route });
  },
  openRecommendation() {
    wx.navigateTo({ url: '/pages/campus-manager/parent-growth-report/index?student=' + this.data.student.id });
  },
  createFollowUp() {
    wx.navigateTo({ url: '/pages/campus-manager/growth-tasks/index?student=' + this.data.student.id });
  }
});
