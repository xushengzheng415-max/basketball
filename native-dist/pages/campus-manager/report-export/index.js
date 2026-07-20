const CLOUD_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/';
const COMMON_ROOT = CLOUD_ROOT + 'common/campus-manager/';
const PERIOD_OPTIONS = ['1周', '1月', '1季度', '1年'];
const CAMPUS_OPTIONS = ['全部校区', '浦东校区', '徐汇校区', '静安校区'];
const PERIOD_WEIGHTS = { '1周': 1, '1月': 4, '1季度': 13, '1年': 52 };

function adaptMetrics(metrics, selectedPeriod, basePeriod) {
  const factor = PERIOD_WEIGHTS[selectedPeriod] / PERIOD_WEIGHTS[basePeriod];
  return metrics.map((item) => {
    if (item.suffix === '%') return Object.assign({}, item);
    const source = Number(String(item.value).replace(/,/g, ''));
    if (!Number.isFinite(source)) return Object.assign({}, item);
    const value = Math.round(source * factor * 10) / 10;
    return Object.assign({}, item, { value: value.toLocaleString('en-US', { maximumFractionDigits: 1 }) });
  });
}

function adaptRows(rows, selectedPeriod, basePeriod) {
  if (selectedPeriod === basePeriod) return rows.map((item) => Object.assign({}, item));
  return rows.map((item, index) => {
    const number = index + 1;
    return Object.assign({}, item, { time: selectedPeriod + '记录 ' + (number < 10 ? '0' + number : String(number)) });
  });
}

function decodeOption(value) {
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
}

const REPORT_CONFIGS = {
  hours: {
    title: '销课课时明细', period: '1周', description: '只统计已完成销课的课时记录',
    metrics: [{ label: '销课课时', value: '128', suffix: '课时' }, { label: '完成课程', value: '12', suffix: '节' }, { label: '涉及学员', value: '96', suffix: '人' }],
    rows: [
      { id: 'h-01', time: '11:30', title: 'U10 提高班', meta: '陈教练 · 12名学员', value: '18课时', status: '已销课' },
      { id: 'h-02', time: '10:15', title: 'U8 基础班', meta: '王教练 · 10名学员', value: '10课时', status: '已销课' },
      { id: 'h-03', time: '09:40', title: 'U12 竞赛班', meta: '赵教练 · 14名学员', value: '28课时', status: '已销课' },
      { id: 'h-04', time: '08:55', title: 'U10 提高班', meta: '陈教练 · 12名学员', value: '18课时', status: '已销课' }
    ]
  },
  amount: {
    title: '销课金额明细', period: '1周', description: '只统计今日销课对应的金额',
    metrics: [{ label: '销课金额', value: '38,600', suffix: '元' }, { label: '销课记录', value: '128', suffix: '条' }, { label: '完成课程', value: '12', suffix: '节' }],
    rows: [
      { id: 'a-01', time: '11:30', title: 'U10 提高班', meta: '陈教练 · 12条销课记录', value: '¥2,376', status: '已核算' },
      { id: 'a-02', time: '10:15', title: 'U8 基础班', meta: '王教练 · 10条销课记录', value: '¥1,280', status: '已核算' },
      { id: 'a-03', time: '09:40', title: 'U12 竞赛班', meta: '赵教练 · 14条销课记录', value: '¥3,640', status: '已核算' },
      { id: 'a-04', time: '08:55', title: 'U10 提高班', meta: '陈教练 · 12条销课记录', value: '¥2,376', status: '已核算' }
    ]
  },
  courses: {
    title: '完成课程明细', period: '1周', description: '只查看今日已结束并完成销课的课程',
    metrics: [{ label: '完成课程', value: '12', suffix: '节' }, { label: '涉及班级', value: '8', suffix: '个' }, { label: '授课教练', value: '6', suffix: '人' }],
    rows: [
      { id: 'c-01', time: '11:30', title: 'U10 提高班', meta: '陈教练 · 1号馆', value: '90分钟', status: '已完成' },
      { id: 'c-02', time: '10:15', title: 'U8 基础班', meta: '王教练 · 2号馆', value: '60分钟', status: '已完成' },
      { id: 'c-03', time: '09:40', title: 'U12 竞赛班', meta: '赵教练 · 1号馆', value: '120分钟', status: '已完成' }
    ]
  },
  attendance: {
    title: '到课学员明细', period: '1周', description: '只查看今日课程的实际到课情况',
    metrics: [{ label: '到课学员', value: '96', suffix: '人' }, { label: '应到学员', value: '104', suffix: '人' }, { label: '到课率', value: '92.6', suffix: '%' }],
    rows: [
      { id: 'at-01', time: '11:30', title: 'U10 提高班', meta: '应到12人 · 请假1人', value: '11人', status: '已点名' },
      { id: 'at-02', time: '10:15', title: 'U8 基础班', meta: '应到10人 · 无请假', value: '10人', status: '已点名' },
      { id: 'at-03', time: '09:40', title: 'U12 竞赛班', meta: '应到14人 · 请假2人', value: '12人', status: '已点名' }
    ]
  },
  received: {
    title: '实收明细', period: '1周', description: '只统计今日实际到账的收款记录',
    metrics: [{ label: '净实收', value: '12,680', suffix: '元' }, { label: '到账订单', value: '10', suffix: '笔' }, { label: '待核对', value: '1', suffix: '笔' }],
    rows: [
      { id: 'r-01', time: '11:26', title: '林浩 · U10 技能提升包', meta: '微信支付 · XS20260719018', value: '+¥3,980', status: '已到账' },
      { id: 'r-02', time: '10:42', title: '周子轩 · 暑期基础课包', meta: '微信支付 · XS20260719017', value: '+¥2,680', status: '已到账' },
      { id: 'r-03', time: '09:18', title: '李沐阳 · 竞赛班课包', meta: '线下收款 · XS20260719016', value: '+¥4,200', status: '已到账' },
      { id: 'r-04', time: '08:36', title: '吴桐 · U10 技能提升包', meta: '银行转账 · XS20260719015', value: '+¥1,820', status: '待核对' }
    ]
  },
  renewal: {
    title: '续费收入明细', period: '1周', description: '只统计老学员今日续费到账记录',
    metrics: [{ label: '续费收入', value: '8,800', suffix: '元' }, { label: '续费订单', value: '7', suffix: '笔' }, { label: '续费学员', value: '7', suffix: '人' }],
    rows: [
      { id: 'rn-01', time: '11:26', title: '林浩 · U10 技能提升包', meta: '微信支付 · 续费', value: '+¥3,980', status: '已到账' },
      { id: 'rn-02', time: '09:18', title: '李沐阳 · 竞赛班课包', meta: '线下收款 · 续费', value: '+¥4,200', status: '已到账' }
    ]
  },
  new: {
    title: '新报收入明细', period: '1周', description: '只统计新学员今日报名到账记录',
    metrics: [{ label: '新报收入', value: '3,880', suffix: '元' }, { label: '新报订单', value: '3', suffix: '笔' }, { label: '新学员', value: '3', suffix: '人' }],
    rows: [
      { id: 'n-01', time: '10:42', title: '周子轩 · 暑期基础课包', meta: '微信支付 · 新报名', value: '+¥2,680', status: '已到账' },
      { id: 'n-02', time: '08:20', title: '张一诺 · 新人体验课包', meta: '微信支付 · 新报名', value: '+¥1,200', status: '已到账' }
    ]
  },
  refund: {
    title: '退款明细', period: '1周', description: '只查看今日退款及处理状态',
    metrics: [{ label: '退款金额', value: '620', suffix: '元' }, { label: '退款订单', value: '1', suffix: '笔' }, { label: '待处理', value: '0', suffix: '笔' }],
    rows: []
  },
  income: {
    title: '本月实收明细', period: '1月', description: '只统计本月实际到账的收款记录',
    metrics: [{ label: '本月实收', value: '286,800', suffix: '元' }, { label: '到账订单', value: '86', suffix: '笔' }, { label: '待核对', value: '3', suffix: '笔' }],
    rows: [
      { id: 'm-01', time: '7月19日', title: '今日到账', meta: '10笔有效收款', value: '+¥12,680', status: '已入账' },
      { id: 'm-02', time: '7月18日', title: '当日到账', meta: '8笔有效收款', value: '+¥10,520', status: '已入账' },
      { id: 'm-03', time: '7月17日', title: '当日到账', meta: '11笔有效收款', value: '+¥16,380', status: '已入账' }
    ]
  }
};

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    icons: {
      back: COMMON_ROOT + 'icon-back-orange-256.png',
      filter: COMMON_ROOT + 'icon-filter-orange-256.png',
      download: COMMON_ROOT + 'icon-download-orange-256.png',
      chevron: COMMON_ROOT + 'icon-chevron-orange-256.png',
      calendar: COMMON_ROOT + 'icon-calendar-orange-256.png',
      user: COMMON_ROOT + 'icon-user-orange-256.png'
    },
    reportTitle: '销课课时明细',
    reportDescription: '',
    baseDescription: '',
    metrics: [],
    baseMetrics: [],
    baseRows: [],
    basePeriod: '1周',
    rows: [],
    showEmpty: false,
    filters: [],
    periodOptions: PERIOD_OPTIONS,
    campusOptions: CAMPUS_OPTIONS,
    selectedPeriod: '1周',
    selectedCampus: '全部校区',
    periodIndex: 0,
    campusIndex: 0,
    showExportPanel: false,
    exportToggleText: '导出当前明细'
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
      console.warn('[campus-manager-report-export] nav metrics unavailable', error);
    }
    const key = options && options.type;
    const config = REPORT_CONFIGS[key] || REPORT_CONFIGS.hours;
    const requestedPeriod = decodeOption(options && options.period);
    const requestedCampus = decodeOption(options && options.campus);
    const selectedPeriod = PERIOD_OPTIONS.indexOf(requestedPeriod) >= 0 ? requestedPeriod : config.period;
    const selectedCampus = CAMPUS_OPTIONS.indexOf(requestedCampus) >= 0 ? requestedCampus : '全部校区';
    const filters = [
      { label: '时间范围', value: selectedPeriod, icon: this.data.icons.calendar },
      { label: '校区', value: selectedCampus, icon: this.data.icons.user }
    ];
    this.setData({
      navTop,
      navHeight,
      navSpacer: navTop + navHeight + 16,
      reportTitle: config.title,
      reportDescription: config.description.replace('今日', selectedPeriod),
      baseDescription: config.description,
      metrics: adaptMetrics(config.metrics, selectedPeriod, config.period),
      baseMetrics: config.metrics,
      rows: adaptRows(config.rows, selectedPeriod, config.period),
      baseRows: config.rows,
      basePeriod: config.period,
      showEmpty: config.rows.length === 0,
      selectedPeriod,
      selectedCampus,
      periodIndex: PERIOD_OPTIONS.indexOf(selectedPeriod),
      campusIndex: CAMPUS_OPTIONS.indexOf(selectedCampus),
      filters
    });
  },
  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.redirectTo({ url: '/pages/campus-manager/reports/index', fail: () => wx.reLaunch({ url: '/pages/campus-manager/home/index' }) });
  },
  onPeriodChange(event) {
    const periodIndex = Number(event.detail.value);
    const selectedPeriod = this.data.periodOptions[periodIndex];
    if (!selectedPeriod) return;
    const filters = this.data.filters.map((item) => Object.assign({}, item, { value: item.label === '时间范围' ? selectedPeriod : item.value }));
    this.setData({
      periodIndex,
      selectedPeriod,
      filters,
      reportDescription: this.data.baseDescription.replace('今日', selectedPeriod),
      metrics: adaptMetrics(this.data.baseMetrics, selectedPeriod, this.data.basePeriod),
      rows: adaptRows(this.data.baseRows, selectedPeriod, this.data.basePeriod)
    });
  },
  onCampusChange(event) {
    const campusIndex = Number(event.detail.value);
    const selectedCampus = this.data.campusOptions[campusIndex] || '全部校区';
    const filters = this.data.filters.map((item) => Object.assign({}, item, { value: item.label === '校区' ? selectedCampus : item.value }));
    this.setData({ campusIndex, selectedCampus, filters });
  },
  toggleExportPanel() {
    const showExportPanel = !this.data.showExportPanel;
    this.setData({ showExportPanel, exportToggleText: showExportPanel ? '收起导出设置' : '导出当前明细' });
  },
  generateExport() {
    wx.showToast({ title: '导出任务已创建', icon: 'success' });
    setTimeout(() => wx.navigateTo({ url: '/pages/campus-manager/export-jobs/index' }), 450);
  }
});
