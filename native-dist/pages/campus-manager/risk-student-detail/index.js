const CLOUD_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/';
const COMMON_ROOT = CLOUD_ROOT + 'common/campus-manager/';

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    avatar: CLOUD_ROOT + 'pages/team/avatar-zhangzixuan.png',
    coachAvatar: CLOUD_ROOT + 'pages/team/avatar-zhaozimo.png',
    icons: { back: COMMON_ROOT + 'icon-back-orange-256.png' },
    timeline: [
      { time: '2025-05-27 10:30', text: '首次提醒到期（短信）', status: '已完成' },
      { time: '2025-05-29 18:00', text: '沟通学员情况（企业微信）', status: '已完成' },
      { time: '2025-05-30 10:00', text: '推荐续费方案（电话）', status: '待跟进' }
    ]
  },
  onLoad() {
    let navTop = 20;
    let navHeight = 44;
    try { const menu = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect(); if (menu && menu.top) { navTop = menu.top; navHeight = menu.height || 32; } else { navTop = wx.getSystemInfoSync().statusBarHeight || 20; } } catch (error) { console.warn('[campus-manager-risk-student-detail] nav metrics unavailable', error); }
    this.setData({ navTop, navHeight, navSpacer: navTop + navHeight + 16 });
  },
  goBack() { if (getCurrentPages().length > 1) { wx.navigateBack({ delta: 1 }); return; } wx.redirectTo({ url: '/pages/campus-manager/renewal-risk/index', fail: () => wx.reLaunch({ url: '/pages/campus-manager/home/index' }) }); },
  newFollowup() { wx.navigateTo({ url: '/pages/campus-manager/renewal-followup/index' }); },
  openTask() { wx.navigateTo({ url: '/pages/campus-manager/growth-task-detail/index' }); }
});
