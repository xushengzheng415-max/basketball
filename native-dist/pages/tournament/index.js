const mainRoutes = {
  home: '/pages/home/index',
  tournament: '/pages/tournament/index',
  team: '/pages/team/index',
  education: '/pages/education/index',
  data: '/pages/data/index',
  mine: '/pages/mine/index'
};

const DEMO_TOURNAMENT_IDS = [
  'seed-elite-u10',
  'seed-u12-weekend',
  'seed-training-internal'
];

function hasPhoneLogin() {
  const profile = wx.getStorageSync('loginProfile') || wx.getStorageSync('userProfile') || null;
  return !!(profile && profile.loggedIn && profile.mode !== 'guest' && profile.phoneNumber);
}

function getLoginUrl(redirectPath) {
  const redirect = redirectPath ? '?redirect=' + encodeURIComponent(redirectPath) : '';
  return '/pages/login/index' + redirect;
}

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

  getStatusMeta(status) {
    const statusMap = {
      running: { label: '进行中', className: 'status running' },
      ended: { label: '已结束', className: 'status ended' },
      draft: { label: '草稿', className: 'status draft' }
    };
    return statusMap[status] || statusMap.draft;
  },

  normalizeTournament(tournament) {
    const status = tournament.status || 'draft';
    const statusMeta = this.getStatusMeta(status);
    const teamCount = tournament.teams || 0;
    const gameCount = tournament.games || 0;
    const name = String(tournament.name || '未命名赛事').trim();

    return Object.assign({}, tournament, {
      name,
      status,
      statusLabel: statusMeta.label,
      statusClass: statusMeta.className,
      locationText: tournament.location || '未填写地点',
      dateText: tournament.date || '未选择日期',
      teamText: `${teamCount} 支球队`,
      gameText: `${gameCount} 场比赛`,
      logoUrl: tournament.logoUrl || tournament.logoFileID || tournament.logo || '',
      logoText: name.slice(0, 1)
    });
  },

  loadTournaments() {
    const stored = wx.getStorageSync('tournaments') || [];
    const tournaments = stored.filter((item) => DEMO_TOURNAMENT_IDS.indexOf(String(item.id)) === -1);

    if (tournaments.length !== stored.length) {
      wx.setStorageSync('tournaments', tournaments);
      DEMO_TOURNAMENT_IDS.forEach((id) => wx.removeStorageSync(`games:${id}`));
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

  requirePhoneLogin(redirectPath, content) {
    if (hasPhoneLogin()) return true;
    wx.showModal({
      title: '登录后云端保存',
      content: content || '登录后可保存并同步赛事数据。',
      confirmText: '去登录',
      cancelText: '先浏览',
      confirmColor: '#ff5a00',
      success: (result) => {
        if (result.confirm) wx.navigateTo({ url: getLoginUrl(redirectPath) });
      }
    });
    return false;
  },

  goCreateTournament() {
    const url = '/pages/tournament-create/index?from=tournament';
    if (!this.requirePhoneLogin(url, '登录后才能创建赛事并云端保存参赛队伍、赛程和比赛数据。')) return;
    wx.navigateTo({ url });
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
    if (!this.requirePhoneLogin('', '登录后才能保存赛事资料。')) return;
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
    if (this.suppressOpenUntil && Date.now() < this.suppressOpenUntil) return;
    const id = event.currentTarget.dataset.id || event.target.dataset.id;
    if (!id) {
      wx.showToast({ title: '赛事信息缺失', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '/pages/tournament-detail/index?id=' + encodeURIComponent(String(id)),
      fail: () => wx.showToast({ title: '赛事详情打开失败', icon: 'none' })
    });
  },

  deleteTournament(event) {
    const id = String(event.currentTarget.dataset.id || event.target.dataset.id || '');
    if (!id) {
      wx.showToast({ title: '赛事信息缺失', icon: 'none' });
      return;
    }
    const tournament = this.data.tournaments.find((item) => String(item.id) === id);
    if (!tournament) {
      wx.showToast({ title: '未找到该赛事', icon: 'none' });
      return;
    }

    this.suppressOpenUntil = Date.now() + 1000;
    wx.showModal({
      title: '删除赛事',
      content: `确认删除“${tournament.name || '未命名赛事'}”吗？赛事和赛程删除后不可恢复，已完成的比赛记录仍会保留。`,
      confirmText: '删除',
      confirmColor: '#d93025',
      success: (result) => {
        if (!result.confirm) return;
        const tournaments = this.data.tournaments.filter((item) => String(item.id) !== id);
        wx.setStorageSync('tournaments', tournaments);
        wx.removeStorageSync(`games:${id}`);
        this.setData({ tournaments }, () => this.applyFilter());
        wx.showToast({ title: '赛事已删除', icon: 'success' });
      }
    });
  }
});
