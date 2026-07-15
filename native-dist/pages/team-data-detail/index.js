const ASSET_BASE = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/pages/team-data/';
const TEAM_SELECTION_KEY = 'sx_team_data_selection';
const FALLBACK_TEAM = `${ASSET_BASE}logo-team-fengmang-u12.png`;
const FALLBACK_TOURNAMENTS = [`${ASSET_BASE}logo-tournament-summer-2026.png`, `${ASSET_BASE}logo-tournament-spring.png`];

function readList(key) { const value = wx.getStorageSync(key); return Array.isArray(value) ? value : []; }
function text(value) { return String(value === undefined || value === null ? '' : value).trim(); }
function same(a, b) { return !!text(a) && text(a) === text(b); }
function teamName(team) { return text(team && (team.label || team.name || team.teamName)) || '未命名球队'; }
function teamLogo(team) { return text(team && (team.logoUrl || team.teamLogo || team.logo || team.logoFileID || team.teamLogoFileID)); }
function usableTeamLogo(logo) {
  const value = text(logo);
  return value && value !== FALLBACK_TEAM && value.indexOf('logo-team-fengmang-u12.png') < 0;
}
function finished(item) { return !!item && (item.ended === true || item.status === 'finished' || item.status === 'ended'); }
function teamIds(team) { return [team && team.id, team && team.key, teamName(team)].map(text).filter(Boolean); }
function sideIds(item, side) {
  const team = item && item[side + 'Team'];
  return [item && item[side + 'TeamId'], item && item[side + 'TeamKey'], item && item[side + 'TeamName'], item && item[side + 'Name'], team && team.id, team && team.key, team && (team.name || team.label || team.teamName)].map(text).filter(Boolean);
}
function overlaps(left, right) { return left.some((value) => right.indexOf(value) >= 0); }
function getSide(item, team) {
  const ids = teamIds(team);
  if (overlaps(ids, sideIds(item, 'home'))) return 'home';
  if (overlaps(ids, sideIds(item, 'away'))) return 'away';
  return '';
}
function collectTeams() { return readList('teams').concat(readList('teamDrafts')).concat(readList('teamCategories')); }
function findTeam(id) {
  const teams = collectTeams();
  const groups = [
    teams.filter((team) => same(team.id, id)),
    teams.filter((team) => same(team.key, id)),
    teams.filter((team) => same(teamName(team), id))
  ];
  for (let index = 0; index < groups.length; index += 1) {
    if (groups[index].length) return groups[index].find((team) => teamLogo(team)) || groups[index][0];
  }
  return null;
}
function findByIdentity(ids) { return collectTeams().find((team) => overlaps(ids, teamIds(team))) || null; }
function matchTime(item) { return Number(item.updatedAt || item.createdAt || item.finishedAt || 0); }
function formatDate(value) {
  const date = new Date(Number(value) || 0);
  if (!Number(value) || Number.isNaN(date.getTime())) return '--';
  const pad = (part) => String(part).padStart(2, '0');
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}
function percent(value) { return Number(value || 0).toFixed(1); }

function enrichMatches(tournaments) {
  const gameMap = {};
  tournaments.forEach((tournament) => readList('games:' + tournament.id).forEach((game) => {
    gameMap[text(tournament.id) + ':' + text(game.id)] = game;
  }));
  return readList('sx_recent_matches').filter(finished).map((match) => {
    const game = gameMap[text(match.tournamentId) + ':' + text(match.gameId)] || {};
    return Object.assign({}, game, match, {
      homeTeamId: match.homeTeamId || game.homeTeamId,
      homeTeamKey: match.homeTeamKey || game.homeTeamKey,
      homeTeamName: match.homeTeamName || match.homeName || game.homeTeamName,
      awayTeamId: match.awayTeamId || game.awayTeamId,
      awayTeamKey: match.awayTeamKey || game.awayTeamKey,
      awayTeamName: match.awayTeamName || match.awayName || game.awayTeamName
    });
  }).sort((a, b) => matchTime(b) - matchTime(a));
}

function matchMeta(match, team, index) {
  const side = getSide(match, team);
  if (!side) return null;
  const opponentSide = side === 'home' ? 'away' : 'home';
  const ownScore = Number(match[side + 'Score']) || 0;
  const opponentScore = Number(match[opponentSide + 'Score']) || 0;
  const opponentIds = sideIds(match, opponentSide);
  const opponent = findByIdentity(opponentIds);
  const result = ownScore === opponentScore ? 'D' : (ownScore > opponentScore ? 'W' : 'L');
  const homeName = text(match.homeName || match.homeTeamName) || '主队';
  const awayName = text(match.awayName || match.awayTeamName) || '客队';
  const homeTeam = findByIdentity(sideIds(match, 'home'));
  const awayTeam = findByIdentity(sideIds(match, 'away'));
  return {
    key: text(match.id || match.gameId || index),
    tournamentId: text(match.tournamentId),
    date: formatDate(matchTime(match)),
    ownScore,
    opponentScore,
    score: ownScore + ':' + opponentScore,
    displayScore: (Number(match.homeScore) || 0) + ':' + (Number(match.awayScore) || 0),
    result,
    resultClass: 'result-badge ' + result.toLowerCase(),
    homeName,
    awayName,
    homeLogo: (homeTeam && (homeTeam.logoUrl || homeTeam.teamLogo || homeTeam.logo)) || FALLBACK_TEAM,
    awayLogo: (awayTeam && (awayTeam.logoUrl || awayTeam.teamLogo || awayTeam.logo)) || FALLBACK_TEAM,
    scoreClass: result === 'W' ? 'match-score win' : 'match-score'
  };
}

function buildTournamentCards(records, tournaments) {
  const grouped = {};
  records.forEach((record) => {
    const id = record.tournamentId;
    if (!id) return;
    if (!grouped[id]) grouped[id] = [];
    grouped[id].push(record);
  });
  return Object.keys(grouped).map((id, index) => {
    const tournament = tournaments.find((item) => same(item.id, id)) || {};
    const list = grouped[id];
    const wins = list.filter((item) => item.result === 'W').length;
    const losses = list.filter((item) => item.result === 'L').length;
    return {
      id,
      name: text(tournament.name) || '未命名赛事',
      logo: tournament.logoUrl || tournament.logo || FALLBACK_TOURNAMENTS[index % FALLBACK_TOURNAMENTS.length],
      recordText: list.length + '场  ' + wins + '胜' + losses + '负',
      scoreTags: list.slice(0, 3).map((item) => ({ key: item.key, score: item.score })),
      emptyScores: list.length === 0
    };
  });
}

Page({
  data: {
    assets: { background: `${ASSET_BASE}background-team-data-workbench-v2.png`, back: `${ASSET_BASE}icon-back.png`, chevron: `${ASSET_BASE}icon-chevron-right.png`, match: `${ASSET_BASE}icon-match.png`, trophy: `${ASSET_BASE}icon-trophy.png`, ranking: `${ASSET_BASE}icon-ranking.png`, shield: `${ASSET_BASE}icon-shield.png`, rate: `${ASSET_BASE}icon-win-rate.png`, hoop: `${ASSET_BASE}icon-basket-hoop.png`, trend: `${ASSET_BASE}icon-trend.png` },
    teamId: '', requestedTeamLogo: '', requestedTeamName: '', team: { name: '球队详情', logo: '', meta: '' },
    stats: { matches: 0, tournaments: 0, wins: 0, losses: 0, winRate: '0.0%', points: 0, averageFor: '0.0', averageAgainst: '0.0', difference: 0, differenceText: '0' },
    recentTrend: [], tournaments: [], recentMatches: [], activeTab: 'overview', overviewTabClass: 'tab active', tournamentTabClass: 'tab', overviewVisible: true, tournamentVisible: true, empty: false, trendEmpty: true, tournamentsEmpty: true, matchesEmpty: true
  },

  onLoad(options) {
    this.setData({
      teamId: decodeURIComponent(text(options && options.teamId)),
      requestedTeamLogo: decodeURIComponent(text(options && options.teamLogo)),
      requestedTeamName: decodeURIComponent(text(options && options.teamName))
    });
  },

  onShow() { this.loadData(); },

  loadData() {
    const team = findTeam(this.data.teamId);
    if (!team) {
      this.setData({ empty: true, team: { name: '未找到球队', logo: '', meta: '' } });
      return;
    }
    const tournaments = readList('tournaments');
    const selection = wx.getStorageSync(TEAM_SELECTION_KEY) || {};
    const selectedLogo = same(selection.id, this.data.teamId) ? text(selection.logo) : '';
    const selectedName = same(selection.id, this.data.teamId) ? text(selection.name) : '';
    const preferredLogo = [selectedLogo, this.data.requestedTeamLogo].find(usableTeamLogo) || '';
    const records = enrichMatches(tournaments).map((match, index) => matchMeta(match, team, index)).filter(Boolean);
    const displayName = selectedName || this.data.requestedTeamName || teamName(team);
    const recordLogo = records.map((record) => {
      if (same(record.homeName, displayName)) return record.homeLogo;
      if (same(record.awayName, displayName)) return record.awayLogo;
      return '';
    }).find(usableTeamLogo) || '';
    const storedLogo = teamLogo(team);
    const wins = records.filter((item) => item.result === 'W').length;
    const losses = records.filter((item) => item.result === 'L').length;
    const points = records.reduce((sum, item) => sum + item.ownScore, 0);
    const against = records.reduce((sum, item) => sum + item.opponentScore, 0);
    const tournamentCards = buildTournamentCards(records, tournaments);
    const trend = records.slice(0, 5).reverse();
    const difference = points - against;
    this.setData({
      empty: false,
      team: { name: displayName, logo: preferredLogo || recordLogo || (usableTeamLogo(storedLogo) ? storedLogo : ''), meta: [text(team.group || team.ageGroup || team.category), team.enabled === false ? '已停用' : '启用中'].filter(Boolean).join(' · ') },
      stats: { matches: records.length, tournaments: tournamentCards.length, wins, losses, winRate: records.length ? percent(wins * 100 / records.length) + '%' : '0.0%', points, averageFor: records.length ? percent(points / records.length) : '0.0', averageAgainst: records.length ? percent(against / records.length) : '0.0', difference, differenceText: difference > 0 ? '+' + difference : String(difference) },
      recentTrend: trend,
      tournaments: tournamentCards,
      recentMatches: records.slice(0, 5),
      trendEmpty: trend.length === 0,
      tournamentsEmpty: tournamentCards.length === 0,
      matchesEmpty: records.length === 0
    }, () => this.drawTrend());
  },

  drawTrend() {
    const points = this.data.recentTrend;
    const query = wx.createSelectorQuery().in(this);
    query.select('.trend-canvas').boundingClientRect((rect) => {
      if (!rect) return;
      const ctx = wx.createCanvasContext('teamTrend', this);
      const width = rect.width; const height = rect.height; const left = 34; const right = width - 12; const top = 14; const bottom = height - 24;
      ctx.setStrokeStyle('rgba(145,163,187,.22)'); ctx.setLineWidth(1);
      for (let i = 0; i < 5; i += 1) { const y = top + (bottom - top) * i / 4; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke(); }
      if (points.length) {
        const values = points.map((item) => item.ownScore); const max = Math.max(100, ...values, 1);
        ctx.setStrokeStyle('#ff710f'); ctx.setLineWidth(3); ctx.beginPath();
        points.forEach((item, index) => { const x = left + (right - left) * (points.length === 1 ? .5 : index / (points.length - 1)); const y = bottom - (bottom - top) * item.ownScore / max; if (index) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke();
        points.forEach((item, index) => { const x = left + (right - left) * (points.length === 1 ? .5 : index / (points.length - 1)); const y = bottom - (bottom - top) * item.ownScore / max; ctx.setFillStyle('#ffffff'); ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); ctx.setStrokeStyle('#ff710f'); ctx.setLineWidth(2); ctx.stroke(); });
      }
      ctx.draw();
    }).exec();
  },

  changeTab(event) {
    const tab = event.currentTarget.dataset.tab || 'overview';
    this.setData({ activeTab: tab, overviewTabClass: tab === 'overview' ? 'tab active' : 'tab', tournamentTabClass: tab === 'tournament' ? 'tab active' : 'tab', overviewVisible: tab === 'overview', tournamentVisible: true }, () => { if (tab === 'overview') this.drawTrend(); });
  },

  openTournament(event) {
    const tournamentId = event.currentTarget.dataset.id;
    if (!tournamentId) return;
    wx.navigateTo({ url: '/pages/tournament-team-data/index?teamId=' + encodeURIComponent(this.data.teamId) + '&tournamentId=' + encodeURIComponent(tournamentId) });
  },

  goBack() { wx.navigateBack({ delta: 1 }); }
});
