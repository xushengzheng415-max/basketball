const CLOUD_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/';
const COMMON_ROOT = CLOUD_ROOT + 'common/campus-manager/';

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
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
    quickEntries: [
      { label: '课包课消', icon: COMMON_ROOT + 'icon-check-orange-256.png', route: '/pages/campus-manager/student-package/index' },
      { label: '成长记录', icon: COMMON_ROOT + 'icon-download-orange-256.png', route: '/pages/campus-manager/parent-growth-report/index' },
      { label: '家长反馈', icon: COMMON_ROOT + 'icon-user-orange-256.png', route: '/pages/campus-manager/parent-service/index' },
      { label: '跟进记录', icon: COMMON_ROOT + 'icon-calendar-orange-256.png', route: '/pages/campus-manager/renewal-followup/index' }
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
      console.warn('[campus-manager-student-detail] nav metrics unavailable', error);
    }
    this.setData({ navTop, navHeight, navSpacer: navTop + navHeight + 14 });
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
    wx.navigateTo({ url: '/pages/campus-manager/parent-growth-report/index' });
  },
  createFollowUp() {
    wx.navigateTo({ url: '/pages/campus-manager/growth-tasks/index?student=liu' });
  }
});
