const CLOUD_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/';
const COMMON_ROOT = CLOUD_ROOT + 'common/campus-manager/';

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    avatar: CLOUD_ROOT + 'pages/team/avatar-zhaozimo.png',
    icons: {
      back: COMMON_ROOT + 'icon-back-orange-256.png',
      calendar: COMMON_ROOT + 'icon-calendar-orange-256.png',
      clock: COMMON_ROOT + 'icon-clock-orange-256.png',
      location: COMMON_ROOT + 'icon-location-orange-256.png',
      check: COMMON_ROOT + 'icon-check-orange-256.png',
      warning: COMMON_ROOT + 'icon-warning-orange-256.png',
      user: COMMON_ROOT + 'icon-user-orange-256.png',
      chevron: COMMON_ROOT + 'icon-chevron-orange-256.png'
    },
    metrics: [
      { label: '执行评分', value: '92', suffix: '分', tone: 'green' },
      { label: '本周完成', value: '18', suffix: '节', tone: 'orange' },
      { label: '待评价', value: '2', suffix: '节', tone: 'orange' },
      { label: '退回修改', value: '1', suffix: '条', tone: 'red' }
    ],
    courses: [
      { time: '18:30–20:00', name: 'U10提高班', place: '1号场', status: '待上课' },
      { time: '16:30–18:00', name: 'U8启蒙班', place: '2号场', status: '已完成' }
    ],
    qualities: [
      { label: '点名准时率', value: '96%', ringClass: 'ring-green' },
      { label: '课后评价', value: '89%', ringClass: 'ring-orange' },
      { label: '家长反馈', value: '4.8', ringClass: 'ring-yellow' }
    ],
    actions: [
      { label: '分配班级', caption: '调整负责班级与角色', icon: COMMON_ROOT + 'icon-user-orange-256.png', route: '/pages/campus-manager/coach-classes/index' },
      { label: '查看操作记录', caption: '查看教练近期操作', icon: COMMON_ROOT + 'icon-clock-orange-256.png', route: '/pages/campus-manager/coach-logs/index' },
      { label: '发起沟通', caption: '提醒待办与改进事项', icon: COMMON_ROOT + 'icon-warning-orange-256.png', route: '/pages/campus-manager/permissions/index' }
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
      console.warn('[campus-manager-coach-detail] nav metrics unavailable', error);
    }
    this.setData({ navTop, navHeight, navSpacer: navTop + navHeight + 16 });
  },
  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.redirectTo({
      url: '/pages/campus-manager/staff/index',
      fail: () => wx.reLaunch({ url: '/pages/campus-manager/home/index' })
    });
  },
  openPage(event) {
    const route = event.currentTarget.dataset.route;
    if (route) wx.navigateTo({ url: route });
  }
});
