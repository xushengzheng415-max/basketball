const ICON_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/common/campus-manager/';
const { completeTaskStep, getTask } = require('../task-data');

Page({
  data: {
    navTop: 20,
    navHeight: 44,
    navSpacer: 76,
    taskMode: false,
    taskGuide: null,
    showTaskAction: false,
    taskActionText: '',
    taskActionHint: '',
    icons: {
      back: ICON_ROOT + 'icon-back-orange-256.png',
      clock: ICON_ROOT + 'icon-clock-orange-256.png',
      location: ICON_ROOT + 'icon-location-orange-256.png',
      warning: ICON_ROOT + 'icon-warning-orange-256.png',
      user: ICON_ROOT + 'icon-user-orange-256.png'
    },
    metrics: [
      { label: '今日', value: '12', suffix: '节', tone: 'orange' },
      { label: '已完成', value: '10', suffix: '节', tone: 'success' },
      { label: '待点名', value: '2', suffix: '节', tone: 'danger' }
    ],
    overdueCourses: [
      { id: 'u10', symbol: '王', coach: '王教练', title: 'U10 提高班', venue: '浦东校区 · 1号场', time: '18:30 已开课', minutes: '15', tone: 'danger' },
      { id: 'u8', symbol: '李', coach: '李教练', title: 'U8 精英班', venue: '浦东校区 · 2号场', time: '19:00 已开课', minutes: '8', tone: 'orange' }
    ],
    anomalies: [
      { label: '缺勤', value: '3', suffix: '人', tone: 'danger', symbol: '缺' },
      { label: '请假', value: '2', suffix: '人', tone: 'orange', symbol: '假' },
      { label: '其他', value: '1', suffix: '人', tone: 'warning', symbol: '异' }
    ]
  },
  onLoad(options) {
    const requestedTaskId = options && options.taskId === 'attendance-overdue' ? options.taskId : '';
    const attendanceTask = getTask('attendance-overdue');
    this.taskId = requestedTaskId || (attendanceTask && !attendanceTask.completed ? attendanceTask.id : '');
    let top = 20;
    let height = 44;
    try {
      const menu = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect();
      if (menu && menu.top) { top = menu.top; height = menu.height || 32; }
      else { const system = wx.getSystemInfoSync(); top = system.statusBarHeight || 20; }
    } catch (error) { console.warn('[attendance-overview] nav metrics unavailable', error); }
    this.setData({ navTop: top, navHeight: height, navSpacer: top + height + 16, taskMode: Boolean(this.taskId) });
    if (this.taskId) {
      completeTaskStep(this.taskId, 1);
      this.refreshTaskGuide();
    }
  },
  onShow() {
    if (this.taskId) this.refreshTaskGuide();
  },
  refreshTaskGuide() {
    const taskGuide = getTask(this.taskId);
    if (!taskGuide) return;
    let taskActionText = '';
    let taskActionHint = '';
    if (!taskGuide.completed && taskGuide.progress < 2) {
      taskActionText = '发送提醒并确认接收';
      taskActionHint = '确认教练接收后，自动进入复核环节。';
    } else if (!taskGuide.completed) {
      taskActionText = '下一步：复核点名结果与异常学员';
      taskActionHint = '可立即去复核，也可稍后从待办中心继续。';
    }
    this.setData({
      taskGuide,
      showTaskAction: !taskGuide.completed,
      taskActionText,
      taskActionHint
    });
  },
  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) { wx.navigateBack({ delta: 1 }); return; }
    wx.redirectTo({ url: '/pages/campus-manager/courses/index', fail: () => wx.reLaunch({ url: '/pages/campus-manager/home/index' }) });
  },
  openDetail(event) {
    const id = event.currentTarget.dataset.id || '';
    this.navigateToDetail(id);
  },
  navigateToDetail(id) {
    let url = '/pages/campus-manager/attendance-detail/index?id=' + id;
    if (this.taskId) url += '&taskId=' + encodeURIComponent(this.taskId);
    wx.navigateTo({ url });
  },
  runTaskAction() {
    const task = getTask(this.taskId);
    if (!task || task.completed) return;
    if (task.progress < 2) {
      this.remindAll();
      return;
    }
    this.openTaskReview();
  },
  openTaskReview() {
    const reviewCourse = this.data.overdueCourses[1] || this.data.overdueCourses[0];
    if (reviewCourse) this.navigateToDetail(reviewCourse.id);
  },
  remindCoach(event) {
    const coach = event.currentTarget.dataset.coach || '负责教练';
    this.confirmReminderReceived(coach, false);
  },
  remindAll() {
    this.confirmReminderReceived('全部待点名教练', true);
  },
  confirmReminderReceived(coachName, completesTask) {
    if (!this.taskId) {
      wx.showToast({ title: '已提醒' + coachName, icon: 'none' });
      return;
    }
    if (!completesTask) {
      wx.showModal({
        title: '确认教练已接收',
        content: '点名提醒已发送给' + coachName + '，收到回复后请确认。',
        cancelText: '暂不确认',
        confirmText: '确认接收',
        success: (result) => {
          if (result.confirm) wx.showToast({ title: '已记录' + coachName + '接收', icon: 'none' });
        }
      });
      return;
    }
    const task = getTask(this.taskId);
    if (task && task.progress >= 2) {
      this.offerTaskReview();
      return;
    }
    wx.showModal({
      title: '确认教练已接收',
      content: '点名提醒已发送给' + coachName + '，收到回复后请确认。',
      cancelText: '暂不确认',
      confirmText: '确认接收',
      success: (result) => {
        if (!result.confirm) return;
        const updated = completeTaskStep(this.taskId, 2);
        this.refreshTaskGuide();
        if (updated && updated.progress >= 2) {
          setTimeout(() => this.offerTaskReview(), 120);
          return;
        }
        wx.showToast({ title: '请先查看超时课程', icon: 'none' });
      }
    });
  },
  offerTaskReview() {
    wx.showModal({
      title: '提醒已确认',
      content: '点名提醒已完成并自动核销。下一步需要复核点名结果与异常学员。',
      cancelText: '稍后处理',
      confirmText: '去复核',
      success: (result) => {
        if (result.confirm) this.openTaskReview();
      }
    });
  }
});
