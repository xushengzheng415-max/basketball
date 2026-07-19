const CLOUD_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/';
const COMMON_ROOT = CLOUD_ROOT + 'common/campus-manager/';

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    avatar: CLOUD_ROOT + 'pages/team/avatar-zhangzixuan.png',
    courtPhoto: CLOUD_ROOT + 'pages/tournament-detail/court-background.png',
    icons: { back: COMMON_ROOT + 'icon-back-orange-256.png', calendar: COMMON_ROOT + 'icon-calendar-orange-256.png', warning: COMMON_ROOT + 'icon-warning-orange-256.png', chevron: COMMON_ROOT + 'icon-chevron-orange-256.png', check: COMMON_ROOT + 'icon-check-orange-256.png' },
    hours: 1.5,
    attendance: '出勤',
    attendanceOptions: [ { label: '出勤', activeClass: 'active' }, { label: '缺勤', activeClass: '' } ],
    reasons: [
      { key: 'coach', label: '教练漏记出勤', activeClass: 'active' },
      { key: 'system', label: '系统录入错误', activeClass: '' },
      { key: 'makeup', label: '学员补签', activeClass: '' },
      { key: 'other', label: '其他', activeClass: '' }
    ],
    note: ''
  },
  onLoad() {
    let navTop = 20;
    let navHeight = 44;
    try { const menu = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect(); if (menu && menu.top) { navTop = menu.top; navHeight = menu.height || 32; } else { navTop = wx.getSystemInfoSync().statusBarHeight || 20; } } catch (error) { console.warn('[campus-manager-correction-edit] nav metrics unavailable', error); }
    this.setData({ navTop, navHeight, navSpacer: navTop + navHeight + 16 });
  },
  goBack() { if (getCurrentPages().length > 1) { wx.navigateBack({ delta: 1 }); return; } wx.redirectTo({ url: '/pages/campus-manager/anomaly-detail/index', fail: () => wx.reLaunch({ url: '/pages/campus-manager/home/index' }) }); },
  selectAttendance(event) {
    const attendance = event.currentTarget.dataset.label;
    const attendanceOptions = this.data.attendanceOptions.map((item) => Object.assign({}, item, { activeClass: item.label === attendance ? 'active' : '' }));
    this.setData({ attendance, attendanceOptions });
  },
  changeHours(event) { const delta = Number(event.currentTarget.dataset.delta); const hours = Math.max(0.5, Math.min(6, this.data.hours + delta)); this.setData({ hours }); },
  selectReason(event) { const key = event.currentTarget.dataset.key; const reasons = this.data.reasons.map((item) => Object.assign({}, item, { activeClass: item.key === key ? 'active' : '' })); this.setData({ reasons }); },
  onNoteInput(event) { this.setData({ note: event.detail.value }); },
  submitReview() { wx.navigateTo({ url: '/pages/campus-manager/correction-review/index' }); }
});
