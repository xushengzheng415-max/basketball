const GUIDE_STORAGE_KEY = 'campusManagerHomeGuideV4';
const ASSET_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/';
const MORE_MANAGEMENT_ORDER_KEY = 'campusManagerMoreManagementOrderV1';
const MORE_MANAGEMENT_COLUMNS_KEY = 'campusManagerMoreManagementColumnsV1';

const GUIDE_STEPS = [
  {
    selector: '#guide-role',
    scrollTarget: '',
    title: '确认当前身份',
    description: '这里显示当前校长身份，开发环境下可以切换查看教练端。'
  },
  {
    selector: '#guide-business',
    scrollTarget: 'guide-role',
    title: '先看经营结果',
    description: '销课统计和实收统计放在第一屏，打开页面就能掌握校区经营结果。'
  },
  {
    selector: '#guide-tasks',
    scrollTarget: 'guide-business',
    title: '再处理今日待办',
    description: '每组任务都有编号和数量，点击后直接进入对应业务页面处理。'
  },
  {
    selector: '#guide-management',
    scrollTarget: 'guide-tasks',
    title: '管理功能放到二层',
    description: '首页只保留教练管理和学员管理两个入口。'
  }
];

const TASK_GROUPS = [
  {
    prefix: 'KX',
    title: '课消异常',
    description: '已上课记录与课时扣减结果不一致',
    count: 3,
    unit: '条',
    icon: ASSET_ROOT + 'pages/education/icon-lesson-consume-stats.png',
    toneClass: 'danger',
    route: '/pages/campus-manager/corrections/index?type=consumption'
  },
  {
    prefix: 'CW',
    title: '财务异常',
    description: '1 笔收款尚未匹配到学员订单',
    count: 1,
    unit: '笔',
    icon: ASSET_ROOT + 'pages/education/icon-coach-salary.png',
    toneClass: 'danger',
    route: '/pages/campus-manager/reports/index?view=finance-anomaly&period=today'
  },
  {
    prefix: 'XF',
    title: '续费风险',
    description: '剩余课时不足或近期到课率下降',
    count: 5,
    unit: '人',
    icon: ASSET_ROOT + 'pages/data/icon-growth-trend.png',
    toneClass: 'warning',
    route: '/pages/campus-manager/renewal-risk/index'
  },
  {
    prefix: 'QJ',
    title: '请假补课',
    description: '请假待审核或补课方案待确认',
    count: 4,
    unit: '项',
    icon: ASSET_ROOT + 'pages/education/icon-course-schedule.png',
    toneClass: 'normal',
    route: '/pages/campus-manager/leave/index'
  }
];

const MANAGEMENT_ITEMS = [
  { key: 'coach', icon: ASSET_ROOT + 'pages/data/icon-parent-sync.png', label: '教练管理', caption: '教练、课程、班级', badge: '2', toneClass: 'orange' },
  { key: 'student', icon: ASSET_ROOT + 'pages/education/icon-student-checkin.png', label: '学员管理', caption: '学员、续费、家长', badge: '5', toneClass: 'blue' }
];

const MANAGEMENT_ROUTES = {
  coach: '/pages/campus-manager/staff/index?role=coach',
  student: '/pages/campus-manager/students/index'
};

const MORE_MANAGEMENT_ITEMS = [
  { key: 'course', icon: ASSET_ROOT + 'pages/education/icon-course-schedule.png', label: '课程与排课', caption: '课程、排课、调停课', route: '/pages/campus-manager/courses/index' },
  { key: 'class', icon: ASSET_ROOT + 'pages/education/icon-multi-campus.png', label: '班级管理', caption: '班级、学员、教练', route: '/pages/campus-manager/classes/index' },
  { key: 'package', icon: ASSET_ROOT + 'pages/education/icon-lesson-consume-stats.png', label: '课包管理', caption: '课包、价格、课时规则', route: '/pages/campus-manager/packages/index' },
  { key: 'leave', icon: ASSET_ROOT + 'pages/education/icon-student-checkin.png', label: '请假与补课', caption: '请假、补课、代课', route: '/pages/campus-manager/leave/index' },
  { key: 'report', icon: ASSET_ROOT + 'pages/data/icon-growth-trend.png', label: '经营报表', caption: '销课、收入、趋势', route: '/pages/campus-manager/reports/index?view=overview&period=month' }
];

function decorateMoreManagement(items, draggingIndex) {
  return items.map((item, index) => Object.assign({}, item, {
    dragClass: index === draggingIndex ? 'is-dragging' : ''
  }));
}

function loadMoreManagementPreferences() {
  let columns = 2;
  let items = MORE_MANAGEMENT_ITEMS.slice();
  try {
    const savedColumns = Number(wx.getStorageSync(MORE_MANAGEMENT_COLUMNS_KEY));
    if (savedColumns === 2 || savedColumns === 3) columns = savedColumns;

    const savedOrder = wx.getStorageSync(MORE_MANAGEMENT_ORDER_KEY);
    if (Array.isArray(savedOrder) && savedOrder.length) {
      const itemMap = MORE_MANAGEMENT_ITEMS.reduce((result, item) => {
        result[item.key] = item;
        return result;
      }, {});
      const savedItems = savedOrder.map((key) => itemMap[key]).filter(Boolean);
      const savedKeys = savedItems.reduce((result, item) => {
        result[item.key] = true;
        return result;
      }, {});
      items = savedItems.concat(MORE_MANAGEMENT_ITEMS.filter((item) => !savedKeys[item.key]));
    }
  } catch (error) {
    console.warn('[campus-manager-home] more management preferences unavailable', error);
  }
  return {
    moreManagement: decorateMoreManagement(items, -1),
    moreColumnCount: columns,
    moreColumnClass: columns === 3 ? 'columns-3' : 'columns-2',
    moreColumnTwoClass: columns === 2 ? 'active' : '',
    moreColumnThreeClass: columns === 3 ? 'active' : ''
  };
}

function padNumber(value) {
  return value < 10 ? `0${value}` : String(value);
}

function buildDateMeta() {
  const now = new Date();
  const weekNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return {
    label: `${now.getMonth() + 1}月${now.getDate()}日 ${weekNames[now.getDay()]}`,
    token: `${now.getFullYear()}${padNumber(now.getMonth() + 1)}${padNumber(now.getDate())}`
  };
}

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

function buildGreetingTitle(hour) {
  if (hour >= 5 && hour < 12) return '王校长，上午好！';
  if (hour >= 12 && hour < 18) return '王校长，下午好！';
  return '王校长，晚上好！';
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
  return true;
}

function buildHomeScreen() {
  const dateMeta = buildDateMeta();
  const tasks = TASK_GROUPS.map((item, index) => Object.assign({}, item, {
    code: `${item.prefix}-${dateMeta.token}-${padNumber(index + 1)}`
  }));
  const pendingCount = tasks.reduce((sum, item) => sum + item.count, 0);

  return {
    title: buildGreetingTitle(new Date().getHours()),
    subtitle: `浦东校区 · ${dateMeta.label}`,
    businessCards: [
      {
        key: 'consumption',
        eyebrow: '销课统计',
        value: '128',
        unit: '课时',
        amountLabel: '销课金额',
        amount: '¥38,600',
        detail: '已完成 12 节 · 到课 96 人',
        trend: '较昨日 +12%',
        trendClass: 'up',
        toneClass: 'consumption',
        route: '/pages/campus-manager/reports/index?view=consumption&period=today'
      },
      {
        key: 'finance',
        eyebrow: '实收统计',
        value: '12,680',
        prefix: '¥',
        unit: '净实收',
        amountLabel: '续费 ¥8,800',
        amount: '新报 ¥3,880',
        detail: '今日退款 ¥0',
        trend: '较昨日 +8%',
        trendClass: 'up',
        toneClass: 'finance',
        route: '/pages/campus-manager/reports/index?view=finance&period=today'
      }
    ],
    pendingCount,
    tasks,
    management: MANAGEMENT_ITEMS
  };
}

Page({
  data: {
    screen: buildHomeScreen(),
    navSpacer: 76,
    navTop: 20,
    showRoleTester: false,
    rolePickerDisabled: true,
    roleOptions: ['校长端', '教练端'],
    roleIndex: 0,
    moreManagement: decorateMoreManagement(MORE_MANAGEMENT_ITEMS, -1),
    moreManagementVisible: false,
    moreEditMode: false,
    moreEditLabel: '编辑排序',
    moreSortHint: '长按卡片拖动排序',
    moreColumnCount: 2,
    moreColumnClass: 'columns-2',
    moreColumnTwoClass: 'active',
    moreColumnThreeClass: '',
    draggingMoreIndex: -1,
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
    const moreManagementPreferences = loadMoreManagementPreferences();
    const showRoleTester = isRolePreviewEnabled();
    this.setData(Object.assign({
      navSpacer: top + height + 4,
      navTop: top,
      showRoleTester,
      rolePickerDisabled: !showRoleTester
    }, moreManagementPreferences), () => {
      if (!shouldStartGuide) return;
      this.guideTimer = setTimeout(() => this.startGuide(), 500);
    });
  },
  onShow() {
    this.setData({ screen: buildHomeScreen() });
  },
  onUnload() {
    clearTimeout(this.guideTimer);
    clearTimeout(this.guideMeasureTimer);
    this.moreItemRects = null;
  },
  onRoleChange(event) {
    if (!this.data.showRoleTester) return;
    const roleIndex = Number(event.detail.value);
    this.setData({ roleIndex });
    if (roleIndex === 1) wx.redirectTo({ url: '/pages/education/index?rolePreview=1' });
  },
  openRoute(event) {
    const route = event.currentTarget.dataset.route;
    if (route) wx.navigateTo({ url: route });
  },
  openManagement(event) {
    const key = event.currentTarget.dataset.key;
    const route = MANAGEMENT_ROUTES[key];
    if (route) wx.navigateTo({ url: route });
  },
  openMoreManagement() {
    this.setData({ moreManagementVisible: true });
  },
  closeMoreManagement() {
    this.persistMoreManagementOrder(this.data.moreManagement);
    this.moreItemRects = null;
    this.setData({
      moreManagementVisible: false,
      moreEditMode: false,
      moreEditLabel: '编辑排序',
      moreSortHint: '长按卡片拖动排序',
      draggingMoreIndex: -1,
      moreManagement: decorateMoreManagement(this.data.moreManagement, -1)
    });
  },
  openMoreRoute(event) {
    if (this.data.moreEditMode || this.data.draggingMoreIndex >= 0) return;
    const route = event.currentTarget.dataset.route;
    if (!route) return;
    this.setData({ moreManagementVisible: false }, () => {
      wx.navigateTo({ url: route });
    });
  },
  changeMoreColumns(event) {
    if (this.data.draggingMoreIndex >= 0) return;
    const columns = Number(event.currentTarget.dataset.columns) === 3 ? 3 : 2;
    if (columns === this.data.moreColumnCount) return;
    try {
      wx.setStorageSync(MORE_MANAGEMENT_COLUMNS_KEY, columns);
    } catch (error) {
      console.warn('[campus-manager-home] more management columns not saved', error);
    }
    this.setData({
      moreColumnCount: columns,
      moreColumnClass: columns === 3 ? 'columns-3' : 'columns-2',
      moreColumnTwoClass: columns === 2 ? 'active' : '',
      moreColumnThreeClass: columns === 3 ? 'active' : ''
    });
  },
  toggleMoreEdit() {
    if (this.data.draggingMoreIndex >= 0) return;
    const editing = !this.data.moreEditMode;
    if (!editing) this.persistMoreManagementOrder(this.data.moreManagement);
    this.setData({
      moreEditMode: editing,
      moreEditLabel: editing ? '完成' : '编辑排序',
      moreSortHint: editing ? '按住卡片并拖到想要的位置' : '长按卡片拖动排序'
    });
  },
  startMoreDrag(event) {
    const index = Number(event.currentTarget.dataset.index);
    if (!Number.isInteger(index) || index < 0 || index >= this.data.moreManagement.length) return;
    try {
      if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });
    } catch (error) {
      console.warn('[campus-manager-home] drag vibration unavailable', error);
    }
    this.setData({
      moreEditMode: true,
      moreEditLabel: '完成',
      moreSortHint: '拖到想要的位置后松手',
      draggingMoreIndex: index,
      moreManagement: decorateMoreManagement(this.data.moreManagement, index)
    }, () => this.measureMoreManagementItems());
  },
  measureMoreManagementItems() {
    if (!wx.createSelectorQuery) return;
    const query = wx.createSelectorQuery();
    if (query.in) query.in(this);
    query.selectAll('.more-management-item').boundingClientRect((rects) => {
      this.moreItemRects = rects || [];
    }).exec();
  },
  moveMoreDrag(event) {
    const fromIndex = this.data.draggingMoreIndex;
    if (fromIndex < 0 || !this.moreItemRects || !this.moreItemRects.length) return;
    const touch = event.touches && event.touches[0];
    if (!touch) return;
    const clientX = typeof touch.clientX === 'number' ? touch.clientX : touch.pageX;
    const clientY = typeof touch.clientY === 'number' ? touch.clientY : touch.pageY;
    const targetIndex = this.moreItemRects.findIndex((rect) => (
      clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
    ));
    if (targetIndex < 0 || targetIndex === fromIndex) return;

    const items = this.data.moreManagement.slice();
    const movingItems = items.splice(fromIndex, 1);
    items.splice(targetIndex, 0, movingItems[0]);
    this.setData({
      draggingMoreIndex: targetIndex,
      moreManagement: decorateMoreManagement(items, targetIndex)
    });
  },
  finishMoreDrag() {
    if (this.data.draggingMoreIndex < 0) return;
    const items = this.data.moreManagement.slice();
    this.persistMoreManagementOrder(items);
    this.moreItemRects = null;
    this.setData({
      draggingMoreIndex: -1,
      moreSortHint: '排序已保存，可继续调整',
      moreManagement: decorateMoreManagement(items, -1)
    });
  },
  persistMoreManagementOrder(items) {
    try {
      wx.setStorageSync(MORE_MANAGEMENT_ORDER_KEY, items.map((item) => item.key));
    } catch (error) {
      console.warn('[campus-manager-home] more management order not saved', error);
    }
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
  blockGuideTouch() {}
});
