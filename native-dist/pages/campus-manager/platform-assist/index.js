const ICON_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/common/campus-manager/';

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    icons: {
      back: `${ICON_ROOT}icon-back-orange-256.png`,
      search: `${ICON_ROOT}icon-search-gray-256.png`,
      check: `${ICON_ROOT}icon-check-orange-256.png`,
      chevron: `${ICON_ROOT}icon-chevron-orange-256.png`,
      user: `${ICON_ROOT}icon-user-orange-256.png`
    },
    values: [
      { title: '发现机会', value: '38', suffix: '项', icon: `${ICON_ROOT}icon-search-gray-256.png` },
      { title: '机构已执行', value: '29', suffix: '项', icon: `${ICON_ROOT}icon-check-orange-256.png` },
      { title: '过程改善', value: '17', suffix: '项', icon: `${ICON_ROOT}icon-user-orange-256.png` },
      { title: '辅助成交', value: '18,600', suffix: '元', icon: `${ICON_ROOT}icon-check-orange-256.png`, money: true }
    ],
    contributions: [
      { title: '续费任务', detail: '辅助学员续费', amount: '¥12,000', symbol: '续' },
      { title: '缺勤召回', detail: '辅助召回流失学员', amount: '¥2,600', symbol: '召' },
      { title: '转介绍', detail: '辅助转介绍达成', amount: '¥4,000', symbol: '转' }
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
      console.warn('[platform-assist] nav metrics unavailable', error);
    }
    this.setData({ navTop, navHeight, navSpacer: navTop + navHeight + 12 });
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
  openDetail() {
    wx.navigateTo({ url: '/pages/campus-manager/assisted-conversion-detail/index' });
  }
});
