function containsPlayer(list, playerId) {
  return list.some((player) => player.id === playerId);
}

Page({
  data: {
    name: '',
    location: '',
    date: '',
    homeTeamName: '主队',
    awayTeamName: '客队',
    players: [],
    homePlayers: [],
    awayPlayers: [],
    tournaments: []
  },
  onShow() {
    this.setData({
      players: wx.getStorageSync('players') || [],
      tournaments: wx.getStorageSync('tournaments') || []
    });
  },
  onNameInput(event) { this.setData({ name: event.detail.value }); },
  onLocationInput(event) { this.setData({ location: event.detail.value }); },
  onDateInput(event) { this.setData({ date: event.detail.value }); },
  onHomeTeamInput(event) { this.setData({ homeTeamName: event.detail.value || '主队' }); },
  onAwayTeamInput(event) { this.setData({ awayTeamName: event.detail.value || '客队' }); },
  addPlayerToHome(event) {
    const id = Number(event.currentTarget.dataset.id);
    const player = this.data.players.find((item) => item.id === id);
    if (!player || containsPlayer(this.data.homePlayers, id)) return;
    this.setData({ homePlayers: this.data.homePlayers.concat(player) });
  },
  addPlayerToAway(event) {
    const id = Number(event.currentTarget.dataset.id);
    const player = this.data.players.find((item) => item.id === id);
    if (!player || containsPlayer(this.data.awayPlayers, id)) return;
    this.setData({ awayPlayers: this.data.awayPlayers.concat(player) });
  },
  removeHomePlayer(event) {
    const id = Number(event.currentTarget.dataset.id);
    this.setData({ homePlayers: this.data.homePlayers.filter((item) => item.id !== id) });
  },
  removeAwayPlayer(event) {
    const id = Number(event.currentTarget.dataset.id);
    this.setData({ awayPlayers: this.data.awayPlayers.filter((item) => item.id !== id) });
  },
  saveTournament() {
    if (!this.data.name.trim()) {
      wx.showToast({ title: '请填写赛事名称', icon: 'none' });
      return;
    }
    const item = {
      id: Date.now(),
      name: this.data.name.trim(),
      location: this.data.location.trim(),
      date: this.data.date.trim(),
      homeTeamName: this.data.homeTeamName || '主队',
      awayTeamName: this.data.awayTeamName || '客队',
      homePlayers: this.data.homePlayers,
      awayPlayers: this.data.awayPlayers
    };
    const tournaments = [item].concat(this.data.tournaments);
    wx.setStorageSync('tournaments', tournaments);
    this.setData({
      name: '',
      location: '',
      date: '',
      homeTeamName: '主队',
      awayTeamName: '客队',
      homePlayers: [],
      awayPlayers: [],
      tournaments
    });
    wx.showToast({ title: '赛事已保存', icon: 'success' });
  }
});