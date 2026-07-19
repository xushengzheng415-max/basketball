const CLOUD_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/';
const COMMON_ROOT = CLOUD_ROOT + 'common/campus-manager/';

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    avatar: CLOUD_ROOT + 'pages/team/avatar-zhaozimo.png',
    icons: {
      back: COMMON_ROOT + 'icon-back-orange-256.png',
      calendar: COMMON_ROOT + 'icon-calendar-orange-256.png',
      clock: COMMON_ROOT + 'icon-clock-orange-256.png',
      location: COMMON_ROOT + 'icon-location-orange-256.png',
      check: COMMON_ROOT + 'icon-check-orange-256.png',
      warning: COMMON_ROOT + 'icon-warning-orange-256.png',
      chevron: COMMON_ROOT + 'icon-chevron-orange-256.png'
    },
    currentClasses: [
      { name: 'U10-1班', role: '主教练', time: '周二、周四 18:30–20:00', place: '浦东校区 · 1号场' },
      { name: 'U12-2班', role: '助理教练', time: '周六 14:00–15:30', place: '浦东校区 · 2号场' }
    ],
    availableClasses: [
      { id: 1, name: 'U8基础班', time: '周三 17:00–18:30', place: '3号场', selected: false, selectedClass: '', role: '主教练', mainClass: 'active', assistantClass: '', conflict: false },
      { id: 2, name: 'U10-3班', time: '周四 18:30–20:00', place: '2号场', selected: false, selectedClass: '', role: '主教练', mainClass: 'active', assistantClass: '', conflict: true },
      { id: 3, name: 'U14精英班', time: '周日 09:00–10:30', place: '1号场', selected: true, selectedClass: 'selected', role: '主教练', mainClass: 'active', assistantClass: '', conflict: false }
    ],
    effectiveDate: '2025-07-21'
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
      console.warn('[campus-manager-coach-classes] nav metrics unavailable', error);
    }
    this.setData({ navTop, navHeight, navSpacer: navTop + navHeight + 16 });
  },
  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.redirectTo({
      url: '/pages/campus-manager/coach-detail/index',
      fail: () => wx.reLaunch({ url: '/pages/campus-manager/home/index' })
    });
  },
  toggleClass(event) {
    const id = Number(event.currentTarget.dataset.id);
    const list = this.data.availableClasses.map((item) => {
      if (item.id !== id || item.conflict) return item;
      const selected = !item.selected;
      return Object.assign({}, item, { selected, selectedClass: selected ? 'selected' : '' });
    });
    this.setData({ availableClasses: list });
  },
  setRole(event) {
    const id = Number(event.currentTarget.dataset.id);
    const role = event.currentTarget.dataset.role;
    const list = this.data.availableClasses.map((item) => {
      if (item.id !== id) return item;
      return Object.assign({}, item, {
        role,
        mainClass: role === '主教练' ? 'active' : '',
        assistantClass: role === '助理教练' ? 'active' : ''
      });
    });
    this.setData({ availableClasses: list });
  },
  onDateChange(event) {
    this.setData({ effectiveDate: event.detail.value });
  },
  submitAssignment() {
    wx.showToast({ title: '分配已保存并通知教练', icon: 'success' });
  }
});
