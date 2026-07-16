const ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/';

Page({
  data: {
    studentId: 'student-1',
    avatar: ROOT + 'pages/team/avatar-linhao.png',
    tabs: [
      { key: 'education', label: '教务', activeClass: '' },
      { key: 'match', label: '赛事', activeClass: 'active' },
      { key: 'growth', label: '成长', activeClass: '' },
      { key: 'family', label: '家长', activeClass: '' }
    ],
    activeTab: 'match',
    stats: [
      { label: '出场', value: '6', unit: '场次' },
      { label: '场均得分', value: '10.8', unit: '得分' },
      { label: '助攻', value: '3.2', unit: '次/场' },
      { label: '成长徽章', value: '8', unit: '枚' }
    ],
    courses: [
      { month: '11月', used: 18, gift: 2, height: '48%' },
      { month: '12月', used: 22, gift: 1, height: '60%' },
      { month: '1月', used: 26, gift: 2, height: '72%' },
      { month: '本月', used: 14, gift: 1, height: '38%' }
    ]
  },

  onLoad(options) {
    this.setData({ studentId: (options && options.id) || 'student-1' });
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.reLaunch({ url: '/pages/education/index' });
  },

  selectTab(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({
      activeTab: key,
      tabs: this.data.tabs.map((item) => ({ ...item, activeClass: item.key === key ? 'active' : '' }))
    });
  },

  openEvaluationHistory() {
    wx.navigateTo({ url: '/pages/coach-student-evaluations/index?studentId=' + encodeURIComponent(this.data.studentId) });
  },

  reserve() {
    wx.navigateTo({ url: '/pages/coach-student-reservation/index?studentId=' + encodeURIComponent(this.data.studentId) });
  }
});
