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
    name: '',
    location: '',
    date: '',
    dateLabel: '选择赛事日期',
    activeStatus: 'all',
    showCreatePanel: false,
    tabs: [],
    tournaments: [],
    visibleTournaments: [],
    hasVisibleTournaments: false,
    tabItems: [
      { key: 'home', text: '工作台', iconClass: 'home', icon: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/tabbar/tab-home.png', activeClass: '' },
      { key: 'tournament', text: '赛事', iconClass: 'trophy', icon: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/tabbar/tab-tournament-selected.png', activeClass: 'active' },
      { key: 'team', text: '球员', iconClass: 'user', icon: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/tabbar/tab-team.png', activeClass: '' },
      { key: 'education', text: '教务', iconClass: 'edu', icon: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/tabbar/tab-education.png', activeClass: '' },
      { key: 'data', text: '数据', iconClass: 'data', icon: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/tabbar/tab-data.png', activeClass: '' },
      { key: 'mine', text: '我的', iconClass: 'mine', icon: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/tabbar/tab-mine.png', activeClass: '' }
    ]
  },

  onLoad() {
    this.setData({ tabs: this.buildTabs('all') });
  },

  onShow() {
    this.loadTournaments();
  },

  buildTabs(activeStatus) {
    const source = [
      { key: 'all', label: '全部' },
      { key: 'running', label: '进行中' },
      { key: 'ended', label: '已结束' },
      { key: 'draft', label: '草稿' }
    ];
    return source.map((item) => Object.assign({}, item, {
      className: item.key === activeStatus ? 'tab active' : 'tab'
    }));
  },

  getSeedTournaments() {
    return [
      {
        id: 'seed-elite-u10',
        name: '蜂巢U10精英联赛',
        location: '蜂巢篮球馆 A1 主场',
        date: '2026-05-10 ~ 2026-05-24',
        status: 'running',
        teams: 12,
        games: 36,
        cardImage: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/tournament/tournament-card-elite-u10.png'
      },
      {
        id: 'seed-u12-weekend',
        name: 'U12周末积分赛',
        location: '城北体育中心 2 号馆',
        date: '2026-05-31 ~ 2026-07-12',
        status: 'draft',
        teams: 16,
        games: 48,
        cardImage: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/tournament/tournament-card-u12-weekend.png'
      },
      {
        id: 'seed-training-internal',
        name: '训练营内部对抗赛',
        location: '赛小蜂训练营',
        date: '2026-04-12 ~ 2026-04-13',
        status: 'ended',
        teams: 8,
        games: 12,
        cardImage: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/tournament/tournament-card-training-internal.png'
      }
    ];
  },

  getStatusMeta(status) {
    const statusMap = {
      running: { label: '进行中', className: 'status running' },
      ended: { label: '已结束', className: 'status ended' },
      draft: { label: '草稿', className: 'status draft' }
    };
    return statusMap[status] || statusMap.draft;
  },

  normalizeTournament(tournament, index) {
    const covers = [
      'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/tournament/cover-elite-u10.png',
      'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/tournament/cover-u12-weekend.png',
      'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/tournament/cover-training-internal.png'
    ];
    const cardImages = [
      'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/tournament/tournament-card-elite-u10.png',
      'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/tournament/tournament-card-u12-weekend.png',
      'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/tournament/tournament-card-training-internal.png'
    ];
    const status = tournament.status || 'draft';
    const statusMeta = this.getStatusMeta(status);
    const teamCount = tournament.teams || 0;
    const gameCount = tournament.games || 0;

    return Object.assign({}, tournament, {
      status,
      statusLabel: statusMeta.label,
      statusClass: statusMeta.className,
      locationText: tournament.location || '未填写地点',
      dateText: tournament.date || '未选择日期',
      teamText: `${teamCount} 支球队`,
      gameText: `${gameCount} 场比赛`,
      cover: tournament.cover || covers[index % covers.length],
      cardImage: tournament.cardImage || cardImages[index % cardImages.length]
    });
  },

  loadTournaments() {
    const stored = wx.getStorageSync('tournaments') || [];
    const seedTournaments = this.getSeedTournaments();
    const storedIds = stored.map((item) => String(item.id));
    const missingSeeds = seedTournaments.filter((item) => storedIds.indexOf(String(item.id)) === -1);
    const tournaments = missingSeeds.concat(stored);

    if (missingSeeds.length > 0) {
      wx.setStorageSync('tournaments', tournaments);
    }

    this.setData({ tournaments }, () => {
      this.applyFilter();
    });
  },

  applyFilter() {
    const activeStatus = this.data.activeStatus;
    const filtered = this.data.tournaments
      .filter((item) => activeStatus === 'all' || (item.status || 'draft') === activeStatus)
      .map((item, index) => this.normalizeTournament(item, index));

    this.setData({
      visibleTournaments: filtered,
      hasVisibleTournaments: filtered.length > 0,
      tabs: this.buildTabs(activeStatus)
    });
  },

  changeStatus(event) {
    this.setData({ activeStatus: event.currentTarget.dataset.status }, () => {
      this.applyFilter();
    });
  },

  goCreateTournament() {
    wx.navigateTo({ url: '/pages/tournament-create/index?from=tournament' });
  },

  hideCreateTournament() {
    this.setData({ showCreatePanel: false });
  },

  onNameInput(event) {
    this.setData({ name: event.detail.value });
  },

  onLocationInput(event) {
    this.setData({ location: event.detail.value });
  },

  onDateChange(event) {
    this.setData({ date: event.detail.value, dateLabel: event.detail.value });
  },

  saveTournament() {
    const name = this.data.name.trim();
    if (!name) {
      wx.showToast({ title: '请填写赛事名称', icon: 'none' });
      return;
    }

    const tournament = {
      id: Date.now(),
      name,
      location: this.data.location.trim(),
      date: this.data.date,
      status: 'draft',
      teams: 0,
      games: 0
    };
    const tournaments = [tournament].concat(this.data.tournaments);
    wx.setStorageSync('tournaments', tournaments);
    this.setData({
      name: '',
      location: '',
      date: '',
      dateLabel: '选择赛事日期',
      activeStatus: 'all',
      showCreatePanel: false,
      tournaments
    }, () => {
      this.applyFilter();
    });
    wx.showToast({ title: '赛事已保存', icon: 'success' });
  },

  noop() {},

  onTabTap(event) {
    const key = event.currentTarget.dataset.key;
    const url = mainRoutes[key];
    if (!url || key === 'tournament') return;
    wx.redirectTo({ url });
  },

  openTournament(event) {
    const id = event.currentTarget.dataset.id || event.target.dataset.id;
    if (!id) {
      wx.showToast({ title: '璧涗簨淇℃伅缂哄け', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '/pages/tournament-detail/index?id=' + encodeURIComponent(String(id)),
      fail: () => wx.showToast({ title: '璧涗簨璇︽儏鎵撳紑澶辫触', icon: 'none' })
    });
  }
});


