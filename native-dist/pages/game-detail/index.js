function getGameKey(tournamentId) {
  return `games:${tournamentId}`;
}

function containsPlayer(list, playerId) {
  return list.some((player) => String(player.id) === String(playerId));
}

function removePlayer(list, playerId) {
  return list.filter((player) => String(player.id) !== String(playerId));
}

function getAvailablePlayers(players, game) {
  if (!game) return players;
  const selectedIds = (game.homePlayers || [])
    .concat(game.awayPlayers || [])
    .map((player) => String(player.id));
  return players.filter((player) => selectedIds.indexOf(String(player.id)) === -1);
}

Page({
  data: {
    tournamentId: '',
    gameId: '',
    tournament: null,
    game: null,
    players: [],
    availablePlayers: []
  },
  onLoad(options) {
    this.setData({
      tournamentId: String(options.tournamentId || ''),
      gameId: String(options.gameId || '')
    });
    this.loadData();
  },
  onShow() {
    this.loadData();
  },
  loadData() {
    const tournaments = wx.getStorageSync('tournaments') || [];
    const games = wx.getStorageSync(getGameKey(this.data.tournamentId)) || [];
    const players = wx.getStorageSync('players') || [];
    const game = games.find((item) => String(item.id) === this.data.gameId) || null;

    if (game) {
      game.homePlayers = game.homePlayers || [];
      game.awayPlayers = game.awayPlayers || [];
    }

    this.setData({
      tournament: tournaments.find((item) => String(item.id) === this.data.tournamentId) || null,
      game,
      players,
      availablePlayers: getAvailablePlayers(players, game)
    });
  },
  persistGame(nextGame) {
    const games = wx.getStorageSync(getGameKey(this.data.tournamentId)) || [];
    const nextGames = games.map((item) => (String(item.id) === this.data.gameId ? nextGame : item));
    wx.setStorageSync(getGameKey(this.data.tournamentId), nextGames);
    this.setData({
      game: nextGame,
      availablePlayers: getAvailablePlayers(this.data.players, nextGame)
    });
  },
  addPlayer(side, playerId) {
    const player = this.data.players.find((item) => String(item.id) === String(playerId));
    const game = this.data.game;
    if (!player || !game) return;

    const homePlayers = game.homePlayers || [];
    const awayPlayers = game.awayPlayers || [];
    if (side === 'home' && containsPlayer(homePlayers, playerId)) {
      wx.showToast({ title: '已在主队名单', icon: 'none' });
      return;
    }
    if (side === 'away' && containsPlayer(awayPlayers, playerId)) {
      wx.showToast({ title: '已在客队名单', icon: 'none' });
      return;
    }

    const nextGame = Object.assign({}, game, {
      homePlayers: side === 'home' ? homePlayers.concat(player) : removePlayer(homePlayers, playerId),
      awayPlayers: side === 'away' ? awayPlayers.concat(player) : removePlayer(awayPlayers, playerId)
    });
    this.persistGame(nextGame);
  },
  addToHome(event) {
    this.addPlayer('home', event.currentTarget.dataset.id);
  },
  addToAway(event) {
    this.addPlayer('away', event.currentTarget.dataset.id);
  },
  removeHome(event) {
    const game = this.data.game;
    if (!game) return;
    this.persistGame(Object.assign({}, game, {
      homePlayers: removePlayer(game.homePlayers || [], event.currentTarget.dataset.id)
    }));
  },
  removeAway(event) {
    const game = this.data.game;
    if (!game) return;
    this.persistGame(Object.assign({}, game, {
      awayPlayers: removePlayer(game.awayPlayers || [], event.currentTarget.dataset.id)
    }));
  }
});