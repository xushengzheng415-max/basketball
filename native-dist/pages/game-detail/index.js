function readList(key) {
  const value = wx.getStorageSync(key) || [];
  return Array.isArray(value) ? value : [];
}

function getGameKey(tournamentId) {
  return 'games:' + tournamentId;
}

function sameId(left, right) {
  return left !== undefined
    && left !== null
    && right !== undefined
    && right !== null
    && String(left) === String(right);
}

function findTeam(game, side, teams) {
  const id = game[side + 'TeamId'];
  const key = game[side + 'TeamKey'];
  const name = game[side + 'TeamName'];
  return teams.find((team) => sameId(team.id, id)
    || sameId(team.key, key)
    || team.name === name
    || team.label === name) || {
    id: id || key || name,
    key: key || id || name,
    name,
    label: name,
    logoUrl: ''
  };
}

function belongsToTeam(player, team) {
  if (!player || !team) return false;
  return sameId(player.teamId, team.id)
    || sameId(player.filter, team.key)
    || (!!player.team && !!team.name && player.team === team.name)
    || (!!player.team && !!team.label && player.team === team.label);
}

function idSet(items) {
  const result = {};
  (items || []).forEach((item) => {
    result[String(item.id || item)] = true;
  });
  return result;
}

function buildRoster(players, starterIds, benchIds) {
  const starters = idSet(starterIds);
  return players.map((player) => {
    const isStarter = !!starters[String(player.id)];
    return Object.assign({}, player, {
      role: isStarter ? 'starter' : 'bench',
      roleText: isStarter ? '首发' : '替补',
      roleClass: isStarter ? 'player-row starter' : 'player-row',
      starterButtonClass: isStarter ? 'role-btn active' : 'role-btn',
      benchButtonClass: !isStarter ? 'role-btn active dark' : 'role-btn dark'
    });
  });
}

Page({
  data: {
    tournamentId: '',
    gameId: '',
    tournament: null,
    game: null,
    homeTeam: null,
    awayTeam: null,
    homeRoster: [],
    awayRoster: [],
    homeStarterCount: 0,
    awayStarterCount: 0,
    homeEmpty: true,
    awayEmpty: true
  },

  onLoad(options) {
    this.setData({
      tournamentId: String(options.tournamentId || ''),
      gameId: String(options.gameId || '')
    });
    this.loadData();
  },

  onShow() {
    if (this.data.gameId) this.loadData();
  },

  loadData() {
    const tournaments = readList('tournaments');
    const games = readList(getGameKey(this.data.tournamentId));
    const allPlayers = readList('players');
    const teams = readList('teams').concat(readList('teamCategories'));
    const game = games.find((item) => sameId(item.id, this.data.gameId)) || null;
    if (!game) {
      this.setData({ game: null });
      return;
    }

    const homeTeam = findTeam(game, 'home', teams);
    const awayTeam = findTeam(game, 'away', teams);
    const homePlayers = allPlayers.filter((player) => belongsToTeam(player, homeTeam));
    const awayPlayers = allPlayers.filter((player) => belongsToTeam(player, awayTeam));
    const homeRoster = buildRoster(homePlayers, game.homeStarterIds, game.homeBenchIds);
    const awayRoster = buildRoster(awayPlayers, game.awayStarterIds, game.awayBenchIds);

    this.setData({
      tournament: tournaments.find((item) => sameId(item.id, this.data.tournamentId)) || null,
      game,
      homeTeam: Object.assign({}, homeTeam, {
        logoUrl: homeTeam.logoUrl || (homePlayers[0] && homePlayers[0].teamLogo) || '/assets/pages/team/mini-logo-unassigned.png'
      }),
      awayTeam: Object.assign({}, awayTeam, {
        logoUrl: awayTeam.logoUrl || (awayPlayers[0] && awayPlayers[0].teamLogo) || '/assets/pages/team/mini-logo-unassigned.png'
      }),
      homeRoster,
      awayRoster,
      homeStarterCount: homeRoster.filter((player) => player.role === 'starter').length,
      awayStarterCount: awayRoster.filter((player) => player.role === 'starter').length,
      homeEmpty: homeRoster.length === 0,
      awayEmpty: awayRoster.length === 0
    });
  },

  setRole(side, playerId, role) {
    const game = this.data.game;
    if (!game) return;
    const starterKey = side + 'StarterIds';
    const benchKey = side + 'BenchIds';
    const roster = side === 'home' ? this.data.homeRoster : this.data.awayRoster;
    const starterIds = roster.filter((player) => player.role === 'starter').map((player) => player.id);
    const benchIds = roster.filter((player) => player.role !== 'starter').map((player) => player.id);
    const withoutStarter = starterIds.filter((id) => !sameId(id, playerId));
    const withoutBench = benchIds.filter((id) => !sameId(id, playerId));

    if (role === 'starter' && withoutStarter.length >= 5) {
      wx.showToast({ title: '首发最多设置 5 人', icon: 'none' });
      return;
    }

    const nextGame = Object.assign({}, game, {
      [starterKey]: role === 'starter' ? withoutStarter.concat(playerId) : withoutStarter,
      [benchKey]: role === 'bench' ? withoutBench.concat(playerId) : withoutBench
    });
    const nextGames = readList(getGameKey(this.data.tournamentId)).map((item) =>
      sameId(item.id, this.data.gameId) ? nextGame : item
    );
    wx.setStorageSync(getGameKey(this.data.tournamentId), nextGames);
    this.setData({ game: nextGame });
    this.loadData();
  },

  chooseRole(event) {
    this.setRole(
      event.currentTarget.dataset.side,
      event.currentTarget.dataset.id,
      event.currentTarget.dataset.role
    );
  }
});
