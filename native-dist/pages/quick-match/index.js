const { cloudAsset } = require('../../utils/assets');

const ASSET_BASE = 'pages/quick-match/';
const LINEUP_KEY = 'quickMatchLineups';
const ACTIVE_KEY = 'quickMatchActiveConfig';
const HOME_COLORS = [
  { key: 'orange', value: '#ff5a0a', activeClass: '' },
  { key: 'red', value: '#f33a31', activeClass: '' },
  { key: 'yellow', value: '#ffc20a', activeClass: '' },
  { key: 'green', value: '#31bf62', activeClass: '' },
  { key: 'blue', value: '#228be6', activeClass: '' },
  { key: 'purple', value: '#6848e8', activeClass: '' }
];
const AWAY_COLORS = [
  { key: 'black', value: '#111111', activeClass: '' },
  { key: 'red', value: '#f33a31', activeClass: '' },
  { key: 'yellow', value: '#ffc20a', activeClass: '' },
  { key: 'green', value: '#31bf62', activeClass: '' },
  { key: 'blue', value: '#228be6', activeClass: '' },
  { key: 'purple', value: '#6848e8', activeClass: '' }
];
const DEFAULT_PLAYERS = {
  home: [
    { id: 'home-1', number: 23, name: '林浩' },
    { id: 'home-2', number: 7, name: '张子轩' },
    { id: 'home-3', number: 11, name: '李奥然' }
  ],
  away: [
    { id: 'away-1', number: 7, name: '王子轩' },
    { id: 'away-2', number: 11, name: '李奥然' },
    { id: 'away-3', number: 9, name: '陈子睿' }
  ]
};
const STAT_ITEMS = [
  { key: 'score', label: '得分', enabled: true, activeClass: 'active' },
  { key: 'rebound', label: '篮板', enabled: true, activeClass: 'active' },
  { key: 'assist', label: '助攻', enabled: true, activeClass: 'active' },
  { key: 'steal', label: '抢断', enabled: true, activeClass: 'active' },
  { key: 'block', label: '盖帽', enabled: true, activeClass: 'active' },
  { key: 'turnover', label: '失误', enabled: true, activeClass: 'active' }
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function todayText() {
  const date = new Date();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function buildColors(selected, side) {
  const source = side === 'away' ? AWAY_COLORS : HOME_COLORS;
  return source.map((item) => Object.assign({}, item, { activeClass: item.key === selected ? 'active' : '' }));
}

function normalizePlayers(players) {
  return players.map((item, index) => ({
    id: item.id || ('player-' + Date.now() + '-' + index),
    number: Math.max(0, Math.min(99, Number(item.number) || index + 1)),
    name: item.name || '临时球员'
  }));
}

function getColorTeamName(color) {
  const names = {
    black: '黑队',
    orange: '橙队',
    red: '红队',
    yellow: '黄队',
    green: '绿队',
    blue: '蓝队',
    purple: '紫队'
  };
  return names[color] || '临时队';
}

function isDefaultColorTeamName(name) {
  return ['黑队', '橙队', '红队', '黄队', '绿队', '蓝队', '紫队', '临时队'].indexOf(String(name || '').trim()) >= 0;
}

function normalizeTeam(team, fallback) {
  const next = Object.assign({}, fallback, team || {});
  const name = String(next.name || '').trim();
  next.name = !name || name.indexOf('?') >= 0 ? getColorTeamName(next.color) : name;
  return next;
}

function formatLineupTime(value) {
  const date = new Date(value || Date.now());
  return pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
}

Page({
  data: {
    assets: {
      bg: cloudAsset(`${ASSET_BASE}background-quick-match-clean.jpg`),
      back: cloudAsset(`${ASSET_BASE}icon-back-common-ffffff-256.png`),
      info: cloudAsset(`${ASSET_BASE}icon-info-common-ff5a0a-256.png`),
      close: cloudAsset(`${ASSET_BASE}icon-close-circle-common-aeb3ba-256.png`),
      calendar: cloudAsset(`${ASSET_BASE}icon-calendar-common-4e5560-256.png`),
      location: cloudAsset(`${ASSET_BASE}icon-location-common-4e5560-256.png`),
      chevron: cloudAsset(`${ASSET_BASE}icon-chevron-right-common-4e5560-256.png`),
      minus: cloudAsset(`${ASSET_BASE}icon-minus-common-4e5560-256.png`),
      plus: cloudAsset(`${ASSET_BASE}icon-plus-common-4e5560-256.png`),
      trash: cloudAsset(`${ASSET_BASE}icon-trash-common-4e5560-256.png`),
      check: cloudAsset(`${ASSET_BASE}icon-check-common-ffffff-256.png`)
    },
    matchName: '试听课对抗赛',
    matchDate: '2026-05-10',
    matchTime: '10:00',
    venue: '蜂巢篮球馆 1号场',
    periods: 4,
    periodMinutes: 10,
    homeTeam: { name: '橙队', color: 'orange', colorValue: '#ff5a0a' },
    awayTeam: { name: '黑队', color: 'black', colorValue: '#111111' },
    homeColors: [],
    awayColors: [],
    activeTeam: 'home',
    homeTabClass: 'active',
    awayTabClass: '',
    visiblePlayers: [],
    homePlayers: [],
    awayPlayers: [],
    statItems: [],
    venues: ['蜂巢篮球馆 1号场', '蜂巢篮球馆 2号场', '西湖校区主馆'],
    venueIndex: 0,
    showLineupModal: false,
    lineupList: [],
    isLineupEmpty: true
  },

  onLoad() {
    this.setData({
      matchDate: todayText(),
      homeColors: buildColors('orange', 'home'),
      awayColors: buildColors('black', 'away'),
      homePlayers: clone(DEFAULT_PLAYERS.home),
      awayPlayers: clone(DEFAULT_PLAYERS.away),
      statItems: clone(STAT_ITEMS)
    }, () => this.refreshPlayers());
  },

  onShow() {
    if (wx.hideTabBar) wx.hideTabBar({ animation: false, fail: () => {} });
  },

  restoreLineup(lineup) {
    const homeTeam = normalizeTeam(lineup.homeTeam, this.data.homeTeam);
    const awayTeam = normalizeTeam(lineup.awayTeam, this.data.awayTeam);
    this.setData({
      homeTeam,
      awayTeam,
      homeColors: buildColors(homeTeam.color, 'home'),
      awayColors: buildColors(awayTeam.color, 'away'),
      homePlayers: normalizePlayers(lineup.homePlayers || DEFAULT_PLAYERS.home),
      awayPlayers: normalizePlayers(lineup.awayPlayers || DEFAULT_PLAYERS.away)
    }, () => this.refreshPlayers());
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
      return;
    }
    wx.redirectTo({ url: '/pages/home/index' });
  },

  onMatchNameInput(event) { this.setData({ matchName: event.detail.value }); },
  onHomeNameInput(event) { this.updateTeamName('home', event.detail.value); },
  onAwayNameInput(event) { this.updateTeamName('away', event.detail.value); },
  clearMatchName() { this.setData({ matchName: '' }); },
  clearHomeName() { this.resetTeamName('home'); },
  clearAwayName() { this.resetTeamName('away'); },

  onDateChange(event) { this.setData({ matchDate: event.detail.value }); },
  onTimeChange(event) { this.setData({ matchTime: event.detail.value }); },
  onVenueChange(event) {
    const index = Number(event.detail.value) || 0;
    this.setData({ venueIndex: index, venue: this.data.venues[index] || this.data.venue });
  },

  changePeriods(event) { this.adjustNumber('periods', Number(event.currentTarget.dataset.delta)); },
  changePeriodMinutes(event) { this.adjustNumber('periodMinutes', Number(event.currentTarget.dataset.delta)); },

  adjustNumber(key, delta) {
    const min = key === 'periods' ? 1 : 1;
    const max = key === 'periods' ? 8 : 30;
    const value = Math.max(min, Math.min(max, Number(this.data[key]) + delta));
    this.setData({ [key]: value });
  },

  updateTeamName(side, value) {
    const key = side === 'home' ? 'homeTeam' : 'awayTeam';
    const team = Object.assign({}, this.data[key], { name: value });
    this.setData({ [key]: team });
  },

  resetTeamName(side) {
    const key = side === 'home' ? 'homeTeam' : 'awayTeam';
    const team = Object.assign({}, this.data[key]);
    team.name = getColorTeamName(team.color);
    this.setData({ [key]: team });
  },

  selectColor(event) {
    const side = event.currentTarget.dataset.side;
    const color = event.currentTarget.dataset.color;
    const value = event.currentTarget.dataset.value;
    const teamKey = side === 'home' ? 'homeTeam' : 'awayTeam';
    const colorsKey = side === 'home' ? 'homeColors' : 'awayColors';
    const currentTeam = this.data[teamKey];
    const shouldUseColorName = !String(currentTeam.name || '').trim() || isDefaultColorTeamName(currentTeam.name);
    const team = Object.assign({}, currentTeam, {
      color,
      colorValue: value,
      name: shouldUseColorName ? getColorTeamName(color) : currentTeam.name
    });
    this.setData({ [teamKey]: team, [colorsKey]: buildColors(color, side) });
  },

  switchTeam(event) {
    const activeTeam = event.currentTarget.dataset.team || 'home';
    this.setData({
      activeTeam,
      homeTabClass: activeTeam === 'home' ? 'active' : '',
      awayTabClass: activeTeam === 'away' ? 'active' : ''
    }, () => this.refreshPlayers());
  },

  refreshPlayers() {
    const visiblePlayers = this.data.activeTeam === 'home' ? this.data.homePlayers : this.data.awayPlayers;
    this.setData({ visiblePlayers });
  },

  onPlayerNameInput(event) {
    const id = event.currentTarget.dataset.id;
    const value = event.detail.value;
    this.updatePlayer(id, { name: value });
  },

  changePlayerNumber(event) {
    const id = event.currentTarget.dataset.id;
    const delta = Number(event.currentTarget.dataset.delta);
    const current = this.getPlayers().find((item) => item.id === id);
    if (!current) return;
    this.updatePlayer(id, { number: Math.max(0, Math.min(99, Number(current.number) + delta)) });
  },

  getPlayers() {
    return this.data.activeTeam === 'home' ? this.data.homePlayers : this.data.awayPlayers;
  },

  setPlayers(players) {
    const key = this.data.activeTeam === 'home' ? 'homePlayers' : 'awayPlayers';
    this.setData({ [key]: players }, () => this.refreshPlayers());
  },

  updatePlayer(id, patch) {
    const players = this.getPlayers().map((item) => item.id === id ? Object.assign({}, item, patch) : item);
    this.setPlayers(players);
  },

  addPlayer() {
    const side = this.data.activeTeam;
    const players = this.getPlayers();
    const nextNumber = players.length ? Math.max.apply(null, players.map((item) => Number(item.number) || 0)) + 1 : 1;
    this.setPlayers(players.concat([{ id: `${side}-${Date.now()}`, number: Math.min(nextNumber, 99), name: '临时球员' }]));
  },

  deletePlayer(event) {
    const id = event.currentTarget.dataset.id;
    this.setPlayers(this.getPlayers().filter((item) => item.id !== id));
  },

  toggleStat(event) {
    const key = event.currentTarget.dataset.key;
    const statItems = this.data.statItems.map((item) => {
      if (item.key !== key) return item;
      const enabled = !item.enabled;
      return Object.assign({}, item, { enabled, activeClass: enabled ? 'active' : '' });
    });
    this.setData({ statItems });
  },

  buildConfig() {
    return {
      mode: 'quick',
      matchName: this.data.matchName.trim() || '快捷比赛',
      matchDate: this.data.matchDate,
      matchTime: this.data.matchTime,
      venue: this.data.venue,
      periods: this.data.periods,
      periodMinutes: this.data.periodMinutes,
      homeTeam: Object.assign({}, this.data.homeTeam, { name: this.data.homeTeam.name.trim() || 'A队' }),
      awayTeam: Object.assign({}, this.data.awayTeam, { name: this.data.awayTeam.name.trim() || 'B队' }),
      homePlayers: normalizePlayers(this.data.homePlayers),
      awayPlayers: normalizePlayers(this.data.awayPlayers),
      statItems: this.data.statItems,
      createdAt: Date.now()
    };
  },

  readLineups() {
    const value = wx.getStorageSync(LINEUP_KEY) || [];
    return Array.isArray(value) ? value : [];
  },

  formatLineupList(lineups) {
    return lineups.map((item) => {
      const homeTeam = normalizeTeam(item.homeTeam, this.data.homeTeam);
      const awayTeam = normalizeTeam(item.awayTeam, this.data.awayTeam);
      const playerCount = (item.homePlayers || []).length + (item.awayPlayers || []).length;
      return Object.assign({}, item, {
        title: homeTeam.name + ' vs ' + awayTeam.name,
        meta: playerCount + ' 名球员 · ' + formatLineupTime(item.createdAt)
      });
    });
  },

  refreshLineupList(lineups) {
    const lineupList = this.formatLineupList(lineups || this.readLineups());
    this.setData({ lineupList, isLineupEmpty: lineupList.length === 0 });
  },

  buildLineupPayload() {
    const homePlayers = normalizePlayers(this.data.homePlayers);
    const awayPlayers = normalizePlayers(this.data.awayPlayers);
    const createdAt = Date.now();
    return {
      id: 'lineup-' + createdAt,
      title: (this.data.homeTeam.name || 'A队') + ' vs ' + (this.data.awayTeam.name || 'B队'),
      meta: (homePlayers.length + awayPlayers.length) + ' 名球员 · ' + formatLineupTime(createdAt),
      createdAt,
      homeTeam: Object.assign({}, this.data.homeTeam),
      awayTeam: Object.assign({}, this.data.awayTeam),
      homePlayers,
      awayPlayers
    };
  },

  saveLineup() {
    const next = [this.buildLineupPayload()].concat(this.readLineups()).slice(0, 12);
    wx.setStorageSync(LINEUP_KEY, next);
    wx.showToast({ title: '阵容已保存', icon: 'success' });
  },

  openLineupPicker() {
    const lineupList = this.formatLineupList(this.readLineups());
    this.setData({ showLineupModal: true, lineupList, isLineupEmpty: lineupList.length === 0 });
  },

  closeLineupPicker() {
    this.setData({ showLineupModal: false });
  },

  importLineup(event) {
    const id = event.currentTarget.dataset.id;
    const lineup = this.readLineups().find((item) => item.id === id);
    if (!lineup) {
      wx.showToast({ title: '阵容不存在', icon: 'none' });
      return;
    }
    this.restoreLineup(lineup);
    this.closeLineupPicker();
    wx.showToast({ title: '阵容已导入', icon: 'success' });
  },

  deleteLineup(event) {
    const id = event.currentTarget.dataset.id;
    const removeLineup = () => {
      const next = this.readLineups().filter((item) => item.id !== id);
      wx.setStorageSync(LINEUP_KEY, next);
      this.refreshLineupList(next);
      wx.showToast({ title: '已删除', icon: 'success' });
    };

    if (wx.showModal) {
      wx.showModal({
        title: '删除阵容',
        content: '确定删除这条临时阵容吗？',
        cancelText: '取消',
        confirmText: '删除',
        confirmColor: '#ff5a0a',
        success: (res) => {
          if (res.confirm) removeLineup();
        }
      });
      return;
    }

    removeLineup();
  },

  noop() {},

  startQuickScoring() {
    const config = this.buildConfig();
    wx.setStorageSync(ACTIVE_KEY, config);
    wx.navigateTo({ url: '/pages/scorer/index?mode=quick' });
  }
});
