function getGameKey(tournamentId) {
  return `games:${tournamentId}`;
}

function findTournament(tournamentId) {
  const tournaments = wx.getStorageSync('tournaments') || [];
  return tournaments.find((item) => String(item.id) === String(tournamentId)) || null;
}

Page({
  data: {
    tournamentId: '',
    tournament: null,
    gameName: '',
    homeTeamName: '主队',
    awayTeamName: '客队',
    gameDate: '',
    games: []
  },
  onLoad(options) {
    const tournamentId = String(options.id || '');
    this.setData({ tournamentId });
    this.loadData(tournamentId);
  },
  onShow() {
    if (this.data.tournamentId) {
      this.loadData(this.data.tournamentId);
    }
  },
  loadData(tournamentId) {
    this.setData({
      tournament: findTournament(tournamentId),
      games: wx.getStorageSync(getGameKey(tournamentId)) || []
    });
  },
  onGameNameInput(event) {
    this.setData({ gameName: event.detail.value });
  },
  onHomeTeamInput(event) {
    this.setData({ homeTeamName: event.detail.value || '主队' });
  },
  onAwayTeamInput(event) {
    this.setData({ awayTeamName: event.detail.value || '客队' });
  },
  onGameDateInput(event) {
    this.setData({ gameDate: event.detail.value });
  },
  saveGame() {
    if (!this.data.tournament) {
      wx.showToast({ title: '赛事不存在', icon: 'none' });
      return;
    }

    const games = this.data.games;
    const game = {
      id: Date.now(),
      tournamentId: this.data.tournamentId,
      name: this.data.gameName.trim() || `第 ${games.length + 1} 场`,
      homeTeamName: this.data.homeTeamName || '主队',
      awayTeamName: this.data.awayTeamName || '客队',
      date: this.data.gameDate.trim(),
      homePlayers: [],
      awayPlayers: []
    };
    const nextGames = [game].concat(games);
    wx.setStorageSync(getGameKey(this.data.tournamentId), nextGames);
    this.setData({
      gameName: '',
      homeTeamName: '主队',
      awayTeamName: '客队',
      gameDate: '',
      games: nextGames
    });
    wx.showToast({ title: '比赛已创建', icon: 'success' });
  },
  openGame(event) {
    const gameId = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/game-detail/index?tournamentId=${this.data.tournamentId}&gameId=${gameId}` });
  }
});