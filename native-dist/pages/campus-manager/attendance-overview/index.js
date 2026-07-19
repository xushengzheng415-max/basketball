const ICON_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/common/campus-manager/';

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    icons: {
      back: ICON_ROOT + 'icon-back-orange-256.png',
      clock: ICON_ROOT + 'icon-clock-orange-256.png',
      location: ICON_ROOT + 'icon-location-orange-256.png',
      warning: ICON_ROOT + 'icon-warning-orange-256.png',
      user: ICON_ROOT + 'icon-user-orange-256.png'
    },
    metrics: [
      { label: '今日', value: '12', suffix: '节', tone: 'orange' },
      { label: '已完成', value: '10', suffix: '节', tone: 'success' },
      { label: '待点名', value: '2', suffix: '节', tone: 'danger' }
    ],
    overdueCourses: [
      { id: 'u10', symbol: '王', title: 'U10 提高班', venue: '浦东校区 · 1号场', time: '18:30 已开课', minutes: '15', tone: 'danger' },
      { id: 'u8', symbol: '李', title: 'U8 精英班', venue: '浦东校区 · 2号场', time: '19:00 已开课', minutes: '8', tone: 'orange' }
    ],
    anomalies: [
      { label: '缺勤', value: '3', suffix: '人', tone: 'danger', symbol: '缺' },
      { label: '请假', value: '2', suffix: '人', tone: 'orange', symbol: '假' },
      { label: '其他', value: '1', suffix: '人', tone: 'warning', symbol: '异' }
    ]
  },
  onLoad() {
    let top = 20;
    let height = 44;
    try {
      const menu = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect();
      if (menu && menu.top) { top = menu.top; height = menu.height || 32; }
      else { const system = wx.getSystemInfoSync(); top = system.statusBarHeight || 20; }
    } catch (error) { console.warn('[attendance-overview] nav metrics unavailable', error); }
    this.setData({ navTop: top, navHeight: height, navSpacer: top + height + 16 });
  },
  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) { wx.navigateBack({ delta: 1 }); return; }
    wx.redirectTo({ url: '/pages/campus-manager/courses/index', fail: () => wx.reLaunch({ url: '/pages/campus-manager/home/index' }) });
  },
  openDetail(event) {
    const id = event.currentTarget.dataset.id || '';
    wx.navigateTo({ url: '/pages/campus-manager/attendance-detail/index?id=' + id });
  },
  remindCoach(event) {
    const title = event.currentTarget.dataset.title || '教练';
    wx.showToast({ title: '已提醒' + title + '教练', icon: 'none' });
  },
  remindAll() {
    wx.showToast({ title: '已提醒全部待点名教练', icon: 'none' });
  }
});
