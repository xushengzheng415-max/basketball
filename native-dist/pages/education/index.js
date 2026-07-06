const mainRoutes = {
  home: '/pages/home/index',
  tournament: '/pages/tournament/index',
  team: '/pages/team/index',
  education: '/pages/education/index',
  data: '/pages/data/index',
  mine: '/pages/mine/index'
};

Page({
  data: {
    features: [
      { key: 'multi-campus', title: '多校区管理', icon: '/assets/pages/education/icon-multi-campus.png' },
      { key: 'course-schedule', title: '课程排课', icon: '/assets/pages/education/icon-course-schedule.png' },
      { key: 'student-checkin', title: '学员签到', icon: '/assets/pages/education/icon-student-checkin.png' },
      { key: 'lesson-consume-stats', title: '课消统计', icon: '/assets/pages/education/icon-lesson-consume-stats.png' },
      { key: 'after-class-review', title: '课后评价', icon: '/assets/pages/education/icon-after-class-review.png' },
      { key: 'coach-salary', title: '教练工资', icon: '/assets/pages/education/icon-coach-salary.png' }
    ],
    tabItems: [
      { key: 'home', text: '工作台', iconClass: 'home', icon: '/assets/tabbar/tab-home.png', activeClass: '' },
      { key: 'tournament', text: '赛事', iconClass: 'trophy', icon: '/assets/tabbar/tab-tournament.png', activeClass: '' },
      { key: 'team', text: '球员', iconClass: 'user', icon: '/assets/tabbar/tab-team.png', activeClass: '' },
      { key: 'education', text: '教务', iconClass: 'edu', icon: '/assets/tabbar/tab-education-selected.png', activeClass: 'active' },
      { key: 'data', text: '数据', iconClass: 'data', icon: '/assets/tabbar/tab-data.png', activeClass: '' },
      { key: 'mine', text: '我的', iconClass: 'mine', icon: '/assets/tabbar/tab-mine.png', activeClass: '' }
    ]
  },
  goTournament() {
    wx.redirectTo({ url: mainRoutes.tournament });
  },
  onFeatureTap() {
    wx.showToast({ title: '功能规划中', icon: 'none' });
  },
  onTabTap(event) {
    const key = event.currentTarget.dataset.key;
    const url = mainRoutes[key];
    if (!url || key === 'education') return;
    wx.redirectTo({ url });
  }
});