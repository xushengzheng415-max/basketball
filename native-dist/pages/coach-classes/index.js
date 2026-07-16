const ASSET_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/pages/education/';

Page({
  data: {
    assets: {
      course: ASSET_ROOT + 'icon-course-schedule.png',
      student: ASSET_ROOT + 'icon-student-checkin.png',
      progress: ASSET_ROOT + 'icon-lesson-consume-stats.png'
    },
    summary: [
      { value: '3', label: '负责班级' },
      { value: '37', label: '班级学员' },
      { value: '8', label: '本周课程' },
      { value: '91%', label: '平均出勤' }
    ],
    todayTasks: [
      { value: '2', label: '今日课程', note: '18:30、20:10', action: 'courses', activeClass: 'primary' },
      { value: '1', label: '待完成计划', note: 'U12精英班', action: 'pending-plan', classId: 'course-3', activeClass: '' },
      { value: '12', label: '待写评价', note: 'U10提高班', action: 'evaluation', classId: 'course-2', activeClass: 'warning' }
    ],
    alerts: [
      { level: '关注', title: 'U8启蒙班近4周出勤率 82%', desc: '低于班级目标8%，建议关注连续请假学员', action: '查看学员', classId: 'course-1', levelClass: 'warning' },
      { level: '待处理', title: 'U12精英班今晚课程计划未确认', desc: '距离开课还有3小时20分钟', action: '立即备课', classId: 'course-3', levelClass: 'urgent' }
    ],
    classes: [
      { id: 'course-1', title: 'U8 启蒙班', level: '少儿启蒙', students: 10, capacity: 12, venue: '1号馆', schedule: '周三、周六 09:30', next: '周六 09:30', progress: 72, progressText: '本期 18 / 25 节', task: '1份评价待完成', taskClass: 'warning' },
      { id: 'course-2', title: 'U10 提高班', level: '进阶训练', students: 15, capacity: 16, venue: '2号馆', schedule: '周三、周日 18:30', next: '今天 18:30', progress: 60, progressText: '本期 15 / 25 节', task: '今晚待上课', taskClass: 'next' },
      { id: 'course-3', title: 'U12 精英班', level: '高阶实战', students: 12, capacity: 14, venue: '1号馆', schedule: '周二、周五 20:10', next: '今天 20:10', progress: 48, progressText: '本期 12 / 25 节', task: '课程计划未完成', taskClass: 'warning' }
    ]
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.reLaunch({ url: '/pages/education/index' });
  },

  openStudents(event) {
    wx.navigateTo({ url: '/pages/coach-course-students/index?id=' + event.currentTarget.dataset.id });
  },

  openCourses() {
    wx.navigateTo({ url: '/pages/coach-courses/index' });
  },

  openPlan(event) {
    wx.navigateTo({ url: '/pages/coach-course-plan/index?id=' + event.currentTarget.dataset.id });
  },

  handleDashboardTask(event) {
    const action = event.currentTarget.dataset.action;
    const classId = event.currentTarget.dataset.id || 'course-2';
    if (action === 'pending-plan') {
      wx.navigateTo({ url: '/pages/coach-pending-plans/index?id=' + classId });
      return;
    }
    if (action === 'evaluation') {
      wx.navigateTo({ url: '/pages/coach-evaluation-list/index?id=' + classId + '&source=classes' });
      return;
    }
    wx.navigateTo({ url: '/pages/coach-courses/index?mode=today' });
  },

  handleAlert(event) {
    const action = event.currentTarget.dataset.action;
    const classId = event.currentTarget.dataset.id;
    const url = action === '立即备课'
      ? '/pages/coach-course-plan/index?id=' + classId
      : '/pages/coach-course-students/index?id=' + classId;
    wx.navigateTo({ url });
  }
});
