const { advanceTask, getTaskSummary } = require('../task-data');

function getNavMetrics() {
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
    console.warn('[task-inbox] nav metrics unavailable', error);
  }
  return { navTop, navHeight, navSpacer: navTop + navHeight + 18 };
}

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    tasks: [],
    summary: {
      pendingCount: 0,
      completedCount: 0,
      totalCount: 0,
      progressPercent: 0,
      progressWidth: '0%'
    }
  },

  onLoad() {
    this.setData(getNavMetrics());
  },

  onShow() {
    this.refreshTasks();
  },

  refreshTasks() {
    const summary = getTaskSummary();
    this.setData({ tasks: summary.tasks, summary });
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.redirectTo({ url: '/pages/campus-manager/home/index' });
  },

  openTask(event) {
    const route = event.currentTarget.dataset.route;
    const taskId = event.currentTarget.dataset.id;
    const businessManaged = event.currentTarget.dataset.businessManaged;
    if (!route) return;
    const separator = route.indexOf('?') >= 0 ? '&' : '?';
    const url = taskId && businessManaged ? route + separator + 'taskId=' + encodeURIComponent(taskId) : route;
    wx.navigateTo({ url });
  },

  completeStep(event) {
    const taskId = event.currentTarget.dataset.id;
    const result = advanceTask(taskId);
    if (!result) return;
    this.refreshTasks();
    wx.showToast({
      title: result.completed ? '该项已完成' : '当前步骤已完成',
      icon: 'none'
    });
  }
});
