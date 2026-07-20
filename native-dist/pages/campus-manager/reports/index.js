const COMMON_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/common/campus-manager/';

const REPORT_VIEWS = {
  consumption: {
    title: '销课统计',
    periodText: '1周',
    description: '查看今天实际完成的课程与课时消耗',
    reports: [
      { key: 'hours', title: '销课课时', metric: '今日已消耗', value: '128', suffix: '课时', trend: '较昨日 +12%', tone: 'orange', symbol: '课' },
      { key: 'amount', title: '销课金额', metric: '对应课程收入', value: '38,600', prefix: '¥', suffix: '', trend: '较昨日 +10%', tone: 'orange', symbol: '¥' },
      { key: 'courses', title: '完成课程', metric: '已结束并完成课消', value: '12', suffix: '节', trend: '全部已核对', tone: 'green', symbol: '✓' },
      { key: 'attendance', title: '到课学员', metric: '今天实际到课', value: '96', suffix: '人', trend: '到课率 92.6%', tone: 'green', symbol: '人' }
    ]
  },
  finance: {
    title: '实收统计',
    periodText: '1周',
    description: '只统计今天已到账并完成确认的收款',
    reports: [
      { key: 'received', title: '净实收', metric: '扣除退款后的到账金额', value: '12,680', prefix: '¥', suffix: '', trend: '较昨日 +8%', tone: 'green', symbol: '¥' },
      { key: 'renewal', title: '续费收入', metric: '老学员续费到账', value: '8,800', prefix: '¥', suffix: '', trend: '7 笔订单', tone: 'orange', symbol: '续' },
      { key: 'new', title: '新报收入', metric: '新学员报名到账', value: '3,880', prefix: '¥', suffix: '', trend: '3 笔订单', tone: 'orange', symbol: '新' },
      { key: 'refund', title: '今日退款', metric: '已完成退款金额', value: '0', prefix: '¥', suffix: '', trend: '无退款', tone: 'green', symbol: '退' }
    ]
  },
  overview: {
    title: '经营报表',
    periodText: '1月',
    description: '汇总销课、收入和经营趋势',
    reports: [
      { key: 'hours', title: '本月销课', metric: '累计完成课时', value: '2,860', suffix: '课时', trend: '较上月 +12%', tone: 'orange', symbol: '课' },
      { key: 'income', title: '本月实收', metric: '累计净实收', value: '286,800', prefix: '¥', suffix: '', trend: '较上月 +8%', tone: 'green', symbol: '¥' },
      { key: 'renewal', title: '续费率', metric: '到期学员续费转化', value: '76.8', suffix: '%', trend: '较上月 +3.2%', tone: 'green', symbol: '续' },
      { key: 'attendance', title: '平均到课率', metric: '全部课程平均值', value: '92.6', suffix: '%', trend: '较上月 +2.1%', tone: 'orange', symbol: '人' }
    ]
  }
};

const FINANCE_ANOMALIES = [
  { id: 'finance-unmatched-01', title: '收款未匹配学员订单', amount: '¥1,280', detail: '微信收款已到账，但尚未关联具体学员与课包', time: '今天 11:26', status: '待处理' }
];

const PERIOD_OPTIONS = ['1周', '1月', '1季度', '1年'];
const CAMPUS_OPTIONS = ['全部校区', '浦东校区', '徐汇校区', '静安校区'];
const PERIOD_WEIGHTS = { '1周': 1, '1月': 4, '1季度': 13, '1年': 52 };

function scaleValue(value, factor, keepRate) {
  if (keepRate) return value;
  const source = Number(String(value).replace(/,/g, ''));
  if (!Number.isFinite(source)) return value;
  const scaled = Math.round(source * factor * 10) / 10;
  return scaled.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

function adaptReportsToPeriod(reports, periodText, basePeriod) {
  const factor = PERIOD_WEIGHTS[periodText] / PERIOD_WEIGHTS[basePeriod];
  return reports.map((item) => Object.assign({}, item, {
    title: item.title === '今日退款' ? '退款金额' : item.title,
    metric: item.metric.replace('今日', periodText).replace('今天', periodText),
    value: scaleValue(item.value, factor, item.suffix === '%'),
    trend: '已按' + periodText + '统计'
  }));
}

function resolveView(options) {
  const requested = options && options.view;
  if (requested === 'finance-anomaly') return 'finance-anomaly';
  return REPORT_VIEWS[requested] ? requested : 'overview';
}

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    icons: { back: COMMON_ROOT + 'icon-back-orange-256.png' },
    pageTitle: '经营报表',
    periodText: '1月',
    campusText: '全部校区',
    periodIndex: 1,
    campusIndex: 0,
    periodOptions: PERIOD_OPTIONS,
    campusOptions: CAMPUS_OPTIONS,
    currentView: 'overview',
    basePeriod: '1月',
    baseReports: [],
    description: '',
    reports: [],
    anomalies: [],
    showReports: true,
    showAnomalies: false
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
      console.warn('[campus-manager-reports] nav metrics unavailable', error);
    }
    const view = resolveView(options);
    if (view === 'finance-anomaly') {
      this.setData({
        navTop,
        navHeight,
        navSpacer: navTop + navHeight + 16,
        pageTitle: '财务异常',
        periodText: '1周',
        periodIndex: 0,
        description: '核对未匹配、重复或金额不一致的收款',
        reports: [],
        anomalies: FINANCE_ANOMALIES,
        showReports: false,
        showAnomalies: true
      });
      return;
    }
    const config = REPORT_VIEWS[view];
    const periodText = options && options.period && PERIOD_OPTIONS.indexOf(options.period) >= 0 ? options.period : config.periodText;
    const campusText = options && options.campus && CAMPUS_OPTIONS.indexOf(options.campus) >= 0 ? options.campus : '全部校区';
    this.setData({
      navTop,
      navHeight,
      navSpacer: navTop + navHeight + 16,
      pageTitle: config.title,
      periodText,
      campusText,
      periodIndex: PERIOD_OPTIONS.indexOf(periodText),
      campusIndex: CAMPUS_OPTIONS.indexOf(campusText),
      currentView: view,
      basePeriod: config.periodText,
      description: config.description.replace('今天', periodText),
      baseReports: config.reports,
      reports: adaptReportsToPeriod(config.reports, periodText, config.periodText),
      anomalies: [],
      showReports: true,
      showAnomalies: false
    });
  },
  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.reLaunch({ url: '/pages/campus-manager/home/index' });
  },
  openReport(event) {
    const type = event.currentTarget.dataset.type || 'consume';
    wx.navigateTo({ url: '/pages/campus-manager/report-export/index?type=' + type + '&period=' + encodeURIComponent(this.data.periodText) + '&campus=' + encodeURIComponent(this.data.campusText) });
  },
  onPeriodChange(event) {
    const periodIndex = Number(event.detail.value);
    const periodText = this.data.periodOptions[periodIndex];
    const config = REPORT_VIEWS[this.data.currentView];
    if (!periodText || !config) return;
    this.setData({
      periodIndex,
      periodText,
      description: config.description.replace('今天', periodText),
      reports: adaptReportsToPeriod(this.data.baseReports, periodText, this.data.basePeriod)
    });
  },
  onCampusChange(event) {
    const campusIndex = Number(event.detail.value);
    const campusText = this.data.campusOptions[campusIndex] || '全部校区';
    this.setData({ campusIndex, campusText });
  },
  openAnalysis() {
    wx.navigateTo({ url: '/pages/campus-manager/execution-index/index' });
  },
  openFinanceAnomaly(event) {
    const id = event.currentTarget.dataset.id || 'finance-unmatched-01';
    wx.navigateTo({ url: '/pages/campus-manager/anomaly-detail/index?id=' + id + '&type=finance' });
  }
});
