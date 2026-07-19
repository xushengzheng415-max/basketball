const COMMON_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/common/campus-manager/';

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    icons: { back: COMMON_ROOT + 'icon-back-orange-256.png', warning: COMMON_ROOT + 'icon-warning-orange-256.png', user: COMMON_ROOT + 'icon-user-orange-256.png', clock: COMMON_ROOT + 'icon-clock-orange-256.png', check: COMMON_ROOT + 'icon-check-orange-256.png', chevron: COMMON_ROOT + 'icon-chevron-orange-256.png' },
    evidence: [
      { time: '18:31', title: '教练提交点名', detail: '教练已提交课堂点名，李明未签到', icon: COMMON_ROOT + 'icon-check-orange-256.png' },
      { time: '18:36', title: '家长请假记录', detail: '家长提交请假申请，时间 18:30–20:00', icon: COMMON_ROOT + 'icon-user-orange-256.png' },
      { time: '19:02', title: '系统扣课', detail: '系统已完成课消扣除', icon: COMMON_ROOT + 'icon-clock-orange-256.png' }
    ]
  },
  onLoad() {
    let navTop = 20;
    let navHeight = 44;
    try { const menu = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect(); if (menu && menu.top) { navTop = menu.top; navHeight = menu.height || 32; } else { navTop = wx.getSystemInfoSync().statusBarHeight || 20; } } catch (error) { console.warn('[campus-manager-anomaly-detail] nav metrics unavailable', error); }
    this.setData({ navTop, navHeight, navSpacer: navTop + navHeight + 16 });
  },
  goBack() { if (getCurrentPages().length > 1) { wx.navigateBack({ delta: 1 }); return; } wx.redirectTo({ url: '/pages/campus-manager/corrections/index', fail: () => wx.reLaunch({ url: '/pages/campus-manager/home/index' }) }); },
  returnForCheck() { wx.showToast({ title: '已退回教练核对', icon: 'success' }); },
  approveCorrection() { wx.navigateTo({ url: '/pages/campus-manager/correction-edit/index' }); }
});
