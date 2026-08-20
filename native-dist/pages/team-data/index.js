const ASSET_BASE = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/pages/team-data/';
const FALLBACK_LOGOS = [
  `${ASSET_BASE}logo-team-fengmang-u12.png`,
  `${ASSET_BASE}logo-team-xinghuo.png`,
  `${ASSET_BASE}logo-team-feiyue-u10.png`
];

function readList(key) {
  const value = wx.getStorageSync(key);
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return String(value === undefined || value === null ? '' : value).trim();
}

function same(left, right) {
  return !!text(left) && text(left) === text(right);
}

function isFinished(match) {
  return !!match && (match.ended === true || match.status === 'finished' || match.status === 'ended');
}

function getTeamName(team) {
  return text(team && (team.label || team.name || team.teamName)) || '未命名球队';
}

function teamIdentity(team) {
  return [team && team.id, team && team.key, getTeamName(team)].map(text).filter(Boolean);
}

function sideIdentity(match, side) {
  const team = match && match[side + 'Team'];
  return [
    match && match[side + 'TeamId'], match && match[side + 'TeamKey'],
    team && team.id, team && team.key,
    match && match[side + 'Name'], match && match[side + 'TeamName'],
    team && (team.label || team.name || team.teamName)
  ].map(text).filter(Boolean);
}

function intersects(left, right) {
  return left.some((item) => right.indexOf(item) >= 0);
}

function resultFor(match, team) {
  const ids = teamIdentity(team);
  const home = intersects(ids, sideIdentity(match, 'home'));
  const away = intersects(ids, sideIdentity(match, 'away'));
  if (!home && !away) return '';
  const own = Number(home ? match.homeScore : match.awayScore) || 0;
  const opponent = Number(home ? match.awayScore : match.homeScore) || 0;
  if (own === opponent) return 'D';
  return own > opponent ? 'W' : 'L';
}

function collectGameMap(tournaments) {
  const map = {};
  tournaments.forEach((tournament) => {
    readList('games:' + tournament.id).forEach((game) => {
      const key = text(game.id);
      if (key) map[text(tournament.id) + ':' + key] = game;
    });
  });
  return map;
}

function enrichMatches(tournaments) {
  const gameMap = collectGameMap(tournaments);
  return readList('sx_recent_matches').filter(isFinished).map((match) => {
    const game = gameMap[text(match.tournamentId) + ':' + text(match.gameId)] || {};
    return Object.assign({}, game, match, {
      homeTeamId: match.homeTeamId || game.homeTeamId,
      homeTeamKey: match.homeTeamKey || game.homeTeamKey,
      homeTeamName: match.homeTeamName || match.homeName || game.homeTeamName,
      awayTeamId: match.awayTeamId || game.awayTeamId,
      awayTeamKey: match.awayTeamKey || game.awayTeamKey,
      awayTeamName: match.awayTeamName || match.awayName || game.awayTeamName
    });
  }).sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));
}

function uniqueTeams() {
  const map = {};
  readList('teams').concat(readList('teamDrafts')).forEach((team, index) => {
    if (!team) return;
    const key = text(team.id || team.key || getTeamName(team));
    if (!key || map[key]) return;
    map[key] = Object.assign({}, team, { _sourceIndex: index });
  });
  return Object.keys(map).map((key) => map[key]);
}

function decorateTeam(team, index, matches) {
  const teamMatches = matches.filter((match) => resultFor(match, team));
  const wins = teamMatches.filter((match) => resultFor(match, team) === 'W').length;
  const losses = teamMatches.filter((match) => resultFor(match, team) === 'L').length;
  const recent = teamMatches.slice(0, 5).map((match, recentIndex) => {
    const result = resultFor(match, team);
    return { key: text(match.id || match.gameId || recentIndex), label: result, className: 'form-dot ' + result.toLowerCase() };
  });
  const active = team.enabled !== false && team.status !== 'disabled' && team.status !== 'draft';
  return {
    id: text(team.id || team.key || getTeamName(team)),
    name: getTeamName(team),
    logo: team.logoUrl || team.teamLogo || team.logo || FALLBACK_LOGOS[index % FALLBACK_LOGOS.length],
    matches: teamMatches.length,
    wins,
    losses,
    winRate: teamMatches.length ? (wins * 100 / teamMatches.length).toFixed(1) + '%' : '0.0%',
    recent,
    recentEmpty: recent.length === 0,
    active,
    isRecent: teamMatches.length > 0,
    cardClass: active ? 'team-card active' : 'team-card'
  };
}

Page({
  data: {
    assets: {
      background: `${ASSET_BASE}background-team-data-shared.png`,
      search: `${ASSET_BASE}icon-search.png`,
      team: `${ASSET_BASE}icon-team.png`,
      calendar: `${ASSET_BASE}icon-calendar.png`,
      flame: `${ASSET_BASE}icon-flame.png`,
      chevron: `${ASSET_BASE}icon-chevron-right.png`
    },
    summary: { teams: 0, matches: 0, running: 0 },
    teams: [],
    visibleTeams: [],
    keyword: '',
    activeFilter: 'all',
    filters: [],
    loading: true,
    empty: false
  },

  onShow() {
    if (wx.hideTabBar) wx.hideTabBar({ animation: false, fail: () => {} });
    this.loadData();
  },

  loadData() {
    const tournaments = readList('tournaments');
    const matches = enrichMatches(tournaments);
    const teams = uniqueTeams().map((team, index) => decorateTeam(team, index, matches));
    const running = tournaments.filter((item) => item.status === 'running').length;
    this.setData({
      summary: { teams: teams.length, matches: matches.length, running },
      teams,
      loading: false
    });
    this.applyFilter();
  },

  applyFilter() {
    const keyword = text(this.data.keyword).toLowerCase();
    const activeFilter = this.data.activeFilter;
    const visibleTeams = this.data.teams.filter((team) => {
      const keywordMatched = !keyword || team.name.toLowerCase().indexOf(keyword) >= 0;
      const filterMatched = activeFilter === 'all' || (activeFilter === 'active' && team.active) || (activeFilter === 'recent' && team.isRecent);
      return keywordMatched && filterMatched;
    });
    const filters = [
      { key: 'all', label: '全部' },
      { key: 'active', label: '活跃' },
      { key: 'recent', label: '最近参赛' }
    ].map((item) => Object.assign({}, item, { className: item.key === activeFilter ? 'filter-chip active' : 'filter-chip' }));
    this.setData({ visibleTeams, filters, empty: visibleTeams.length === 0 });
  },

  onKeywordInput(event) {
    this.setData({ keyword: event.detail.value }, () => this.applyFilter());
  },

  changeFilter(event) {
    this.setData({ activeFilter: event.currentTarget.dataset.key || 'all' }, () => this.applyFilter());
  },

  openTeam(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: '/pages/team-data-detail/index?teamId=' + encodeURIComponent(id) });
  }
});
