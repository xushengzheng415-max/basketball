const ICON_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/common/campus-manager/';

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    icons: {
      back: `${ICON_ROOT}icon-back-orange-256.png`,
      user: `${ICON_ROOT}icon-user-orange-256.png`,
      check: `${ICON_ROOT}icon-check-orange-256.png`,
      warning: `${ICON_ROOT}icon-warning-orange-256.png`,
      clock: `${ICON_ROOT}icon-clock-orange-256.png`
    },
    chain: [
      { title: '系统发现风险', detail: '系统识别到学员出勤下滑', time: '05-12 09:30', owner: '系统', symbol: '险' },
      { title: '机构创建任务', detail: '创建续费任务并指派负责人', time: '05-12 09:35', owner: '陈教练', symbol: '任' },
      { title: '发送成长报告', detail: '向家长发送学员成长报告', time: '05-12 16:20', owner: '陈教练', symbol: '报' },
      { title: '负责人联系', detail: '电话沟通并解答课程疑问', time: '05-13 10:48', owner: '陈教练', symbol: '联' },
      { title: '家长续费', detail: '家长完成课程续费', time: '05-26 20:18', owner: '刘承宇家长', symbol: '成' }
    ],
    evidence: [
      { title: '风险预警记录', detail: '出勤率连续下降预警', time: '05-12 09:30', owner: '系统', symbol: '险' },
      { title: '任务创建记录', detail: '续费任务创建与指派', time: '05-12 09:35', owner: '陈教练', symbol: '任' },
      { title: '成长报告发送记录', detail: '成长报告已发送给家长', time: '05-12 16:20', owner: '陈教练', symbol: '报' },
      { title: '沟通记录', detail: '电话沟通记录与跟进摘要', time: '05-13 10:48', owner: '陈教练', symbol: '联' },
      { title: '续费订单记录', detail: '家长完成续费支付', time: '05-26 20:18', owner: '系统', symbol: '单' }
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
      console.warn('[assisted-conversion-detail] nav metrics unavailable', error);
    }
    this.setData({ navTop, navHeight, navSpacer: navTop + navHeight + 14 });
  },
  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.redirectTo({
      url: '/pages/campus-manager/platform-assist/index',
      fail: () => wx.reLaunch({ url: '/pages/campus-manager/home/index' })
    });
  },
  showOriginalRecords() {
    wx.showToast({ title: '原始记录已按时间顺序展示', icon: 'none' });
  }
});
