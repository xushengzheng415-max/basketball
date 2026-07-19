const CLOUD_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/';
const COMMON_ROOT = CLOUD_ROOT + 'common/campus-manager/';

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    courtPhoto: CLOUD_ROOT + 'pages/tournament-detail/court-background.png',
    icons: { back: COMMON_ROOT + 'icon-back-orange-256.png', download: COMMON_ROOT + 'icon-download-orange-256.png', warning: COMMON_ROOT + 'icon-warning-orange-256.png' },
    timeline: [
      { title: '异常检测', detail: '系统检测到课时记录与消课规则不一致', time: '2025-05-13 10:15' },
      { title: '更正提交', detail: '校区管理员提交更正申请', time: '2025-05-13 14:32' },
      { title: '审批通过', detail: '总部管理员审批通过', time: '2025-05-13 15:05' },
      { title: '账务更新', detail: '系统更新课时余额与财务账目', time: '2025-05-13 15:06' }
    ],
    comparisons: [
      { label: '学员', before: '张同学（学号：S2024001）', after: '张同学（学号：S2024001）' },
      { label: '课程', before: '篮球基础班（周二18:00-19:30）', after: '篮球提高班（周二18:00-19:30）' },
      { label: '课时类型', before: '常规课时', after: '常规课时' },
      { label: '消耗课时', before: '2 课时', after: '1 课时' },
      { label: '课时单价', before: '￥120 / 课时', after: '￥120 / 课时' },
      { label: '涉及日期', before: '2025-05-10', after: '2025-05-10' },
      { label: '课时余额变化', before: '-2 课时', after: '-1 课时' }
    ],
    audits: [
      { time: '2025-05-13 10:15', operator: '系统', role: '系统', action: '检测到课时记录异常' },
      { time: '2025-05-13 14:32', operator: '李明', role: '校区管理员', action: '提交更正申请' },
      { time: '2025-05-13 15:05', operator: '王强', role: '总部管理员', action: '审批通过' },
      { time: '2025-05-13 15:06', operator: '系统', role: '系统', action: '账务更新完成' }
    ]
  },
  onLoad() {
    let navTop = 20;
    let navHeight = 44;
    try { const menu = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect(); if (menu && menu.top) { navTop = menu.top; navHeight = menu.height || 32; } else { navTop = wx.getSystemInfoSync().statusBarHeight || 20; } } catch (error) { console.warn('[campus-manager-correction-record] nav metrics unavailable', error); }
    this.setData({ navTop, navHeight, navSpacer: navTop + navHeight + 16 });
  },
  goBack() { if (getCurrentPages().length > 1) { wx.navigateBack({ delta: 1 }); return; } wx.redirectTo({ url: '/pages/campus-manager/corrections/index', fail: () => wx.reLaunch({ url: '/pages/campus-manager/home/index' }) }); },
  openAnomaly() { wx.navigateTo({ url: '/pages/campus-manager/anomaly-detail/index' }); },
  exportRecord() { wx.showToast({ title: '更正记录已导出', icon: 'success' }); }
});
