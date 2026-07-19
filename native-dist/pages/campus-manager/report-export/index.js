const CLOUD_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/';
const COMMON_ROOT = CLOUD_ROOT + 'common/campus-manager/';

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    icons: {
      back: COMMON_ROOT + 'icon-back-orange-256.png',
      calendar: COMMON_ROOT + 'icon-calendar-orange-256.png',
      user: COMMON_ROOT + 'icon-user-orange-256.png',
      bell: COMMON_ROOT + 'icon-warning-orange-256.png',
      filter: COMMON_ROOT + 'icon-filter-orange-256.png',
      download: COMMON_ROOT + 'icon-download-orange-256.png',
      chevron: COMMON_ROOT + 'icon-chevron-orange-256.png'
    },
    metrics: [
      { label: '课消', value: '286', suffix: '节' },
      { label: '出勤率', value: '94', suffix: '%' },
      { label: '待确认', value: '6', suffix: '条' }
    ],
    filters: [
      { label: '时间范围', value: '本月', icon: COMMON_ROOT + 'icon-calendar-orange-256.png' },
      { label: '校区', value: '浦东校区', icon: COMMON_ROOT + 'icon-location-orange-256.png' },
      { label: '班级', value: '全部班级', icon: COMMON_ROOT + 'icon-user-orange-256.png' },
      { label: '教练', value: '全部教练', icon: COMMON_ROOT + 'icon-user-orange-256.png' }
    ],
    reportTypes: [
      { key: 'consume', label: '课消报表', symbol: '▥', selectedClass: 'selected' },
      { key: 'attendance', label: '出勤报表', symbol: '◔', selectedClass: '' },
      { key: 'review', label: '评价报表', symbol: '☆', selectedClass: '' },
      { key: 'growth', label: '增长报告', symbol: '↗', selectedClass: '' }
    ],
    selectedType: '课消报表'
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
      console.warn('[campus-manager-report-export] nav metrics unavailable', error);
    }
    this.setData({ navTop, navHeight, navSpacer: navTop + navHeight + 16 });
  },
  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.redirectTo({ url: '/pages/campus-manager/reports/index', fail: () => wx.reLaunch({ url: '/pages/campus-manager/home/index' }) });
  },
  selectType(event) {
    const key = event.currentTarget.dataset.key;
    const reportTypes = this.data.reportTypes.map((item) => Object.assign({}, item, { selectedClass: item.key === key ? 'selected' : '' }));
    const selected = reportTypes.filter((item) => item.key === key)[0];
    this.setData({ reportTypes, selectedType: selected.label });
  },
  editFilter(event) {
    wx.showToast({ title: '可选择' + event.currentTarget.dataset.label, icon: 'none' });
  },
  generateExport() {
    wx.showToast({ title: '导出任务已创建', icon: 'success' });
    setTimeout(() => wx.navigateTo({ url: '/pages/campus-manager/export-jobs/index' }), 450);
  }
});
