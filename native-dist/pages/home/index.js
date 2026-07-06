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
    currentRole: '校区管理员',
    todayStats: {
      total: 3,
      pending: 2,
      finished: 1
    },
    hasRecentMatches: true,
    shortcutItems: [
      { key: 'createTournament', title: '创建赛事', desc: '创建并发布赛事', icon: '/assets/home/workbench/icon-create-event.png', iconClass: 'event', cardClass: '' },
      { key: 'createTeam', title: '创建球队', desc: '创建并管理球队', icon: '/assets/home/workbench/icon-create-team.png', iconClass: 'team', cardClass: '' },
      { key: 'createPlayer', title: '创建球员', desc: '添加球员资料', icon: '/assets/home/workbench/icon-create-player.png', iconClass: 'player', cardClass: '' },
      { key: 'quickMatch', title: '快捷比赛', desc: '单场临时计分', icon: '/assets/home/workbench/icon-quick-match.png', iconClass: 'quick', cardClass: '' },
      { key: 'lessonStats', title: '销课统计', desc: '待开发', icon: '/assets/home/workbench/icon-lesson-stats.png', iconClass: 'stats', cardClass: '' },
      { key: 'lessonReview', title: '课后评价', desc: '待开发', icon: '/assets/home/workbench/icon-after-review.png', iconClass: 'review', cardClass: '' }
    ],
    recentMatches: [
      {
        id: 'match-001',
        homeName: '蜂巢U10A',
        awayName: '星火U10',
        homeScore: 38,
        awayScore: 34,
        time: '05-10 09:00',
        venue: '蜂巢篮球馆1号场',
        statusText: '已完成',
        statusClass: 'done',
        homeLogoClass: 'bee',
        awayLogoClass: 'star'
      },
      {
        id: 'match-002',
        homeName: '猎鹰U12',
        awayName: '风暴U12',
        homeScore: 42,
        awayScore: 40,
        time: '05-10 10:30',
        venue: '蜂巢篮球馆1号场',
        statusText: '待确认',
        statusClass: 'pending',
        homeLogoClass: 'eagle',
        awayLogoClass: 'storm'
      },
      {
        id: 'match-003',
        homeName: '训练营A队',
        awayName: '训练营B队',
        homeScore: 28,
        awayScore: 22,
        time: '05-10 14:00',
        venue: '蜂巢篮球馆2号场',
        statusText: '待确认',
        statusClass: 'pending',
        homeLogoClass: 'camp-a',
        awayLogoClass: 'camp-b'
      }
    ],
    tabItems: [
      { key: 'home', text: '工作台', iconClass: 'home', icon: '/assets/tabbar/tab-home-selected.png', activeClass: 'active' },
      { key: 'tournament', text: '赛事', iconClass: 'trophy', icon: '/assets/tabbar/tab-tournament.png', activeClass: '' },
      { key: 'team', text: '球员', iconClass: 'user', icon: '/assets/tabbar/tab-team.png', activeClass: '' },
      { key: 'education', text: '教务', iconClass: 'edu', icon: '/assets/tabbar/tab-education.png', activeClass: '' },
      { key: 'data', text: '数据', iconClass: 'data', icon: '/assets/tabbar/tab-data.png', activeClass: '' },
      { key: 'mine', text: '我的', iconClass: 'mine', icon: '/assets/tabbar/tab-mine.png', activeClass: '' }
    ]
  },

  openCampusRole() {
    wx.showActionSheet({
      itemList: ['校区负责人', '教练'],
      success: (res) => {
        const roles = ['校区负责人', '教练'];
        this.setData({ currentRole: roles[res.tapIndex] || '校区管理员' });
      }
    });
  },

  goQuickMatch() {
    wx.navigateTo({ url: '/pages/scorer/index' });
  },

  onShortcutTap(event) {
    const key = event.currentTarget.dataset.key;

    if (key === 'quickMatch') {
      this.goQuickMatch();
      return;
    }

    if (key === 'createTournament') {
      wx.reLaunch({ url: mainRoutes.tournament });
      return;
    }

    if (key === 'createTeam' || key === 'createPlayer') {
      wx.reLaunch({ url: mainRoutes.team });
      return;
    }

    if (key === 'lessonStats' || key === 'lessonReview') {
      wx.showToast({ title: '预览页规划中', icon: 'none' });
    }
  },

  goMatchDetail(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/game-detail/index?id=${id}` });
  },

  goMoreMatches() {
    wx.reLaunch({ url: mainRoutes.tournament });
  },

  onTabTap(event) {
    const key = event.currentTarget.dataset.key;
    const url = mainRoutes[key];
    if (!url || key === 'home') return;
    wx.redirectTo({ url });
  }
});
