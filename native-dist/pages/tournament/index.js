const {
  callTournament,
  decorateTournament,
  hasPhoneLogin,
  listLocalCreatedTournaments,
  readTeams,
  requirePhoneLogin,
  syncLocalTournaments,
  withTeamPlayers
} = require('../../utils/tournament-league');

Page({
  data: {
    capsuleRight: 210,
    activeRole: 'created',
    roleTabs: [
      { key: 'created', label: '我创建的', className: 'role-tab active' },
      { key: 'joined', label: '我参加的', className: 'role-tab' }
    ],
    created: [], joined: [], visibleTournaments: [], pendingReviewCount: 0, loading: true, loadFailed: false,
    emptyText: '还没有创建赛事', migrationPrompting: false
  },
  onLoad() { this.setCapsuleSafeArea(); },
  onShow() {
    if (wx.hideTabBar) wx.hideTabBar({ animation: false, fail: () => {} });
    if (!hasPhoneLogin()) {
      this.setData({ loading: false, loadFailed: false, created: [], joined: [] });
      this.applyRole(); return;
    }
    this.migrateLegacyIfNeeded().finally(() => {
      syncLocalTournaments().finally(() => this.loadTournaments());
    });
  },
  setCapsuleSafeArea() {
    try {
      const capsule = wx.getMenuButtonBoundingClientRect();
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      this.setData({ capsuleRight: Math.max(210, (info.windowWidth - capsule.left + 12) * 2) });
    } catch (error) {}
  },
  loadTournaments() {
    const localCreated = listLocalCreatedTournaments();
    this.setData({ loading: true, loadFailed: false });
    return callTournament('listMine').then((result) => {
      const recentFirst = (items) => (items || []).slice().sort((left, right) => Number(right.updatedAt || 0) - Number(left.updatedAt || 0)).map(decorateTournament);
      const created = recentFirst(localCreated.concat(result.created || []));
      const pendingReviewCount = created.reduce((sum, item) => sum + Number(item.pendingTeamCount || 0), 0);
      wx.setStorageSync('sxfTournamentPendingReviewCount', pendingReviewCount);
      this.setData({ created, joined: recentFirst(result.joined), pendingReviewCount, loading: false, loadFailed: false });
      this.applyRole();
    }).catch((error) => {
      console.warn('[tournament] load failed', error);
      if (localCreated.length) {
        const created = localCreated.map(decorateTournament);
        this.setData({ created, joined: [], loading: false, loadFailed: false });
        this.applyRole();
        return;
      }
      this.setData({ loading: false, loadFailed: true, visibleTournaments: [] });
    });
  },
  applyRole() {
    const activeRole = this.data.activeRole;
    const visibleTournaments = activeRole === 'joined' ? this.data.joined : this.data.created;
    this.setData({
      visibleTournaments,
      emptyText: activeRole === 'joined' ? '还没有参加赛事，扫码即可报名' : '还没有创建赛事',
      roleTabs: this.data.roleTabs.map((tab) => Object.assign({}, tab, { className: tab.key === activeRole ? 'role-tab active' : 'role-tab' }))
    });
  },
  switchRole(event) { this.setData({ activeRole: event.currentTarget.dataset.key || 'created' }); this.applyRole(); },
  createScenario(event) {
    const scenarioType = event.currentTarget.dataset.scenario || 'other';
    const url = `/pages/tournament-create/index?scenarioType=${scenarioType}`;
    if (!requirePhoneLogin(url, '登录后才能创建并邀请其他球队参加赛事。')) return;
    wx.navigateTo({ url });
  },
  openOtherMenu() {
    const url = '/pages/tournament-create/index?scenarioType=other';
    if (!requirePhoneLogin(url, '登录后才能创建其他赛事。')) return;
    wx.navigateTo({ url });
  },
  openInviteCode() {
    wx.showModal({
      title: '输入赛事邀请码',
      editable: true,
      placeholderText: '请输入邀请海报或群消息中的邀请码',
      confirmText: '进入报名',
      confirmColor: '#ff6500',
      success: (result) => {
        if (!result.confirm) return;
        const inviteKey = String(result.content || '').trim();
        if (!inviteKey) { wx.showToast({ title: '请输入邀请码', icon: 'none' }); return; }
        wx.showLoading({ title: '正在验证' });
        callTournament('getInvitation', { inviteKey }).then((response) => {
          wx.navigateTo({ url: `/pages/tournament-register/index?eventId=${encodeURIComponent(response.tournament.eventId)}&inviteKey=${encodeURIComponent(inviteKey)}` });
        }).catch((error) => wx.showToast({ title: error.message || '邀请码无效', icon: 'none' })).finally(() => wx.hideLoading());
      }
    });
  },
  openTournament(event) {
    const eventId = event.currentTarget.dataset.id;
    if (eventId) wx.navigateTo({ url: `/pages/tournament-detail/index?id=${encodeURIComponent(eventId)}` });
  },
  retryLoad() { if (requirePhoneLogin('/pages/tournament/index')) this.loadTournaments(); },
  migrateLegacyIfNeeded() {
    const migrationState = wx.getStorageSync('tournamentLeagueMigrationV1');
    const legacy = wx.getStorageSync('tournaments');
    if (migrationState || !Array.isArray(legacy) || !legacy.length || this.data.migrationPrompting) return Promise.resolve();
    this.setData({ migrationPrompting: true });
    return new Promise((resolve) => {
      wx.showModal({
        title: '发现旧版赛事', content: `检测到 ${legacy.length} 个本机赛事，是否导入新版云端赛事？原记录会继续保留。`,
        confirmText: '立即导入', cancelText: '稍后', confirmColor: '#ff6a00',
        success: (result) => {
          if (!result.confirm) { this.setData({ migrationPrompting: false }); resolve(); return; }
          wx.showLoading({ title: '正在导入' });
          const localTeams = readTeams();
          const tournaments = legacy.map((item) => {
            const games = wx.getStorageSync(`games:${item.id}`);
            const teamKeys = Array.isArray(item.teamKeys) ? item.teamKeys.map(String) : [];
            const selectedTeams = teamKeys.length
              ? localTeams.filter((team) => teamKeys.includes(String(team.sourceTeamId))).map(withTeamPlayers)
              : [];
            return Object.assign({}, item, {
              legacyGames: Array.isArray(games) ? games : [],
              legacyTeams: selectedTeams
            });
          });
          callTournament('migrateLegacy', { tournaments }).then((response) => {
            wx.setStorageSync('tournamentLeagueMigrationV1', { migratedAt: Date.now(), imported: response.imported || 0 });
            wx.showToast({ title: `已导入 ${response.imported || 0} 个`, icon: 'success' });
          }).catch((error) => wx.showToast({ title: error.message || '导入失败', icon: 'none' })).finally(() => {
            wx.hideLoading(); this.setData({ migrationPrompting: false }); resolve();
          });
        }, fail: resolve
      });
    });
  }
});
