const mainRoutes = {
  home: '/pages/home/index',
  tournament: '/pages/tournament/index',
  team: '/pages/team/index',
  education: '/pages/education/index',
  data: '/pages/data/index',
  mine: '/pages/mine/index'
};

const RECENT_MATCHES_KEY = 'sx_recent_matches';
const TEAM_LOGO_BASE = '/assets/pages/scorer-v2/teams/';
const STATUS_ICON_BASE = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/pages/recent-matches/';
const { pullRoster, resolveImageUrl } = require('../../utils/roster-sync');

function hasPhoneLogin() {
  const profile = wx.getStorageSync('loginProfile') || wx.getStorageSync('userProfile') || null;
  return !!(profile && profile.loggedIn && profile.mode !== 'guest' && profile.phoneNumber);
}

function getLoginUrl(redirectPath) {
  const redirect = redirectPath ? '?redirect=' + encodeURIComponent(redirectPath) : '';
  return '/pages/login/index' + redirect;
}

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
  const identities = [team.id, team.key, team.label, team.name, team.teamName];
  identities.forEach((identity) => {
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

function formatRecentMatchTime(timestamp) {
  const date = new Date(Number(timestamp) || Date.now());
  const pad = (value) => String(value).padStart(2, '0');
  return pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
}

function getMatchTimestamp(item) {
  return Number(item && (item.updatedAt || item.endedAt || item.createdAt)) || 0;
}

function isFinishedMatch(item) {
  return !!(item && (item.ended === true || item.status === 'finished'));
}

function decorateRecentMatch(item, teamLogoMap) {
  const ended = isFinishedMatch(item);
  return Object.assign({}, item, {
    homeName: item.homeName || '\u4e3b\u961f',
    awayName: item.awayName || '\u5ba2\u961f',
    homeLogo: getRecentTeamLogo(item, 'home', teamLogoMap),
    awayLogo: getRecentTeamLogo(item, 'away', teamLogoMap),
    homeScore: Number(item.homeScore || 0),
    awayScore: Number(item.awayScore || 0),
    time: formatRecentMatchTime(getMatchTimestamp(item)),
    venue: item.matchName || '\u5feb\u6377\u6bd4\u8d5b',
    statusText: ended ? '\u5df2\u7ed3\u675f' : '\u672a\u7ed3\u675f',
    statusIcon: STATUS_ICON_BASE + (ended ? 'status-finished.png' : 'status-unfinished.png')
  });
}

Page({
  data: {
    showLoginGuide: true,
    currentRole: '校区管理员',
    todayStats: {
      total: 0,
      pending: 0,
      finished: 0
    },
    hasRecentMatches: false,
    recentMatches: [],
    tabItems: [
      { key: 'home', text: '工作台', iconClass: 'home', icon: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/tabbar/tab-home-selected.png', activeClass: 'active' },
      { key: 'tournament', text: '赛事', iconClass: 'trophy', icon: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/tabbar/tab-tournament.png', activeClass: '' },
      { key: 'team', text: '球员', iconClass: 'user', icon: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/tabbar/tab-team.png', activeClass: '' },
      { key: 'education', text: '教务', iconClass: 'edu', icon: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/tabbar/tab-education.png', activeClass: '' },
      { key: 'data', text: '数据', iconClass: 'data', icon: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/tabbar/tab-data.png', activeClass: '' },
      { key: 'mine', text: '我的', iconClass: 'mine', icon: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/tabbar/tab-mine.png', activeClass: '' }
    ]
  },

  onShareAppMessage() {
    return {
      title: '赛小蜂篮球｜赛事、计分、教务一体化管理',
      path: '/pages/home/index',
      imageUrl: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/home/share-card-5x4-v2.png'
    };
  },

  onShareTimeline() {
    return {
      title: '赛小蜂篮球｜赛事、计分、教务一体化管理',
      imageUrl: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/home/share-logo-20260715.png'
    };
  },

  onShow() {
    this.refreshLoginState();
    this.loadRecentMatches();
    const app = typeof getApp === 'function' ? getApp() : null;
    const rosterReady = app && app.globalData && app.globalData.rosterReady;
    Promise.resolve(rosterReady)
      .then((result) => result || pullRoster())
      .then(() => this.loadRecentMatches())
      .catch((error) => console.warn('[home] pull roster failed', error));
  },

  refreshLoginState() {
    this.setData({ showLoginGuide: !hasPhoneLogin() });
  },

  goLogin() {
    wx.navigateTo({ url: getLoginUrl('') });
  },

  requirePhoneLogin(redirectPath, content) {
    if (hasPhoneLogin()) return true;
    wx.showModal({
      title: '登录后云端保存',
      content: content || '登录后可保存并同步赛事、球队和比赛数据。',
      confirmText: '去登录',
      cancelText: '先浏览',
      confirmColor: '#ff5a00',
      success: (result) => {
        if (result.confirm) wx.navigateTo({ url: getLoginUrl(redirectPath) });
      }
    });
    return false;
  },

  loadRecentMatches() {
    const stored = wx.getStorageSync(RECENT_MATCHES_KEY);
    const allMatches = (Array.isArray(stored) ? stored : []).slice().sort((left, right) => getMatchTimestamp(right) - getMatchTimestamp(left));
    const teamLogoMap = buildTeamLogoMap();
    const recentMatches = allMatches.slice(0, 5).map((item) => decorateRecentMatch(item, teamLogoMap));
    const finished = allMatches.filter(isFinishedMatch).length;
    this.setData({
      recentMatches,
      hasRecentMatches: recentMatches.length > 0,
      todayStats: { total: allMatches.length, pending: allMatches.length - finished, finished }
    });
  },

  openCampusRole() {
    wx.showActionSheet({
      itemList: ['校区负责人', '教练'],
      success: (res) => {
        const roles = ['校区负责人', '教练'];
        this.setData({ currentRole: roles[res.tapIndex] || '校区管理员' });
      }
    });
  },

  goQuickMatch() {
    const url = '/pages/scorer/index?from=homeHero';
    if (!this.requirePhoneLogin(url, '登录后才能云端保存比赛设置、计分过程和赛后记录。')) return;
    wx.navigateTo({ url });
  },

  goMatchDetail(event) {
    const id = event.currentTarget.dataset.id;
    const match = this.data.recentMatches.find((item) => String(item.id) === String(id));
    if (!match) return;
    if (match.ended !== true && match.status !== 'finished') {
      wx.navigateTo({ url: '/pages/scorer-board/index?boardOnly=1&resumeId=' + encodeURIComponent(match.id) });
      return;
    }
    const hasReport = match.reportRequested === true || match.reportLocked === true || !!match.reportNo || !!match.pdfFileID;
    if (hasReport) {
      wx.navigateTo({ url: '/pages/referee-report/index?recordId=' + encodeURIComponent(match.id) });
      return;
    }
    if (match.tournamentId && match.gameId) {
      wx.navigateTo({ url: `/pages/game-detail/index?tournamentId=${match.tournamentId}&gameId=${match.gameId}` });
      return;
    }
    wx.navigateTo({ url: '/pages/referee-report/index?recordId=' + encodeURIComponent(match.id) + '&viewOnly=1' });
  },

  deleteRecentMatch(event) {
    if (!this.requirePhoneLogin('', '删除比分记录前请先登录，避免误操作或数据归属不清。')) return;
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    wx.showModal({
      title: '删除比分',
      content: '确定删除这条最近对阵比分吗？',
      confirmText: '删除',
      confirmColor: '#ff4b00',
      success: (res) => {
        if (!res.confirm) return;
        const stored = wx.getStorageSync(RECENT_MATCHES_KEY);
        const matches = Array.isArray(stored) ? stored : [];
        const nextMatches = matches.filter((item) => String(item.id) !== String(id));
        wx.setStorageSync(RECENT_MATCHES_KEY, nextMatches);
        this.loadRecentMatches();
        wx.showToast({ title: '已删除', icon: 'success' });
      }
    });
  },

  goMoreMatches() {
    wx.navigateTo({ url: '/pages/recent-matches/index' });
  },

  onTabTap(event) {
    const key = event.currentTarget.dataset.key;
    const url = mainRoutes[key];
    if (!url || key === 'home') return;
    wx.redirectTo({ url });
  }
});



