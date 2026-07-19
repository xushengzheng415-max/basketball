const ICON_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/common/campus-manager/';

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    icons: {
      back: `${ICON_ROOT}icon-back-orange-256.png`,
      check: `${ICON_ROOT}icon-check-orange-256.png`,
      user: `${ICON_ROOT}icon-user-orange-256.png`,
      chevron: `${ICON_ROOT}icon-chevron-orange-256.png`
    },
    dimensions: [
      { label: '点名及时率', value: '93', suffix: '%', symbol: '人' },
      { label: '课后评价', value: '82', suffix: '%', symbol: '评' },
      { label: '家长任务', value: '78', suffix: '%', symbol: '任' },
      { label: '续费跟进', value: '91', suffix: '%', symbol: '续' }
    ],
    coaches: [
      { name: '陈教练', score: 82, focus: '课后评价', avatarText: '陈' },
      { name: '李教练', score: 78, focus: '家长任务', avatarText: '李' },
      { name: '张教练', score: 84, focus: '点名及时率', avatarText: '张' }
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
      console.warn('[execution-index] nav metrics unavailable', error);
    }
    this.setData({ navTop, navHeight, navSpacer: navTop + navHeight + 14 });
  },
  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.redirectTo({
      url: '/pages/campus-manager/home/index',
      fail: () => wx.reLaunch({ url: '/pages/campus-manager/home/index' })
    });
  },
  openTasks() {
    wx.navigateTo({ url: '/pages/campus-manager/growth-tasks/index' });
  },
  openCoach() {
    wx.navigateTo({ url: '/pages/campus-manager/coach-detail/index' });
  }
});
