const { callCloud } = require('../../utils/cloud');

const BG = '/assets/pages/scorer-v2/background/scoreboard-court.png';
const SETUP_BG = '/pages/scorer/setup-court.png';
const TEAM_ASSET = '/assets/pages/scorer-v2/teams/';
const ICON_ASSET = '/assets/pages/scorer-v2/icons/';
const AUDIO_SETTINGS_KEY = 'sx_mc_audio_settings';
const CLOUD_AUDIO_MAP_KEY = 'sx_mc_audio_map';
const CLOUD_AUDIO_ITEMS_KEY = 'sx_mc_audio_items';
const VOICE_STYLE_KEY = 'sx_score_voice_style';
const DEFAULT_AUDIO_SETTINGS = {
  masterEnabled: true,
  volume: 70,
  twoEnabled: true,
  threeEnabled: true,
  buzzerEnabled: true,
  pauseAutoEnabled: true,
  categoryEnabled: { attack: true, defense: true, pause: true },
  modes: { attack: 'fixed', defense: 'fixed', pause: 'random' },
  selectedAudio: {}
};
const AUDIO_FILE_IDS = {
  attack: [
    'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/进攻防守音乐/进攻音效1.mp3',
    'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/进攻防守音乐/进攻音效2.mp3',
    'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/进攻防守音乐/进攻音效3.mp3'
  ],
  defense: [
    'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/进攻防守音乐/防守音效1.mp3',
    'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/进攻防守音乐/防守音效2.mp3',
    'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/进攻防守音乐/防守音效3.mp3'
  ],
  miss: ['cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/自定义音效/投篮未进音效.mp3'],
  cheer: ['cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/自定义音效/欢呼声.mp3'],
  horn: ['cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/自定义音效/冲锋号.mp3'],
  entry: ['cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/自定义音效/出场音乐.mp3'],
  anthem: ['cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/自定义音效/国歌.mp3'],
  other: ['cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/自定义音效/国歌.mp3'],
  rest: [
    'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/暂停休息音乐/暂停音乐1.mp3',
    'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/暂停休息音乐/暂停音乐2.mp3'
  ],
  buzzer: ['cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/比赛音效/蜂鸣器.mp3'],
  two: ['cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/比赛音效/2分进球音效.mp3'],
  three: ['cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/比赛音效/三分球.mp3']
};
const AUDIO_SOURCE_KEYS = {
  attack: ['attack'],
  defense: ['defense'],
  rest: ['rest', 'pause'],
  miss: ['miss'],
  cheer: ['cheer'],
  horn: ['horn', 'shout'],
  entry: ['entry'],
  anthem: ['anthem'],
  other: ['other'],
  buzzer: ['buzzer'],
  two: ['two', 'score-two'],
  three: ['three', 'score-three']
};
const AUDIO_CATEGORY_BY_TYPE = { attack: 'attack', defense: 'defense', rest: 'pause', buzzer: 'buzzer' };

function formatClock(totalSeconds) {
  const safe = Math.max(0, totalSeconds || 0);
  const minutes = String(Math.floor(safe / 60)).padStart(2, '0');
  const seconds = String(safe % 60).padStart(2, '0');
  return minutes + ':' + seconds;
}

function nowText() {
  const now = new Date();
  return [now.getHours(), now.getMinutes(), now.getSeconds()].map((item) => String(item).padStart(2, '0')).join(':');
}

const segmentMap = {
  '0': ['a', 'b', 'c', 'd', 'e', 'f'],
  '1': ['b', 'c'],
  '2': ['a', 'b', 'g', 'e', 'd'],
  '3': ['a', 'b', 'c', 'd', 'g'],
  '4': ['f', 'g', 'b', 'c'],
  '5': ['a', 'f', 'g', 'c', 'd'],
  '6': ['a', 'f', 'g', 'c', 'd', 'e'],
  '7': ['a', 'b', 'c'],
  '8': ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  '9': ['a', 'b', 'c', 'd', 'f', 'g']
};
const segmentNames = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

function buildDigitalItems(value, prefix) {
  return String(value).split('').map((char, index) => {
    if (char === ':') return { id: prefix + '-colon-' + index, type: 'colon' };
    const active = segmentMap[char] || [];
    return {
      id: prefix + '-' + index + '-' + char,
      type: 'digit',
      segments: segmentNames.map((name) => ({ key: name, name, onClass: active.indexOf(name) >= 0 ? 'on' : '' }))
    };
  });
}

function getPlayerAvatar(player, side) {
  const fallback = TEAM_ASSET + (side === 'home' ? 'avatar-left-23.png' : 'avatar-right-7.png');
  if (!player) return fallback;
  return player.avatar || player.avatarUrl || player.photo || player.photoUrl || player.headImg || player.headImage || player.headUrl || player.image || player.imageUrl || player.portrait || player.faceUrl || player.profilePhoto || fallback;
}

function createPlayers(side) {
  const base = side === 'home'
    ? [
      ['23', '林浩', 'PG', 'avatar-left-23.png'],
      ['7', '张子轩', 'SG', 'avatar-left-7.png'],
      ['11', '李奥然', 'SF', 'avatar-left-11.png'],
      ['34', '刘宇辰', 'PF', 'avatar-left-34.png'],
      ['30', '赵子墨', 'C', 'avatar-left-30.png']
    ]
    : [
      ['7', '王子轩', 'PG', 'avatar-right-7.png'],
      ['11', '李奥然', 'SG', 'avatar-right-11.png'],
      ['9', '陈子睿', 'SF', 'avatar-right-9.png'],
      ['24', '周宇航', 'PF', 'avatar-right-24.png'],
      ['33', '吴天佑', 'C', 'avatar-right-33.png']
    ];
  return base.map((item, index) => ({
    id: side + '-p-' + index,
    number: item[0],
    name: item[1],
    position: item[2],
    avatar: TEAM_ASSET + item[3],
    cardClass: '',
    tagText: '',
    stats: { score: 0, rebound: 0, assist: 0, steal: 0, block: 0, turnover: 0, foul: 0 }
  }));
}

function createBench(side) {
  const base = side === 'home'
    ? [['2', '王梓豪'], ['8', '陈天宇'], ['18', '韩亦辰'], ['21', '郭子安']]
    : [['5', '徐明轩'], ['12', '赵一航'], ['16', '许一诺'], ['28', '孙景辰']];
  return base.map((item, index) => ({ id: side + '-b-' + index, number: item[0], name: item[1], tagText: '', chipClass: '' }));
}

function cloneStats(stats) {
  return Object.assign({ score: 0, rebound: 0, assist: 0, steal: 0, block: 0, turnover: 0, foul: 0 }, stats || {});
}

function readStorageList(key) {
  const value = wx.getStorageSync(key) || [];
  return Array.isArray(value) ? value : [];
}

function normalizeAudioSettings(saved) {
  const value = saved && typeof saved === 'object' ? saved : {};
  return Object.assign({}, DEFAULT_AUDIO_SETTINGS, value, {
    categoryEnabled: Object.assign({}, DEFAULT_AUDIO_SETTINGS.categoryEnabled, value.categoryEnabled || {}),
    modes: Object.assign({}, DEFAULT_AUDIO_SETTINGS.modes, value.modes || {}),
    selectedAudio: Object.assign({}, value.selectedAudio || {})
  });
}

function collectStoredAudioSources(type) {
  const keys = AUDIO_SOURCE_KEYS[type] || [type];
  const audioMap = wx.getStorageSync(CLOUD_AUDIO_MAP_KEY) || {};
  const audioItems = wx.getStorageSync(CLOUD_AUDIO_ITEMS_KEY) || [];
  const sources = [];
  (audioItems || []).forEach((item) => {
    const channel = item && (item.channel || item.type || '');
    const source = item && (item.fileID || item.fileId || item.src || '');
    if (source && keys.indexOf(channel) >= 0 && sources.indexOf(source) < 0) sources.push(source);
  });
  keys.forEach((key) => {
    const value = audioMap[key];
    const list = Array.isArray(value) ? value : (value ? [value] : []);
    list.forEach((source) => {
      if (source && sources.indexOf(source) < 0) sources.push(source);
    });
  });
  return sources;
}

function voiceToastText(result) {
  if (!result) return '语音播报生成失败';
  const code = result.code || '';
  const messageMap = {
    empty_text: '请先生成需要播报的文案',
    text_too_long: '播报文案过长，请缩短后再试',
    no_voice_credit: '当前没有可用的 AI 播报次数',
    empty_audio: '语音生成成功但未返回音频',
    missing_tts_secret: '语音服务密钥未配置',
    tts_failed: '语音播报生成失败'
  };
  return messageMap[code] || '语音播报生成失败';
}

function normalizeLibraryTeams() {
  const teams = readStorageList('teams').filter((item) => item && item.enabled !== false);
  const categories = readStorageList('teamCategories').filter((item) => item && item.key && item.label && item.key !== 'all' && item.key !== 'unassigned');
  const map = {};
  teams.concat(categories).forEach((item) => {
    const label = item.label || item.name || item.teamName || '\u672a\u547d\u540d\u7403\u961f';
    const key = item.key || item.id || label;
    if (!map[key]) map[key] = { key, label, name: item.name || label, logoUrl: item.logoUrl || item.teamLogo || '', raw: item };
  });
  return Object.keys(map).map((key) => map[key]);
}

function buildEmptyTeamPlayers() {
  return { starters: [], bench: [] };
}

function buildPlayersFromLibrary(team, side) {
  if (!team) return buildEmptyTeamPlayers();
  const sourcePlayers = readStorageList('players').filter((player) => {
    if (!player) return false;
    return player.team === team.label || player.team === team.name || player.filter === team.key;
  });
  const players = sourcePlayers.map((player, index) => ({
    id: side + '-lib-' + (player.id || index),
    number: String(player.number || '--'),
    name: player.name || '\u672a\u547d\u540d',
    position: player.position || (player.tags && player.tags[0]) || '\u7403\u5458',
    avatar: getPlayerAvatar(player, side),
    cardClass: '',
    tagText: '',
    stats: cloneStats(player.stats)
  }));
  return { starters: players.slice(0, 5), bench: players.slice(5).map((player) => Object.assign({}, player, { chipClass: '' })) };
}

function buildQuickPlayers(side, players) {
  return (Array.isArray(players) ? players : []).map((player, index) => ({
    id: side + '-quick-' + (player.id || index),
    number: String(player.number || index + 1),
    name: player.name || '????',
    position: player.position || '??',
    avatar: TEAM_ASSET + (side === 'home' ? 'avatar-left-23.png' : 'avatar-right-7.png'),
    cardClass: '',
    tagText: '',
    stats: cloneStats(player.stats)
  }));
}
Page({
  timer: null,
  shotTimer: null,
  resizeHandler: null,
  longPressTimer: null,
  longPressTick: null,
  audioContext: null,
  audioUrlCache: {},
  data: {
    started: false,
    bgImage: BG,
    setupBgImage: SETUP_BG,
    scorePageClass: 'score-page landscape-board tablet-board',
    setupPresetMinutes: [6, 8, 10, 12],
    setupPresetPeriods: [2, 4, 6],
    homeName: '蜂巢U10A',
    awayName: '星火U10',
    teamOptions: [],
    homeTeamIndex: 0,
    awayTeamIndex: 1,
    homeTeamPickerText: '蜂巢U10A',
    awayTeamPickerText: '星火U10',
    matchName: 'U10组 决赛',
    homeLogo: TEAM_ASSET + 'team-logo-left.png',
    awayLogo: TEAM_ASSET + 'team-logo-right.png',
    homeScore: 0,
    awayScore: 0,
    homeScoreDigits: buildDigitalItems(0, 'home-score'),
    awayScoreDigits: buildDigitalItems(0, 'away-score'),
    clockDigits: buildDigitalItems('10:00', 'clock'),
    homeScorePulseClass: '',
    awayScorePulseClass: '',
    homeFouls: 0,
    awayFouls: 0,
    homeTimeouts: 0,
    awayTimeouts: 0,
    period: 1,
    totalPeriods: 4,
    periodMinutes: 10,
    timerMode: 'down',
    clockSeconds: 600,
    clockText: '10:00',
    clockRunning: false,
    clockButtonText: '开始',
    homeStarters: createPlayers('home'),
    awayStarters: createPlayers('away'),
    homeBench: createBench('home'),
    awayBench: createBench('away'),
    substitutionMode: '',
    pendingOutId: '',
    substitutionHint: '点击后双方场地、比分和阵容同步互换。',
    homeSubButtonText: '换人',
    awaySubButtonText: '换人',
    homeSubButtonClass: '',
    awaySubButtonClass: '',
    possession: 'left',
    leftPossessionClass: 'active',
    rightPossessionClass: '',
    shotClockEnabled: true,
    shotClock: 24,
    shotClockDigits: buildDigitalItems('24', 'shot'),
    shotClockRunning: false,
    shotClockButtonText: '开始',
    events: [],
    homeEvents: [],
    awayEvents: [],
    currentAudioName: '无',
    mcVoiceIcon: ICON_ASSET + 'icon-mc-score-voice-clean.png',
    mcSoundIcon: ICON_ASSET + 'icon-mc-attack-clean.png',
    playingType: '',
    volume: 80,
    longPressActive: false,
    longPressText: '',
    longPressProgress: 0,
    selectedPlayer: null,
    selectedPlayerStats: [],
    scoreStatActions: [],
    techStatActions: [],
    statPopoverClass: 'home',
    showPlayerStats: false,
    voiceOptions: [
      { id: 'standard', name: '赛小智', icon: ICON_ASSET + 'icon-mc-score-voice-clean.png', activeClass: 'active' },
      { id: 'live', name: '赛小瑾', icon: ICON_ASSET + 'icon-mc-score-voice-clean.png', activeClass: '' },
      { id: 'kids', name: '赛小萌', icon: ICON_ASSET + 'icon-mc-score-voice-clean.png', activeClass: '' },
      { id: 'other', name: '其他', icon: ICON_ASSET + 'icon-mc-score-voice-clean.png', activeClass: '' }
    ],
    commonSounds: [
      { type: 'attack', name: '进攻音效', icon: ICON_ASSET + 'icon-tech-score-clean.png', audioIds: AUDIO_FILE_IDS.attack, activeClass: '' },
      { type: 'defense', name: '防守音效', icon: ICON_ASSET + 'icon-mc-defense-clean.png', audioIds: AUDIO_FILE_IDS.defense, activeClass: '' }
    ],
    customSounds: [
      { type: 'miss', name: '投篮未进', icon: ICON_ASSET + 'icon-mc-mvp-clean.png', audioIds: AUDIO_FILE_IDS.miss, activeClass: '' },
      { type: 'cheer', name: '欢呼声', icon: ICON_ASSET + 'icon-mc-mvp-clean.png', audioIds: AUDIO_FILE_IDS.cheer, activeClass: '' },
      { type: 'horn', name: '冲锋号', icon: ICON_ASSET + 'icon-mc-mvp-clean.png', audioIds: AUDIO_FILE_IDS.horn, activeClass: '' },
      { type: 'entry', name: '出场音乐', icon: ICON_ASSET + 'icon-mc-mvp-clean.png', audioIds: AUDIO_FILE_IDS.entry, activeClass: '' }
    ],
    quickKeys: [
      { key: 'K1', label: '进攻' },
      { key: 'K2', label: '防守' },
      { key: 'K3', label: '2分' },
      { key: 'K4', label: '3分' },
      { key: 'K5', label: '未进' },
      { key: 'K6', label: '蜂鸣器' }
    ],
    techStatTemplate: [
      { key: 'rebound', label: '篮板', icon: ICON_ASSET + 'icon-tech-rebound-clean.png' },
      { key: 'assist', label: '助攻', icon: ICON_ASSET + 'icon-tech-assist-clean.png' },
      { key: 'steal', label: '抢断', icon: ICON_ASSET + 'icon-tech-steal-clean.png' },
      { key: 'block', label: '盖帽', icon: ICON_ASSET + 'icon-tech-block-clean.png' },
      { key: 'turnover', label: '失误', icon: ICON_ASSET + 'icon-tech-turnover-clean.png' },
      { key: 'foul', label: '犯规', icon: ICON_ASSET + 'icon-substitution-common-orange-256.png' }
    ]
  },

  onLoad(options) {
    this.loadTeamOptions();
    this.applyQuickMatchConfig(options);
    this.updateDigital();
    this.detectBoardSize();
    if (wx.onWindowResize) {
      this.resizeHandler = () => this.detectBoardSize();
      wx.onWindowResize(this.resizeHandler);
    }
  },

  onShow() {
    this.detectBoardSize();
    this.syncVoiceStyle();
  },

  onUnload() {
    this.clearClock();
    this.clearShotClock();
    this.clearLongPress();
    this.stopNativeAudio();
    if (wx.offWindowResize && this.resizeHandler) wx.offWindowResize(this.resizeHandler);
    if (wx.setPageOrientation) wx.setPageOrientation({ orientation: 'portrait' });
  },

  detectBoardSize() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const longSide = Math.max(info.windowWidth, info.windowHeight);
    const shortSide = Math.min(info.windowWidth, info.windowHeight);
    const aspect = longSide / Math.max(1, shortSide);
    const small = shortSide < 700 || longSide < 1200 || aspect >= 1.95;
    const compactPad = !small && aspect <= 1.7;
    const ultraWide = aspect >= 2.05;
    const classList = ['score-page', 'landscape-board', small ? 'phone-board' : 'tablet-board'];
    if (compactPad) classList.push('pad-compact');
    if (ultraWide) classList.push('phone-wide');
    this.setData({ scorePageClass: classList.join(' ') });
  },

  syncVoiceStyle() {
    const voiceStyle = wx.getStorageSync(VOICE_STYLE_KEY) || 'standard';
    const voiceOptions = this.data.voiceOptions.map((item) => Object.assign({}, item, { activeClass: item.id === voiceStyle ? 'active' : '' }));
    this.setData({ voiceOptions });
  },

  updateDigital() {
    this.setData({
      homeScoreDigits: buildDigitalItems(this.data.homeScore, 'home-score'),
      awayScoreDigits: buildDigitalItems(this.data.awayScore, 'away-score'),
      clockDigits: buildDigitalItems(this.data.clockText, 'clock')
    });
  },

  loadTeamOptions() {
    const libraryTeams = normalizeLibraryTeams();
    const fallbackTeams = [
      { key: 'fallback-home', label: this.data.homeName || '蜂巢U10A', name: this.data.homeName || '蜂巢U10A' },
      { key: 'fallback-away', label: this.data.awayName || '星火U10', name: this.data.awayName || '星火U10' }
    ];
    const teamOptions = libraryTeams.length ? libraryTeams : fallbackTeams;
    const homeTeamIndex = Math.min(Number(this.data.homeTeamIndex) || 0, teamOptions.length - 1);
    let awayTeamIndex = Math.min(Number(this.data.awayTeamIndex) || 1, teamOptions.length - 1);
    if (teamOptions.length > 1 && awayTeamIndex === homeTeamIndex) awayTeamIndex = homeTeamIndex === 0 ? 1 : 0;
    const homeTeam = teamOptions[homeTeamIndex] || teamOptions[0];
    const awayTeam = teamOptions[awayTeamIndex] || teamOptions[0];
    this.setData({
      teamOptions,
      homeTeamIndex,
      awayTeamIndex,
      homeTeamPickerText: homeTeam ? homeTeam.label : '请选择主队',
      awayTeamPickerText: awayTeam ? awayTeam.label : '请选择客队',
      homeName: homeTeam ? homeTeam.label : this.data.homeName,
      awayName: awayTeam ? awayTeam.label : this.data.awayName
    });
  },
  onHomeTeamChange(event) {
    const index = Number(event.detail.value) || 0;
    const team = this.data.teamOptions[index];
    if (!team) return;
    this.setData({ homeTeamIndex: index, homeTeamPickerText: team.label, homeName: team.label });
  },
  onAwayTeamChange(event) {
    const index = Number(event.detail.value) || 0;
    const team = this.data.teamOptions[index];
    if (!team) return;
    this.setData({ awayTeamIndex: index, awayTeamPickerText: team.label, awayName: team.label });
  },

  setTimerMode(event) {
    const timerMode = event.currentTarget.dataset.mode;
    const clockSeconds = timerMode === 'down' ? this.data.periodMinutes * 60 : 0;
    this.clearClock();
    this.setData({ timerMode, clockSeconds, clockText: formatClock(clockSeconds), clockRunning: false, clockButtonText: '开始' }, () => this.updateDigital());
  },

  applyPeriodMinutes(value) {
    const periodMinutes = Math.max(1, Math.min(60, Number(value) || 10));
    const clockSeconds = this.data.timerMode === 'down' ? periodMinutes * 60 : 0;
    this.clearClock();
    this.setData({ periodMinutes, clockSeconds, clockText: formatClock(clockSeconds), clockRunning: false, clockButtonText: '开始' }, () => this.updateDigital());
  },
  decreasePeriodMinutes() { this.applyPeriodMinutes(this.data.periodMinutes - 1); },
  increasePeriodMinutes() { this.applyPeriodMinutes(this.data.periodMinutes + 1); },
  setPeriodPreset(event) { this.applyPeriodMinutes(Number(event.currentTarget.dataset.value)); },

  applyPeriodCount(value) {
    const totalPeriods = Math.max(1, Math.min(12, Number(value) || 4));
    this.setData({ totalPeriods, period: Math.min(this.data.period, totalPeriods) });
  },
  decreasePeriodCount() { this.applyPeriodCount(this.data.totalPeriods - 1); },
  increasePeriodCount() { this.applyPeriodCount(this.data.totalPeriods + 1); },
  setPeriodCountPreset(event) { this.applyPeriodCount(Number(event.currentTarget.dataset.value)); },

  applyQuickMatchConfig(options) {
    if (!options || options.mode !== 'quick') return;
    const config = wx.getStorageSync('quickMatchActiveConfig');
    if (!config || config.mode !== 'quick') return;
    const homeName = (config.homeTeam && config.homeTeam.name) || 'A?';
    const awayName = (config.awayTeam && config.awayTeam.name) || 'B?';
    const periodMinutes = Math.max(1, Number(config.periodMinutes) || 10);
    const totalPeriods = Math.max(1, Number(config.periods) || 4);
    const clockSeconds = periodMinutes * 60;
    const homePlayers = buildQuickPlayers('home', config.homePlayers);
    const awayPlayers = buildQuickPlayers('away', config.awayPlayers);
    if (wx.setPageOrientation) wx.setPageOrientation({ orientation: 'landscape' });
    this.setData({
      started: true,
      matchName: config.matchName || '????',
      homeName,
      awayName,
      period: 1,
      totalPeriods,
      periodMinutes,
      clockSeconds,
      clockText: formatClock(clockSeconds),
      clockRunning: false,
      clockButtonText: '??',
      homeStarters: homePlayers.slice(0, 5),
      awayStarters: awayPlayers.slice(0, 5),
      homeBench: homePlayers.slice(5).map((player) => Object.assign({}, player, { chipClass: '' })),
      awayBench: awayPlayers.slice(5).map((player) => Object.assign({}, player, { chipClass: '' })),
      homeHasRoster: homePlayers.length > 0,
      awayHasRoster: awayPlayers.length > 0,
      events: [],
      homeEvents: [],
      awayEvents: []
    });
  },

  startMatch() {
    const teamOptions = this.data.teamOptions && this.data.teamOptions.length ? this.data.teamOptions : normalizeLibraryTeams();
    const homeTeam = teamOptions[this.data.homeTeamIndex] || teamOptions[0] || null;
    const awayTeam = teamOptions[this.data.awayTeamIndex] || teamOptions[1] || teamOptions[0] || null;
    const homeName = (homeTeam && homeTeam.label) || (this.data.homeName || '').trim() || '主队';
    const awayName = (awayTeam && awayTeam.label) || (this.data.awayName || '').trim() || '客队';
    const homeRoster = homeTeam ? buildPlayersFromLibrary(homeTeam, 'home') : { starters: createPlayers('home'), bench: createBench('home') };
    const awayRoster = awayTeam ? buildPlayersFromLibrary(awayTeam, 'away') : { starters: createPlayers('away'), bench: createBench('away') };
    const clockSeconds = this.data.timerMode === 'down' ? this.data.periodMinutes * 60 : 0;
    if (wx.setPageOrientation) wx.setPageOrientation({ orientation: 'landscape' });
    this.setData({
      started: true,
      homeName,
      awayName,
      homeScore: 0,
      awayScore: 0,
      homeFouls: 0,
      awayFouls: 0,
      homeTimeouts: 0,
      awayTimeouts: 0,
      events: [],
      homeEvents: [],
      awayEvents: [],
      period: 1,
      clockSeconds,
      clockText: formatClock(clockSeconds),
      clockRunning: false,
      clockButtonText: '开始',
      homeStarters: homeRoster.starters,
      homeBench: homeRoster.bench,
      awayStarters: awayRoster.starters,
      awayBench: awayRoster.bench,
      homeHasRoster: homeRoster.starters.length > 0,
      awayHasRoster: awayRoster.starters.length > 0,
      showPlayerStats: false,
      substitutionMode: '',
      pendingOutId: '',
      substitutionHint: '点击后双方场地、比分和阵容同步互换。',
      homeSubButtonText: '换人',
      awaySubButtonText: '换人',
      homeSubButtonClass: '',
      awaySubButtonClass: '',
      possession: 'left',
      leftPossessionClass: 'active',
      rightPossessionClass: '',
      shotClockEnabled: true,
      shotClock: 24,
      shotClockDigits: buildDigitalItems('24', 'shot'),
      shotClockRunning: false,
      shotClockButtonText: '开始'
    }, () => {
      this.detectBoardSize();
      this.updateDigital();
    });
  },
  clearShotClock() {
    if (this.shotTimer) clearInterval(this.shotTimer);
    this.shotTimer = null;
  },
  toggleShotClockEnabled(event) {
    const enabled = !!event.detail.value;
    this.clearShotClock();
    this.setData({
      shotClockEnabled: enabled,
      shotClock: enabled ? 24 : 0,
      shotClockDigits: enabled ? buildDigitalItems('24', 'shot') : [],
      shotClockRunning: false,
      shotClockButtonText: '开始'
    });
  },
  startShotClock() {
    if (!this.data.shotClockEnabled || this.data.shotClockRunning) return;
    const startValue = this.data.shotClock <= 0 ? 24 : this.data.shotClock;
    this.setData({ shotClock: startValue, shotClockDigits: buildDigitalItems(String(startValue).padStart(2, '0'), 'shot'), shotClockRunning: true, shotClockButtonText: '暂停' });
    this.shotTimer = setInterval(() => {
      const next = Math.max(0, this.data.shotClock - 1);
      if (next === 0) {
        this.clearShotClock();
        this.setData({ shotClock: 0, shotClockDigits: buildDigitalItems('00', 'shot'), shotClockRunning: false, shotClockButtonText: '开始' });
        this.playMcAudio('buzzer', '进攻计时蜂鸣器');
        return;
      }
      this.setData({ shotClock: next, shotClockDigits: buildDigitalItems(String(next).padStart(2, '0'), 'shot') });
    }, 1000);
  },
  pauseShotClock() {
    this.clearShotClock();
    this.setData({ shotClockRunning: false, shotClockButtonText: '开始' });
  },
  toggleShotClock() {
    if (!this.data.shotClockEnabled) return;
    if (this.data.shotClockRunning) {
      this.pauseShotClock();
      return;
    }
    this.startShotClock();
  },
  resetShotClockTo(value) {
    if (!this.data.shotClockEnabled) return;
    const shouldRun = this.data.clockRunning;
    this.clearShotClock();
    this.setData({
      shotClock: value,
      shotClockDigits: buildDigitalItems(String(value).padStart(2, '0'), 'shot'),
      shotClockRunning: false,
      shotClockButtonText: '开始'
    }, () => {
      if (shouldRun) this.startShotClock();
    });
  },
  resetShotClock24() { this.resetShotClockTo(24); },
  resetShotClock14() { this.resetShotClockTo(14); },
  setPossession(event) {
    const side = event.currentTarget.dataset.side;
    this.setData({
      possession: side,
      leftPossessionClass: side === 'left' ? 'active' : '',
      rightPossessionClass: side === 'right' ? 'active' : ''
    });
    this.resetShotClockTo(24);
  },
  clearClock() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  },
  toggleClock() {
    if (this.data.clockRunning) {
      this.clearClock();
      this.pauseShotClock();
      this.setData({ clockRunning: false, clockButtonText: '开始' });
      return;
    }
    this.setData({ clockRunning: true, clockButtonText: '暂停' }, () => this.startShotClock());
    this.timer = setInterval(() => {
      let next = this.data.timerMode === 'down' ? this.data.clockSeconds - 1 : this.data.clockSeconds + 1;
      if (this.data.timerMode === 'down' && next <= 0) {
        next = 0;
        this.clearClock();
        this.pauseShotClock();
        this.setData({ clockRunning: false, clockButtonText: '开始' });
        this.handlePeriodEnd();
      }
      this.setData({ clockSeconds: next, clockText: formatClock(next) }, () => this.updateDigital());
    }, 1000);
  },
  handlePeriodEnd() {
    const settings = normalizeAudioSettings(wx.getStorageSync(AUDIO_SETTINGS_KEY));
    this.playMcAudio('buzzer', '蜂鸣器');
    if (settings.pauseAutoEnabled === false) return;
    wx.showModal({
      title: '本节结束',
      content: '蜂鸣器已响，是否播放暂停休息音乐？',
      confirmText: '播放',
      cancelText: '不播放',
      success: (result) => {
        if (result.confirm) this.playMcAudio('rest', '暂停音乐');
      }
    });
  },
  resetClock() {
    const clockSeconds = this.data.timerMode === 'down' ? this.data.periodMinutes * 60 : 0;
    this.clearClock();
    this.clearShotClock();
    this.setData({ clockRunning: false, clockButtonText: '开始', clockSeconds, clockText: formatClock(clockSeconds), shotClock: 24, shotClockDigits: buildDigitalItems('24', 'shot'), shotClockRunning: false, shotClockButtonText: '开始' }, () => this.updateDigital());
  },
  prevPeriod() { this.setData({ period: Math.max(1, this.data.period - 1) }); this.resetClock(); },
  nextPeriod() { this.setData({ period: Math.min(this.data.totalPeriods, this.data.period + 1) }); this.resetClock(); },

  addHome1() { this.addScore('home', 1); },
  addHome2() { this.addScore('home', 2); this.playMcAudio('two', '两分音效'); },
  addAway1() { this.addScore('away', 1); },
  addAway2() { this.addScore('away', 2); this.playMcAudio('two', '两分音效'); },
  startHome3Press() { this.startLongPress('home'); },
  startAway3Press() { this.startLongPress('away'); },
  startLongPress(side) {
    this.clearLongPress();
    this.playMcAudio('three', '三分音效');
    this.setData({ longPressActive: true, longPressText: '长按三分确认中', longPressProgress: 0 });
    let progress = 0;
    this.longPressTick = setInterval(() => {
      progress = Math.min(100, progress + 8);
      this.setData({ longPressProgress: progress });
    }, 50);
    this.longPressTimer = setTimeout(() => {
      this.addScore(side, 3);
      this.clearLongPress();
    }, 650);
  },
  stopLongPress() { this.clearLongPress(); },
  clearLongPress() {
    if (this.longPressTimer) clearTimeout(this.longPressTimer);
    if (this.longPressTick) clearInterval(this.longPressTick);
    this.longPressTimer = null;
    this.longPressTick = null;
    this.setData({ longPressActive: false, longPressProgress: 0 });
  },

  addScore(side, points, playerId) {
    const scoreKey = side === 'home' ? 'homeScore' : 'awayScore';
    const pulseKey = side === 'home' ? 'homeScorePulseClass' : 'awayScorePulseClass';
    const team = side === 'home' ? this.data.homeName : this.data.awayName;
    const selected = this.data.selectedPlayer;
    const fallbackPlayer = selected && selected.id === playerId ? selected : null;
    const player = playerId ? (this.findPlayer(side, playerId) || fallbackPlayer) : null;
    const nextHome = side === 'home' ? this.data.homeScore + points : this.data.homeScore;
    const nextAway = side === 'away' ? this.data.awayScore + points : this.data.awayScore;
    const patch = {};
    patch[scoreKey] = this.data[scoreKey] + points;
    patch[pulseKey] = 'pulse';
    const scoreEvent = {
      id: Date.now(),
      time: this.eventTimeText(),
      team,
      action: player ? ('#' + player.number + ' ' + player.name + ' 得分 +' + points) : ('得分 +' + points),
      score: nextHome + '-' + nextAway
    };
    patch.events = [scoreEvent].concat(this.data.events).slice(0, 12);
    patch[side + 'Events'] = [scoreEvent].concat(this.data[side + 'Events']).slice(0, 8);
    if (playerId) this.bumpPlayerStat(side, playerId, 'score', points, patch);
    this.setData(patch, () => {
      this.updateDigital();
      if (playerId) this.refreshSelectedPlayer(side, playerId);
    });
    setTimeout(() => { const reset = {}; reset[pulseKey] = ''; this.setData(reset); }, 420);
  },
  eventTimeText() {
    const baseSeconds = Math.max(0, Number(this.data.periodMinutes || 0) * 60);
    const currentSeconds = Math.max(0, Number(this.data.clockSeconds || 0));
    const elapsed = this.data.timerMode === 'down'
      ? Math.max(0, baseSeconds - currentSeconds)
      : currentSeconds;
    return 'Q' + this.data.period + ' ' + formatClock(elapsed);
  },

  addHomeFoul() { this.addCounter('home', 'homeFouls', this.data.homeName, '犯规'); },
  addAwayFoul() { this.addCounter('away', 'awayFouls', this.data.awayName, '犯规'); },
  addHomeTimeout() { this.addCounter('home', 'homeTimeouts', this.data.homeName, '暂停'); this.playMcAudio('rest', '暂停音乐'); },
  addAwayTimeout() { this.addCounter('away', 'awayTimeouts', this.data.awayName, '暂停'); this.playMcAudio('rest', '暂停音乐'); },
  addCounter(side, key, team, action) {
    const patch = {};
    const item = { id: Date.now(), time: this.eventTimeText(), team, action, score: this.data.homeScore + '-' + this.data.awayScore };
    patch[key] = this.data[key] + 1;
    patch.events = [item].concat(this.data.events).slice(0, 12);
    patch[side + 'Events'] = [item].concat(this.data[side + 'Events']).slice(0, 8);
    this.setData(patch);
  },

  confirmReset() {
    wx.showModal({
      title: '确认重置',
      content: '是否清空当前比分并重开本场比赛？',
      success: (res) => {
        if (!res.confirm) return;
        this.clearClock();
        const clockSeconds = this.data.timerMode === 'down' ? this.data.periodMinutes * 60 : 0;
        this.setData({
          homeScore: 0,
          awayScore: 0,
          homeFouls: 0,
          awayFouls: 0,
          homeTimeouts: 0,
          awayTimeouts: 0,
          events: [],
          homeEvents: [],
          awayEvents: [],
          period: 1,
          clockRunning: false,
          clockButtonText: '开始',
          clockSeconds,
          clockText: formatClock(clockSeconds),
          showPlayerStats: false,
          possession: 'left',
          leftPossessionClass: 'active',
          rightPossessionClass: '',
          shotClock: 24,
          shotClockRunning: false,
          shotClockButtonText: '开始'
        }, () => {
          this.clearShotClock();
          this.updateDigital();
        });
      }
    });
  },

  swapSides() {
    wx.showModal({
      title: '确认交换场地',
      content: '主客队名称、比分、犯规、暂停和阵容将同步互换。',
      confirmText: '确认交换',
      success: (result) => {
        if (!result.confirm) return;
        this.setData({
          homeName: this.data.awayName,
          awayName: this.data.homeName,
          homeScore: this.data.awayScore,
          awayScore: this.data.homeScore,
          homeFouls: this.data.awayFouls,
          awayFouls: this.data.homeFouls,
          homeTimeouts: this.data.awayTimeouts,
          awayTimeouts: this.data.homeTimeouts,
          homeLogo: this.data.awayLogo,
          awayLogo: this.data.homeLogo,
          homeStarters: this.data.awayStarters,
          awayStarters: this.data.homeStarters,
          homeBench: this.data.awayBench,
          awayBench: this.data.homeBench,
          substitutionMode: this.data.substitutionMode === 'home' ? 'away' : (this.data.substitutionMode === 'away' ? 'home' : ''),
          homeSubButtonText: this.data.awaySubButtonText,
          awaySubButtonText: this.data.homeSubButtonText,
          homeSubButtonClass: this.data.awaySubButtonClass,
          awaySubButtonClass: this.data.homeSubButtonClass,
          substitutionHint: this.data.substitutionMode ? this.data.substitutionHint : '点击后双方场地、比分和阵容同步互换。',
          events: [{ id: Date.now(), time: this.eventTimeText(), team: '系统', action: '交换场地', score: this.data.awayScore + '-' + this.data.homeScore }].concat(this.data.events).slice(0, 12),
          homeEvents: [{ id: Date.now() + 1, time: this.eventTimeText(), team: this.data.awayName, action: '交换场地', score: this.data.awayScore + '-' + this.data.homeScore }].concat(this.data.awayEvents).slice(0, 8),
          awayEvents: [{ id: Date.now() + 2, time: this.eventTimeText(), team: this.data.homeName, action: '交换场地', score: this.data.awayScore + '-' + this.data.homeScore }].concat(this.data.homeEvents).slice(0, 8)
        }, () => this.updateDigital());
      }
    });
  },
  clearEvents() { this.setData({ events: [], homeEvents: [], awayEvents: [] }); },
  clearHomeEvents() { this.setData({ homeEvents: [] }); },
  clearAwayEvents() { this.setData({ awayEvents: [] }); },

  selectStarter(event) {
    const side = event.currentTarget.dataset.side;
    const id = event.currentTarget.dataset.id;
    if (this.data.substitutionMode === side) {
      this.updateSubstitutionMarks(side, id);
      return;
    }
    const player = this.findPlayer(side, id);
    if (!player) return;
    this.openPlayerStats(side, player);
  },
  selectBench(event) {
    const side = event.currentTarget.dataset.side;
    const id = event.currentTarget.dataset.id;
    if (this.data.substitutionMode !== side || !this.data.pendingOutId) return;
    const startersKey = side + 'Starters';
    const benchKey = side + 'Bench';
    const starters = this.data[startersKey].slice();
    const bench = this.data[benchKey].slice();
    const starterIndex = starters.findIndex((item) => item.id === this.data.pendingOutId);
    const benchIndex = bench.findIndex((item) => item.id === id);
    if (starterIndex < 0 || benchIndex < 0) return;
    const out = starters[starterIndex];
    const incoming = bench[benchIndex];
    starters[starterIndex] = Object.assign({}, out, { number: incoming.number, name: incoming.name, position: incoming.position || out.position, avatar: incoming.avatar || out.avatar, stats: cloneStats(incoming.stats) });
    bench[benchIndex] = Object.assign({}, incoming, { number: out.number, name: out.name, position: out.position || incoming.position, avatar: out.avatar || incoming.avatar, stats: cloneStats(out.stats) });
    const readyStarters = starters.map((item) => Object.assign({}, item, {
      cardClass: 'sub-ready',
      tagText: '换下'
    }));
    const readyBench = bench.map((item) => Object.assign({}, item, {
      chipClass: 'sub-in-wait',
      tagText: '换上'
    }));
    const team = side === 'home' ? this.data.homeName : this.data.awayName;
    const patch = {};
    patch[startersKey] = readyStarters;
    patch[benchKey] = readyBench;
    patch.substitutionMode = side;
    patch.pendingOutId = '';
    patch.substitutionHint = '换人完成，可继续选择下一名“换下”球员；完成后点击取消换人。';
    const subEvent = { id: Date.now(), time: this.eventTimeText(), team, action: out.name + ' ⇄ ' + incoming.name, score: this.data.homeScore + '-' + this.data.awayScore };
    patch.events = [subEvent].concat(this.data.events).slice(0, 12);
    patch[side + 'Events'] = [subEvent].concat(this.data[side + 'Events']).slice(0, 8);
    this.setData(patch);
  },
  openHomeSub() { this.toggleSubMode('home'); },
  openAwaySub() { this.toggleSubMode('away'); },
  toggleSubMode(side) {
    if (this.data.substitutionMode === side) {
      this.cancelSubstitution('换人已取消。');
      return;
    }
    this.enterSubMode(side);
  },
  enterSubMode(side) {
    const clean = this.buildClearSubstitutionPatch();
    this.setData(clean, () => {
      this.updateSubstitutionMarks(side, '');
      this.setData({
        substitutionMode: side,
        pendingOutId: '',
        showPlayerStats: false,
        substitutionHint: '换人模式：先点“换下”的首发，再点“换上”的替补。',
        homeSubButtonText: side === 'home' ? '取消换人' : '换人',
        awaySubButtonText: side === 'away' ? '取消换人' : '换人',
        homeSubButtonClass: side === 'home' ? 'sub-cancel' : '',
        awaySubButtonClass: side === 'away' ? 'sub-cancel' : ''
      });
    });
  },
  cancelSubstitution(message) {
    const patch = this.buildClearSubstitutionPatch();
    patch.substitutionHint = message || '点击后双方场地、比分和阵容同步互换。';
    this.setData(patch);
  },
  buildClearSubstitutionPatch() {
    return {
      homeStarters: this.data.homeStarters.map((item) => Object.assign({}, item, { cardClass: '', tagText: '' })),
      awayStarters: this.data.awayStarters.map((item) => Object.assign({}, item, { cardClass: '', tagText: '' })),
      homeBench: this.data.homeBench.map((item) => Object.assign({}, item, { chipClass: '', tagText: '' })),
      awayBench: this.data.awayBench.map((item) => Object.assign({}, item, { chipClass: '', tagText: '' })),
      substitutionMode: '',
      pendingOutId: '',
      homeSubButtonText: '换人',
      awaySubButtonText: '换人',
      homeSubButtonClass: '',
      awaySubButtonClass: ''
    };
  },
  updateSubstitutionMarks(side, pendingOutId) {
    const startersKey = side + 'Starters';
    const benchKey = side + 'Bench';
    const starters = this.data[startersKey].map((item) => Object.assign({}, item, {
      cardClass: item.id === pendingOutId ? 'selected-out' : 'sub-ready',
      tagText: item.id === pendingOutId ? '已选下' : '换下'
    }));
    const bench = this.data[benchKey].map((item) => Object.assign({}, item, {
      chipClass: pendingOutId ? 'sub-in-ready' : 'sub-in-wait',
      tagText: '换上'
    }));
    const patch = {};
    patch[startersKey] = starters;
    patch[benchKey] = bench;
    patch.pendingOutId = pendingOutId;
    patch.substitutionHint = pendingOutId ? '已选换下球员，请点击一名“换上”替补。' : '请选择一名标有“换下”的首发球员。';
    this.setData(patch);
  },

  findPlayer(side, id) {
    const list = this.data[side + 'Starters'] || [];
    return list.find((item) => item.id === id);
  },
  buildStatPopoverData(stats) {
    const safe = cloneStats(stats);
    return {
      scoreStatActions: [
        { key: 'score1', label: '罚球', value: '+1', primaryClass: '' },
        { key: 'score2', label: '两分', value: '+2', primaryClass: 'secondary' },
        { key: 'score3', label: '三分', value: '+3', primaryClass: '' }
      ],
      techStatActions: this.data.techStatTemplate.map((item) => Object.assign({}, item, { value: safe[item.key] || 0 })),
      selectedPlayerStats: [
        { label: '得分', value: safe.score },
        { label: '篮板', value: safe.rebound },
        { label: '助攻', value: safe.assist },
        { label: '抢断', value: safe.steal },
        { label: '盖帽', value: safe.block },
        { label: '失误', value: safe.turnover },
        { label: '犯规', value: safe.foul }
      ]
    };
  },
  openPlayerStats(side, player) {
    const stats = cloneStats(player.stats);
    const statData = this.buildStatPopoverData(stats);
    this.setData(Object.assign({
      selectedPlayer: Object.assign({}, player, { side, sideText: side === 'home' ? this.data.homeName : this.data.awayName }),
      statPopoverClass: side === 'away' ? 'away' : 'home',
      showPlayerStats: true
    }, statData));
  },
  refreshSelectedPlayer(side, id) {
    if (!this.data.showPlayerStats || !this.data.selectedPlayer || this.data.selectedPlayer.id !== id) return;
    const player = this.findPlayer(side, id);
    if (player) this.openPlayerStats(side, player);
  },
  closePlayerStats() { this.setData({ showPlayerStats: false }); },
  playerStatAction(event) {
    const action = event.currentTarget.dataset.key;
    const player = this.data.selectedPlayer;
    if (!player) return;
    if (action === 'score1') return this.addScore(player.side, 1, player.id);
    if (action === 'score2') { this.playMcAudio('two', '两分音效'); return this.addScore(player.side, 2, player.id); }
    if (action === 'score3') { this.playMcAudio('three', '三分音效'); return this.addScore(player.side, 3, player.id); }
    const labels = {
      rebound: '篮板',
      assist: '助攻',
      steal: '抢断',
      block: '盖帽',
      turnover: '失误',
      foul: '犯规'
    };
    this.bumpSelectedPlayerStat(player.side, player.id, action, labels[action] || action);
  },
  bumpPlayerStat(side, id, key, amount, patch) {
    const listKey = side + 'Starters';
    const list = this.data[listKey].map((item) => {
      if (item.id !== id) return item;
      const stats = cloneStats(item.stats);
      stats[key] = (stats[key] || 0) + amount;
      return Object.assign({}, item, { stats });
    });
    patch[listKey] = list;
  },
  bumpSelectedPlayerStat(side, id, key, actionLabel) {
    const patch = {};
    const team = side === 'home' ? this.data.homeName : this.data.awayName;
    const selected = this.data.selectedPlayer;
    const fallbackPlayer = selected && selected.id === id ? selected : null;
    const player = this.findPlayer(side, id) || fallbackPlayer;
    this.bumpPlayerStat(side, id, key, 1, patch);
    const statEvent = {
      id: Date.now(),
      time: this.eventTimeText(),
      team,
      action: (player ? ('#' + player.number + ' ' + player.name + ' ') : '') + (actionLabel || key) + ' +1',
      score: this.data.homeScore + '-' + this.data.awayScore
    };
    patch.events = [statEvent].concat(this.data.events).slice(0, 12);
    patch[side + 'Events'] = [statEvent].concat(this.data[side + 'Events']).slice(0, 8);
    this.setData(patch, () => {
      const latestPlayer = this.findPlayer(side, id);
      if (latestPlayer) this.openPlayerStats(side, latestPlayer);
    });
  },

  selectVoice(event) {
    const id = event.currentTarget.dataset.id;
    const voiceOptions = this.data.voiceOptions.map((item) => Object.assign({}, item, { activeClass: item.id === id ? 'active' : '' }));
    wx.setStorageSync(VOICE_STYLE_KEY, id);
    this.setData({ voiceOptions });
  },
  playSound(event) {
    const type = event.currentTarget.dataset.type;
    const sounds = this.data.commonSounds.concat(this.data.customSounds);
    const item = sounds.find((sound) => sound.type === type);
    if (!item) return;
    if (this.data.playingType === type) return this.stopAudio();
    this.playMcAudio(type, item.name);
  },
  playMcAudio(type, name) {
    const commonSounds = this.data.commonSounds.map((item) => Object.assign({}, item, { activeClass: item.type === type ? 'active' : '' }));
    const customSounds = this.data.customSounds.map((item) => Object.assign({}, item, { activeClass: item.type === type ? 'active' : '' }));
    this.setData({ playingType: type, currentAudioName: name, commonSounds, customSounds });
    this.playNativeAudio(type);
  },
  stopAudio() {
    const commonSounds = this.data.commonSounds.map((item) => Object.assign({}, item, { activeClass: '' }));
    const customSounds = this.data.customSounds.map((item) => Object.assign({}, item, { activeClass: '' }));
    this.stopNativeAudio();
    this.setData({ playingType: '', currentAudioName: '无', commonSounds, customSounds });
  },
  getAudioIds(type) {
    const settings = normalizeAudioSettings(wx.getStorageSync(AUDIO_SETTINGS_KEY));
    if (!this.audioEnabledForType(type, settings)) return [];
    const categoryKey = AUDIO_CATEGORY_BY_TYPE[type];
    if (categoryKey && settings.selectedAudio[categoryKey] && String(settings.selectedAudio[categoryKey]).indexOf('placeholder-') !== 0) {
      return [settings.selectedAudio[categoryKey]];
    }
    const storedSources = collectStoredAudioSources(type);
    const sources = storedSources.length ? storedSources : (AUDIO_FILE_IDS[type] || []);
    if (categoryKey && settings.modes && settings.modes[categoryKey] === 'random' && sources.length > 1) {
      return [sources[Math.floor(Math.random() * sources.length)]];
    }
    return sources;
  },
  audioEnabledForType(type, settings) {
    if (settings.masterEnabled === false) return false;
    if (type === 'two' && settings.twoEnabled === false) return false;
    if (type === 'three' && settings.threeEnabled === false) return false;
    if (type === 'buzzer' && settings.buzzerEnabled === false) return false;
    const categoryKey = AUDIO_CATEGORY_BY_TYPE[type];
    if (categoryKey && settings.categoryEnabled && settings.categoryEnabled[categoryKey] === false) return false;
    return true;
  },
  playNativeAudio(type) {
    const ids = this.getAudioIds(type);
    if (!ids.length || !wx.createInnerAudioContext) return;
    this.playAudioSource(ids[0]);
  },
  playAudioSource(fileId) {
    if (!fileId || !wx.createInnerAudioContext) return;
    const settings = normalizeAudioSettings(wx.getStorageSync(AUDIO_SETTINGS_KEY));
    if (settings.masterEnabled === false) return;
    const playSrc = (src) => {
      this.stopNativeAudio();
      this.audioContext = wx.createInnerAudioContext();
      this.audioContext.volume = Math.max(0, Math.min(1, Number(settings.volume || 70) / 100));
      this.audioContext.src = src;
      if (this.audioContext.onEnded) this.audioContext.onEnded(() => this.stopAudio());
      if (this.audioContext.onError) this.audioContext.onError(() => this.stopAudio());
      this.audioContext.play();
    };
    if (this.audioUrlCache[fileId]) {
      playSrc(this.audioUrlCache[fileId]);
      return;
    }
    if (wx.cloud && wx.cloud.getTempFileURL && fileId.indexOf('cloud://') === 0) {
      wx.cloud.getTempFileURL({
        fileList: [fileId],
        success: (res) => {
          const item = res.fileList && res.fileList[0];
          const tempUrl = item && item.tempFileURL;
          if (tempUrl) this.audioUrlCache[fileId] = tempUrl;
          playSrc(tempUrl || fileId);
        },
        fail: () => playSrc(fileId)
      });
      return;
    }
    playSrc(fileId);
  },
  stopNativeAudio() {
    if (!this.audioContext) return;
    this.audioContext.stop();
    this.audioContext.destroy();
    this.audioContext = null;
  },
  async announceScore() {
    const settings = normalizeAudioSettings(wx.getStorageSync(AUDIO_SETTINGS_KEY));
    if (settings.masterEnabled === false) {
      wx.showToast({ title: 'MC音效已关闭', icon: 'none' });
      return;
    }
    const text = this.data.homeName + ' ' + this.data.homeScore + ' 比 ' + this.data.awayScore + ' ' + this.data.awayName;
    this.setData({ playingType: 'voice', currentAudioName: '播报当前比分' });
    const result = await callCloud('sxCreateScoreVoice', {
      text,
      style: wx.getStorageSync(VOICE_STYLE_KEY) || 'standard'
    });
    const source = result && (result.tempFileURL || result.fileID);
    if (!result || !result.ok || !source) {
      wx.showToast({ title: voiceToastText(result), icon: 'none' });
      this.setData({ playingType: '', currentAudioName: '无' });
      return;
    }
    this.playAudioSource(source);
  },
  noop() {},
  goSettings() { wx.navigateTo({ url: '/pages/mc-settings/index' }); },
  goBack() {
    if (this.data.started) {
      if (wx.setPageOrientation) wx.setPageOrientation({ orientation: 'portrait' });
      this.setData({ started: false });
      return;
    }
    const pages = getCurrentPages ? getCurrentPages() : [];
    if (pages.length > 1) return wx.navigateBack();
    wx.reLaunch({ url: '/pages/home/index' });
  }
});
