const CLOUD_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/';
const COMMON_ROOT = CLOUD_ROOT + 'common/campus-manager/';

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    courtPhoto: CLOUD_ROOT + 'pages/tournament-detail/court-background.png',
    icons: { back: COMMON_ROOT + 'icon-back-orange-256.png', user: COMMON_ROOT + 'icon-user-orange-256.png', check: COMMON_ROOT + 'icon-check-orange-256.png', warning: COMMON_ROOT + 'icon-warning-orange-256.png' },
    comparisons: [
      { label: '上课日期', before: '2025-05-14（周三）', after: '2025-05-14（周三）' },
      { label: '上课时间', before: '19:00–21:00', after: '18:00–20:00' },
      { label: '教练', before: '张教练', after: '王教练' },
      { label: '场地', before: '室外1号场', after: '室内2号场' },
      { label: '课时类型', before: '常规课', after: '补课' }
    ],
    checks: [
      { label: '申请时效', detail: '提交在课程后 7 天内' },
      { label: '可更正范围', detail: '不涉及跨校区、跨课程类型变更' },
      { label: '材料完整性', detail: '已提供必要凭证' },
      { label: '历史更正记录', detail: '本学期累计 1 次，未超限' }
    ],
    decisions: [
      { key: 'approve', label: '同意更正', symbol: '👍', activeClass: 'active' },
      { key: 'reject', label: '驳回申请', symbol: '👎', activeClass: '' },
      { key: 'return', label: '退回修改', symbol: '↩', activeClass: '' }
    ],
    decision: 'approve',
    note: ''
  },
  onLoad() {
    let navTop = 20;
    let navHeight = 44;
    try { const menu = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect(); if (menu && menu.top) { navTop = menu.top; navHeight = menu.height || 32; } else { navTop = wx.getSystemInfoSync().statusBarHeight || 20; } } catch (error) { console.warn('[campus-manager-correction-review] nav metrics unavailable', error); }
    this.setData({ navTop, navHeight, navSpacer: navTop + navHeight + 16 });
  },
  goBack() { if (getCurrentPages().length > 1) { wx.navigateBack({ delta: 1 }); return; } wx.redirectTo({ url: '/pages/campus-manager/correction-edit/index', fail: () => wx.reLaunch({ url: '/pages/campus-manager/home/index' }) }); },
  chooseDecision(event) { const decision = event.currentTarget.dataset.key; const decisions = this.data.decisions.map((item) => Object.assign({}, item, { activeClass: item.key === decision ? 'active' : '' })); this.setData({ decision, decisions }); },
  onNoteInput(event) { this.setData({ note: event.detail.value }); },
  confirmReview() { wx.showToast({ title: '审核结果已提交', icon: 'success' }); setTimeout(() => wx.navigateTo({ url: '/pages/campus-manager/correction-record/index' }), 450); }
});
