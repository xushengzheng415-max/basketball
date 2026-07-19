const ICON_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/common/campus-manager/';

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    icons: {
      back: ICON_ROOT + 'icon-back-orange-256.png', calendar: ICON_ROOT + 'icon-calendar-orange-256.png',
      clock: ICON_ROOT + 'icon-clock-orange-256.png', warning: ICON_ROOT + 'icon-warning-orange-256.png',
      check: ICON_ROOT + 'icon-check-orange-256.png', user: ICON_ROOT + 'icon-user-orange-256.png'
    },
    metrics: [
      { label: '应到', value: '18', suffix: '人', tone: 'muted', symbol: '应' },
      { label: '已到', value: '16', suffix: '人', tone: 'success', symbol: '到' },
      { label: '请假', value: '1', suffix: '人', tone: 'orange', symbol: '假' },
      { label: '缺勤', value: '1', suffix: '人', tone: 'danger', symbol: '缺' }
    ],
    students: [
      { no: '1', name: '张宇轩', avatar: '张', status: '已到', tone: 'success', tag: '' },
      { no: '2', name: '李浩然', avatar: '李', status: '已到', tone: 'success', tag: '' },
      { no: '3', name: '王子睿', avatar: '王', status: '已到', tone: 'success', tag: '' },
      { no: '4', name: '陈奕辰', avatar: '陈', status: '已到', tone: 'success', tag: '' },
      { no: '5', name: '刘昊天', avatar: '刘', status: '已到', tone: 'success', tag: '' },
      { no: '6', name: '周子墨', avatar: '周', status: '请假', tone: 'orange', tag: '事假' },
      { no: '7', name: '吴俊熙', avatar: '吴', status: '已到', tone: 'success', tag: '' },
      { no: '8', name: '赵梓涵', avatar: '赵', status: '缺勤', tone: 'danger', tag: '未到校' }
    ],
    exceptions: [
      { avatar: '赵', name: '赵梓涵', status: '缺勤', tone: 'danger', reason: '原因：未到校' },
      { avatar: '周', name: '周子墨', status: '请假', tone: 'orange', reason: '事假：家中有事' }
    ]
  },
  onLoad() {
    let top = 20;
    let height = 44;
    try {
      const menu = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect();
      if (menu && menu.top) { top = menu.top; height = menu.height || 32; }
      else { const system = wx.getSystemInfoSync(); top = system.statusBarHeight || 20; }
    } catch (error) { console.warn('[attendance-detail] nav metrics unavailable', error); }
    this.setData({ navTop: top, navHeight: height, navSpacer: top + height + 16 });
  },
  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) { wx.navigateBack({ delta: 1 }); return; }
    wx.redirectTo({ url: '/pages/campus-manager/attendance-overview/index', fail: () => wx.reLaunch({ url: '/pages/campus-manager/courses/index' }) });
  },
  showToast(event) {
    wx.showToast({ title: event.currentTarget.dataset.message || '操作已记录', icon: 'none' });
  }
});
