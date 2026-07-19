const ASSET_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/';

Page({
  data: {
    mode: 'dashboard',
    isDashboard: true,
    coachAvatar: ASSET_ROOT + 'pages/team/avatar-coach.png',
    dashboardClasses: [
      { id: 'course-2', title: 'U10提高班', count: '12/15', time: '下一节 18:30–20:00', venue: '1号场', attendance: '10到', leave: '1请假', absent: '1未到' },
      { id: 'course-1', title: 'U8启蒙班', count: '8/12', time: '下一节 16:30–18:00', venue: '2号场', attendance: '8到', leave: '0请假', absent: '0未到' }
    ],
    classes: [
      { id: 'course-2', title: 'U10提高班', count: '12/15', time: '下一节 18:30–20:00', venue: '1号场', attendance: '10到', leave: '1请假', absent: '1未到' },
      { id: 'course-1', title: 'U8启蒙班', count: '8/12', time: '下一节 16:30–18:00', venue: '2号场', attendance: '8到', leave: '0请假', absent: '0未到' },
      { id: 'course-3', title: 'U12精英班', count: '15/18', time: '本周三 19:00', venue: '1号场', attendance: '15到', leave: '0请假', absent: '0未到' },
      { id: 'course-4', title: 'U10进阶班', count: '10/15', time: '本周五 18:30–20:00', venue: '3号场', attendance: '10到', leave: '0请假', absent: '0未到' }
    ]
  },
  onLoad(options) {
    const mode = options.mode === 'list' ? 'list' : 'dashboard';
    this.setData({ mode, isDashboard: mode === 'dashboard' });
  },
  goBack() {
    if (!this.data.isDashboard) { this.setData({ mode: 'dashboard', isDashboard: true }); return; }
    const pages = getCurrentPages();
    if (pages.length > 1) wx.navigateBack({ delta: 1 });
    else wx.reLaunch({ url: '/pages/education/index' });
  },
  showClasses() { this.setData({ mode: 'list', isDashboard: false }); },
  openCourses() { wx.navigateTo({ url: '/pages/coach-courses/index' }); },
  openStudents(event) { wx.navigateTo({ url: '/pages/coach-course-students/index?id=' + event.currentTarget.dataset.id }); },
  openPending() { wx.navigateTo({ url: '/pages/coach-pending-plans/index' }); },
  openEvaluations() { wx.navigateTo({ url: '/pages/coach-evaluation-list/index' }); },
  openReturned() { wx.navigateTo({ url: '/pages/coach-evaluation/index?studentId=s1&mode=returned' }); },
  openReports(event) { wx.navigateTo({ url: '/pages/coach-period-reports/index?type=' + event.currentTarget.dataset.type }); },
  enterClassroom() { wx.navigateTo({ url: '/pages/coach-course-plan/index?id=course-2&mode=view' }); }
});
