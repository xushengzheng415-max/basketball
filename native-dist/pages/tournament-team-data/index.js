const ASSET_BASE = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/pages/team-data/';
const FALLBACK_TEAM = `${ASSET_BASE}logo-team-fengmang-u12.png`;
const FALLBACK_TOURNAMENT = `${ASSET_BASE}logo-tournament-summer-2026.png`;

function readList(key) { const value = wx.getStorageSync(key); return Array.isArray(value) ? value : []; }
function text(value) { return String(value === undefined || value === null ? '' : value).trim(); }
function same(a, b) { return !!text(a) && text(a) === text(b); }
function finished(item) { return !!item && (item.ended === true || item.status === 'finished' || item.status === 'ended'); }
function nameOf(team) { return text(team && (team.label || team.name || team.teamName)) || '未命名球队'; }
function identities(team) { return [team && team.id, team && team.key, nameOf(team)].map(text).filter(Boolean); }
function sideIds(item, side) { const team = item && item[side + 'Team']; return [item && item[side + 'TeamId'], item && item[side + 'TeamKey'], item && item[side + 'TeamName'], item && item[side + 'Name'], team && team.id, team && team.key, team && (team.name || team.label || team.teamName)].map(text).filter(Boolean); }
function overlap(left, right) { return left.some((value) => right.indexOf(value) >= 0); }
function allTeams() { return readList('teams').concat(readList('teamDrafts')).concat(readList('teamCategories')); }
function findTeam(id) { return allTeams().find((team) => same(team.id, id) || same(team.key, id) || same(nameOf(team), id)) || null; }
function findByIds(ids) { return allTeams().find((team) => overlap(ids, identities(team))) || null; }
function sideFor(item, team) { if (overlap(identities(team), sideIds(item, 'home'))) return 'home'; if (overlap(identities(team), sideIds(item, 'away'))) return 'away'; return ''; }
function timestamp(item) { return Number(item.updatedAt || item.createdAt || item.finishedAt || 0); }
function dateText(value) { const date = new Date(Number(value) || 0); if (!Number(value) || Number.isNaN(date.getTime())) return '--'; const pad = (v) => String(v).padStart(2, '0'); return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()); }
function oneDecimal(value) { return Number(value || 0).toFixed(1); }

function tournamentMatches(tournamentId) {
  const games = readList('games:' + tournamentId); const gameMap = {};
  games.forEach((game) => { gameMap[text(game.id)] = game; });
  return readList('sx_recent_matches').filter((match) => same(match.tournamentId, tournamentId) && finished(match)).map((match) => {
    const game = gameMap[text(match.gameId)] || {};
    return Object.assign({}, game, match, {
      homeTeamId: match.homeTeamId || game.homeTeamId, homeTeamKey: match.homeTeamKey || game.homeTeamKey, homeTeamName: match.homeTeamName || match.homeName || game.homeTeamName,
      awayTeamId: match.awayTeamId || game.awayTeamId, awayTeamKey: match.awayTeamKey || game.awayTeamKey, awayTeamName: match.awayTeamName || match.awayName || game.awayTeamName
    });
  }).sort((a, b) => timestamp(a) - timestamp(b));
}

function logoFor(item, side) { const team = findByIds(sideIds(item, side)); return (team && (team.logoUrl || team.teamLogo || team.logo)) || FALLBACK_TEAM; }
function decorate(item, team, index) {
  const side = sideFor(item, team); if (!side) return null;
  const other = side === 'home' ? 'away' : 'home'; const own = Number(item[side + 'Score']) || 0; const against = Number(item[other + 'Score']) || 0;
  const result = own === against ? 'D' : (own > against ? 'W' : 'L');
  return {
    key: text(item.id || item.gameId || index), sequence: '第' + (index + 1) + '场', date: dateText(timestamp(item)), ownScore: own, opponentScore: against, score: own + ':' + against,
    result, resultClass: 'result-badge ' + result.toLowerCase(), scoreClass: result === 'W' ? 'game-score win' : 'game-score',
    homeName: text(item.homeName || item.homeTeamName) || '主队', awayName: text(item.awayName || item.awayTeamName) || '客队', homeLogo: logoFor(item, 'home'), awayLogo: logoFor(item, 'away')
  };
}

function rankFor(team, matches) {
  const table = {};
  function ensure(ids, fallback) { const found = findByIds(ids); const key = text(found && (found.id || found.key)) || text(ids[0] || fallback); if (!key) return null; if (!table[key]) table[key] = { key, name: found ? nameOf(found) : fallback, wins: 0, losses: 0, diff: 0, points: 0 }; return table[key]; }
  matches.forEach((match) => {
    const home = ensure(sideIds(match, 'home'), match.homeName || match.homeTeamName); const away = ensure(sideIds(match, 'away'), match.awayName || match.awayTeamName); if (!home || !away) return;
    const homeScore = Number(match.homeScore) || 0; const awayScore = Number(match.awayScore) || 0; home.points += homeScore; away.points += awayScore; home.diff += homeScore - awayScore; away.diff += awayScore - homeScore;
    if (homeScore > awayScore) { home.wins += 1; away.losses += 1; } else if (awayScore > homeScore) { away.wins += 1; home.losses += 1; }
  });
  const sorted = Object.keys(table).map((key) => table[key]).sort((a, b) => b.wins - a.wins || b.diff - a.diff || b.points - a.points);
  const index = sorted.findIndex((row) => same(row.key, team.id) || same(row.key, team.key) || same(row.name, nameOf(team)));
  return index >= 0 ? '第' + (index + 1) + '名' : '--';
}

function longestWinningStreak(records) { let best = 0; let current = 0; records.forEach((item) => { if (item.result === 'W') { current += 1; best = Math.max(best, current); } else current = 0; }); return best; }

Page({
  data: {
    assets: { background: `${ASSET_BASE}background-team-data-workbench-v2.png`, back: `${ASSET_BASE}icon-back.png`, match: `${ASSET_BASE}icon-match.png`, trophy: `${ASSET_BASE}icon-trophy.png`, shield: `${ASSET_BASE}icon-shield.png`, rate: `${ASSET_BASE}icon-win-rate.png`, ranking: `${ASSET_BASE}icon-ranking.png`, hoop: `${ASSET_BASE}icon-basket-hoop.png`, trend: `${ASSET_BASE}icon-trend.png`, star: `${ASSET_BASE}icon-star.png` },
    teamId: '', tournamentId: '', tournament: { name: '赛事球队数据', logo: FALLBACK_TOURNAMENT }, team: { name: '球队', logo: FALLBACK_TEAM },
    stats: { matches: 0, wins: 0, losses: 0, winRate: '0.0%', rank: '--', points: 0, averageFor: '0.0', averageAgainst: '0.0', differenceText: '0' },
    performance: { averageFor: '0.0', averageAgainst: '0.0', highest: 0, lowestAgainst: 0, streakText: '0场', attackStyle: 'width:0%', defenseStyle: 'width:0%' },
    records: [], trend: [], activeTab: 'overview', overviewTabClass: 'tab active', recordTabClass: 'tab', overviewVisible: true, empty: false, recordsEmpty: true
  },

  onLoad(options) { this.setData({ teamId: decodeURIComponent(text(options && options.teamId)), tournamentId: decodeURIComponent(text(options && options.tournamentId)) }); },
  onShow() { this.loadData(); },

  loadData() {
    const team = findTeam(this.data.teamId); const tournament = readList('tournaments').find((item) => same(item.id, this.data.tournamentId));
    if (!team || !tournament) { this.setData({ empty: true }); return; }
    const matches = tournamentMatches(this.data.tournamentId); const records = matches.map((item, index) => decorate(item, team, index)).filter(Boolean).map((item, index) => Object.assign({}, item, { sequence: '第' + (index + 1) + '场' }));
    const wins = records.filter((item) => item.result === 'W').length; const losses = records.filter((item) => item.result === 'L').length; const points = records.reduce((sum, item) => sum + item.ownScore, 0); const against = records.reduce((sum, item) => sum + item.opponentScore, 0); const difference = points - against;
    const highest = records.length ? Math.max(...records.map((item) => item.ownScore)) : 0; const lowestAgainst = records.length ? Math.min(...records.map((item) => item.opponentScore)) : 0;
    this.setData({
      empty: false, team: { name: nameOf(team), logo: team.logoUrl || team.teamLogo || team.logo || FALLBACK_TEAM }, tournament: { name: text(tournament.name) || '未命名赛事', logo: tournament.logoUrl || tournament.logo || FALLBACK_TOURNAMENT },
      stats: { matches: records.length, wins, losses, winRate: records.length ? oneDecimal(wins * 100 / records.length) + '%' : '0.0%', rank: rankFor(team, matches), points, averageFor: records.length ? oneDecimal(points / records.length) : '0.0', averageAgainst: records.length ? oneDecimal(against / records.length) : '0.0', differenceText: difference > 0 ? '+' + difference : String(difference) },
      performance: { averageFor: records.length ? oneDecimal(points / records.length) : '0.0', averageAgainst: records.length ? oneDecimal(against / records.length) : '0.0', highest, lowestAgainst, streakText: longestWinningStreak(records) + '场', attackStyle: 'width:' + Math.min(100, records.length ? points / records.length : 0) + '%', defenseStyle: 'width:' + Math.min(100, records.length ? against / records.length : 0) + '%' },
      records: records.slice().reverse(), trend: records, recordsEmpty: records.length === 0
    }, () => this.drawTrend());
  },

  drawTrend() {
    const points = this.data.trend; const query = wx.createSelectorQuery().in(this);
    query.select('.event-trend-canvas').boundingClientRect((rect) => {
      if (!rect) return; const ctx = wx.createCanvasContext('eventTrend', this); const width = rect.width; const height = rect.height; const left = 34; const right = width - 12; const top = 14; const bottom = height - 24;
      ctx.setStrokeStyle('rgba(145,163,187,.22)'); ctx.setLineWidth(1); for (let i = 0; i < 5; i += 1) { const y = top + (bottom - top) * i / 4; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke(); }
      if (points.length) { const max = Math.max(100, ...points.map((item) => item.ownScore), 1); ctx.setStrokeStyle('#ff710f'); ctx.setLineWidth(3); ctx.beginPath(); points.forEach((item, index) => { const x = left + (right - left) * (points.length === 1 ? .5 : index / (points.length - 1)); const y = bottom - (bottom - top) * item.ownScore / max; if (index) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); points.forEach((item, index) => { const x = left + (right - left) * (points.length === 1 ? .5 : index / (points.length - 1)); const y = bottom - (bottom - top) * item.ownScore / max; ctx.setFillStyle('#fff'); ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); ctx.setStrokeStyle('#ff710f'); ctx.setLineWidth(2); ctx.stroke(); }); }
      ctx.draw();
    }).exec();
  },

  changeTab(event) { const tab = event.currentTarget.dataset.tab || 'overview'; this.setData({ activeTab: tab, overviewTabClass: tab === 'overview' ? 'tab active' : 'tab', recordTabClass: tab === 'records' ? 'tab active' : 'tab', overviewVisible: tab === 'overview' }, () => { if (tab === 'overview') this.drawTrend(); }); },
  goBack() { wx.navigateBack({ delta: 1 }); }
});
