const { callCloud } = require('../../utils/cloud');
const { buildScoreVoice } = require('../../utils/scoreVoice');
const { pullRoster, resolveImageUrl } = require('../../utils/roster-sync');

const BG = '/assets/pages/scorer-v2/background/scoreboard-court.png';
const SETUP_BG = '/pages/scorer/setup-court.png';
const TEAM_ASSET = '/assets/pages/scorer-v2/teams/';
const ICON_ASSET = '/assets/pages/scorer-v2/icons/';
const AUDIO_SETTINGS_KEY = 'sx_mc_audio_settings';
const CLOUD_AUDIO_MAP_KEY = 'sx_mc_audio_map';
const CLOUD_AUDIO_ITEMS_KEY = 'sx_mc_audio_items';
const CUSTOM_SLOTS_KEY = 'sx_mc_custom_slots';
const VOICE_STYLE_KEY = 'sx_score_voice_style';
const RECENT_MATCHES_KEY = 'sx_recent_matches';
const RECENT_MATCHES_LIMIT = 30;
const HID_SERVICE_UUID = '00001812-0000-1000-8000-00805F9B34FB';
function callWxApi(name, options) {
  return new Promise((resolve, reject) => {
    const method = wx[name];
    if (typeof method !== 'function') return reject(new Error(name + ' unavailable'));
    method(Object.assign({}, options || {}, { success: resolve, fail: reject }));
  });
}
function isHidService(uuid) { return String(uuid || '').replace(/-/g, '').toUpperCase().includes('1812'); }
function isHidReport(uuid) { return String(uuid || '').replace(/-/g, '').toUpperCase().includes('2A4D'); }
function bleDeviceName(device) { return (device && (device.localName || device.name)) || '\u672a\u547d\u540d\u84dd\u7259\u8bbe\u5907'; }
const DEFAULT_AUDIO_SETTINGS = {
  masterEnabled: true,
  volume: 70,
  twoEnabled: true,
  threeEnabled: true,
  buzzerEnabled: true,
  pauseAutoEnabled: true,
  categoryEnabled: { attack: true, defense: true, pause: true, buzzer: true, countdown: true },
  modes: { attack: 'fixed', defense: 'fixed', pause: 'random', buzzer: 'fixed', countdown: 'fixed' },
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
  cheer: ['cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/自定义音效/欢呼声(1).mp3'],
  horn: ['cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/自定义音效/冲锋号.mp3'],
  entry: ['cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/自定义音效/出场音乐.mp3'],
  anthem: ['cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/自定义音效/国歌.mp3'],
  other: ['cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/自定义音效/国歌.mp3'],
  freeThrowMade: ['cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/自定义音效/罚进音效.mp3'],
  freeThrowMiss: ['cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/自定义音效/罚球失误.mp3'],
  rest: [
    'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/暂停休息音乐/暂停音乐1.mp3',
    'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/暂停休息音乐/暂停音乐2.mp3'
  ],
  buzzer: ['cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/比赛音效/蜂鸣器.mp3'],
  countdown: ['cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/比赛音效/倒计时5秒.mp3'],
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
  freeThrowMade: ['freeThrowMade'],
  freeThrowMiss: ['freeThrowMiss'],
  buzzer: ['buzzer'],
  countdown: ['countdown'],
  two: ['two', 'score-two'],
  three: ['three', 'score-three']
};
const AUDIO_CATEGORY_BY_TYPE = { attack: 'attack', defense: 'defense', rest: 'pause', buzzer: 'buzzer', countdown: 'countdown' };
const SOUND_GLYPHS = {
  attack: '\u27a4',
  defense: '\u25c6',
  miss: '\u2715',
  cheer: '\u2605',
  horn: '\u266b',
  entry: '\u25b6',
  anthem: '\u266a',
  other: '\u266a',
  freeThrowMade: '\u2713',
  freeThrowMiss: '\u2715'
};

function formatClock(totalSeconds) {
  const safe = Math.max(0, totalSeconds || 0);
  const minutes = String(Math.floor(safe / 60)).padStart(2, '0');
  const seconds = String(safe % 60).padStart(2, '0');
  return minutes + ':' + seconds;
}

function formatAudioTime(totalSeconds) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const minutes = String(Math.floor(safe / 60)).padStart(2, '0');
  const seconds = String(safe % 60).padStart(2, '0');
  return minutes + ':' + seconds;
}

function cloneUndoValue(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
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
  return resolveImageUrl(
    player.avatar,
    player.avatarFileID,
    player.avatarUrl,
    player.photo,
    player.photoUrl,
    player.headImg,
    player.headImage,
    player.headUrl,
    player.image,
    player.imageUrl,
    player.portrait,
    player.faceUrl,
    player.profilePhoto
  ) || fallback;
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

const DEFAULT_CUSTOM_SOUND_META = [
  { type: 'miss', name: '投篮未进', source: AUDIO_FILE_IDS.miss[0] },
  { type: 'cheer', name: '欢呼声', source: AUDIO_FILE_IDS.cheer[0] },
  { type: 'horn', name: '冲锋号', source: AUDIO_FILE_IDS.horn[0] },
  { type: 'entry', name: '出场音乐', source: AUDIO_FILE_IDS.entry[0] },
  { type: 'anthem', name: '国歌', source: AUDIO_FILE_IDS.anthem[0] },
  { type: 'freeThrowMade', name: '罚进音效', source: AUDIO_FILE_IDS.freeThrowMade[0] },
  { type: 'freeThrowMiss', name: '罚球失误', source: AUDIO_FILE_IDS.freeThrowMiss[0] }
];

function buildConfiguredCustomSounds() {
  const saved = wx.getStorageSync(CUSTOM_SLOTS_KEY);
  const savedSlots = Array.isArray(saved) ? saved.filter((source) => source && String(source).indexOf('placeholder-') !== 0) : [];
  const audioItems = wx.getStorageSync(CLOUD_AUDIO_ITEMS_KEY) || [];
  return Array.from({ length: 6 }, (_, index) => {
    const savedValue = savedSlots[index] || '';
    const stored = audioItems.find((item) => item && (
      item.id === savedValue || item.key === savedValue ||
      (item.fileID || item.fileId || item.src) === savedValue
    )) || {};
    const fallback = DEFAULT_CUSTOM_SOUND_META[index] || {};
    const source = stored.fileID || stored.fileId || stored.src || (String(savedValue).indexOf('cloud://') === 0 ? savedValue : '') || fallback.source || '';
    const channel = stored.channel === 'shout' ? 'horn' : (stored.channel || fallback.type || ('custom-' + index));
    return {
      type: channel,
      name: stored.name || fallback.name || ('自定义音效' + (index + 1)),
      icon: ICON_ASSET + 'icon-mc-mvp-clean.png',
      glyph: SOUND_GLYPHS[channel] || '\u266a',
      source,
      audioIds: [source],
      activeClass: ''
    };
  });
}

function voiceToastText(result) {
  if (!result) return '语音播报生成失败';
  const code = result.code || '';
  const messageMap = {
    empty_text: '请先生成需要播报的文案',
    text_too_long: '播报文案过长，请缩短后再试',
    no_voice_credit: 'AI 播报暂不可用，请稍后重试',
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
    const logoUrl = resolveImageUrl(item.logoUrl, item.logoFileID, item.teamLogo, item.teamLogoFileID, item.logo);
    if (!map[key]) map[key] = { key, label, name: item.name || label, logoUrl, raw: item };
  });
  return Object.keys(map).map((key) => map[key]);
}

function getTeamLogo(team, side) {
  const logoUrl = team && resolveImageUrl(team.logoUrl, team.logoFileID, team.teamLogo, team.teamLogoFileID, team.logo);
  return logoUrl || TEAM_ASSET + (side === 'home' ? 'team-logo-left.png' : 'team-logo-right.png');
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
    avatar: getPlayerAvatar(player, side),
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
  shortcutActiveTimer: null,
  shortcutBleConnecting: false,
  shortcutBleDeviceId: '',
  shortcutBleServiceId: '',
  shortcutBleFoundHandler: null,
  shortcutBleValueHandler: null,
  shortcutPressedUsages: {},
  countdownLastPlayedAt: 0,
  audioContext: null,
  restAudioContext: null,
  restAudioProgressTimer: null,
  restAudioSeeking: false,
  restAudioTrackRect: null,
  audioUrlCache: {},
  matchRecordId: '',
  matchRecordCreatedAt: 0,
  matchRecordSaveTimer: null,
  matchEnded: false,
  matchHiddenAt: 0,
  matchClockWasRunning: false,
  matchShotClockWasRunning: false,
  undoStack: [],
  data: {
    started: false,
    bgImage: BG,
    setupBgImage: SETUP_BG,
    scorePageClass: 'score-page landscape-board tablet-board',
    setupPresetMinutes: [6, 8, 10, 12],
    setupPresetPeriods: [2, 4, 6],
    setupPresetIntervalMinutes: [1, 2, 3, 5],
    setupPresetHalftimeMinutes: [5, 10, 15, 20],
    homeName: '赛小蜂勇者',
    awayName: '赛小蜂闪电',
    teamOptions: [],
    hasExistingTeams: false,
    homeTeamUseExisting: false,
    awayTeamUseExisting: false,
    homeExistingModeClass: '',
    homeTemporaryModeClass: 'active',
    awayExistingModeClass: '',
    awayTemporaryModeClass: 'active',
    homeTeamIndex: -1,
    awayTeamIndex: -1,
    homeTeamPickerText: '请选择主队',
    awayTeamPickerText: '请选择客队',
    matchName: 'U10组 决赛',
    homeLogo: TEAM_ASSET + 'team-logo-left.png',
    awayLogo: TEAM_ASSET + 'team-logo-right.png',
    homeScore: 0,
    awayScore: 0,
    periodScores: [],
    maxPeriodReached: 1,
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
    intervalMinutes: 2,
    halftimeMinutes: 15,
    timeoutMinutes: 1,
    timerMode: 'down',
    timerModeDownClass: 'active',
    timerModeUpClass: '',
    clockSeconds: 600,
    clockText: '10:00',
    clockRunning: false,
    clockButtonText: '开始',
    homeStarters: [],
    awayStarters: [],
    homeBench: [],
    awayBench: [],
    homeHasRoster: false,
    awayHasRoster: false,
    teamEventPanelsVisible: true,
    rosterPickerVisible: false,
    rosterPickerSide: 'home',
    rosterPickerTarget: 'starter',
    rosterPickerTeamText: '主队',
    rosterPickerQuery: '',
    rosterPickerPlayers: [],
    rosterPickerStarterCount: 0,
    rosterPickerBenchCount: 0,
    rosterStarterTargetClass: 'active',
    rosterBenchTargetClass: '',
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
    shotClockEnabled: false,
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
    showRestAudioControls: false,
    restAudioPaused: false,
    restAudioButtonText: '暂停',
    restAudioProgress: 0,
    restAudioCurrentText: '00:00',
    restAudioDurationText: '00:00',
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
      { type: 'attack', name: '进攻音效', icon: ICON_ASSET + 'icon-tech-score-clean.png', glyph: SOUND_GLYPHS.attack, audioIds: AUDIO_FILE_IDS.attack, activeClass: '' },
      { type: 'defense', name: '防守音效', icon: ICON_ASSET + 'icon-mc-defense-clean.png', glyph: SOUND_GLYPHS.defense, audioIds: AUDIO_FILE_IDS.defense, activeClass: '' }
    ],
    scoringSounds: [
      { type: 'two', name: '2分音效', glyph: '2', audioIds: AUDIO_FILE_IDS.two, activeClass: '' },
      { type: 'three', name: '3分音效', glyph: '3', audioIds: AUDIO_FILE_IDS.three, activeClass: '' },
      { type: 'freeThrowMade', name: '罚球音效', glyph: SOUND_GLYPHS.freeThrowMade, audioIds: AUDIO_FILE_IDS.freeThrowMade, activeClass: '' },
      { type: 'freeThrowMiss', name: '罚球未进音效', glyph: SOUND_GLYPHS.freeThrowMiss, audioIds: AUDIO_FILE_IDS.freeThrowMiss, activeClass: '' }
    ],
    customSounds: buildConfiguredCustomSounds(),
    shortcutListening: false,
    shortcutCompatMode: false,
    shortcutCompatFocused: false,
    shortcutCompatValue: '',
    shortcutEffectText: '\u81ea\u5b9a\u4e49\u6309\u952e\u4e0d\u751f\u6548',
    shortcutEffectClass: 'disabled',
    bluetoothStateText: '\u25cb \u84dd\u7259\u672a\u8fde\u63a5',
    bluetoothStateClass: 'off',
    quickKeys: [
      { key: '1', label: '\u8fdb\u653b', type: 'attack', activeClass: '' },
      { key: '2', label: '\u9632\u5b88', type: 'defense', activeClass: '' },
      { key: '3', label: '2\u5206', type: 'two', activeClass: '' },
      { key: '4', label: '3\u5206', type: 'three', activeClass: '' },
      { key: '5', label: '\u672a\u8fdb', type: 'miss', activeClass: '' },
      { key: '6', label: '\u8702\u9e23\u5668', type: 'buzzer', activeClass: '' }
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
    this.boardOnly = !!(options && options.boardOnly === '1');
    if (options && options.mode === 'quick' && !this.boardOnly) {
      wx.redirectTo({ url: '/pages/scorer-board/index?mode=quick&boardOnly=1' });
      return;
    }
    const initialize = () => {
      if (this.rosterInitialized) return;
      this.rosterInitialized = true;
      this.loadTeamOptions();
      this.applyQuickMatchConfig(options);
      this.updateDigital();
      this.detectBoardSize();
      if (wx.onWindowResize) {
        this.resizeHandler = () => this.detectBoardSize();
        wx.onWindowResize(this.resizeHandler);
      }
    };
    const app = typeof getApp === 'function' ? getApp() : null;
    const rosterReady = app && app.globalData && app.globalData.rosterReady;
    Promise.resolve(rosterReady)
      .then((result) => result || pullRoster())
      .then(initialize)
      .catch((error) => {
        console.warn('[scorer] pull roster failed', error);
        initialize();
      });
  },

  onShow() {
    this.detectBoardSize();
    this.syncVoiceStyle();
    this.syncCustomSounds();
    if (this.data.started && this.matchHiddenAt) {
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - this.matchHiddenAt) / 1000));
      this.resumeElapsedMatchClock(elapsedSeconds, this.matchClockWasRunning, this.matchShotClockWasRunning);
    }
  },

  onHide() {
    if (!this.data.started) return;
    this.matchHiddenAt = Date.now();
    this.matchClockWasRunning = !!this.data.clockRunning;
    this.matchShotClockWasRunning = !!this.data.shotClockRunning;
    this.clearClock();
    this.clearShotClock();
    this.persistMatchRecord(this.matchEnded);
  },


  onUnload() {
    if (this.matchRecordSaveTimer) clearTimeout(this.matchRecordSaveTimer);
    if (this.data.started) this.persistMatchRecord(this.matchEnded);
    this.clearClock();
    this.clearShotClock();
    this.clearLongPress();
    this.stopNativeAudio();
    this.disconnectShortcutBle(true);
    if (this.shortcutActiveTimer) clearTimeout(this.shortcutActiveTimer);
    if (wx.offWindowResize && this.resizeHandler) wx.offWindowResize(this.resizeHandler);
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
      { key: 'fallback-home', label: this.data.homeName || '赛小蜂勇者', name: this.data.homeName || '赛小蜂勇者', logoUrl: this.data.homeLogo },
      { key: 'fallback-away', label: this.data.awayName || '赛小蜂闪电', name: this.data.awayName || '赛小蜂闪电', logoUrl: this.data.awayLogo }
    ];
    const teamOptions = libraryTeams.length ? libraryTeams : fallbackTeams;
    const homeTeamIndex = Math.min(Number(this.data.homeTeamIndex) || 0, teamOptions.length - 1);
    let awayTeamIndex = Math.min(Number(this.data.awayTeamIndex) || 1, teamOptions.length - 1);
    if (teamOptions.length > 1 && awayTeamIndex === homeTeamIndex) awayTeamIndex = homeTeamIndex === 0 ? 1 : 0;
    const homeTeam = teamOptions[homeTeamIndex] || teamOptions[0];
    const awayTeam = teamOptions[awayTeamIndex] || teamOptions[0];
    const editedNames = this.setupTeamNameEdited || {};
    const touchedModes = this.setupTeamModeTouched || {};
    const hasExistingTeams = libraryTeams.length > 0;
    const homeTeamUseExisting = touchedModes.home ? !!this.data.homeTeamUseExisting : false;
    const awayTeamUseExisting = touchedModes.away ? !!this.data.awayTeamUseExisting : false;
    this.setData({
      teamOptions,
      hasExistingTeams,
      homeTeamUseExisting,
      awayTeamUseExisting,
      homeExistingModeClass: homeTeamUseExisting ? 'active' : '',
      homeTemporaryModeClass: homeTeamUseExisting ? '' : 'active',
      awayExistingModeClass: awayTeamUseExisting ? 'active' : '',
      awayTemporaryModeClass: awayTeamUseExisting ? '' : 'active',
      homeTeamIndex,
      awayTeamIndex,
      homeTeamPickerText: homeTeam ? homeTeam.label : '请选择主队',
      awayTeamPickerText: awayTeam ? awayTeam.label : '请选择客队',
      homeName: editedNames.home || !homeTeamUseExisting ? this.data.homeName : (homeTeam ? homeTeam.label : this.data.homeName),
      awayName: editedNames.away || !awayTeamUseExisting ? this.data.awayName : (awayTeam ? awayTeam.label : this.data.awayName),
      homeLogo: editedNames.home || !homeTeamUseExisting ? this.data.homeLogo : getTeamLogo(homeTeam, 'home'),
      awayLogo: editedNames.away || !awayTeamUseExisting ? this.data.awayLogo : getTeamLogo(awayTeam, 'away')
    });
  },
  onHomeTeamChange(event) {
    const index = Number(event.detail.value) || 0;
    const team = this.data.teamOptions[index];
    if (!team) return;
    this.setData({ homeTeamIndex: index, homeTeamPickerText: team.label, homeName: team.label, homeLogo: getTeamLogo(team, 'home') });
  },
  onAwayTeamChange(event) {
    const index = Number(event.detail.value) || 0;
    const team = this.data.teamOptions[index];
    if (!team) return;
    this.setData({ awayTeamIndex: index, awayTeamPickerText: team.label, awayName: team.label, awayLogo: getTeamLogo(team, 'away') });
  },
  onSetupTeamNameInput(event) {
    const side = event.currentTarget.dataset.side === 'away' ? 'away' : 'home';
    this.setupTeamNameEdited = Object.assign({}, this.setupTeamNameEdited || {}, { [side]: true });
    const value = String((event.detail && event.detail.value) || '').slice(0, 12);
    this.setupTemporaryNames = Object.assign({}, this.setupTemporaryNames || {}, { [side]: value });
    const teamOptions = Array.isArray(this.data.teamOptions) ? this.data.teamOptions : [];
    const teamIndex = teamOptions.findIndex((team) => team && team.label === value);
    const team = teamIndex >= 0 ? teamOptions[teamIndex] : null;
    const patch = {};
    patch[side + 'Name'] = value;
    patch[side + 'TeamIndex'] = teamIndex;
    patch[side + 'Logo'] = getTeamLogo(team, side);
    this.setData(patch);
  },
  setSetupTeamMode(event) {
    const side = event.currentTarget.dataset.side === 'away' ? 'away' : 'home';
    const useExisting = event.currentTarget.dataset.mode === 'existing';
    if (useExisting && !this.data.hasExistingTeams) {
      wx.showToast({ title: '暂无已建球队，请使用临时球队', icon: 'none' });
      return;
    }
    this.setupTeamModeTouched = Object.assign({}, this.setupTeamModeTouched || {}, { [side]: true });
    const patch = {};
    patch[side + 'TeamUseExisting'] = useExisting;
    patch[side + 'ExistingModeClass'] = useExisting ? 'active' : '';
    patch[side + 'TemporaryModeClass'] = useExisting ? '' : 'active';
    if (useExisting) {
      if (!this.data[side + 'TeamUseExisting']) {
        this.setupTemporaryNames = Object.assign({}, this.setupTemporaryNames || {}, { [side]: this.data[side + 'Name'] || '' });
      }
      const fallbackIndex = side === 'away' && this.data.teamOptions.length > 1 ? 1 : 0;
      const currentIndex = Number(this.data[side + 'TeamIndex']);
      const teamIndex = currentIndex >= 0 && this.data.teamOptions[currentIndex] ? currentIndex : fallbackIndex;
      const team = this.data.teamOptions[teamIndex];
      patch[side + 'TeamIndex'] = teamIndex;
      patch[side + 'Name'] = team ? team.label : '';
      patch[side + 'TeamPickerText'] = team ? team.label : '请选择球队';
      patch[side + 'Logo'] = getTeamLogo(team, side);
      this.setupTeamNameEdited = Object.assign({}, this.setupTeamNameEdited || {}, { [side]: false });
    } else {
      const temporaryName = (this.setupTemporaryNames && this.setupTemporaryNames[side]) || '';
      patch[side + 'TeamIndex'] = -1;
      patch[side + 'Name'] = temporaryName;
      patch[side + 'Logo'] = getTeamLogo(null, side);
      this.setupTeamNameEdited = Object.assign({}, this.setupTeamNameEdited || {}, { [side]: true });
    }
    this.setData(patch);
  },

  setTimerMode(event) {
    const timerMode = event.currentTarget.dataset.mode;
    const clockSeconds = timerMode === 'down' ? this.data.periodMinutes * 60 : 0;
    this.clearClock();
    this.setData({
      timerMode,
      timerModeDownClass: timerMode === 'down' ? 'active' : '',
      timerModeUpClass: timerMode === 'up' ? 'active' : '',
      clockSeconds,
      clockText: formatClock(clockSeconds),
      clockRunning: false,
      clockButtonText: '开始'
    }, () => this.updateDigital());
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

  applyRestMinutes(kind, value) {
    const key = kind === 'halftime' ? 'halftimeMinutes' : 'intervalMinutes';
    const fallback = key === 'halftimeMinutes' ? 15 : 2;
    const max = key === 'halftimeMinutes' ? 30 : 10;
    const patch = {};
    patch[key] = Math.max(1, Math.min(max, Number(value) || fallback));
    this.setData(patch);
  },
  decreaseIntervalMinutes() { this.applyRestMinutes('interval', this.data.intervalMinutes - 1); },
  increaseIntervalMinutes() { this.applyRestMinutes('interval', this.data.intervalMinutes + 1); },
  setIntervalPreset(event) { this.applyRestMinutes('interval', Number(event.currentTarget.dataset.value)); },
  decreaseHalftimeMinutes() { this.applyRestMinutes('halftime', this.data.halftimeMinutes - 1); },
  increaseHalftimeMinutes() { this.applyRestMinutes('halftime', this.data.halftimeMinutes + 1); },
  setHalftimePreset(event) { this.applyRestMinutes('halftime', Number(event.currentTarget.dataset.value)); },

  applyQuickMatchConfig(options) {
    if (!options || options.mode !== 'quick') return;
    const config = wx.getStorageSync('quickMatchActiveConfig');
    if (!config || config.mode !== 'quick') return;
    const homeName = (config.homeTeam && config.homeTeam.name) || 'A?';
    const awayName = (config.awayTeam && config.awayTeam.name) || 'B?';
    const periodMinutes = Math.max(1, Number(config.periodMinutes) || 10);
    const totalPeriods = Math.max(1, Number(config.periods) || 4);
    const intervalMinutes = Math.max(1, Number(config.intervalMinutes) || 2);
    const halftimeMinutes = Math.max(1, Number(config.halftimeMinutes) || 15);
    const timeoutMinutes = Math.max(1, Number(config.timeoutMinutes) || 1);
    const timerMode = config.timerMode === 'up' ? 'up' : 'down';
    const clockSeconds = timerMode === 'down' ? periodMinutes * 60 : 0;
    const homePlayers = buildQuickPlayers('home', config.homePlayers);
    const awayPlayers = buildQuickPlayers('away', config.awayPlayers);
    this.setData({
      started: true,
      matchName: config.matchName || '????',
      homeName,
      awayName,
      homeLogo: getTeamLogo(config.homeTeam, 'home'),
      awayLogo: getTeamLogo(config.awayTeam, 'away'),
      period: 1,
      totalPeriods,
      periodMinutes,
      intervalMinutes,
      halftimeMinutes,
      timeoutMinutes,
      timerMode,
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
    }, () => this.persistMatchRecord(false));
  },

  startMatch() {
    const teamOptions = this.data.teamOptions && this.data.teamOptions.length ? this.data.teamOptions : normalizeLibraryTeams();
    const homeName = (this.data.homeName || '').trim() || '主队';
    const awayName = (this.data.awayName || '').trim() || '客队';
    const homeTeam = this.data.homeTeamUseExisting ? (teamOptions.find((team) => team && team.label === homeName) || null) : null;
    const awayTeam = this.data.awayTeamUseExisting ? (teamOptions.find((team) => team && team.label === awayName) || null) : null;
    const homeRoster = { starters: [], bench: [] };
    const awayRoster = { starters: [], bench: [] };
    wx.setStorageSync('quickMatchActiveConfig', {
      mode: 'quick',
      matchName: this.data.matchName || '快捷比赛',
      periods: this.data.totalPeriods,
      periodMinutes: this.data.periodMinutes,
      intervalMinutes: this.data.intervalMinutes,
      halftimeMinutes: this.data.halftimeMinutes,
      timeoutMinutes: this.data.timeoutMinutes,
      timerMode: this.data.timerMode,
      homeTeam: { name: homeName, logoUrl: getTeamLogo(homeTeam, 'home') },
      awayTeam: { name: awayName, logoUrl: getTeamLogo(awayTeam, 'away') },
      homePlayers: homeRoster.starters.concat(homeRoster.bench),
      awayPlayers: awayRoster.starters.concat(awayRoster.bench),
      createdAt: Date.now()
    });
    wx.navigateTo({ url: '/pages/scorer-board/index?mode=quick&boardOnly=1' });
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
  playCountdownCue() {
    const now = Date.now();
    if (now - this.countdownLastPlayedAt < 1500) return;
    this.countdownLastPlayedAt = now;
    this.playMcAudio('countdown', '倒计时5秒');
  },
  startShotClock() {
    if (!this.data.shotClockEnabled || this.data.shotClockRunning) return;
    const startValue = this.data.shotClock <= 0 ? 24 : this.data.shotClock;
    this.setData({ shotClock: startValue, shotClockDigits: buildDigitalItems(String(startValue).padStart(2, '0'), 'shot'), shotClockRunning: true, shotClockButtonText: '暂停' });
    if (startValue === 5) this.playCountdownCue();
    this.shotTimer = setInterval(() => {
      const next = Math.max(0, this.data.shotClock - 1);
      if (next === 5) this.playCountdownCue();
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
  resumeElapsedMatchClock(elapsedSeconds, clockWasRunning, shotClockWasRunning) {
    const elapsed = Math.max(0, Math.floor(Number(elapsedSeconds) || 0));
    let clockSeconds = Math.max(0, Number(this.data.clockSeconds) || 0);
    let shotClock = Math.max(0, Number(this.data.shotClock) || 0);
    if (clockWasRunning && elapsed > 0) {
      clockSeconds = this.data.timerMode === 'down'
        ? Math.max(0, clockSeconds - elapsed)
        : clockSeconds + elapsed;
    }
    if (shotClockWasRunning && elapsed > 0) shotClock = Math.max(0, shotClock - elapsed);
    const mainClockEnded = !!clockWasRunning && this.data.timerMode === 'down' && clockSeconds <= 0;
    const resumeMainClock = !!clockWasRunning && !mainClockEnded;
    const resumeShotClock = !!shotClockWasRunning && this.data.shotClockEnabled && shotClock > 0 && !mainClockEnded;
    this.matchHiddenAt = 0;
    this.matchClockWasRunning = false;
    this.matchShotClockWasRunning = false;
    this.setData({
      clockSeconds,
      clockText: formatClock(clockSeconds),
      clockRunning: false,
      clockButtonText: '开始',
      shotClock,
      shotClockDigits: buildDigitalItems(String(shotClock).padStart(2, '0'), 'shot'),
      shotClockRunning: false,
      shotClockButtonText: '开始'
    }, () => {
      this.updateDigital();
      if (resumeMainClock) this.toggleClock({ skipShotClock: true });
      if (resumeShotClock) this.startShotClock();
      if (mainClockEnded) this.handlePeriodEnd();
      this.scheduleMatchRecordSave();
    });
  },
  toggleClock(options) {
    const skipShotClock = !!(options && options.skipShotClock === true);
    if (this.data.clockRunning) {
      this.clearClock();
      this.pauseShotClock();
      this.setData({ clockRunning: false, clockButtonText: '开始' });
      return;
    }
    this.setData({ clockRunning: true, clockButtonText: '暂停' }, () => {
      if (!skipShotClock) this.startShotClock();
    });
    const currentRemaining = this.data.timerMode === 'down'
      ? this.data.clockSeconds
      : Math.max(0, this.data.periodMinutes * 60 - this.data.clockSeconds);
    if (currentRemaining === 5) this.playCountdownCue();
    this.timer = setInterval(() => {
      let next = this.data.timerMode === 'down' ? this.data.clockSeconds - 1 : this.data.clockSeconds + 1;
      const remaining = this.data.timerMode === 'down'
        ? next
        : Math.max(0, this.data.periodMinutes * 60 - next);
      if (remaining === 5) this.playCountdownCue();
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
    setTimeout(() => {
      wx.showModal({
        title: '本节结束',
        content: '蜂鸣器已响，是否播放暂停休息音乐？',
        confirmText: '播放',
        cancelText: '不播放',
        success: (result) => {
          if (result.confirm) this.playMcAudio('rest', '暂停音乐');
        }
      });
    }, 900);
  },
  resetClock() {
    const clockSeconds = this.data.timerMode === 'down' ? this.data.periodMinutes * 60 : 0;
    this.clearClock();
    this.clearShotClock();
    this.setData({ clockRunning: false, clockButtonText: '开始', clockSeconds, clockText: formatClock(clockSeconds), shotClock: 24, shotClockDigits: buildDigitalItems('24', 'shot'), shotClockRunning: false, shotClockButtonText: '开始' }, () => this.updateDigital());
  },
  prevPeriod() { this.setData({ period: Math.max(1, this.data.period - 1) }); this.resetClock(); },
  nextPeriod() {
    this.handlePeriodEnd();
    const period = Math.min(this.data.totalPeriods, this.data.period + 1);
    this.setData({ period, maxPeriodReached: Math.max(Number(this.data.maxPeriodReached || 1), period) });
    this.resetClock();
  },

  addHome1() { this.addScore('home', 1); },
  addHome2() { this.addScore('home', 2); },
  addHome3() { this.addScore('home', 3); },
  subtractHome1() { this.subtractScore('home'); },
  addAway1() { this.addScore('away', 1); },
  addAway2() { this.addScore('away', 2); },
  addAway3() { this.addScore('away', 3); },
  subtractAway1() { this.subtractScore('away'); },
  subtractScore(side) {
    const score = side === 'home' ? this.data.homeScore : this.data.awayScore;
    if (score <= 0) {
      wx.showToast({ title: '比分不能低于0', icon: 'none' });
      return;
    }
    this.addScore(side, -1);
  },
  startHome3Press() { this.startLongPress('home'); },
  startAway3Press() { this.startLongPress('away'); },
  startLongPress(side, playerId) {
    this.clearLongPress();
    this.playMcAudio('three', '三分音效');
    this.setData({ longPressActive: true, longPressText: '长按三分确认中', longPressProgress: 0 });
    let progress = 0;
    this.longPressTick = setInterval(() => {
      progress = Math.min(100, progress + 8);
      this.setData({ longPressProgress: progress });
    }, 50);
    this.longPressTimer = setTimeout(() => {
      this.addScore(side, 3, playerId);
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
    this.pushUndoSnapshot(points < 0 ? '减分' : '得分');
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
    const currentPeriod = Math.max(1, Number(this.data.period || 1));
    const periodScores = (Array.isArray(this.data.periodScores) ? this.data.periodScores : []).map((item) => Object.assign({}, item));
    let periodItem = periodScores.find((item) => Number(item.period) === currentPeriod);
    if (!periodItem) {
      periodItem = { period: currentPeriod, home: 0, away: 0 };
      periodScores.push(periodItem);
    }
    periodItem[side] = Number(periodItem[side] || 0) + points;
    periodScores.sort((a, b) => Number(a.period) - Number(b.period));
    patch.periodScores = periodScores;
    patch.maxPeriodReached = Math.max(Number(this.data.maxPeriodReached || 1), currentPeriod);
    const scoreEvent = {
      id: Date.now(),
      time: this.eventTimeText(),
      team,
      action: player ? ('#' + player.number + ' ' + player.name + ' 得分 +' + points) : (points < 0 ? '减分 -1' : ('得分 +' + points)),
      score: nextHome + '-' + nextAway
    };
    patch.events = [scoreEvent].concat(this.data.events).slice(0, 12);
    patch[side + 'Events'] = [scoreEvent].concat(this.data[side + 'Events']).slice(0, 8);
    if (playerId) this.bumpPlayerStat(side, playerId, 'score', points, patch);
    this.setData(patch, () => {
      this.updateDigital();
      if (playerId) this.refreshSelectedPlayer(side, playerId);
      this.scheduleMatchRecordSave();
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
  addHomeTimeout() { this.handleTeamTimeout('home', 'homeTimeouts', this.data.homeName); },
  addAwayTimeout() { this.handleTeamTimeout('away', 'awayTimeouts', this.data.awayName); },
  addCounter(side, key, team, action) {
    this.pushUndoSnapshot(action);
    const patch = {};
    const item = { id: Date.now(), time: this.eventTimeText(), team, action, score: this.data.homeScore + '-' + this.data.awayScore };
    patch[key] = this.data[key] + 1;
    patch.events = [item].concat(this.data.events).slice(0, 12);
    patch[side + 'Events'] = [item].concat(this.data[side + 'Events']).slice(0, 8);
    this.setData(patch, () => this.scheduleMatchRecordSave());
  },
  handleTeamTimeout(side, key, team) {
    this.addCounter(side, key, team, '暂停');
    this.playMcAudio('buzzer', '暂停蜂鸣器');
    this.clearClock();
    this.pauseShotClock();
    this.setData({ clockRunning: false, clockButtonText: '开始' });
    setTimeout(() => {
      wx.showModal({
        title: '暂停计时',
        content: '比赛时间已暂停，是否继续正常读秒？',
        confirmText: '继续读秒',
        cancelText: '保持暂停',
        success: (result) => {
          if (result.confirm && !this.data.clockRunning) this.toggleClock();
          this.askPauseMusic();
        },
        fail: () => this.askPauseMusic()
      });
    }, 500);
  },
  askPauseMusic() {
    wx.showModal({
      title: '暂停音乐',
      content: '是否播放暂停休息音乐？',
      confirmText: '播放',
      cancelText: '不播放',
      success: (result) => { if (result.confirm) this.playMcAudio('rest', '暂停音乐'); }
    });
  },

  confirmEndMatch() {
    const choices = [
      { mode: 'none', label: '不需要报告' },
      { mode: 'now', label: '需要报告，立即进入' },
      { mode: 'later', label: '需要报告，稍后提交签字' }
    ];
    wx.showActionSheet({
      itemList: choices.map((item) => item.label),
      success: (result) => {
        const choice = choices[result.tapIndex];
        if (!choice) return;
        wx.showModal({
          title: '确认结束比赛',
          content: choice.mode === 'none' ? '比赛将保存，但不会创建裁判报告。' : (choice.mode === 'now' ? '比赛将保存，并立即进入裁判签名页面。' : '比赛将保存为待签署报告，可稍后补交裁判签名。'),
          confirmText: '确认结束', confirmColor: '#e64340', cancelText: '继续比赛',
          success: (confirmResult) => { if (confirmResult.confirm) this.finishMatch(choice.mode); }
        });
      }
    });
  },
  finishMatch(reportMode) {
    this.clearClock();
    this.pauseShotClock();
    this.stopAudio();
    if (this.matchRecordSaveTimer) clearTimeout(this.matchRecordSaveTimer);
    this.matchRecordSaveTimer = null;
    this.setData({ clockRunning: false, clockButtonText: '\u5f00\u59cb' }, () => {
      const record = this.persistMatchRecord(true, reportMode || 'none');
      if (record) callCloud('sxSaveMatchResult', { result: record });
      const route = reportMode === 'now' && record ? '/pages/referee-report/index?recordId=' + encodeURIComponent(record.id) : '/pages/home/index';
      wx.showToast({ title: reportMode === 'later' ? '已保存为待签报告' : '\u6bd4\u8d5b\u5df2\u7ed3\u675f\u5e76\u4fdd\u5b58', icon: 'success' });
      setTimeout(() => wx.reLaunch({ url: route }), 500);
    });
  },

  confirmReset() {
    wx.showModal({
      title: '确认重置',
      content: '是否清空当前比分并重开本场比赛？',
      success: (res) => {
        if (!res.confirm) return;
        this.undoStack = [];
        this.clearClock();
        const clockSeconds = this.data.timerMode === 'down' ? this.data.periodMinutes * 60 : 0;
        this.setData({
          homeScore: 0,
          awayScore: 0,
          periodScores: [],
          maxPeriodReached: 1,
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

  pushUndoSnapshot(label) {
    const keys = [
      'homeName', 'awayName', 'homeLogo', 'awayLogo',
      'homeScore', 'awayScore', 'homeFouls', 'awayFouls', 'homeTimeouts', 'awayTimeouts',
      'periodScores', 'maxPeriodReached',
      'events', 'homeEvents', 'awayEvents',
      'homeStarters', 'awayStarters', 'homeBench', 'awayBench',
      'selectedPlayer', 'showPlayerStats',
      'substitutionMode', 'pendingOutId', 'substitutionHint',
      'homeSubButtonText', 'awaySubButtonText', 'homeSubButtonClass', 'awaySubButtonClass',
      'possession', 'leftPossessionClass', 'rightPossessionClass'
    ];
    const snapshot = { label: label || '上一操作', data: {} };
    keys.forEach((key) => { snapshot.data[key] = cloneUndoValue(this.data[key]); });
    this.undoStack = (this.undoStack || []).concat(snapshot).slice(-30);
  },

  undoLastAction() {
    const stack = this.undoStack || [];
    const snapshot = stack.pop();
    this.undoStack = stack;
    if (!snapshot) {
      wx.showToast({ title: '暂无可撤销操作', icon: 'none' });
      return;
    }
    this.setData(snapshot.data, () => {
      this.updateDigital();
      this.scheduleMatchRecordSave();
      wx.showToast({ title: '已撤销' + snapshot.label, icon: 'none' });
    });
  },
  swapSides() {
    wx.showModal({
      title: '确认交换场地',
      content: '主客队名称、比分、犯规、暂停和阵容将同步互换。',
      confirmText: '确认交换',
      success: (result) => {
        if (!result.confirm) return;
        this.pushUndoSnapshot('交换场地');
        this.setData({
          homeName: this.data.awayName,
          awayName: this.data.homeName,
          homeScore: this.data.awayScore,
          awayScore: this.data.homeScore,
          homeFouls: this.data.awayFouls,
          awayFouls: this.data.homeFouls,
          homeTimeouts: this.data.awayTimeouts,
          awayTimeouts: this.data.homeTimeouts,
          periodScores: (Array.isArray(this.data.periodScores) ? this.data.periodScores : []).map((item) => ({ period: item.period, home: Number(item.away || 0), away: Number(item.home || 0) })),
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
        }, () => {
          this.updateDigital();
          this.scheduleMatchRecordSave();
        });
      }
    });
  },
  clearEvents() { this.setData({ events: [], homeEvents: [], awayEvents: [] }); },
  clearHomeEvents() { this.setData({ homeEvents: [] }); },
  clearAwayEvents() { this.setData({ awayEvents: [] }); },

  openRosterPlayerPicker(event) {
    const side = event.currentTarget.dataset.side === 'away' ? 'away' : 'home';
    const players = readStorageList('players').filter((player) => player && player.enabled !== false);
    if (!players.length) {
      wx.showModal({
        title: '球员库为空',
        content: '请先创建球员，再返回计分板添加。',
        confirmText: '创建球员',
        success: (result) => {
          if (result.confirm) wx.navigateTo({ url: '/pages/player-add/index?from=scorer&side=' + side });
        }
      });
      return;
    }
    this.rosterPickerAllPlayers = players.map((player, index) => ({
      pickerId: String(player.id || ('player-' + index)),
      raw: player
    }));
    const starterCount = (this.data[side + 'Starters'] || []).length;
    const target = starterCount < 5 ? 'starter' : 'bench';
    this.setData({
      rosterPickerVisible: true,
      rosterPickerSide: side,
      rosterPickerTarget: target,
      rosterPickerTeamText: side === 'home' ? '主队' : '客队',
      rosterPickerQuery: ''
    }, () => this.refreshRosterPickerPlayers());
  },
  closeRosterPlayerPicker() {
    this.rosterPickerAllPlayers = [];
    this.setData({ rosterPickerVisible: false, rosterPickerQuery: '', rosterPickerPlayers: [] });
  },
  switchRosterPickerTarget(event) {
    const target = event.currentTarget.dataset.target === 'bench' ? 'bench' : 'starter';
    this.setData({ rosterPickerTarget: target }, () => this.refreshRosterPickerPlayers());
  },
  filterRosterPickerPlayers(event) {
    this.setData({ rosterPickerQuery: String((event.detail && event.detail.value) || '').trim() }, () => this.refreshRosterPickerPlayers());
  },
  refreshRosterPickerPlayers() {
    const side = this.data.rosterPickerSide === 'away' ? 'away' : 'home';
    const starters = Array.isArray(this.data[side + 'Starters']) ? this.data[side + 'Starters'] : [];
    const bench = Array.isArray(this.data[side + 'Bench']) ? this.data[side + 'Bench'] : [];
    const usedIds = starters.concat(bench).map((item) => String(item.sourcePlayerId || ''));
    const query = String(this.data.rosterPickerQuery || '').toLowerCase();
    const players = (this.rosterPickerAllPlayers || []).filter((entry) => {
      const player = entry.raw || {};
      return !query || String(player.name || '').toLowerCase().includes(query) || String(player.number || '').toLowerCase().includes(query);
    }).map((entry) => {
      const player = entry.raw || {};
      const disabled = usedIds.indexOf(String(player.id || '')) >= 0;
      return {
        pickerId: entry.pickerId,
        name: player.name || '未命名',
        number: String(player.number || '--'),
        position: player.position || (player.tags && player.tags[0]) || '球员',
        avatar: getPlayerAvatar(player, side),
        disabledClass: disabled ? 'disabled' : '',
        actionText: disabled ? '已添加' : '添加'
      };
    });
    this.setData({
      rosterPickerPlayers: players,
      rosterPickerStarterCount: starters.length,
      rosterPickerBenchCount: bench.length,
      rosterStarterTargetClass: this.data.rosterPickerTarget === 'starter' ? 'active' : '',
      rosterBenchTargetClass: this.data.rosterPickerTarget === 'bench' ? 'active' : ''
    });
  },
  addRosterPlayerFromPicker(event) {
    const pickerId = String(event.currentTarget.dataset.id || '');
    const entry = (this.rosterPickerAllPlayers || []).find((item) => item.pickerId === pickerId);
    if (!entry) return;
    const side = this.data.rosterPickerSide === 'away' ? 'away' : 'home';
    const target = this.data.rosterPickerTarget === 'bench' ? 'bench' : 'starter';
    const listKey = side + (target === 'bench' ? 'Bench' : 'Starters');
    const limit = target === 'bench' ? 6 : 5;
    const current = Array.isArray(this.data[listKey]) ? this.data[listKey] : [];
    if (current.length >= limit) {
      wx.showToast({ title: target === 'bench' ? '替补最多6人' : '首发最多5人', icon: 'none' });
      return;
    }
    const player = entry.raw || {};
    const allSelected = (this.data[side + 'Starters'] || []).concat(this.data[side + 'Bench'] || []);
    if (allSelected.some((item) => String(item.sourcePlayerId || '') === String(player.id || ''))) {
      wx.showToast({ title: '该球员已在本队阵容中', icon: 'none' });
      return;
    }
    this.pushUndoSnapshot('添加球员');
    const next = current.concat({
      id: side + '-' + target + '-' + (player.id || Date.now()),
      sourcePlayerId: player.id || '',
      number: String(player.number || '--'),
      name: player.name || '未命名',
      position: player.position || (player.tags && player.tags[0]) || '球员',
      avatar: getPlayerAvatar(player, side),
      cardClass: '',
      chipClass: '',
      tagText: '',
      stats: cloneStats(player.stats)
    });
    const patch = {};
    patch[listKey] = next;
    patch[side + 'HasRoster'] = true;
    this.setData(patch, () => {
      this.scheduleMatchRecordSave();
      this.refreshRosterPickerPlayers();
      wx.showToast({ title: '已添加到' + (target === 'bench' ? '替补' : '首发'), icon: 'success' });
    });
  },

  removeRosterPlayer(event) {
    const side = event.currentTarget.dataset.side === 'away' ? 'away' : 'home';
    const target = event.currentTarget.dataset.target === 'bench' ? 'bench' : 'starter';
    const id = String(event.currentTarget.dataset.id || '');
    const listKey = side + (target === 'bench' ? 'Bench' : 'Starters');
    const current = Array.isArray(this.data[listKey]) ? this.data[listKey] : [];
    const player = current.find((item) => String(item.id) === id);
    if (!player) return;
    wx.showModal({
      title: '移出本场阵容',
      content: '确认将“' + (player.name || '该球员') + '”移出' + (target === 'bench' ? '替补' : '首发') + '名单？球员库资料不会删除。',
      confirmText: '移出',
      confirmColor: '#e64340',
      success: (result) => {
        if (!result.confirm) return;
        this.pushUndoSnapshot('删除球员');
        const next = current.filter((item) => String(item.id) !== id);
        const otherKey = side + (target === 'bench' ? 'Starters' : 'Bench');
        const patch = {};
        patch[listKey] = next;
        patch[side + 'HasRoster'] = next.length + ((this.data[otherKey] || []).length) > 0;
        if (this.data.selectedPlayer && String(this.data.selectedPlayer.id) === id) {
          patch.selectedPlayer = null;
          patch.showPlayerStats = false;
        }
        this.setData(patch, () => {
          this.scheduleMatchRecordSave();
          if (this.data.rosterPickerVisible && this.data.rosterPickerSide === side) this.refreshRosterPickerPlayers();
          wx.showToast({ title: '已移出阵容', icon: 'success' });
        });
      }
    });
  },

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
    this.pushUndoSnapshot('换人');
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
    if (action === 'score2') return this.addScore(player.side, 2, player.id);
    if (action === 'score3') return this.addScore(player.side, 3, player.id);
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
  startSelectedPlayerThreePress() {
    const player = this.data.selectedPlayer;
    if (!player) return;
    this.startLongPress(player.side, player.id);
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
    this.pushUndoSnapshot(actionLabel || key);
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

  ensureMatchRecordIdentity() {
    if (this.matchRecordId) return this.matchRecordId;
    const active = wx.getStorageSync('quickMatchActiveConfig') || {};
    const createdAt = Number(active.createdAt) || Date.now();
    const gameRecordId = active.tournamentId && active.gameId ? ('game-' + active.tournamentId + '-' + active.gameId) : '';
    const recordId = String(active.recordId || gameRecordId || ('match-' + createdAt));
    this.matchRecordId = recordId;
    this.matchRecordCreatedAt = createdAt;
    if (active.mode === 'quick' && (!active.recordId || !active.createdAt)) {
      wx.setStorageSync('quickMatchActiveConfig', Object.assign({}, active, { recordId, createdAt }));
    }
    return recordId;
  },
  persistMatchRecord(ended, reportMode) {
    if (!this.data.started) return null;
    const now = Date.now();
    const id = this.ensureMatchRecordIdentity();
    const stored = wx.getStorageSync(RECENT_MATCHES_KEY);
    const list = Array.isArray(stored) ? stored : [];
    const existing = list.find((item) => String(item.id) === id) || {};
    const active = wx.getStorageSync('quickMatchActiveConfig') || {};
    const isEnded = ended === true || this.matchEnded === true;
    const maxPeriodReached = Math.max(1, Number(this.data.maxPeriodReached || this.data.period || 1));
    const sourcePeriodScores = Array.isArray(this.data.periodScores) ? this.data.periodScores : [];
    const normalizedPeriodScores = [];
    for (let periodIndex = 1; periodIndex <= maxPeriodReached; periodIndex += 1) {
      const sourcePeriod = sourcePeriodScores.find((item) => Number(item.period) === periodIndex) || {};
      normalizedPeriodScores.push({ period: periodIndex, home: Number(sourcePeriod.home || 0), away: Number(sourcePeriod.away || 0) });
    }
    if (ended === true) this.matchEnded = true;
    const record = Object.assign({}, existing, {
      id,
      source: active.source || 'scoreboard',
      tournamentId: active.tournamentId || '',
      gameId: active.gameId || '',
      matchName: this.data.matchName || active.matchName || '\u5feb\u6377\u6bd4\u8d5b',
      homeName: this.data.homeName,
      awayName: this.data.awayName,
      homeLogo: this.data.homeLogo || '',
      awayLogo: this.data.awayLogo || '',
      homeScore: Number(this.data.homeScore || 0),
      awayScore: Number(this.data.awayScore || 0),
      homeFouls: Number(this.data.homeFouls || 0),
      awayFouls: Number(this.data.awayFouls || 0),
      homeTimeouts: Number(this.data.homeTimeouts || 0),
      awayTimeouts: Number(this.data.awayTimeouts || 0),
      periodScores: normalizedPeriodScores,
      maxPeriodReached,
      period: Number(this.data.period || 1),
      totalPeriods: Number(this.data.totalPeriods || 4),
      periodMinutes: Number(this.data.periodMinutes || 10),
      clockSeconds: Number(this.data.clockSeconds || 0),
      clockText: this.data.clockText || '',
      clockRunning: !!this.data.clockRunning,
      timerMode: this.data.timerMode || 'down',
      shotClockEnabled: this.data.shotClockEnabled !== false,
      shotClock: Number(this.data.shotClock || 0),
      shotClockRunning: !!this.data.shotClockRunning,
      possession: this.data.possession || 'left',
      homeStarters: Array.isArray(this.data.homeStarters) ? this.data.homeStarters : [],
      awayStarters: Array.isArray(this.data.awayStarters) ? this.data.awayStarters : [],
      homeBench: Array.isArray(this.data.homeBench) ? this.data.homeBench : [],
      awayBench: Array.isArray(this.data.awayBench) ? this.data.awayBench : [],
      homeHasRoster: !!this.data.homeHasRoster,
      awayHasRoster: !!this.data.awayHasRoster,
      events: Array.isArray(this.data.events) ? this.data.events.slice(0, 20) : [],
      homeEvents: Array.isArray(this.data.homeEvents) ? this.data.homeEvents.slice(0, 12) : [],
      awayEvents: Array.isArray(this.data.awayEvents) ? this.data.awayEvents.slice(0, 12) : [],
      ended: isEnded,
      status: isEnded ? 'finished' : 'active',
      statusText: isEnded ? '\u5df2\u7ed3\u675f' : '\u672a\u7ed3\u675f',
      statusClass: isEnded ? 'done' : 'pending',
      createdAt: Number(existing.createdAt || this.matchRecordCreatedAt || now),
      updatedAt: now,
      endedAt: isEnded ? Number(existing.endedAt || now) : 0
    });
    if (reportMode) {
      record.reportMode = reportMode;
      record.reportRequested = reportMode !== 'none';
      record.reportStatus = reportMode === 'none' ? 'not_required' : 'pending_signature';
      record.reportRequestedAt = reportMode === 'none' ? 0 : now;
    }
    const next = [record].concat(list.filter((item) => String(item.id) !== id)).slice(0, RECENT_MATCHES_LIMIT);
    wx.setStorageSync(RECENT_MATCHES_KEY, next);
    return record;
  },
  scheduleMatchRecordSave() {
    if (!this.data.started) return;
    if (this.matchRecordSaveTimer) clearTimeout(this.matchRecordSaveTimer);
    this.matchRecordSaveTimer = setTimeout(() => {
      this.matchRecordSaveTimer = null;
      this.persistMatchRecord(false);
    }, 180);
  },

  syncCustomSounds() {
    this.setData({ customSounds: buildConfiguredCustomSounds() });
  },

  selectVoice(event) {
    const id = event.currentTarget.dataset.id;
    const voiceOptions = this.data.voiceOptions.map((item) => Object.assign({}, item, { activeClass: item.id === id ? 'active' : '' }));
    wx.setStorageSync(VOICE_STYLE_KEY, id);
    this.setData({ voiceOptions });
  },
  setShortcutListening(shortcutListening, statusText, statusClass) {
    this.setData({ shortcutListening, shortcutEffectText: shortcutListening ? '\u81ea\u5b9a\u4e49\u6309\u952e\u751f\u6548' : '\u81ea\u5b9a\u4e49\u6309\u952e\u4e0d\u751f\u6548', shortcutEffectClass: shortcutListening ? 'enabled' : 'disabled', bluetoothStateText: statusText || (shortcutListening ? '\u25cc BLE\u8fde\u63a5\u4e2d' : '\u25cb \u84dd\u7259\u672a\u8fde\u63a5'), bluetoothStateClass: statusClass || (shortcutListening ? 'pending' : 'off'), quickKeys: this.data.quickKeys.map((item) => Object.assign({}, item, { activeClass: '' })) });
  },
  onShortcutSwitchChange() {
    this.disconnectShortcutBle(true);
    this.setShortcutListening(false, '\u25cb \u84dd\u7259\u672a\u8fde\u63a5', 'off');
  },
  disableShortcutListening() { this.disconnectShortcutBle(); },
  async connectShortcutBle() {
    if (this.shortcutBleConnecting || this.shortcutBleDeviceId) return;
    this.shortcutBleConnecting = true;
    this.setShortcutListening(true, '\u25cc BLE\u641c\u7d22\u4e2d', 'pending');
    try {
      await callWxApi('openBluetoothAdapter');
      let devices = [];
      try { const result = await callWxApi('getConnectedBluetoothDevices', { services: [HID_SERVICE_UUID] }); devices = result.devices || []; } catch (e) {}
      let device = devices[0];
      let alreadyConnected = !!device;
      if (!device) {
        devices = await this.discoverShortcutBleDevices();
        if (!devices.length) throw new Error('no_ble_hid_device');
        device = devices.length === 1 ? devices[0] : await this.chooseShortcutBleDevice(devices);
      }
      if (!device) throw new Error('device_not_selected');
      await this.setupShortcutBleDevice(device, alreadyConnected);
    } catch (error) {
      console.warn('[scorer] BLE HID connect failed', error);
      this.setShortcutListening(false, '\u25cb BLE\u8fde\u63a5\u5931\u8d25', 'off');
      wx.showModal({ title: '\u8bbe\u5907\u4ec5\u652f\u6301\u666e\u901a\u952e\u76d8', content: '\u8bf7\u5148\u5728\u5e73\u677f\u7cfb\u7edf\u8bbe\u7f6e\u4e2d\u5173\u95ed\u201c\u8fde\u63a5\u5b9e\u4f53\u952e\u76d8\u65f6\u663e\u793a\u5c4f\u5e55\u952e\u76d8\u201d\uff0c\u518d\u542f\u7528\u517c\u5bb9\u6a21\u5f0f\u3002', confirmText: '\u517c\u5bb9\u6a21\u5f0f', cancelText: '\u53d6\u6d88', success: (result) => { if (result.confirm) this.enableShortcutCompatMode(); } });
    } finally { this.shortcutBleConnecting = false; }
  },
  discoverShortcutBleDevices() {
    return new Promise(async (resolve, reject) => {
      const found = Object.create(null);
      const finish = () => { try { wx.stopBluetoothDevicesDiscovery(); } catch (e) {} if (this.shortcutBleFoundHandler && wx.offBluetoothDeviceFound) wx.offBluetoothDeviceFound(this.shortcutBleFoundHandler); this.shortcutBleFoundHandler = null; resolve(Object.keys(found).map((key) => found[key])); };
      this.shortcutBleFoundHandler = (result) => { (result.devices || []).forEach((device) => { if (device && device.deviceId && (device.name || device.localName)) found[device.deviceId] = device; }); };
      wx.onBluetoothDeviceFound(this.shortcutBleFoundHandler);
      try { await callWxApi('startBluetoothDevicesDiscovery', { allowDuplicatesKey: false }); setTimeout(finish, 3500); } catch (error) { reject(error); }
    });
  },
  chooseShortcutBleDevice(devices) {
    return new Promise((resolve, reject) => wx.showActionSheet({ itemList: devices.slice(0, 6).map(bleDeviceName), success: (result) => resolve(devices[result.tapIndex]), fail: reject }));
  },
  async setupShortcutBleDevice(device, alreadyConnected) {
    if (!alreadyConnected) {
      try { await callWxApi('createBLEConnection', { deviceId: device.deviceId, timeout: 8000 }); } catch (error) { if (error.errCode !== 10003) throw error; }
    }
    const serviceResult = await callWxApi('getBLEDeviceServices', { deviceId: device.deviceId });
    const service = (serviceResult.services || []).find((item) => isHidService(item.uuid));
    if (!service) throw new Error('hid_service_missing');
    const characteristicResult = await callWxApi('getBLEDeviceCharacteristics', { deviceId: device.deviceId, serviceId: service.uuid });
    const characteristics = (characteristicResult.characteristics || []).filter((item) => item.properties && (item.properties.notify || item.properties.indicate));
    const reports = characteristics.filter((item) => isHidReport(item.uuid));
    const notifyItems = reports.length ? reports : characteristics;
    if (!notifyItems.length) throw new Error('hid_notify_missing');
    this.shortcutBleDeviceId = device.deviceId;
    this.shortcutBleServiceId = service.uuid;
    this.shortcutPressedUsages = {};
    this.shortcutBleValueHandler = (result) => { if (result.deviceId === this.shortcutBleDeviceId) this.handleShortcutBleReport(result.value); };
    wx.onBLECharacteristicValueChange(this.shortcutBleValueHandler);
    let subscribed = 0;
    for (const item of notifyItems) { try { await callWxApi('notifyBLECharacteristicValueChange', { state: true, deviceId: device.deviceId, serviceId: service.uuid, characteristicId: item.uuid }); subscribed += 1; } catch (e) {} }
    if (!subscribed) throw new Error('hid_notify_failed');
    this.setShortcutListening(true, '\u25cf BLE\u5df2\u8fde\u63a5', 'connected');
    wx.showToast({ title: bleDeviceName(device) + '\u5df2\u8fde\u63a5', icon: 'none' });
  },
  handleShortcutBleReport(value) {
    const bytes = new Uint8Array(value || new ArrayBuffer(0));
    const pressed = Object.create(null);
    for (let index = 0; index < bytes.length; index += 1) {
      const usage = bytes[index];
      if (usage < 0x1e || usage > 0x23) continue;
      pressed[usage] = true;
      if (!this.shortcutPressedUsages[usage]) this.triggerQuickKey(String(usage - 0x1d));
    }
    this.shortcutPressedUsages = pressed;
  },
  disconnectShortcutBle(silent) {
    try { wx.stopBluetoothDevicesDiscovery(); } catch (e) {}
    if (this.shortcutBleFoundHandler && wx.offBluetoothDeviceFound) wx.offBluetoothDeviceFound(this.shortcutBleFoundHandler);
    if (this.shortcutBleValueHandler && wx.offBLECharacteristicValueChange) wx.offBLECharacteristicValueChange(this.shortcutBleValueHandler);
    if (this.shortcutBleDeviceId && wx.closeBLEConnection) wx.closeBLEConnection({ deviceId: this.shortcutBleDeviceId });
    this.shortcutBleDeviceId = ''; this.shortcutBleServiceId = ''; this.shortcutBleFoundHandler = null; this.shortcutBleValueHandler = null; this.shortcutPressedUsages = {};
    if (!silent) {
      if (wx.hideKeyboard) wx.hideKeyboard({ fail: () => {} });
      this.setData({ shortcutCompatMode: false, shortcutCompatFocused: false, shortcutCompatValue: '' });
      this.setShortcutListening(false, '\u25cb BLE\u672a\u8fde\u63a5', 'off');
    }
  },
  enableShortcutCompatMode() {
    this.setData({ shortcutCompatMode: true, shortcutCompatFocused: true, shortcutCompatValue: '' });
    this.setShortcutListening(true, '\u25cf \u666e\u901a\u952e\u76d8\u6a21\u5f0f', 'connected');
  },
  onShortcutCompatFocus() { if (!this.data.shortcutCompatFocused) this.setData({ shortcutCompatFocused: true }); },
  onShortcutCompatBlur() {
    this.setData({ shortcutCompatMode: false, shortcutCompatFocused: false, shortcutCompatValue: '' });
    this.setShortcutListening(false, '\u25cb \u517c\u5bb9\u76d1\u542c\u5df2\u5173\u95ed', 'off');
  },
  onShortcutCompatInput(event) {
    if (!this.data.shortcutCompatMode) return;
    const keys = String((event.detail && event.detail.value) || '').match(/[1-6]/g) || [];
    keys.forEach((key) => this.triggerQuickKey(key));
    this.setData({ shortcutCompatValue: '' });
  },
  tapQuickKey(event) { if (!this.data.shortcutListening) return wx.showToast({ title: '\u8bf7\u5148\u5f00\u542f\u76d1\u542c\u5f00\u5173', icon: 'none' }); this.triggerQuickKey(String(event.currentTarget.dataset.key || '')); },
  triggerQuickKey(key) { const item = this.data.quickKeys.find((quickKey) => quickKey.key === key); if (!item) return; const sound = this.data.commonSounds.concat(this.data.customSounds).find((audio) => audio.type === item.type); this.playMcAudio(item.type, item.label, sound && sound.source); if (this.shortcutActiveTimer) clearTimeout(this.shortcutActiveTimer); this.setData({ quickKeys: this.data.quickKeys.map((quickKey) => Object.assign({}, quickKey, { activeClass: quickKey.key === key ? 'active' : '' })) }); this.shortcutActiveTimer = setTimeout(() => this.setData({ quickKeys: this.data.quickKeys.map((quickKey) => Object.assign({}, quickKey, { activeClass: '' })) }), 420); },

  playSound(event) {
    const type = event.currentTarget.dataset.type;
    const sounds = this.data.commonSounds.concat(this.data.scoringSounds || [], this.data.customSounds);
    const item = sounds.find((sound) => sound.type === type);
    if (!item) return;
    if (this.data.playingType === type) return this.stopAudio();
    this.playMcAudio(type, item.name, item.source);
  },
  playMcAudio(type, name, preferredSource) {
    const commonSounds = this.data.commonSounds.map((item) => Object.assign({}, item, { activeClass: item.type === type ? 'active' : '' }));
    const scoringSounds = this.data.scoringSounds.map((item) => Object.assign({}, item, { activeClass: item.type === type ? 'active' : '' }));
    const customSounds = this.data.customSounds.map((item) => Object.assign({}, item, { activeClass: item.type === type ? 'active' : '' }));
    this.setData({ playingType: type, currentAudioName: name, commonSounds, scoringSounds, customSounds, showRestAudioControls: false, restAudioPaused: false, restAudioButtonText: '暂停', restAudioProgress: 0, restAudioCurrentText: '00:00', restAudioDurationText: '00:00' });
    this.playNativeAudio(type, preferredSource);
  },
  stopAudio() {
    const commonSounds = this.data.commonSounds.map((item) => Object.assign({}, item, { activeClass: '' }));
    const scoringSounds = this.data.scoringSounds.map((item) => Object.assign({}, item, { activeClass: '' }));
    const customSounds = this.data.customSounds.map((item) => Object.assign({}, item, { activeClass: '' }));
    this.stopNativeAudio();
    this.setData({ playingType: '', currentAudioName: '无', commonSounds, scoringSounds, customSounds, showRestAudioControls: false, restAudioPaused: false, restAudioButtonText: '暂停', restAudioProgress: 0, restAudioCurrentText: '00:00', restAudioDurationText: '00:00' });
  },
  toggleRestAudio() {
    const context = this.getRestAudioContext();
    if (!context) return;
    const paused = typeof context.paused === 'boolean' ? context.paused : this.data.restAudioPaused;
    if (paused) {
      context.play();
      this.setData({ restAudioPaused: false, restAudioButtonText: '\u6682\u505c' });
    } else {
      context.pause();
      this.setData({ restAudioPaused: true, restAudioButtonText: '\u7ee7\u7eed' });
    }
  },
  getRestAudioContext() {
    return this.restAudioContext || (this.data.playingType === 'rest' ? this.audioContext : null);
  },
  startRestAudioProgressTimer() {
    this.stopRestAudioProgressTimer();
    this.syncRestAudioProgress();
    this.restAudioProgressTimer = setInterval(() => this.syncRestAudioProgress(), 250);
  },
  stopRestAudioProgressTimer() {
    if (this.restAudioProgressTimer) clearInterval(this.restAudioProgressTimer);
    this.restAudioProgressTimer = null;
  },
  seekRestAudioToProgress(value) {
    const context = this.getRestAudioContext();
    if (!context) return;
    const duration = Number(context.duration) || 0;
    if (!duration) return;
    const progress = Math.max(0, Math.min(100, Number(value) || 0));
    const current = duration * progress / 100;
    context.seek(current);
    this.setData({ restAudioProgress: progress, restAudioCurrentText: formatAudioTime(current) });
  },
  seekRestAudioByClientX(clientX) {
    const rect = this.restAudioTrackRect;
    if (!rect || !rect.width) return;
    this.seekRestAudioToProgress((Number(clientX) - rect.left) / rect.width * 100);
  },
  startRestAudioSeek(event) {
    const touch = event.touches && event.touches[0];
    if (!touch) return;
    this.restAudioSeeking = true;
    const applyTouch = (rect) => {
      if (!rect || !rect.width) return;
      this.restAudioTrackRect = rect;
      this.seekRestAudioByClientX(touch.clientX);
    };
    if (this.restAudioTrackRect) {
      applyTouch(this.restAudioTrackRect);
      return;
    }
    wx.createSelectorQuery().in(this).select('#restAudioTrack').boundingClientRect().exec((result) => applyTouch(result && result[0]));
  },
  moveRestAudioSeek(event) {
    const touch = event.touches && event.touches[0];
    if (!touch || !this.restAudioSeeking) return;
    this.seekRestAudioByClientX(touch.clientX);
  },
  endRestAudioSeek(event) {
    const touch = event.changedTouches && event.changedTouches[0];
    if (touch) this.seekRestAudioByClientX(touch.clientX);
    this.restAudioSeeking = false;
    this.restAudioTrackRect = null;
    this.syncRestAudioProgress();
  },
  syncRestAudioProgress() {
    const context = this.getRestAudioContext();
    if (!context || this.restAudioSeeking) return;
    const current = Number(context.currentTime) || 0;
    const duration = Number(context.duration) || 0;
    this.setData({
      restAudioProgress: duration > 0 ? Math.min(100, current / duration * 100) : 0,
      restAudioCurrentText: formatAudioTime(current),
      restAudioDurationText: formatAudioTime(duration)
    });
  },
  getAudioIds(type) {
    const settings = normalizeAudioSettings(wx.getStorageSync(AUDIO_SETTINGS_KEY));
    if (!this.audioEnabledForType(type, settings)) return [];
    const categoryKey = AUDIO_CATEGORY_BY_TYPE[type];
    const storedSources = collectStoredAudioSources(type);
    const fallbackSources = AUDIO_FILE_IDS[type] || [];
    const allSources = storedSources.concat(fallbackSources).filter((source, index, list) => source && list.indexOf(source) === index);
    if (categoryKey && settings.selectedAudio[categoryKey] && String(settings.selectedAudio[categoryKey]).indexOf('placeholder-') !== 0) {
      const selected = settings.selectedAudio[categoryKey];
      return [selected].concat(allSources.filter((source) => source !== selected));
    }
    if (categoryKey && settings.modes && settings.modes[categoryKey] === 'random' && allSources.length > 1) {
      const randomIndex = Math.floor(Math.random() * allSources.length);
      return [allSources[randomIndex]].concat(allSources.filter((source, index) => index !== randomIndex));
    }
    return allSources;
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
  playNativeAudio(type, preferredSource) {
    const fallbackIds = this.getAudioIds(type);
    const ids = preferredSource ? [preferredSource].concat(fallbackIds.filter((source) => source !== preferredSource)) : fallbackIds;
    if (!ids.length || !wx.createInnerAudioContext) return;
    this.playAudioQueue(ids, 0, type);
  },
  playAudioQueue(ids, index, type) {
    if (!ids || index >= ids.length) {
      this.stopAudio();
      wx.showToast({ title: '音效加载失败，请检查网络', icon: 'none' });
      return;
    }
    this.playAudioSource(ids[index], () => this.playAudioQueue(ids, index + 1, type), type);
  },
  playAudioSource(fileId, onFailure, type) {
    if (!fileId || !wx.createInnerAudioContext) return;
    const settings = normalizeAudioSettings(wx.getStorageSync(AUDIO_SETTINGS_KEY));
    if (settings.masterEnabled === false) return;
    const playSrc = (src) => {
      this.stopNativeAudio();
      const context = wx.createInnerAudioContext();
      this.audioContext = context;
      context.volume = Math.max(0, Math.min(1, Number(settings.volume || 70) / 100));
      context.src = src;
      if (type === 'rest') {
        this.restAudioContext = context;
        this.startRestAudioProgressTimer();
        this.setData({ showRestAudioControls: true, restAudioPaused: false, restAudioButtonText: '暂停' });
        if (this.audioContext.onCanplay) this.audioContext.onCanplay(() => this.syncRestAudioProgress());
        if (this.audioContext.onTimeUpdate) this.audioContext.onTimeUpdate(() => this.syncRestAudioProgress());
        if (this.audioContext.onPlay) this.audioContext.onPlay(() => this.setData({ restAudioPaused: false, restAudioButtonText: '暂停' }));
        if (this.audioContext.onPause) this.audioContext.onPause(() => this.setData({ restAudioPaused: true, restAudioButtonText: '继续' }));
      }
      if (this.audioContext.onEnded) this.audioContext.onEnded(() => this.stopAudio());
      if (this.audioContext.onError) this.audioContext.onError((error) => {
        console.warn('[scorer] audio playback failed', fileId, error);
        this.stopNativeAudio();
        if (onFailure) onFailure();
        else this.stopAudio();
      });
      this.audioContext.play();
    };
    const resolveWithCloudFunction = () => {
      callCloud('sxGetAudioUrl', { fileID: fileId }).then((result) => {
        const tempUrl = result && result.ok && result.tempFileURL;
        if (tempUrl) {
          this.audioUrlCache[fileId] = tempUrl;
          playSrc(tempUrl);
          return;
        }
        console.warn('[scorer] cloud function audio resolve failed', fileId, result);
        if (onFailure) onFailure();
        else this.stopAudio();
      });
    };
    const downloadCloudFile = () => {
      if (!wx.cloud || !wx.cloud.downloadFile) {
        resolveWithCloudFunction();
        return;
      }
      wx.cloud.downloadFile({
        fileID: fileId,
        success: (result) => {
          const tempFilePath = result && result.tempFilePath;
          if (tempFilePath) {
            this.audioUrlCache[fileId] = tempFilePath;
            playSrc(tempFilePath);
            return;
          }
          resolveWithCloudFunction();
        },
        fail: (error) => {
          console.warn('[scorer] download cloud audio failed', fileId, error);
          resolveWithCloudFunction();
        }
      });
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
          const invalidStatus = item && typeof item.status === 'number' && item.status !== 0;
          if (tempUrl) this.audioUrlCache[fileId] = tempUrl;
          if (tempUrl && !invalidStatus) playSrc(tempUrl);
          else downloadCloudFile();
        },
        fail: (error) => {
          console.warn('[scorer] resolve cloud audio failed', fileId, error);
          downloadCloudFile();
        }
      });
      return;
    }
    if (fileId.indexOf('cloud://') === 0) {
      downloadCloudFile();
      return;
    }
    playSrc(fileId);
  },
  stopNativeAudio() {
    const context = this.audioContext;
    this.stopRestAudioProgressTimer();
    this.restAudioContext = null;
    this.restAudioSeeking = false;
    this.restAudioTrackRect = null;
    if (!context) return;
    try { context.stop(); } catch (error) {}
    try { context.destroy(); } catch (error) {}
    if (this.audioContext === context) this.audioContext = null;
  },
  async announceScore() {
    const settings = normalizeAudioSettings(wx.getStorageSync(AUDIO_SETTINGS_KEY));
    if (settings.masterEnabled === false) {
      wx.showToast({ title: 'MC音效已关闭', icon: 'none' });
      return;
    }
    const style = wx.getStorageSync(VOICE_STYLE_KEY) || 'standard';
    const latestEvent = this.data.events && this.data.events[0] ? this.data.events[0].action : '';
    const text = buildScoreVoice({
      homeName: this.data.homeName,
      awayName: this.data.awayName,
      homeScore: this.data.homeScore,
      awayScore: this.data.awayScore,
      period: this.data.period,
      totalPeriods: this.data.totalPeriods,
      clockText: this.data.clockText,
      clockSeconds: this.data.clockSeconds,
      timerMode: this.data.timerMode,
      latestEvent
    }, style);
    this.setData({ playingType: 'voice', currentAudioName: '播报当前比分' });
    const result = await callCloud('sxCreateScoreVoice', {
      text,
      style,
      skipCredit: true
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
    if (this.data.started) this.persistMatchRecord(false);
    if (this.boardOnly) {
      const pages = getCurrentPages ? getCurrentPages() : [];
      if (pages.length > 1) return wx.navigateBack();
      wx.reLaunch({ url: '/pages/home/index' });
      return;
    }
    if (this.data.started) {
      this.setData({ started: false });
      return;
    }
    const pages = getCurrentPages ? getCurrentPages() : [];
    if (pages.length > 1) return wx.navigateBack();
    wx.reLaunch({ url: '/pages/home/index' });
  }
});
