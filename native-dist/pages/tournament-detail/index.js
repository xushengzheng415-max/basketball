function getGameKey(tournamentId) {
  return 'games:' + tournamentId;
}

function getTournaments() {
  return wx.getStorageSync('tournaments') || [];
}

function findTournament(tournamentId) {
  return getTournaments().find((item) => String(item.id) === String(tournamentId)) || null;
}

function formatTournament(item) {
  if (!item) return null;
  return Object.assign({}, item, {
    metaText: (item.location || '\u672a\u586b\u5199\u5730\u70b9') + ' · ' + (item.date || '\u672a\u9009\u62e9\u65e5\u671f')
  });
}

function normalizeGames(list) {
  return (Array.isArray(list) ? list : []).map((item) => Object.assign({}, item, {
    dateText: item.date || '\u672a\u9009\u62e9\u65e5\u671f',
    playerText: '\u5df2\u9009 ' + ((item.homePlayers || []).length + (item.awayPlayers || []).length) + ' \u4eba'
  }));
}

Page({
  data: {
    tournamentId: '',
    tournament: null,
    isEditingTournament: false,
    editName: '',
    editLocation: '',
    editDate: '',
    editDateText: '\u9009\u62e9\u8d5b\u4e8b\u65e5\u671f',
    gameName: '',
    homeTeamName: '\u4e3b\u961f',
    awayTeamName: '\u5ba2\u961f',
    gameDate: '',
    gameDateText: '\u9009\u62e9\u573a\u6b21\u65e5\u671f',
    games: [],
    hasGames: false,
    emptyGames: true,
    editDateClass: '',
    gameDateClass: ''
  },
  onLoad(options) {
    const tournamentId = String(options.id || '');
    this.setData({ tournamentId });
    this.loadData(tournamentId);
  },
  onShow() {
    if (this.data.tournamentId) this.loadData(this.data.tournamentId);
  },
  loadData(tournamentId) {
    const games = normalizeGames(wx.getStorageSync(getGameKey(tournamentId)) || []);
    this.setData({
      tournament: formatTournament(findTournament(tournamentId)),
      games,
      hasGames: games.length > 0,
      emptyGames: games.length === 0
    });
  },
  startEditTournament() {
    const tournament = this.data.tournament;
    if (!tournament) return;
    this.setData({
      isEditingTournament: true,
      editName: tournament.name || '',
      editLocation: tournament.location || '',
      editDate: tournament.date || '',
      editDateText: tournament.date || '\u9009\u62e9\u8d5b\u4e8b\u65e5\u671f',
      editDateClass: tournament.date ? 'has-value' : ''
    });
  },
  cancelEditTournament() {
    this.setData({ isEditingTournament: false });
  },
  onEditNameInput(event) {
    this.setData({ editName: event.detail.value });
  },
  onEditLocationInput(event) {
    this.setData({ editLocation: event.detail.value });
  },
  onEditDateChange(event) {
    const editDate = event.detail.value;
    this.setData({ editDate, editDateText: editDate || '\u9009\u62e9\u8d5b\u4e8b\u65e5\u671f', editDateClass: editDate ? 'has-value' : '' });
  },
  saveTournamentEdit() {
    const name = this.data.editName.trim();
    if (!name) {
      wx.showToast({ title: '\u8bf7\u586b\u5199\u8d5b\u4e8b\u540d\u79f0', icon: 'none' });
      return;
    }
    const id = String(this.data.tournamentId);
    const next = getTournaments().map((item) => String(item.id) === id ? Object.assign({}, item, {
      name,
      location: this.data.editLocation.trim(),
      date: this.data.editDate,
      updatedAt: Date.now()
    }) : item);
    wx.setStorageSync('tournaments', next);
    this.setData({ isEditingTournament: false });
    this.loadData(id);
    wx.showToast({ title: '\u8d5b\u4e8b\u5df2\u66f4\u65b0', icon: 'success' });
  },
  deleteTournament() {
    const tournament = this.data.tournament;
    if (!tournament) return;
    wx.showModal({
      title: '\u5220\u9664\u8d5b\u4e8b',
      content: '\u786e\u5b9a\u5220\u9664\u300c' + (tournament.name || '\u672a\u547d\u540d\u8d5b\u4e8b') + '\u300d\u5417\uff1f\u8be5\u8d5b\u4e8b\u4e0b\u7684\u573a\u6b21\u4e5f\u4f1a\u4e00\u5e76\u79fb\u9664\u3002',
      confirmText: '\u5220\u9664',
      confirmColor: '#d83b01',
      success: (res) => {
        if (!res.confirm) return;
        const id = String(this.data.tournamentId);
        wx.setStorageSync('tournaments', getTournaments().filter((item) => String(item.id) !== id));
        wx.removeStorageSync(getGameKey(id));
        wx.showToast({ title: '\u5df2\u5220\u9664', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 350);
      }
    });
  },
  onGameNameInput(event) {
    this.setData({ gameName: event.detail.value });
  },
  onHomeTeamInput(event) {
    this.setData({ homeTeamName: event.detail.value || '\u4e3b\u961f' });
  },
  onAwayTeamInput(event) {
    this.setData({ awayTeamName: event.detail.value || '\u5ba2\u961f' });
  },
  onGameDateChange(event) {
    const gameDate = event.detail.value;
    this.setData({ gameDate, gameDateText: gameDate || '\u9009\u62e9\u573a\u6b21\u65e5\u671f', gameDateClass: gameDate ? 'has-value' : '' });
  },
  saveGame() {
    if (!this.data.tournament) {
      wx.showToast({ title: '\u8d5b\u4e8b\u4e0d\u5b58\u5728', icon: 'none' });
      return;
    }
    const games = this.data.games;
    const game = {
      id: Date.now(),
      tournamentId: this.data.tournamentId,
      name: this.data.gameName.trim() || ('\u7b2c ' + (games.length + 1) + ' \u573a'),
      homeTeamName: this.data.homeTeamName || '\u4e3b\u961f',
      awayTeamName: this.data.awayTeamName || '\u5ba2\u961f',
      date: this.data.gameDate,
      homePlayers: [],
      awayPlayers: []
    };
    const nextGames = normalizeGames([game].concat(games));
    wx.setStorageSync(getGameKey(this.data.tournamentId), [game].concat(games));
    this.setData({
      gameName: '',
      homeTeamName: '\u4e3b\u961f',
      awayTeamName: '\u5ba2\u961f',
      gameDate: '',
      gameDateText: '\u9009\u62e9\u573a\u6b21\u65e5\u671f',
      gameDateClass: '',
      games: nextGames,
      hasGames: nextGames.length > 0,
      emptyGames: nextGames.length === 0
    });
    wx.showToast({ title: '\u573a\u6b21\u5df2\u521b\u5efa', icon: 'success' });
  },
  openGame(event) {
    const gameId = event.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/game-detail/index?tournamentId=' + this.data.tournamentId + '&gameId=' + gameId });
  }
});
