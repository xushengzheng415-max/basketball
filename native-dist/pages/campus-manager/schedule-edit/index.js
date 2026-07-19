const ICON_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/common/campus-manager/';

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    campusOptions: ['浦东校区', '徐汇校区'],
    classOptions: ['U8启蒙班', 'U10基础训练班', 'U12进阶班', '成人基础班'],
    coachOptions: ['王教练', '陈教练', '李教练'],
    assistantOptions: ['不设置助教', '陈教练', '刘助教'],
    venueOptions: ['1号馆', '2号馆', '3号馆', '4号馆'],
    startOptions: ['09:00', '14:00', '15:00', '16:30', '18:30'],
    endOptions: ['10:30', '15:30', '16:30', '18:00', '20:00'],
    form: { campus: '浦东校区', className: 'U10基础训练班', date: '2025-07-16', start: '14:00', end: '15:30', coach: '王教练', assistant: '陈教练', venue: '2号馆' },
    notifyParent: true,
    notifyCoach: true,
    checks: [
      { symbol: '人', title: '教练冲突', result: '通过', note: '所选教练时间可用' },
      { symbol: '馆', title: '场馆冲突', result: '通过', note: '场馆时间可用' },
      { symbol: '员', title: '学员冲突', result: '通过', note: '学员无时间冲突' }
    ],
    icons: {
      back: ICON_ROOT + 'icon-back-white-256.png',
      location: ICON_ROOT + 'icon-location-orange-256.png',
      calendar: ICON_ROOT + 'icon-calendar-orange-256.png',
      clock: ICON_ROOT + 'icon-clock-orange-256.png',
      chevron: ICON_ROOT + 'icon-chevron-gray-256.png',
      user: ICON_ROOT + 'icon-user-orange-256.png'
    }
  },
  onLoad() {
    let navTop = 20;
    let navHeight = 44;
    try {
      const menu = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect();
      if (menu && menu.top) { navTop = menu.top; navHeight = menu.height || 32; }
      else navTop = wx.getSystemInfoSync().statusBarHeight || 20;
    } catch (error) { console.warn('[schedule-edit] nav metrics unavailable', error); }
    this.setData({ navTop, navHeight, navSpacer: navTop + navHeight + 13 });
  },
  goBack() {
    if (getCurrentPages().length > 1) { wx.navigateBack({ delta: 1 }); return; }
    wx.redirectTo({ url: '/pages/campus-manager/schedule/index', fail: () => wx.reLaunch({ url: '/pages/campus-manager/home/index' }) });
  },
  onPicker(event) {
    const key = event.currentTarget.dataset.key;
    const source = event.currentTarget.dataset.source;
    const value = (this.data[source] || [])[Number(event.detail.value)] || '';
    this.setData({ [`form.${key}`]: value });
  },
  onDate(event) { this.setData({ 'form.date': event.detail.value || '' }); },
  toggleNotify(event) { this.setData({ [event.currentTarget.dataset.key]: event.detail.value }); },
  createCourse() {
    wx.showToast({ title: '课程已创建并通知', icon: 'success' });
  }
});
