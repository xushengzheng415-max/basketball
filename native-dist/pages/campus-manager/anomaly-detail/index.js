const COMMON_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/common/campus-manager/';

const ANOMALY_DETAILS = {
  'duplicate-consume': { id: 'duplicate-consume', title: '重复课消扣减', classInfo: 'U8启蒙班', owner: '李老师 · 1号场', time: '7月18日 17:00', summary: '同一名学员在同一节课程被重复扣减1课时', impactValue: '1', impactUnit: '人', checkValue: '2', checkUnit: '笔记录' },
  'attendance-mismatch': { id: 'attendance-mismatch', title: '签到课消不一致', classInfo: 'U8启蒙班', owner: '王老师 · 2号场', time: '7月18日 18:30', summary: '学员显示缺勤，但系统已完成课消扣除', impactValue: '1', impactUnit: '人', checkValue: '1', checkUnit: '节课' },
  'missing-consume': { id: 'missing-consume', title: '已上课但未扣课时', classInfo: 'U12进阶班', owner: '陈教练 · 3号场', time: '7月18日 19:00', summary: '课程已结束并完成点名，但学员课时尚未扣减', impactValue: '1', impactUnit: '人', checkValue: '1', checkUnit: '节课' },
  'cross-campus': { id: 'cross-campus', title: '跨校区授课', classInfo: 'U10提高班', owner: '陈教练 · 1号场', time: '7月17日 18:30', summary: '授课校区与课程归属校区不一致，需要复核归属', impactValue: '2', impactUnit: '课时', checkValue: '2', checkUnit: '个校区' },
  'finance-unmatched-01': { id: 'finance-unmatched-01', title: '收款未匹配学员订单', classInfo: '浦东校区收款', owner: '财务待认领', time: '今天 11:26', summary: '微信收款¥1,280已到账，但尚未关联学员和课包订单', impactValue: '1', impactUnit: '笔', checkValue: '1', checkUnit: '个订单', finance: true }
};

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    detail: ANOMALY_DETAILS['attendance-mismatch'],
    icons: { back: COMMON_ROOT + 'icon-back-orange-256.png', warning: COMMON_ROOT + 'icon-warning-orange-256.png', user: COMMON_ROOT + 'icon-user-orange-256.png', clock: COMMON_ROOT + 'icon-clock-orange-256.png', check: COMMON_ROOT + 'icon-check-orange-256.png', chevron: COMMON_ROOT + 'icon-chevron-orange-256.png' },
    evidence: [
      { time: '18:31', title: '教练提交点名', detail: '教练已提交课堂点名，李明未签到', icon: COMMON_ROOT + 'icon-check-orange-256.png' },
      { time: '18:36', title: '家长请假记录', detail: '家长提交请假申请，时间 18:30–20:00', icon: COMMON_ROOT + 'icon-user-orange-256.png' },
      { time: '19:02', title: '系统扣课', detail: '系统已完成课消扣除', icon: COMMON_ROOT + 'icon-clock-orange-256.png' }
    ]
  },
  onLoad(options) {
    let navTop = 20;
    let navHeight = 44;
    try { const menu = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect(); if (menu && menu.top) { navTop = menu.top; navHeight = menu.height || 32; } else { navTop = wx.getSystemInfoSync().statusBarHeight || 20; } } catch (error) { console.warn('[campus-manager-anomaly-detail] nav metrics unavailable', error); }
    const id = options && ANOMALY_DETAILS[options.id] ? options.id : 'attendance-mismatch';
    const detail = ANOMALY_DETAILS[id];
    const evidence = detail.finance ? [
      { time: '11:26', title: '微信收款到账', detail: '实收金额¥1,280，支付状态已完成', icon: COMMON_ROOT + 'icon-check-orange-256.png' },
      { time: '11:27', title: '订单匹配失败', detail: '未找到相同金额与手机号的待支付订单', icon: COMMON_ROOT + 'icon-warning-orange-256.png' },
      { time: '11:30', title: '进入财务待办', detail: '系统已通知校区负责人核对认领', icon: COMMON_ROOT + 'icon-clock-orange-256.png' }
    ] : this.data.evidence;
    this.setData({ navTop, navHeight, navSpacer: navTop + navHeight + 16, detail, evidence });
  },
  goBack() { if (getCurrentPages().length > 1) { wx.navigateBack({ delta: 1 }); return; } wx.redirectTo({ url: '/pages/campus-manager/corrections/index', fail: () => wx.reLaunch({ url: '/pages/campus-manager/home/index' }) }); },
  returnForCheck() { wx.showToast({ title: this.data.detail.finance ? '已保留财务待核对' : '已退回责任人核对', icon: 'success' }); },
  approveCorrection() {
    if (this.data.detail.finance) {
      wx.showToast({ title: '订单已关联', icon: 'success' });
      setTimeout(() => wx.navigateBack({ delta: 1 }), 450);
      return;
    }
    wx.navigateTo({ url: '/pages/campus-manager/correction-edit/index?record=' + this.data.detail.id });
  }
});
