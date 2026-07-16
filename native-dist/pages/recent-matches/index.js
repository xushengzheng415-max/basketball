const RECENT_MATCHES_KEY = 'sx_recent_matches';
const TEAM_LOGO_BASE = '/assets/pages/scorer-v2/teams/';
const STATUS_ICON_BASE = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/pages/recent-matches/';
const { pullRoster, resolveImageUrl } = require('../../utils/roster-sync');

function normalizeText(value) {
  return String(value || '').trim();
}

function getLogoSource(item) {
  if (!item) return '';
  return resolveImageUrl(item.logoUrl, item.logoFileID, item.teamLogo, item.teamLogoFileID, item.logo);
}

function addTeamLogo(map, team) {
  const logo = resolveImageUrl(getLogoSource(team));
  if (!team || !logo) return;
  [team.id, team.key, team.label, team.name, team.teamName].forEach((identity) => {
    const key = normalizeText(identity);
    if (key) map[key] = logo;
  });
}

function buildTeamLogoMap() {
  const map = {};
  ['teams', 'teamDrafts', 'teamCategories'].forEach((storageKey) => {
    const teams = wx.getStorageSync(storageKey);
    (Array.isArray(teams) ? teams : []).forEach((team) => addTeamLogo(map, team));
  });
  return map;
}

function getRecentTeamLogo(item, side, teamLogoMap) {
  const team = item && item[side + 'Team'];
  const directLogo = item && (item[side + 'Logo'] || item[side + 'LogoUrl'] || getLogoSource(team));
  const identities = item ? [
    item[side + 'TeamId'],
    item[side + 'TeamKey'],
    team && team.id,
    team && team.key,
    item[side + 'Name'],
    team && (team.label || team.name || team.teamName)
  ] : [];
  const storedLogo = identities.map((identity) => teamLogoMap[normalizeText(identity)]).find(Boolean);
  return resolveImageUrl(storedLogo, directLogo) || TEAM_LOGO_BASE + (side === 'home' ? 'team-logo-left.png' : 'team-logo-right.png');
}

function getMatchTimestamp(item) {
  return Number(item && (item.updatedAt || item.endedAt || item.createdAt)) || 0;
}

function isFinishedMatch(item) {
  return !!(item && (item.ended === true || item.status === 'finished'));
}

function formatMatchTime(timestamp) {
  const date = new Date(Number(timestamp) || Date.now());
  const pad = (value) => String(value).padStart(2, '0');
  return pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
}

function decorateMatch(item, teamLogoMap) {
  const ended = isFinishedMatch(item);
  return Object.assign({}, item, {
    homeName: item.homeName || '主队',
    awayName: item.awayName || '客队',
    homeLogo: getRecentTeamLogo(item, 'home', teamLogoMap),
    awayLogo: getRecentTeamLogo(item, 'away', teamLogoMap),
    homeScore: Number(item.homeScore || 0),
    awayScore: Number(item.awayScore || 0),
    time: formatMatchTime(getMatchTimestamp(item)),
    venue: item.matchName || '快捷比赛',
    statusText: ended ? '已结束' : '未结束',
    statusIcon: STATUS_ICON_BASE + (ended ? 'status-finished.png' : 'status-unfinished.png')
  });
}

function normalizeFilter(filter) {
  return ['all', 'pending', 'finished'].includes(filter) ? filter : 'all';
}

function getFilterView(filter) {
  const activeFilter = normalizeFilter(filter);
  const titles = { all: '全部比赛', pending: '未结束比赛', finished: '已完成比赛' };
  return {
    activeFilter,
    pageTitle: titles[activeFilter],
    allFilterClass: activeFilter === 'all' ? 'active' : '',
    pendingFilterClass: activeFilter === 'pending' ? 'active' : '',
    finishedFilterClass: activeFilter === 'finished' ? 'active' : ''
  };
}

Page({
  data: {
    matches: [],
    hasMatches: false,
    totalCount: 0,
    finishedCount: 0,
    activeCount: 0,
    activeFilter: 'all',
    pageTitle: '全部比赛',
    allFilterClass: 'active',
    pendingFilterClass: '',
    finishedFilterClass: ''
  },

  onLoad(options) {
    const filterView = getFilterView(options && options.filter);
    this.setData(filterView);
    wx.setNavigationBarTitle({ title: filterView.pageTitle });
  },

  onShow() {
    this.loadMatches();
    const app = typeof getApp === 'function' ? getApp() : null;
    const rosterReady = app && app.globalData && app.globalData.rosterReady;
    Promise.resolve(rosterReady)
      .then((result) => result || pullRoster())
      .then(() => this.loadMatches())
      .catch((error) => console.warn('[recent-matches] pull roster failed', error));
  },

  onPullDownRefresh() {
    Promise.resolve(pullRoster())
      .catch((error) => console.warn('[recent-matches] refresh roster failed', error))
      .then(() => this.loadMatches())
      .finally(() => wx.stopPullDownRefresh());
  },

  loadMatches() {
    const stored = wx.getStorageSync(RECENT_MATCHES_KEY);
    const allMatches = (Array.isArray(stored) ? stored : [])
      .slice()
      .sort((left, right) => getMatchTimestamp(right) - getMatchTimestamp(left));
    const teamLogoMap = buildTeamLogoMap();
    const decoratedMatches = allMatches.map((item) => decorateMatch(item, teamLogoMap));
    const finishedCount = allMatches.filter(isFinishedMatch).length;
    const matches = decoratedMatches.filter((item) => {
      if (this.data.activeFilter === 'finished') return isFinishedMatch(item);
      if (this.data.activeFilter === 'pending') return !isFinishedMatch(item);
      return true;
    });
    this.setData({
      matches,
      hasMatches: matches.length > 0,
      totalCount: allMatches.length,
      finishedCount,
      activeCount: allMatches.length - finishedCount
    });
  },

  changeFilter(event) {
    const filterView = getFilterView(event.currentTarget.dataset.filter);
    this.setData(filterView, () => this.loadMatches());
    wx.setNavigationBarTitle({ title: filterView.pageTitle });
  },

  openMatch(event) {
    const id = event.currentTarget.dataset.id;
    const match = this.data.matches.find((item) => String(item.id) === String(id));
    if (!match) return;
    if (!isFinishedMatch(match)) {
      wx.navigateTo({ url: '/pages/scorer-board/index?boardOnly=1&resumeId=' + encodeURIComponent(match.id) });
      return;
    }
    const hasReport = match.reportRequested === true || match.reportLocked === true || !!match.reportNo || !!match.pdfFileID;
    if (hasReport) {
      wx.navigateTo({ url: '/pages/referee-report/index?recordId=' + encodeURIComponent(match.id) });
      return;
    }
    if (match.tournamentId && match.gameId) {
      wx.navigateTo({ url: '/pages/game-detail/index?tournamentId=' + encodeURIComponent(match.tournamentId) + '&gameId=' + encodeURIComponent(match.gameId) });
      return;
    }
    wx.navigateTo({ url: '/pages/referee-report/index?recordId=' + encodeURIComponent(match.id) + '&viewOnly=1' });
  },

  deleteMatch(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    wx.showModal({
      title: '删除比分',
      content: '确定删除这条最近对阵比分吗？',
      confirmText: '删除',
      confirmColor: '#ff4b00',
      success: (result) => {
        if (!result.confirm) return;
        const stored = wx.getStorageSync(RECENT_MATCHES_KEY);
        const matches = Array.isArray(stored) ? stored : [];
        wx.setStorageSync(RECENT_MATCHES_KEY, matches.filter((item) => String(item.id) !== String(id)));
        this.loadMatches();
        wx.showToast({ title: '已删除', icon: 'success' });
      }
    });
  }
});
