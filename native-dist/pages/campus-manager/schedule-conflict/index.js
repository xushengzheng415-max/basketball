const ICON_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/common/campus-manager/';

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    resolved: {},
    conflicts: [
      {
        id: 'venue', number: '冲突 1', title: '场馆时间重叠', note: '同一场馆在相同时间被安排了多节课程',
        current: { flag: '本课程', title: 'U10基础班', time: '07.16 周四 14:00-15:30', venue: '2号馆', coach: '陈教练', people: '10 / 12 人', status: '正常' },
        other: { flag: '冲突课程', title: 'U12进阶班', time: '07.16 周四 15:00-16:30', venue: '2号馆', coach: '李教练', people: '11 / 12 人', status: '冲突' },
        suggestion: '两节课在 2号馆 时间重叠 30 分钟，建议调整其中一节课时间。'
      },
      {
        id: 'coach', number: '冲突 2', title: '教练时间重叠', note: '同一教练在相同时间被安排了多节课程',
        current: { flag: '本课程', title: 'U12进阶班', time: '07.16 周四 16:30-18:00', venue: '3号馆', coach: '李教练', people: '11 / 12 人', status: '正常' },
        other: { flag: '冲突课程', title: '成人基础班', time: '07.16 周四 18:30-20:00', venue: '4号馆', coach: '李教练', people: '8 / 12 人', status: '冲突' },
        suggestion: '教练李教练课程间隔不足 30 分钟，建议调整其中一节课时间。'
      }
    ],
    icons: { back: ICON_ROOT + 'icon-back-white-256.png', warning: ICON_ROOT + 'icon-warning-orange-256.png' }
  },
  onLoad() {
    let navTop = 20;
    let navHeight = 44;
    try {
      const menu = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect();
      if (menu && menu.top) { navTop = menu.top; navHeight = menu.height || 32; }
      else navTop = wx.getSystemInfoSync().statusBarHeight || 20;
    } catch (error) { console.warn('[schedule-conflict] nav metrics unavailable', error); }
    this.setData({ navTop, navHeight, navSpacer: navTop + navHeight + 13 });
  },
  goBack() {
    if (getCurrentPages().length > 1) { wx.navigateBack({ delta: 1 }); return; }
    wx.redirectTo({ url: '/pages/campus-manager/schedule/index', fail: () => wx.reLaunch({ url: '/pages/campus-manager/home/index' }) });
  },
  resolveConflict(event) {
    const id = event.currentTarget.dataset.id;
    const action = event.currentTarget.dataset.action;
    if (action === 'ignore') {
      wx.showModal({ title: '忽略并记录', content: '确认保留当前冲突并记录原因？', confirmColor: '#ff7900', success: (result) => { if (result.confirm) this.markResolved(id); } });
      return;
    }
    wx.showToast({ title: action === 'current' ? '正在调整本课程' : '正在调整冲突课程', icon: 'none' });
    this.markResolved(id);
  },
  markResolved(id) {
    this.setData({ [`resolved.${id}`]: true });
  },
  finish() {
    wx.showToast({ title: '冲突处理已完成', icon: 'success' });
  }
});
