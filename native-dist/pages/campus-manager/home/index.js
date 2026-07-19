const { getScreen } = require('../screen-data');
const { getTaskSummary } = require('../task-data');
const { refreshEducationAccess, openEducationAccountPage } = require('../../../utils/education-access');

const QUICK_ICON_KINDS = {
  courses: 'course',
  students: 'student',
  classes: 'class',
  schedule: 'schedule',
  packages: 'package',
  leave: 'leave',
  staff: 'staff',
  corrections: 'correction'
};

const PENDING_META = {
  courses: { symbol: '◷', iconKind: 'clock', iconTone: 'danger' },
  students: { symbol: '续', iconKind: 'student', iconTone: 'orange' },
  corrections: { symbol: '!', iconKind: 'shield', iconTone: 'orange' }
};

const GUIDE_STORAGE_KEY = 'campusManagerHomeGuideV3';
const GUIDE_STEPS = [
  {
    selector: '#guide-role',
    scrollTarget: '',
    title: '切换工作身份',
    description: '需要查看教练工作台时，从这里切换到教练端。'
  },
  {
    selector: '#guide-focus',
    scrollTarget: 'guide-role',
    title: '先处理今日重点',
    description: '系统会把最需要关注的经营事项放在这里，点击卡片即可跟进。'
  },
  {
    selector: '#guide-pending',
    scrollTarget: 'guide-focus',
    title: '集中处理待办',
    description: '超时点名、异常审核和课包到期都可以从这里快速处理。'
  },
  {
    selector: '#guide-quick',
    scrollTarget: 'guide-pending',
    title: '进入常用操作',
    description: '课程、学员、班级、排课、课包和员工管理都在这里。'
  },
  {
    selector: '#guide-summary',
    scrollTarget: 'guide-quick',
    title: '查看经营结果',
    description: '最后通过经营健康和教练执行，快速掌握校区当前状态。'
  }
];

function buildGuideStep(index) {
  const source = GUIDE_STEPS[index];
  return {
    index,
    title: source.title,
    description: source.description,
    stepText: `${index + 1} / ${GUIDE_STEPS.length}`,
    showPrevious: index > 0,
    primaryText: index === GUIDE_STEPS.length - 1 ? '开始使用' : '下一步',
    dots: GUIDE_STEPS.map((item, dotIndex) => ({
      key: String(dotIndex),
      activeClass: dotIndex === index ? 'active' : ''
    }))
  };
}

function hasCompletedGuide() {
  try {
    return Boolean(wx.getStorageSync(GUIDE_STORAGE_KEY));
  } catch (error) {
    console.warn('[campus-manager-home] guide storage unavailable', error);
    return false;
  }
}

function isRolePreviewEnabled() {
  try {
    const system = wx.getSystemInfoSync();
    const account = wx.getAccountInfoSync && wx.getAccountInfoSync();
    const envVersion = account && account.miniProgram && account.miniProgram.envVersion;
    return system.platform === 'devtools' && (!envVersion || envVersion === 'develop');
  } catch (error) {
    console.warn('[campus-manager-home] role preview unavailable', error);
    return false;
  }
}

function getBadgeCount(badges, key, fallback) {
  return typeof badges[key] === 'number' ? badges[key] : fallback;
}

function buildHomeScreen() {
  const source = JSON.parse(JSON.stringify(getScreen('M01')));
  const summary = getTaskSummary();
  const badges = summary.badges || {};
  const riskCount = getBadgeCount(badges, 'students', 4);

  const metrics = source.metrics.map((metric) => {
    if (metric.label !== '待处理') return metric;
    return Object.assign({}, metric, { value: String(summary.pendingCount) });
  });

  return {
    greeting: '下午好，校区经理',
    title: source.title,
    subtitle: '浦东校区 · 关键事项一处处理',
    metrics,
    notice: Object.assign({}, source.dashboard.notice, {
      count: summary.pendingCount ? String(summary.pendingCount) : '',
      caption: summary.pendingCount
        ? `${summary.pendingCount} 项待处理 · 建议按优先级逐项完成`
        : '全部待办已完成 · 今日经营事项已清零'
    }),
    focus: {
      eyebrow: '今日重点',
      title: '续费风险学员',
      value: String(riskCount),
      unit: '人',
      caption: '本周预计流失',
      amount: '4,800',
      action: '去跟进',
      route: '/pages/campus-manager/renewal-risk/index'
    },
    pending: source.dashboard.pending.map((item) => Object.assign({}, item, PENDING_META[item.taskKey], {
      key: item.taskKey,
      value: String(getBadgeCount(badges, item.taskKey, Number(item.value) || 0))
    })),
    quick: source.dashboard.quick.map((item) => ({
      key: item.taskKey,
      iconKind: QUICK_ICON_KINDS[item.taskKey],
      label: item.label,
      route: item.route,
      badge: getBadgeCount(badges, item.taskKey, Number(item.badge) || 0)
    })),
    opportunities: source.dashboard.opportunities.map((item, index) => Object.assign({ key: String(index) }, item)),
    summaries: [
      {
        key: 'health',
        symbol: '♥',
        title: '经营健康',
        route: '/pages/campus-manager/reports/index',
        items: [
          { label: '课消达成', value: '76%', progress: '76%', tone: 'orange' },
          { label: '续费健康', value: '68%', progress: '68%', tone: 'orange' }
        ]
      },
      {
        key: 'execution',
        symbol: '★',
        title: '教练执行',
        route: '/pages/campus-manager/execution-index/index',
        items: [
          { label: '评价完成', value: '82%', progress: '82%', tone: 'success' },
          { label: '点名及时', value: '93%', progress: '93%', tone: 'success' }
        ]
      }
    ]
  };
}

Page({
  data: {
    screen: buildHomeScreen(),
    navSpacer: 76,
    navTop: 20,
    showRoleTester: false,
    educationAccessActive: false,
    educationModeClass: '',
    educationModeTitle: '\u6f14\u793a\u6a21\u5f0f',
    educationModeCopy: '\u4ec5\u4f9b\u9884\u89c8\uff0cPC \u7aef\u4e0b\u53d1\u8d26\u6237\u5e76\u5f00\u6237\u540e\u53ef\u6b63\u5f0f\u4f7f\u7528',
    guideVisible: false,
    guideScrollTarget: '',
    guideSpotlightStyle: 'opacity:0;',
    guide: buildGuideStep(0)
  },
  onLoad() {
    let top = 20;
    let height = 44;
    try {
      const menu = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect();
      if (menu && menu.top) {
        top = menu.top;
        height = menu.height || 32;
      } else {
        const system = wx.getSystemInfoSync();
        top = system.statusBarHeight || 20;
      }
    } catch (error) {
      console.warn('[campus-manager-home] nav metrics unavailable', error);
    }
    const shouldStartGuide = !hasCompletedGuide();
    this.setData({
      navSpacer: top + height + 4,
      navTop: top,
      showRoleTester: isRolePreviewEnabled()
    }, () => {
      if (!shouldStartGuide) return;
      this.guideTimer = setTimeout(() => this.startGuide(), 500);
    });
    refreshEducationAccess().then((access) => {
      const active = !!(access && access.active);
      this.setData({
        educationAccessActive: active,
        educationModeClass: active ? 'active' : '',
        educationModeTitle: active ? '\u5df2\u5f00\u6237' : '\u6f14\u793a\u6a21\u5f0f',
        educationModeCopy: active
          ? '\u6559\u52a1\u8d26\u6237\u5df2\u6fc0\u6d3b\uff0c\u771f\u5b9e\u4e1a\u52a1\u64cd\u4f5c\u5df2\u5f00\u653e'
          : '\u4ec5\u4f9b\u9884\u89c8\uff0cPC \u7aef\u4e0b\u53d1\u8d26\u6237\u5e76\u5f00\u6237\u540e\u53ef\u6b63\u5f0f\u4f7f\u7528'
      });
    });
  },
  openEducationAccount() {
    if (this.data.educationAccessActive) {
      wx.showToast({ title: '\u6559\u52a1\u8d26\u6237\u5df2\u5f00\u901a', icon: 'success' });
      return;
    }
    openEducationAccountPage();
  },
  onShow() {
    this.setData({ screen: buildHomeScreen() });
  },
  onUnload() {
    clearTimeout(this.guideTimer);
    clearTimeout(this.guideMeasureTimer);
  },
  startGuide() {
    this.showGuideStep(0);
  },
  showGuideStep(index) {
    const step = GUIDE_STEPS[index];
    if (!step) return;
    clearTimeout(this.guideMeasureTimer);
    this.setData({
      guideVisible: true,
      guide: buildGuideStep(index),
      guideScrollTarget: step.scrollTarget,
      guideSpotlightStyle: 'opacity:0;'
    }, () => {
      this.guideMeasureTimer = setTimeout(() => this.measureGuideTarget(step.selector), 360);
    });
  },
  measureGuideTarget(selector) {
    if (!wx.createSelectorQuery) return;
    const query = wx.createSelectorQuery();
    if (query.in) query.in(this);
    query.select(selector).boundingClientRect((rect) => {
      if (!rect) return;
      const padding = 6;
      const top = Math.max(6, rect.top - padding);
      const left = Math.max(6, rect.left - padding);
      const width = rect.width + padding * 2;
      const height = rect.height + padding * 2;
      this.setData({
        guideSpotlightStyle: `top:${top}px;left:${left}px;width:${width}px;height:${height}px;opacity:1;`
      });
    }).exec();
  },
  previousGuideStep() {
    this.showGuideStep(this.data.guide.index - 1);
  },
  nextGuideStep() {
    const nextIndex = this.data.guide.index + 1;
    if (nextIndex < GUIDE_STEPS.length) {
      this.showGuideStep(nextIndex);
      return;
    }
    this.finishGuide('completed');
  },
  exitGuide() {
    this.finishGuide('skipped');
  },
  finishGuide(result) {
    clearTimeout(this.guideTimer);
    clearTimeout(this.guideMeasureTimer);
    try {
      wx.setStorageSync(GUIDE_STORAGE_KEY, result);
    } catch (error) {
      console.warn('[campus-manager-home] guide result not saved', error);
    }
    this.setData({
      guideVisible: false,
      guideScrollTarget: '',
      guideSpotlightStyle: 'opacity:0;'
    });
  },
  blockGuideTouch() {},
  openRoleTester() {
    if (!this.data.showRoleTester) return;
    wx.showActionSheet({
      itemList: ['校区端（当前）', '教练端'],
      success: (result) => {
        if (result.tapIndex !== 1) return;
        wx.redirectTo({ url: '/pages/education/index?rolePreview=1' });
      }
    });
  },
  openRoute(event) {
    const route = event.currentTarget.dataset.route;
    if (route) wx.navigateTo({ url: route });
  }
});
