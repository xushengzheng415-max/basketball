const CLOUD_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/';
const COMMON_ROOT = CLOUD_ROOT + 'common/campus-manager/';

const allGroups = [
  { date: '今天 · 07月18日', events: [
    { id: 1, time: '18:42', title: '点名提交', detail: 'U10提高班 · 应到12人，实到11人', result: '提交成功', tone: 'green', abnormal: false, icon: COMMON_ROOT + 'icon-check-orange-256.png' },
    { id: 2, time: '18:55', title: '课后评价待补', detail: 'U10提高班 · 系统自动提醒', result: '待处理', tone: 'orange', abnormal: true, icon: COMMON_ROOT + 'icon-clock-orange-256.png' },
    { id: 3, time: '20:12', title: '评价被退回', detail: '需补充家长可读内容后重新提交', result: '查看详情', tone: 'red', abnormal: true, icon: COMMON_ROOT + 'icon-warning-orange-256.png' }
  ]},
  { date: '昨天 · 07月17日', events: [
    { id: 4, time: '16:30', title: '课程评价提交', detail: 'U8启蒙班 · 12份评价已完成', result: '已完成', tone: 'green', abnormal: false, icon: COMMON_ROOT + 'icon-check-orange-256.png' },
    { id: 5, time: '19:08', title: '点名超时', detail: 'U12进阶班 · 开课后12分钟提交', result: '已提醒', tone: 'red', abnormal: true, icon: COMMON_ROOT + 'icon-warning-orange-256.png' }
  ]},
  { date: '07月15日 · 周二', events: [
    { id: 6, time: '10:25', title: '课表调整', detail: 'U10提高班授课时间调整', result: '负责人已确认', tone: 'green', abnormal: false, icon: COMMON_ROOT + 'icon-calendar-orange-256.png' }
  ]}
];

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    avatar: CLOUD_ROOT + 'pages/team/avatar-zhaozimo.png',
    icons: {
      back: COMMON_ROOT + 'icon-back-orange-256.png',
      calendar: COMMON_ROOT + 'icon-calendar-orange-256.png',
      filter: COMMON_ROOT + 'icon-filter-orange-256.png',
      chevron: COMMON_ROOT + 'icon-chevron-orange-256.png'
    },
    metrics: [
      { label: '本周操作', value: '26', tone: 'white' },
      { label: '异常记录', value: '3', tone: 'red' },
      { label: '已处理', value: '2', tone: 'green' }
    ],
    filters: [
      { key: 'all', label: '全部操作', activeClass: 'active' },
      { key: 'attendance', label: '点名', activeClass: '' },
      { key: 'review', label: '评价', activeClass: '' },
      { key: 'schedule', label: '课表', activeClass: '' }
    ],
    groups: allGroups,
    abnormalOnly: false,
    switchClass: ''
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
      console.warn('[campus-manager-coach-logs] nav metrics unavailable', error);
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
  switchFilter(event) {
    const key = event.currentTarget.dataset.key;
    const filters = this.data.filters.map((item) => Object.assign({}, item, { activeClass: item.key === key ? 'active' : '' }));
    this.setData({ filters });
  },
  toggleAbnormal() {
    const abnormalOnly = !this.data.abnormalOnly;
    const groups = abnormalOnly ? allGroups.map((group) => Object.assign({}, group, { events: group.events.filter((event) => event.abnormal) })).filter((group) => group.events.length) : allGroups;
    this.setData({ abnormalOnly, groups, switchClass: abnormalOnly ? 'on' : '' });
  },
  openLog(event) {
    const id = Number(event.currentTarget.dataset.id);
    if (id === 3 || id === 5) {
      wx.navigateTo({ url: '/pages/campus-manager/anomaly-detail/index' });
      return;
    }
    wx.showToast({ title: '记录详情已展开', icon: 'none' });
  }
});
