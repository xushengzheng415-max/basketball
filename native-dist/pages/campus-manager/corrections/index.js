const COMMON_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/common/campus-manager/';

const ALL_ANOMALIES = [
  { id: 'cross-campus', category: 'other', level: '严重', tone: 'red', title: '跨校区授课', classInfo: 'U10提高班', person: '陈教练', impact: '-2课时 / -¥240', rule: '跨校区归属校验', owner: '张老师', evidence: '2', action: '去复核' },
  { id: 'duplicate-consume', category: 'consumption', level: '高', tone: 'orange', title: '重复课消扣减', classInfo: 'U8启蒙班', person: '林浩', impact: '-1课时 / -¥120', rule: '重复课消检测', owner: '李老师', evidence: '1', action: '去更正' },
  { id: 'attendance-mismatch', category: 'consumption', level: '中', tone: 'yellow', title: '签到课消不一致', classInfo: 'U8启蒙班', person: '王老师', impact: '1名学员', rule: '签到与课消一致性', owner: '王老师', evidence: '3', action: '去更正' },
  { id: 'missing-consume', category: 'consumption', level: '中', tone: 'yellow', title: '已上课但未扣课时', classInfo: 'U12进阶班', person: '张可欣', impact: '+1课时 / ¥160', rule: '课程完成与课消校验', owner: '陈教练', evidence: '2', action: '去核对' }
];

function buildTabs(activeKey) {
  return [
    { key: 'pending', label: '待处理' },
    { key: 'done', label: '已处理' },
    { key: 'records', label: '更正记录' }
  ].map((item) => Object.assign({}, item, { activeClass: item.key === activeKey ? 'active' : '' }));
}

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    pageTitle: '异常更正',
    filterType: '',
    filterTip: '',
    icons: { back: COMMON_ROOT + 'icon-back-orange-256.png' },
    metrics: [
      { label: '待处理', value: '8', symbol: '⚠' },
      { label: '课消异常', value: '3', symbol: '课' },
      { label: '出勤异常', value: '2', symbol: '人' },
      { label: '跨校区待复核', value: '3', symbol: '校' }
    ],
    tabs: buildTabs('pending'),
    anomalies: ALL_ANOMALIES,
    rules: [
      { name: '重复课消', active: true },
      { name: '跨校区归属', active: true },
      { name: '签到课消不一致', active: true },
      { name: '课程计划缺失', active: true }
    ],
    records: [
      { id: 'record-001', name: '张老师', time: '07-16 10:15', content: '归属校区：浦东校区 → 静安校区', status: '已通过' },
      { id: 'record-002', name: '李老师', time: '07-16 09:42', content: '原扣2课时 → 应扣1课时', status: '已通过' }
    ]
  },
  onLoad(options) {
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
      console.warn('[campus-manager-corrections] nav metrics unavailable', error);
    }
    const filterType = options && options.type === 'consumption' ? 'consumption' : '';
    const anomalies = filterType ? ALL_ANOMALIES.filter((item) => item.category === filterType) : ALL_ANOMALIES;
    this.setData({
      navTop,
      navHeight,
      navSpacer: navTop + navHeight + 16,
      pageTitle: filterType ? '课消异常' : '异常更正',
      filterType,
      filterTip: filterType ? '已自动筛选首页对应的3条课消异常' : '',
      anomalies
    });
  },
  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.reLaunch({ url: '/pages/campus-manager/home/index' });
  },
  switchTab(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ tabs: buildTabs(key) });
  },
  openAnomaly(event) {
    const id = event.currentTarget.dataset.id || 'attendance-mismatch';
    wx.navigateTo({ url: '/pages/campus-manager/anomaly-detail/index?id=' + id });
  },
  openRecord(event) {
    const id = event.currentTarget.dataset.id || 'record-001';
    wx.navigateTo({ url: '/pages/campus-manager/correction-record/index?id=' + id });
  },
  batch() {
    const suffix = this.data.filterType ? '?type=' + this.data.filterType : '';
    wx.navigateTo({ url: '/pages/campus-manager/correction-review/index' + suffix });
  }
});
