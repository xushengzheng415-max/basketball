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
const CUSTOM_SLOT_DETAILS_KEY = 'sx_mc_custom_slot_details';
const VOICE_STYLE_KEY = 'sx_score_voice_style';
const VOICE_MODE_KEY = 'sx_score_voice_mode';
const AUDIO_CACHE_STORAGE_KEY = 'sx_local_audio_cache_v1';
const AUDIO_CACHE_ORDER_KEY = 'sx_local_audio_cache_order_v1';
const AUDIO_CACHE_CONSENT_KEY = 'sx_local_audio_cache_consent_v1';
const AUDIO_CACHE_LIMIT = 48;
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

function buildSimpleScoreVoice(data) {
  const period = Math.max(1, Number(data.period) || 1);
  const timePrefix = data.timerMode === 'down' ? '还剩' : '已经进行';
  const parts = String(data.clockText || '00:00').split(':');
  const minutes = Math.max(0, Number(parts[0]) || 0);
  const seconds = Math.max(0, Number(parts[1]) || 0);
  const durationText = minutes > 0
    ? `${minutes}分${seconds > 0 ? seconds + '秒' : ''}`
    : `${seconds}秒`;
  return `第${period}节，比赛${timePrefix}${durationText}。${data.homeName || '主队'}对${data.awayName || '客队'}，${Number(data.homeScore) || 0}比${Number(data.awayScore) || 0}。`;
}

function cloneUndoValue(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function formatAudioTime(totalSeconds) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
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
  const savedSlots = Array.isArray(saved) ? saved : [];
  const savedDetails = wx.getStorageSync(CUSTOM_SLOT_DETAILS_KEY);
  const slotDetails = Array.isArray(savedDetails) ? savedDetails : [];
  const audioItems = wx.getStorageSync(CLOUD_AUDIO_ITEMS_KEY) || [];
  return Array.from({ length: 6 }, (_, index) => {
    const savedValue = savedSlots[index] || '';
    const detail = slotDetails[index] || {};
    const stored = audioItems.find((item) => item && (
      item.id === savedValue || item.key === savedValue ||
      (item.fileID || item.fileId || item.src) === savedValue
    )) || {};
    const detailChannel = detail.channel === 'shout' ? 'horn' : detail.channel;
    const channelStored = audioItems.find((item) => {
      const itemChannel = item && item.channel === 'shout' ? 'horn' : (item && item.channel);
      return itemChannel && itemChannel === detailChannel;
    }) || {};
    const indexFallback = DEFAULT_CUSTOM_SOUND_META[index] || {};
    const savedFallback = DEFAULT_CUSTOM_SOUND_META.find((item) => item.source === savedValue);
    const fallback = DEFAULT_CUSTOM_SOUND_META.find((item) => item.type === detailChannel) || savedFallback || indexFallback;
    const source = stored.fileID || stored.fileId || stored.src || channelStored.fileID || channelStored.fileId || channelStored.src || detail.source || (String(savedValue).indexOf('cloud://') === 0 ? savedValue : '') || fallback.source || '';
    const storedChannel = stored.channel === 'shout' ? 'horn' : stored.channel;
    const channel = detailChannel || storedChannel || fallback.type || ('custom-' + index);
    return {
      type: channel,
      name: detail.name || stored.name || fallback.name || ('自定义音效' + (index + 1)),
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
  const raw = team && team.raw ? team.raw : {};
  const stableCloudLogo = [
    team && team.logoFileID,
    team && team.teamLogoFileID,
    raw.logoFileID,
    raw.teamLogoFileID,
    team && team.logoUrl,
    team && team.teamLogo,
    raw.logoUrl,
    raw.teamLogo
  ].map((value) => String(value || '')).find((value) => value.indexOf('cloud://') === 0);
  if (stableCloudLogo) return stableCloudLogo;
  const logoUrl = team && resolveImageUrl(team.logoUrl, team.logoFileID, team.teamLogo, team.teamLogoFileID, team.logo);
  return logoUrl || TEAM_ASSET + (side === 'home' ? 'team-logo-left.png' : 'team-logo-right.png');
}

function matchConfiguredTeam(configTeam, teamOptions) {
  if (!configTeam) return null;
  const values = [configTeam.id, configTeam.key, configTeam.name, configTeam.label]
    .map((value) => String(value || ''))
    .filter(Boolean);
  return (teamOptions || []).find((team) => {
    const raw = team && team.raw ? team.raw : {};
    return [team && team.key, team && team.label, team && team.name, raw.id, raw.key, raw.name, raw.label, raw.teamName]
      .map((value) => String(value || ''))
      .some((value) => value && values.indexOf(value) >= 0);
  }) || null;
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
    name: player.name || '未命名',
    position: player.position || '未知',
    avatar: getPlayerAvatar(player, side),
    cardClass: '',
    tagText: '',
    stats: cloneStats(player.stats)
  }));
}

function playerTeamGroup(player) {
  return String((player && player.team) || '').trim() || '无球队';
}

function playerAgeGroup(player) {
  const source = player || {};
  const directGroup = [source.ageGroup, source.group, source.category].find((value) => /U\s*\d{1,2}/i.test(String(value || '')));
  if (directGroup) {
    const match = String(directGroup).match(/U\s*(\d{1,2})/i);
    if (match) return 'U' + Number(match[1]);
  }
  let age = Number(source.age) || 0;
  if (!age && Array.isArray(source.tags)) {
    const ageTag = source.tags.find((tag) => /\d{1,2}\s*岁/.test(String(tag || '')));
    const match = ageTag && String(ageTag).match(/(\d{1,2})\s*岁/);
    age = match ? Number(match[1]) : 0;
  }
  return age > 0 ? 'U' + age : '年龄未填';
}
Page({
  timer: null,
  shotTimer: null,
  restTimer: null,
  restEndsAt: 0,
  periodEndPromptTimer: null,
  periodEndHandled: 0,
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
  audioDownloadPromises: {},
  persistentAudioCache: {},
  persistentAudioConsent: '',
  audioConsentPromptOpen: false,
  audioPreloadStarted: false,
  audioPreloadStopped: false,
  audioLibrarySyncPromise: null,
  matchRecordId: '',
  matchRecordCreatedAt: 0,
  matchRecordSaveTimer: null,
  matchEnded: false,
  matchHiddenAt: 0,
  matchClockWasRunning: false,
  matchShotClockWasRunning: false,
  undoStack: [],
  data: {
    started: true,
    bgImage: BG,
    setupBgImage: SETUP_BG,
    scorePageClass: 'score-page landscape-board tablet-board',
    rosterDrawerToggleVisible: true,
    rosterDrawerClass: 'roster-collapsed',
    rosterDrawerButtonClass: '',
    rosterDrawerButtonText: '显示阵容',
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
    restCountdownVisible: false,
    restCountdownRunning: false,
    restKind: 'period',
    restSeconds: 0,
    restText: '00:00',
    restTitle: '节间休息',
    restHint: '倒计时结束后进入下一节',
    restNextPeriod: 2,
    restButtonText: '暂停倒计时',
    restSkipText: '跳过休息',
    timerMode: 'down',
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
    teamEventPanelsVisible: false,
    rosterPickerVisible: false,
    rosterBatchVisible: true,
    rosterPickerSide: 'home',
    rosterPickerTarget: 'starter',
    rosterPickerTeamText: '主队',
    rosterPickerQuery: '',
    rosterPickerPlayers: [],
    rosterPickerGroupMode: 'team',
    rosterPickerSelectedGroups: [],
    rosterPickerSelectedPlayerIds: [],
    rosterPickerNumberMap: {},
    rosterPickerGroupOptions: [],
    rosterBatchSelecting: false,
    rosterTeamModeClass: 'active',
    rosterAgeModeClass: '',
    rosterBatchButtonClass: 'disabled',
    rosterBatchButtonText: '请选择球队',
    rosterBatchAvailableCount: 0,
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
    mcVoiceIcon: ICON_ASSET + 'icon-mc-attack-clean.png',
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
      { id: 'live', name: '赛小锦', icon: ICON_ASSET + 'icon-mc-score-voice-clean.png', activeClass: '' },
      { id: 'kids', name: '赛小萌', icon: ICON_ASSET + 'icon-mc-score-voice-clean.png', activeClass: '' }
    ],
    commonSounds: [
      { type: 'attack', name: '进攻音效', icon: ICON_ASSET + 'icon-tech-score-clean.png', glyph: SOUND_GLYPHS.attack, audioIds: AUDIO_FILE_IDS.attack, activeClass: '' },
      { type: 'defense', name: '防守音效', icon: ICON_ASSET + 'icon-mc-defense-clean.png', glyph: SOUND_GLYPHS.defense, audioIds: AUDIO_FILE_IDS.defense, activeClass: '' }
    ],
    scoringSounds: [],
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
    this.boardOnly = true;
    this.loadPersistentAudioCache();
    if (options && options.mode === 'quick' && !this.boardOnly) {
      wx.redirectTo({ url: '/pages/scorer-board/index?mode=quick&boardOnly=1' });
      return;
    }
    const initialize = () => {
      if (this.rosterInitialized) return;
      this.rosterInitialized = true;
      this.loadTeamOptions();
      const resumeId = options && options.resumeId ? decodeURIComponent(String(options.resumeId)) : '';
      const restored = resumeId ? this.restoreMatchRecord(resumeId) : false;
      if (resumeId && !restored) {
        wx.showToast({ title: '\u672a\u627e\u5230\u53ef\u6062\u590d\u7684\u6bd4\u8d5b', icon: 'none' });
        setTimeout(() => wx.reLaunch({ url: '/pages/home/index' }), 500);
        return;
      }
      if (!restored) this.applyQuickMatchConfig(options);
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
        console.warn('[scorer-board] pull roster failed', error);
        initialize();
      });
  },

  onShow() {
    this.detectBoardSize();
    this.syncVoiceStyle();
    this.syncCustomSounds();
    this.refreshCloudAudioLibrary().finally(() => this.preloadCommonAudio());
    if (this.data.restCountdownVisible && this.data.restCountdownRunning) this.resumeRestCountdown();
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
    this.clearRestCountdownTimer();
    this.persistMatchRecord(this.matchEnded);
  },


  onUnload() {
    this.audioPreloadStopped = true;
    if (this.matchRecordSaveTimer) clearTimeout(this.matchRecordSaveTimer);
    if (this.data.started) this.persistMatchRecord(this.matchEnded);
    this.clearClock();
    this.clearShotClock();
    this.clearRestCountdownTimer();
    if (this.periodEndPromptTimer) clearTimeout(this.periodEndPromptTimer);
    this.periodEndPromptTimer = null;
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
    const storedStyle = wx.getStorageSync(VOICE_STYLE_KEY) || 'standard';
    const voiceStyle = this.data.voiceOptions.some((item) => item.id === storedStyle) ? storedStyle : 'standard';
    if (voiceStyle !== storedStyle) wx.setStorageSync(VOICE_STYLE_KEY, voiceStyle);
    const voiceOptions = this.data.voiceOptions.map((item) => Object.assign({}, item, { activeClass: item.id === voiceStyle ? 'active' : '' }));
    this.setData({ voiceOptions });
  },

  setVoiceButtonActive(active) {
    const classes = String(this.data.scorePageClass || '').split(/\s+/).filter(Boolean).filter((item) => item !== 'voice-active');
    if (active) classes.push('voice-active');
    this.setData({ scorePageClass: classes.join(' ') });
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
    const homeTeam = matchConfiguredTeam(config.homeTeam, this.data.teamOptions) || config.homeTeam;
    const awayTeam = matchConfiguredTeam(config.awayTeam, this.data.teamOptions) || config.awayTeam;
    this.setData({
      started: true,
      matchName: config.matchName || '未命名比赛',
      homeName,
      awayName,
      homeLogo: getTeamLogo(homeTeam, 'home'),
      awayLogo: getTeamLogo(awayTeam, 'away'),
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
      clockButtonText: '开始',
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
  toggleRosterDrawer() {
    const open = this.data.rosterDrawerClass !== 'roster-open';
    this.setData({
      rosterDrawerClass: open ? 'roster-open' : 'roster-collapsed',
      rosterDrawerButtonClass: open ? 'active' : '',
      rosterDrawerButtonText: open ? '收起阵容' : '显示阵容'
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
    if (this.data.restCountdownVisible) {
      wx.showToast({ title: '请先结束节间休息', icon: 'none' });
      return;
    }
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
    const currentPeriod = Math.max(1, Number(this.data.period) || 1);
    if (this.periodEndHandled === currentPeriod || this.data.restCountdownVisible) return;
    this.periodEndHandled = currentPeriod;
    this.playMcAudio('buzzer', '本节结束蜂鸣器');
    if (currentPeriod >= Number(this.data.totalPeriods || 4)) return;
    if (this.periodEndPromptTimer) clearTimeout(this.periodEndPromptTimer);
    this.periodEndPromptTimer = setTimeout(() => {
      this.periodEndPromptTimer = null;
      wx.showModal({
        title: '第 ' + currentPeriod + ' 节结束',
        content: '是否播放休息音乐？确认后开始休息倒计时。',
        confirmText: '播放音乐',
        cancelText: '仅倒计时',
        success: (result) => this.startPeriodRest(!!result.confirm),
        fail: () => this.startPeriodRest(false)
      });
    }, 900);
  },
  clearRestCountdownTimer() {
    if (this.restTimer) clearInterval(this.restTimer);
    this.restTimer = null;
  },
  restDurationForPeriod(period) {
    const halftimeAfter = Math.ceil(Math.max(2, Number(this.data.totalPeriods) || 4) / 2);
    const isHalftime = Number(period) === halftimeAfter;
    return {
      isHalftime,
      minutes: isHalftime ? Number(this.data.halftimeMinutes || 15) : Number(this.data.intervalMinutes || 2)
    };
  },
  startPeriodRest(playMusic) {
    const currentPeriod = Math.max(1, Number(this.data.period) || 1);
    if (currentPeriod >= Number(this.data.totalPeriods || 4)) return;
    const duration = this.restDurationForPeriod(currentPeriod);
    const seconds = Math.max(1, duration.minutes * 60);
    this.clearRestCountdownTimer();
    this.restEndsAt = Date.now() + seconds * 1000;
    this.setData({
      restCountdownVisible: true,
      restCountdownRunning: true,
      restKind: 'period',
      restSeconds: seconds,
      restText: formatClock(seconds),
      restTitle: duration.isHalftime ? '中场休息' : '节间休息',
      restHint: '倒计时结束后进入第 ' + (currentPeriod + 1) + ' 节',
      restNextPeriod: currentPeriod + 1,
      restButtonText: '暂停倒计时',
      restSkipText: '跳过休息'
    }, () => {
      if (playMusic) this.playMcAudio('rest', duration.isHalftime ? '中场休息音乐' : '节间休息音乐');
      this.resumeRestCountdown();
    });
  },
  startTeamTimeout(playMusic) {
    const seconds = Math.max(1, Number(this.data.timeoutMinutes || 1) * 60);
    this.clearRestCountdownTimer();
    this.restEndsAt = Date.now() + seconds * 1000;
    this.setData({
      restCountdownVisible: true,
      restCountdownRunning: true,
      restKind: 'timeout',
      restSeconds: seconds,
      restText: formatClock(seconds),
      restTitle: '球队暂停',
      restHint: '倒计时结束后比赛准备继续',
      restNextPeriod: this.data.period,
      restButtonText: '暂停倒计时',
      restSkipText: '结束暂停'
    }, () => {
      if (playMusic) this.playMcAudio('rest', '暂停音乐');
      this.resumeRestCountdown();
    });
  },
  resumeRestCountdown() {
    if (!this.data.restCountdownVisible || !this.data.restCountdownRunning) return;
    if (!this.restEndsAt) this.restEndsAt = Date.now() + Math.max(0, Number(this.data.restSeconds) || 0) * 1000;
    this.clearRestCountdownTimer();
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((this.restEndsAt - Date.now()) / 1000));
      if (remaining !== this.data.restSeconds) this.setData({ restSeconds: remaining, restText: formatClock(remaining) });
      if (remaining <= 0) this.finishRestCountdown(true);
    };
    tick();
    if (this.data.restCountdownVisible) this.restTimer = setInterval(tick, 250);
  },
  toggleRestCountdown() {
    if (!this.data.restCountdownVisible) return;
    if (this.data.restCountdownRunning) {
      const remaining = Math.max(0, Math.ceil((this.restEndsAt - Date.now()) / 1000));
      this.clearRestCountdownTimer();
      this.restEndsAt = 0;
      this.setData({ restCountdownRunning: false, restSeconds: remaining, restText: formatClock(remaining), restButtonText: '继续倒计时' });
      return;
    }
    this.restEndsAt = Date.now() + Math.max(0, Number(this.data.restSeconds) || 0) * 1000;
    this.setData({ restCountdownRunning: true, restButtonText: '暂停倒计时' }, () => this.resumeRestCountdown());
  },
  finishRestCountdown(playEndBuzzer) {
    if (!this.data.restCountdownVisible) return;
    const isTimeout = this.data.restKind === 'timeout';
    const nextPeriod = Math.min(Number(this.data.totalPeriods || 4), Number(this.data.restNextPeriod || this.data.period + 1));
    this.clearRestCountdownTimer();
    this.restEndsAt = 0;
    if (this.data.playingType === 'rest') this.stopAudio();
    this.periodEndHandled = 0;
    const patch = {
      restCountdownVisible: false,
      restCountdownRunning: false,
      restSeconds: 0,
      restText: '00:00'
    };
    if (!isTimeout) {
      patch.period = nextPeriod;
      patch.maxPeriodReached = Math.max(Number(this.data.maxPeriodReached || 1), nextPeriod);
    }
    this.setData(patch, () => {
      if (!isTimeout) this.resetClock();
      if (playEndBuzzer) this.playMcAudio('buzzer', isTimeout ? '暂停结束蜂鸣器' : '休息结束蜂鸣器');
      wx.showToast({ title: isTimeout ? '暂停结束，比赛准备继续' : ('第 ' + nextPeriod + ' 节准备开始'), icon: 'none' });
    });
  },
  skipRestCountdown() { this.finishRestCountdown(false); },
  cancelPeriodEndPrompt() {
    if (this.periodEndPromptTimer) clearTimeout(this.periodEndPromptTimer);
    this.periodEndPromptTimer = null;
    this.periodEndHandled = 0;
  },
  resetClock() {
    const clockSeconds = this.data.timerMode === 'down' ? this.data.periodMinutes * 60 : 0;
    this.clearClock();
    this.clearShotClock();
    this.setData({ clockRunning: false, clockButtonText: '开始', clockSeconds, clockText: formatClock(clockSeconds), shotClock: 24, shotClockDigits: buildDigitalItems('24', 'shot'), shotClockRunning: false, shotClockButtonText: '开始' }, () => this.updateDigital());
  },
  prevPeriod() {
    if (this.data.restCountdownVisible) this.finishRestCountdown(false);
    this.cancelPeriodEndPrompt();
    this.setData({ period: Math.max(1, this.data.period - 1) });
    this.resetClock();
  },
  nextPeriod() {
    if (this.data.restCountdownVisible) {
      this.finishRestCountdown(false);
      return;
    }
    this.cancelPeriodEndPrompt();
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
    this.pushUndoSnapshot(points < 0 ? '减分' : '得分', side);
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
    if (playerId) {
      this.bumpPlayerStat(side, playerId, 'score', points, patch);
      patch.selectedPlayer = null;
      patch.showPlayerStats = false;
    }
    this.setData(patch, () => {
      this.updateDigital();
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
    this.pushUndoSnapshot(action, side);
    const patch = {};
    const item = { id: Date.now(), time: this.eventTimeText(), team, action, score: this.data.homeScore + '-' + this.data.awayScore };
    patch[key] = this.data[key] + 1;
    patch.events = [item].concat(this.data.events).slice(0, 12);
    patch[side + 'Events'] = [item].concat(this.data[side + 'Events']).slice(0, 8);
    this.setData(patch, () => this.scheduleMatchRecordSave());
  },
  handleTeamTimeout(side, key, team) {
    if (this.data.restCountdownVisible) {
      wx.showToast({ title: '当前已有休息倒计时', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '暂停期间比赛计时',
      content: '暂停期间，总比赛时间是否继续走？',
      confirmText: '继续走时',
      cancelText: '暂停计时',
      success: (result) => this.beginTeamTimeout(side, key, team, !!result.confirm),
      fail: () => this.beginTeamTimeout(side, key, team, false)
    });
  },
  beginTeamTimeout(side, key, team, keepGameClockRunning) {
    this.addCounter(side, key, team, '暂停');
    this.pauseShotClock();
    if (keepGameClockRunning) {
      if (!this.data.clockRunning) this.toggleClock({ skipShotClock: true });
    } else {
      this.clearClock();
      this.setData({ clockRunning: false, clockButtonText: '开始' });
    }
    this.playMcAudio('buzzer', '暂停蜂鸣器');
    setTimeout(() => {
      wx.showModal({
        title: '球队暂停',
        content: '是否播放暂停音乐？确认后开始 1 分钟倒计时。',
        confirmText: '播放音乐',
        cancelText: '仅倒计时',
        success: (result) => this.startTeamTimeout(!!result.confirm),
        fail: () => this.startTeamTimeout(false)
      });
    }, 500);
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
    this.clearRestCountdownTimer();
    this.cancelPeriodEndPrompt();
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
        this.clearRestCountdownTimer();
        this.cancelPeriodEndPrompt();
        if (this.data.playingType === 'rest') this.stopAudio();
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
          restCountdownVisible: false,
          restCountdownRunning: false,
          restSeconds: 0,
          restText: '00:00',
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

  pushUndoSnapshot(label, side) {
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
    const snapshot = { label: label || '上一操作', side: side || '', data: {} };
    keys.forEach((key) => { snapshot.data[key] = cloneUndoValue(this.data[key]); });
    this.undoStack = (this.undoStack || []).concat(snapshot).slice(-30);
  },

  undoLastAction() {
    const stack = this.undoStack || [];
    const snapshot = stack.pop();
    this.undoStack = stack;
    if (!snapshot) return;
    const restored = Object.assign({}, snapshot.data, {
      selectedPlayer: null,
      showPlayerStats: false
    });
    const side = snapshot.side;
    const baseEvent = {
      id: Date.now(),
      time: this.eventTimeText(),
      team: side === 'away' ? restored.awayName : (side === 'home' ? restored.homeName : '双方'),
      action: '撤销' + snapshot.label,
      score: restored.homeScore + '-' + restored.awayScore
    };
    restored.events = [baseEvent].concat(restored.events || []).slice(0, 12);
    if (side === 'home' || side === 'both') {
      const homeEvent = Object.assign({}, baseEvent, { id: Date.now() + 1, team: restored.homeName });
      restored.homeEvents = [homeEvent].concat(restored.homeEvents || []).slice(0, 8);
    }
    if (side === 'away' || side === 'both') {
      const awayEvent = Object.assign({}, baseEvent, { id: Date.now() + 2, team: restored.awayName });
      restored.awayEvents = [awayEvent].concat(restored.awayEvents || []).slice(0, 8);
    }
    this.setData(restored, () => {
      this.updateDigital();
      this.scheduleMatchRecordSave();
    });
  },

  swapSides() {
    wx.showModal({
      title: '确认交换场地',
      content: '主客队名称、比分、犯规、暂停和阵容将同步互换。',
      confirmText: '确认交换',
      success: (result) => {
        if (!result.confirm) return;
        this.pushUndoSnapshot('交换场地', 'both');
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
      raw: player,
      teamGroup: playerTeamGroup(player),
      ageGroup: playerAgeGroup(player)
    }));
    const numberMap = {};
    this.rosterPickerAllPlayers.forEach((entry) => {
      numberMap[entry.pickerId] = String((entry.raw && entry.raw.number) || '').replace(/[^0-9]/g, '').slice(0, 2);
    });
    const starterCount = (this.data[side + 'Starters'] || []).length;
    const target = starterCount < 5 ? 'starter' : 'bench';
    this.setData({
      rosterPickerVisible: true,
      rosterPickerSide: side,
      rosterPickerTarget: target,
      rosterPickerTeamText: side === 'home' ? '主队' : '客队',
      rosterPickerQuery: '',
      rosterPickerGroupMode: 'team',
      rosterPickerSelectedGroups: [],
      rosterPickerSelectedPlayerIds: [],
      rosterPickerNumberMap: numberMap,
      rosterBatchSelecting: false,
      rosterTeamModeClass: 'active',
      rosterAgeModeClass: ''
    }, () => {
      this.refreshRosterPickerGroups();
      this.refreshRosterPickerPlayers();
    });
  },
  closeRosterPlayerPicker() {
    this.rosterPickerAllPlayers = [];
    this.setData({ rosterPickerVisible: false, rosterPickerQuery: '', rosterPickerPlayers: [], rosterPickerSelectedGroups: [], rosterPickerSelectedPlayerIds: [], rosterPickerNumberMap: {}, rosterPickerGroupOptions: [], rosterBatchSelecting: false });
  },
  switchRosterPickerTarget(event) {
    const target = event.currentTarget.dataset.target === 'bench' ? 'bench' : 'starter';
    const side = this.data.rosterPickerSide === 'away' ? 'away' : 'home';
    const listKey = side + (target === 'bench' ? 'Bench' : 'Starters');
    const limit = target === 'bench' ? 6 : 5;
    const remaining = Math.max(0, limit - ((this.data[listKey] || []).length));
    const selectedIds = (this.data.rosterPickerSelectedPlayerIds || []).slice(0, remaining);
    this.setData({ rosterPickerTarget: target, rosterPickerSelectedPlayerIds: selectedIds }, () => this.refreshRosterPickerPlayers());
  },
  filterRosterPickerPlayers(event) {
    this.setData({ rosterPickerQuery: String((event.detail && event.detail.value) || '').trim() }, () => this.refreshRosterPickerPlayers());
  },
  switchRosterGroupMode(event) {
    const mode = event.currentTarget.dataset.mode === 'age' ? 'age' : 'team';
    this.setData({
      rosterPickerGroupMode: mode,
      rosterPickerSelectedGroups: [],
      rosterPickerSelectedPlayerIds: [],
      rosterBatchSelecting: false,
      rosterTeamModeClass: mode === 'team' ? 'active' : '',
      rosterAgeModeClass: mode === 'age' ? 'active' : ''
    }, () => {
      this.refreshRosterPickerGroups();
      this.refreshRosterPickerPlayers();
    });
  },
  toggleRosterPickerGroup(event) {
    const key = String(event.currentTarget.dataset.key || '');
    if (!key) return;
    const selected = Array.isArray(this.data.rosterPickerSelectedGroups) ? this.data.rosterPickerSelectedGroups.slice() : [];
    const index = selected.indexOf(key);
    if (index >= 0) selected.splice(index, 1);
    else selected.push(key);
    this.setData({ rosterPickerSelectedGroups: selected, rosterPickerSelectedPlayerIds: [], rosterBatchSelecting: false }, () => {
      this.refreshRosterPickerGroups();
      this.refreshRosterPickerPlayers();
    });
  },
  refreshRosterPickerGroups() {
    const mode = this.data.rosterPickerGroupMode === 'age' ? 'age' : 'team';
    const selected = Array.isArray(this.data.rosterPickerSelectedGroups) ? this.data.rosterPickerSelectedGroups : [];
    const counts = {};
    (this.rosterPickerAllPlayers || []).forEach((entry) => {
      const key = mode === 'age' ? entry.ageGroup : entry.teamGroup;
      counts[key] = (counts[key] || 0) + 1;
    });
    const keys = Object.keys(counts).sort((left, right) => {
      if (mode === 'age') {
        const leftAge = Number(String(left).replace(/[^0-9]/g, '')) || 999;
        const rightAge = Number(String(right).replace(/[^0-9]/g, '')) || 999;
        return leftAge - rightAge;
      }
      if (left === '无球队') return 1;
      if (right === '无球队') return -1;
      return left.localeCompare(right, 'zh-CN');
    });
    this.setData({
      rosterPickerGroupOptions: keys.map((key) => ({
        key,
        label: key,
        count: counts[key],
        activeClass: selected.indexOf(key) >= 0 ? 'active' : ''
      }))
    });
  },
  refreshRosterPickerPlayers() {
    const side = this.data.rosterPickerSide === 'away' ? 'away' : 'home';
    const starters = Array.isArray(this.data[side + 'Starters']) ? this.data[side + 'Starters'] : [];
    const bench = Array.isArray(this.data[side + 'Bench']) ? this.data[side + 'Bench'] : [];
    const usedIds = starters.concat(bench).map((item) => String(item.sourcePlayerId || ''));
    const query = String(this.data.rosterPickerQuery || '').toLowerCase();
    const mode = this.data.rosterPickerGroupMode === 'age' ? 'age' : 'team';
    const selectedGroups = Array.isArray(this.data.rosterPickerSelectedGroups) ? this.data.rosterPickerSelectedGroups : [];
    const selectedPlayerIds = Array.isArray(this.data.rosterPickerSelectedPlayerIds) ? this.data.rosterPickerSelectedPlayerIds : [];
    const numberMap = this.data.rosterPickerNumberMap || {};
    const players = (this.rosterPickerAllPlayers || []).filter((entry) => {
      const player = entry.raw || {};
      const group = mode === 'age' ? entry.ageGroup : entry.teamGroup;
      const matchesGroup = !selectedGroups.length || selectedGroups.indexOf(group) >= 0;
      const matchesQuery = !query || String(player.name || '').toLowerCase().includes(query) || String(player.number || '').toLowerCase().includes(query);
      return matchesGroup && matchesQuery;
    }).map((entry) => {
      const player = entry.raw || {};
      const disabled = usedIds.indexOf(String(player.id || entry.pickerId)) >= 0;
      const checked = selectedPlayerIds.indexOf(entry.pickerId) >= 0;
      return {
        pickerId: entry.pickerId,
        name: player.name || '未命名',
        number: String(player.number || '--'),
        position: player.position || (player.tags && player.tags[0]) || '球员',
        avatar: getPlayerAvatar(player, side),
        disabledClass: disabled ? 'disabled' : '',
        checkedClass: checked ? 'checked' : '',
        checkText: checked ? '✓' : '',
        rowClass: this.data.rosterBatchSelecting ? (checked ? 'batch-selecting number-visible' : 'batch-selecting') : '',
        showNumberInput: !!this.data.rosterBatchSelecting && checked,
        matchNumber: numberMap[entry.pickerId] || '',
        actionText: disabled ? '已添加' : (this.data.rosterBatchSelecting ? (checked ? '已选' : '选择') : '添加')
      };
    });
    const batchCount = selectedGroups.length ? (this.rosterPickerAllPlayers || []).filter((entry) => {
      const player = entry.raw || {};
      const group = mode === 'age' ? entry.ageGroup : entry.teamGroup;
      return selectedGroups.indexOf(group) >= 0 && usedIds.indexOf(String(player.id || entry.pickerId)) < 0;
    }).length : 0;
    this.setData({
      rosterPickerPlayers: players,
      rosterPickerStarterCount: starters.length,
      rosterPickerBenchCount: bench.length,
      rosterStarterTargetClass: this.data.rosterPickerTarget === 'starter' ? 'active' : '',
      rosterBenchTargetClass: this.data.rosterPickerTarget === 'bench' ? 'active' : '',
      rosterBatchButtonClass: selectedGroups.length && (this.data.rosterBatchSelecting ? selectedPlayerIds.length : batchCount > 0) ? '' : 'disabled',
      rosterBatchButtonText: this.data.rosterBatchSelecting
        ? ('添加所选到' + (this.data.rosterPickerTarget === 'bench' ? '替补' : '首发') + '（' + selectedPlayerIds.length + '）')
        : (selectedGroups.length ? ('批量选择（' + batchCount + '人）') : (mode === 'age' ? '请选择年龄组' : '请选择球队')),
      rosterBatchAvailableCount: batchCount
    });
  },
  updateBatchRosterNumber(event) {
    const pickerId = String(event.currentTarget.dataset.id || '');
    const value = String((event.detail && event.detail.value) || '').replace(/[^0-9]/g, '').slice(0, 2);
    const numberMap = Object.assign({}, this.data.rosterPickerNumberMap || {});
    numberMap[pickerId] = value;
    this.setData({ rosterPickerNumberMap: numberMap });
    return value;
  },
  batchAddRosterPlayers() {
    const selectedGroups = Array.isArray(this.data.rosterPickerSelectedGroups) ? this.data.rosterPickerSelectedGroups : [];
    if (!selectedGroups.length) {
      wx.showToast({ title: this.data.rosterPickerGroupMode === 'age' ? '请先选择年龄组' : '请先选择球队', icon: 'none' });
      return;
    }
    if (!this.data.rosterBatchSelecting) {
      if (Number(this.data.rosterBatchAvailableCount) <= 0) {
        wx.showToast({ title: '所选分组暂无可添加球员', icon: 'none' });
        return;
      }
      this.setData({ rosterBatchSelecting: true, rosterPickerSelectedPlayerIds: [] }, () => this.refreshRosterPickerPlayers());
      return;
    }
    const selectedPlayerIds = Array.isArray(this.data.rosterPickerSelectedPlayerIds) ? this.data.rosterPickerSelectedPlayerIds : [];
    if (!selectedPlayerIds.length) {
      wx.showToast({ title: '请勾选需要添加的球员', icon: 'none' });
      return;
    }
    const side = this.data.rosterPickerSide === 'away' ? 'away' : 'home';
    const target = this.data.rosterPickerTarget === 'bench' ? 'bench' : 'starter';
    const listKey = side + (target === 'bench' ? 'Bench' : 'Starters');
    const current = Array.isArray(this.data[listKey]) ? this.data[listKey] : [];
    const limit = target === 'bench' ? 6 : 5;
    const availableSlots = Math.max(0, limit - current.length);
    if (!availableSlots) {
      wx.showToast({ title: target === 'bench' ? '替补名额已满' : '首发名额已满', icon: 'none' });
      return;
    }
    const allSelected = (this.data[side + 'Starters'] || []).concat(this.data[side + 'Bench'] || []);
    const usedIds = allSelected.map((item) => String(item.sourcePlayerId || ''));
    const candidates = (this.rosterPickerAllPlayers || []).filter((entry) => {
      const player = entry.raw || {};
      return selectedPlayerIds.indexOf(entry.pickerId) >= 0 && usedIds.indexOf(String(player.id || entry.pickerId)) < 0;
    });
    const adding = candidates.slice(0, availableSlots);
    if (!adding.length) {
      wx.showToast({ title: '所选球员均已在阵容中', icon: 'none' });
      return;
    }
    const numberMap = this.data.rosterPickerNumberMap || {};
    const occupiedNumbers = {};
    allSelected.forEach((item) => { occupiedNumbers[String(item.number || '')] = true; });
    for (let index = 0; index < adding.length; index += 1) {
      const entry = adding[index];
      const player = entry.raw || {};
      const number = String(numberMap[entry.pickerId] || '').trim();
      if (!/^\d{1,2}$/.test(number)) {
        wx.showToast({ title: '请填写' + (player.name || '球员') + '的本场号码', icon: 'none' });
        return;
      }
      if (occupiedNumbers[number]) {
        wx.showToast({ title: '本队号码 #' + number + ' 重复', icon: 'none' });
        return;
      }
      occupiedNumbers[number] = true;
    }
    this.pushUndoSnapshot('批量添加球员', side);
    const next = current.concat(adding.map((entry, index) => {
      const player = entry.raw || {};
      return {
        id: side + '-' + target + '-' + (player.id || (Date.now() + index)),
        sourcePlayerId: player.id || entry.pickerId,
        number: String(numberMap[entry.pickerId]),
        name: player.name || '未命名',
        position: player.position || (player.tags && player.tags[0]) || '球员',
        avatar: getPlayerAvatar(player, side),
        cardClass: '',
        chipClass: '',
        tagText: '',
        stats: cloneStats(player.stats)
      };
    }));
    const patch = {};
    patch[listKey] = next;
    patch[side + 'HasRoster'] = true;
    this.setData(patch, () => {
      this.scheduleMatchRecordSave();
      this.setData({ rosterBatchSelecting: false, rosterPickerSelectedPlayerIds: [] }, () => this.refreshRosterPickerPlayers());
      wx.showToast({ title: '已批量添加' + adding.length + '人', icon: 'success' });
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
    if (allSelected.some((item) => String(item.sourcePlayerId || '') === String(player.id || entry.pickerId))) {
      wx.showToast({ title: '该球员已在本队阵容中', icon: 'none' });
      return;
    }
    if (this.data.rosterBatchSelecting) {
      const selectedIds = Array.isArray(this.data.rosterPickerSelectedPlayerIds) ? this.data.rosterPickerSelectedPlayerIds.slice() : [];
      const selectedIndex = selectedIds.indexOf(pickerId);
      if (selectedIndex >= 0) selectedIds.splice(selectedIndex, 1);
      else {
        const remaining = Math.max(0, limit - current.length);
        if (selectedIds.length >= remaining) {
          wx.showToast({ title: target === 'bench' ? '替补最多6人' : '首发最多5人', icon: 'none' });
          return;
        }
        selectedIds.push(pickerId);
      }
      this.setData({ rosterPickerSelectedPlayerIds: selectedIds }, () => this.refreshRosterPickerPlayers());
      return;
    }
    const defaultNumber = String(player.number || '').replace(/[^0-9]/g, '').slice(0, 2);
    wx.showModal({
      title: '设置本场球衣号码',
      content: (player.name || '该球员') + ' · 球员库号码 #' + (defaultNumber || '未设置'),
      editable: true,
      placeholderText: defaultNumber ? ('输入本场号码，默认 ' + defaultNumber) : '请输入本场号码 0-99',
      confirmText: '加入阵容',
      confirmColor: '#ff6400',
      success: (result) => {
        if (!result.confirm) return;
        const inputNumber = String(result.content || '').replace(/[^0-9]/g, '').slice(0, 2);
        const number = inputNumber || defaultNumber;
        if (!/^\d{1,2}$/.test(number)) {
          wx.showToast({ title: '请输入本场球衣号码', icon: 'none' });
          return;
        }
        this.commitRosterPlayer(entry, side, target, number);
      }
    });
  },

  commitRosterPlayer(entry, side, target, number) {
    const listKey = side + (target === 'bench' ? 'Bench' : 'Starters');
    const limit = target === 'bench' ? 6 : 5;
    const current = Array.isArray(this.data[listKey]) ? this.data[listKey] : [];
    if (current.length >= limit) {
      wx.showToast({ title: target === 'bench' ? '替补最多6人' : '首发最多5人', icon: 'none' });
      return;
    }
    const player = entry.raw || {};
    const allSelected = (this.data[side + 'Starters'] || []).concat(this.data[side + 'Bench'] || []);
    if (allSelected.some((item) => String(item.sourcePlayerId || '') === String(player.id || entry.pickerId))) {
      wx.showToast({ title: '该球员已在本队阵容中', icon: 'none' });
      return;
    }
    if (allSelected.some((item) => String(item.number) === String(number))) {
      wx.showToast({ title: '本队已有 #' + number, icon: 'none' });
      return;
    }
    this.pushUndoSnapshot('添加球员', side);
    const next = current.concat({
      id: side + '-' + target + '-' + (player.id || Date.now()),
      sourcePlayerId: player.id || entry.pickerId,
      number: String(number),
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
        this.pushUndoSnapshot('删除球员', side);
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
    this.pushUndoSnapshot('换人', side);
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
    this.setData(patch, () => this.scheduleMatchRecordSave());
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
    this.pushUndoSnapshot(actionLabel || '球员数据', side);
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
    patch.selectedPlayer = null;
    patch.showPlayerStats = false;
    this.setData(patch, () => {
      this.scheduleMatchRecordSave();
    });
  },

  restoreMatchRecord(recordId) {
    const stored = wx.getStorageSync(RECENT_MATCHES_KEY);
    const list = Array.isArray(stored) ? stored : [];
    const record = list.find((item) => String(item.id) === String(recordId) && item.ended !== true && item.status !== 'finished');
    if (!record) return false;
    const active = wx.getStorageSync('quickMatchActiveConfig') || {};
    const fallbackHome = buildQuickPlayers('home', active.homePlayers);
    const fallbackAway = buildQuickPlayers('away', active.awayPlayers);
    const homeStarters = Array.isArray(record.homeStarters) && record.homeStarters.length ? record.homeStarters : fallbackHome.slice(0, 5);
    const awayStarters = Array.isArray(record.awayStarters) && record.awayStarters.length ? record.awayStarters : fallbackAway.slice(0, 5);
    const homeBench = Array.isArray(record.homeBench) ? record.homeBench : fallbackHome.slice(5);
    const awayBench = Array.isArray(record.awayBench) ? record.awayBench : fallbackAway.slice(5);
    const clockParts = String(record.clockText || '').split(':');
    const parsedClock = clockParts.length === 2 ? Number(clockParts[0] || 0) * 60 + Number(clockParts[1] || 0) : 0;
    const elapsedSeconds = record.clockRunning || record.shotClockRunning
      ? Math.max(0, Math.floor((Date.now() - Number(record.updatedAt || Date.now())) / 1000))
      : 0;
    let clockSeconds = record.clockSeconds !== undefined ? Number(record.clockSeconds || 0) : parsedClock;
    let shotClock = record.shotClock !== undefined ? Number(record.shotClock || 0) : 24;
    if (record.clockRunning && elapsedSeconds > 0) {
      clockSeconds = record.timerMode === 'up'
        ? Math.max(0, clockSeconds + elapsedSeconds)
        : Math.max(0, clockSeconds - elapsedSeconds);
    }
    if (record.shotClockRunning && elapsedSeconds > 0) shotClock = Math.max(0, shotClock - elapsedSeconds);
    const mainClockEnded = !!record.clockRunning && record.timerMode !== 'up' && clockSeconds <= 0;
    const resumeMainClock = !!record.clockRunning && !mainClockEnded;
    const resumeShotClock = !!record.shotClockRunning && record.shotClockEnabled !== false && shotClock > 0 && !mainClockEnded;
    const possession = record.possession === 'right' ? 'right' : 'left';
    this.matchRecordId = String(record.id);
    this.matchRecordCreatedAt = Number(record.createdAt || Date.now());
    this.matchEnded = false;
    wx.setStorageSync('quickMatchActiveConfig', Object.assign({}, active, {
      mode: 'quick',
      source: record.source || active.source || 'resume',
      recordId: this.matchRecordId,
      createdAt: this.matchRecordCreatedAt,
      tournamentId: record.tournamentId || '',
      gameId: record.gameId || '',
      matchName: record.matchName || '\u5feb\u6377\u6bd4\u8d5b',
      homeTeam: { name: record.homeName, logoUrl: record.homeLogo || '' },
      awayTeam: { name: record.awayName, logoUrl: record.awayLogo || '' },
      homePlayers: homeStarters.concat(homeBench),
      awayPlayers: awayStarters.concat(awayBench),
      periodMinutes: Number(record.periodMinutes || 10),
      periods: Number(record.totalPeriods || 4),
      intervalMinutes: Number(record.intervalMinutes || 2),
      halftimeMinutes: Number(record.halftimeMinutes || 15),
      timeoutMinutes: Number(record.timeoutMinutes || 1),
      timerMode: record.timerMode || 'down'
    }));
    this.setData({
      started: true,
      matchName: record.matchName || '\u5feb\u6377\u6bd4\u8d5b',
      homeName: record.homeName || '\u4e3b\u961f',
      awayName: record.awayName || '\u5ba2\u961f',
      homeLogo: record.homeLogo || getTeamLogo(null, 'home'),
      awayLogo: record.awayLogo || getTeamLogo(null, 'away'),
      homeScore: Number(record.homeScore || 0),
      awayScore: Number(record.awayScore || 0),
      homeFouls: Number(record.homeFouls || 0),
      awayFouls: Number(record.awayFouls || 0),
      homeTimeouts: Number(record.homeTimeouts || 0),
      awayTimeouts: Number(record.awayTimeouts || 0),
      periodScores: Array.isArray(record.periodScores) ? record.periodScores : [],
      maxPeriodReached: Math.max(1, Number(record.maxPeriodReached || record.period || 1)),
      period: Number(record.period || 1),
      totalPeriods: Number(record.totalPeriods || 4),
      periodMinutes: Number(record.periodMinutes || 10),
      intervalMinutes: Number(record.intervalMinutes || 2),
      halftimeMinutes: Number(record.halftimeMinutes || 15),
      timeoutMinutes: Number(record.timeoutMinutes || 1),
      timerMode: record.timerMode || 'down',
      clockSeconds,
      clockText: formatClock(clockSeconds),
      clockRunning: false,
      clockButtonText: '\u5f00\u59cb',
      shotClockEnabled: record.shotClockEnabled === true,
      shotClock,
      shotClockDigits: buildDigitalItems(String(Math.max(0, shotClock)).padStart(2, '0'), 'shot'),
      shotClockRunning: false,
      shotClockButtonText: '\u5f00\u59cb',
      possession,
      leftPossessionClass: possession === 'left' ? 'active' : '',
      rightPossessionClass: possession === 'right' ? 'active' : '',
      homeStarters,
      awayStarters,
      homeBench,
      awayBench,
      homeHasRoster: record.homeHasRoster !== undefined ? !!record.homeHasRoster : homeStarters.length > 0,
      awayHasRoster: record.awayHasRoster !== undefined ? !!record.awayHasRoster : awayStarters.length > 0,
      events: Array.isArray(record.events) ? record.events : [],
      homeEvents: Array.isArray(record.homeEvents) ? record.homeEvents : [],
      awayEvents: Array.isArray(record.awayEvents) ? record.awayEvents : [],
      showPlayerStats: false,
      substitutionMode: '',
      pendingOutId: ''
    }, () => {
      this.updateDigital();
      if (resumeMainClock) this.toggleClock({ skipShotClock: true });
      if (resumeShotClock) this.startShotClock();
      if (mainClockEnded) this.handlePeriodEnd();
      this.persistMatchRecord(false);
    });
    return true;
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
      intervalMinutes: Number(this.data.intervalMinutes || 2),
      halftimeMinutes: Number(this.data.halftimeMinutes || 15),
      timeoutMinutes: Number(this.data.timeoutMinutes || 1),
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
  refreshCloudAudioLibrary() {
    if (this.audioLibrarySyncPromise) return this.audioLibrarySyncPromise;
    this.audioLibrarySyncPromise = callCloud('sxGetAudioLibrary', {})
      .then((result) => {
        if (result && result.ok) {
          if (result.audioMap && typeof result.audioMap === 'object') wx.setStorageSync(CLOUD_AUDIO_MAP_KEY, result.audioMap);
          if (Array.isArray(result.items)) wx.setStorageSync(CLOUD_AUDIO_ITEMS_KEY, result.items);
        }
      })
      .catch((error) => console.warn('[scorer] refresh cloud audio library failed', error))
      .then(() => this.syncCustomSounds())
      .finally(() => { this.audioLibrarySyncPromise = null; });
    return this.audioLibrarySyncPromise;
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
    this.setVoiceButtonActive(false);
    const commonSounds = this.data.commonSounds.map((item) => Object.assign({}, item, { activeClass: item.type === type ? 'active' : '' }));
    const scoringSounds = this.data.scoringSounds.map((item) => Object.assign({}, item, { activeClass: item.type === type ? 'active' : '' }));
    const customSounds = this.data.customSounds.map((item) => Object.assign({}, item, { activeClass: item.type === type ? 'active' : '' }));
    this.setData({ playingType: type, currentAudioName: name, commonSounds, scoringSounds, customSounds, showRestAudioControls: false, restAudioPaused: false, restAudioButtonText: '暂停', restAudioProgress: 0, restAudioCurrentText: '00:00', restAudioDurationText: '00:00' });
    this.playNativeAudio(type, preferredSource);
  },
  stopAudio() {
    this.setVoiceButtonActive(false);
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
    if (type === 'buzzer' && settings.buzzerEnabled === false) return false;
    const categoryKey = AUDIO_CATEGORY_BY_TYPE[type];
    if (categoryKey && settings.categoryEnabled && settings.categoryEnabled[categoryKey] === false) return false;
    return true;
  },
  loadPersistentAudioCache() {
    const saved = wx.getStorageSync(AUDIO_CACHE_STORAGE_KEY);
    this.persistentAudioCache = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    this.persistentAudioConsent = 'allowed';
    wx.setStorageSync(AUDIO_CACHE_CONSENT_KEY, 'allowed');
    this.audioUrlCache = Object.assign({}, this.audioUrlCache || {});
    this.audioDownloadPromises = Object.assign({}, this.audioDownloadPromises || {});
  },
  audioFileExists(path) {
    return new Promise((resolve) => {
      if (!path || !wx.getFileSystemManager) return resolve(false);
      const fs = wx.getFileSystemManager();
      fs.access({ path, success: () => resolve(true), fail: () => resolve(false) });
    });
  },
  savePersistentAudioCache() {
    wx.setStorageSync(AUDIO_CACHE_STORAGE_KEY, this.persistentAudioCache || {});
  },
  recordPersistentAudio(cacheKey, savedFilePath) {
    if (!cacheKey || !savedFilePath) return;
    this.persistentAudioCache = Object.assign({}, this.persistentAudioCache || {}, { [cacheKey]: savedFilePath });
    this.audioUrlCache[cacheKey] = savedFilePath;
    let order = wx.getStorageSync(AUDIO_CACHE_ORDER_KEY);
    order = Array.isArray(order) ? order.filter((item) => item !== cacheKey) : [];
    order.push(cacheKey);
    while (order.length > AUDIO_CACHE_LIMIT) {
      const expiredKey = order.shift();
      const expiredPath = this.persistentAudioCache[expiredKey];
      delete this.persistentAudioCache[expiredKey];
      delete this.audioUrlCache[expiredKey];
      if (expiredPath && wx.removeSavedFile) wx.removeSavedFile({ filePath: expiredPath, fail: () => {} });
    }
    wx.setStorageSync(AUDIO_CACHE_ORDER_KEY, order);
    this.savePersistentAudioCache();
  },
  async getPersistentAudioPath(cacheKey) {
    const path = (this.persistentAudioCache || {})[cacheKey];
    if (!path) return '';
    if (await this.audioFileExists(path)) {
      this.audioUrlCache[cacheKey] = path;
      return path;
    }
    delete this.persistentAudioCache[cacheKey];
    delete this.audioUrlCache[cacheKey];
    this.savePersistentAudioCache();
    return '';
  },
  evictOldestPersistentAudio() {
    return new Promise((resolve) => {
      let order = wx.getStorageSync(AUDIO_CACHE_ORDER_KEY);
      order = Array.isArray(order) ? order : [];
      const expiredKey = order.shift();
      if (!expiredKey) return resolve(false);
      const expiredPath = this.persistentAudioCache[expiredKey];
      delete this.persistentAudioCache[expiredKey];
      delete this.audioUrlCache[expiredKey];
      wx.setStorageSync(AUDIO_CACHE_ORDER_KEY, order);
      this.savePersistentAudioCache();
      if (!expiredPath || !wx.removeSavedFile) return resolve(true);
      wx.removeSavedFile({ filePath: expiredPath, success: () => resolve(true), fail: () => resolve(true) });
    });
  },
  downloadAudioToTemp(source, onProgress) {
    return new Promise((resolve) => {
      const isCloudFile = source.indexOf('cloud://') === 0;
      const download = isCloudFile && wx.cloud && wx.cloud.downloadFile
        ? (options) => wx.cloud.downloadFile(Object.assign({ fileID: source }, options))
        : !isCloudFile && wx.downloadFile
          ? (options) => wx.downloadFile(Object.assign({ url: source }, options))
          : null;
      if (!download) return resolve('');
      const task = download({
        success: (result) => resolve((result && result.tempFilePath) || ''),
        fail: (error) => {
          console.warn('[scorer] background audio download failed', source, error);
          resolve('');
        }
      });
      if (task && task.onProgressUpdate && typeof onProgress === 'function') {
        task.onProgressUpdate((event) => onProgress(Math.max(0, Math.min(100, Number(event && event.progress) || 0))));
      }
    });
  },
  persistDownloadedAudio(cacheKey, tempFilePath) {
    return new Promise((resolve) => {
      if (!tempFilePath) return resolve('');
      this.audioUrlCache[cacheKey] = tempFilePath;
      if (!wx.saveFile) return resolve('');
      const save = (retried) => {
        wx.saveFile({
          tempFilePath,
          success: (result) => {
            const savedFilePath = (result && result.savedFilePath) || '';
            if (savedFilePath) this.recordPersistentAudio(cacheKey, savedFilePath);
            resolve(savedFilePath);
          },
          fail: (error) => {
            if (!retried) {
              this.evictOldestPersistentAudio().then((evicted) => {
                if (evicted) save(true);
                else {
                  console.warn('[scorer] persist audio cache failed', cacheKey, error);
                  resolve('');
                }
              });
              return;
            }
            console.warn('[scorer] persist audio cache failed after retry', cacheKey, error);
            resolve('');
          }
        });
      };
      save(false);
    });
  },
  async ensureAudioCached(source, onProgress) {
    if (!source || !/^(cloud|https?):\/\//.test(source)) return source || '';
    const persistentPath = await this.getPersistentAudioPath(source);
    if (persistentPath) return persistentPath;
    if (this.audioDownloadPromises[source]) return this.audioDownloadPromises[source];
    const task = (async () => {
      let tempFilePath = '';
      const memoryPath = this.audioUrlCache[source];
      if (memoryPath && await this.audioFileExists(memoryPath)) tempFilePath = memoryPath;
      if (!tempFilePath) tempFilePath = await this.downloadAudioToTemp(source, onProgress);
      if (!tempFilePath) return '';
      this.audioUrlCache[source] = tempFilePath;
      const savedFilePath = await this.persistDownloadedAudio(source, tempFilePath);
      return savedFilePath || tempFilePath;
    })();
    this.audioDownloadPromises[source] = task;
    try {
      return await task;
    } finally {
      delete this.audioDownloadPromises[source];
    }
  },
  async persistAudioItemsInBackground(items) {
    const queue = Array.isArray(items) ? items : [];
    for (let index = 0; index < queue.length; index += 1) {
      if (this.audioPreloadStopped) break;
      const item = queue[index];
      if (!item || !item.source || !item.tempFilePath) continue;
      if (await this.getPersistentAudioPath(item.source)) continue;
      await this.persistDownloadedAudio(item.source, item.tempFilePath);
    }
  },
  requestPersistentAudioConsent(items) {
    const queue = Array.isArray(items) ? items : [];
    if (!queue.length || this.persistentAudioConsent || this.audioConsentPromptOpen) return;
    this.audioConsentPromptOpen = true;
    wx.showModal({
      title: '保存比赛音效',
      content: '是否允许将已缓存的比赛音效保存到本地？保存后下次进入可直接使用，无需重新缓存。',
      confirmText: '允许保存',
      cancelText: '仅本次使用',
      success: (result) => {
        this.persistentAudioConsent = result.confirm ? 'allowed' : 'session-denied';
        if (result.confirm) {
          wx.setStorageSync(AUDIO_CACHE_CONSENT_KEY, 'allowed');
          this.persistAudioItemsInBackground(queue);
        }
      },
      complete: () => {
        this.audioConsentPromptOpen = false;
      }
    });
  },
  async preloadCommonAudio() {
    if (this.audioPreloadStarted) return;
    this.audioPreloadStarted = true;
    this.audioPreloadStopped = false;
    const cacheSounds = (this.data.scoringSounds || []).concat(this.data.customSounds || []);
    const extraTypes = ['rest', 'buzzer', 'countdown'];
    const configuredSources = cacheSounds.reduce((list, item) => {
      const storedSources = collectStoredAudioSources(item.type);
      return list.concat(storedSources.length ? storedSources : [item.source || ''].concat(item.audioIds || []));
    }, []);
    const sources = extraTypes
      .reduce((list, type) => {
        const storedSources = collectStoredAudioSources(type);
        return list.concat(storedSources.length ? storedSources : (AUDIO_FILE_IDS[type] || []));
      }, configuredSources)
      .filter((source, index, list) => source && /^(cloud|https?):\/\//.test(source) && list.indexOf(source) === index);
    if (!sources.length) {
      this.audioPreloadStarted = false;
      return;
    }
    for (let index = 0; index < sources.length; index += 1) {
      if (this.audioPreloadStopped) break;
      const source = sources[index];
      await this.ensureAudioCached(source);
      if (this.audioPreloadStopped) break;
    }
    this.audioPreloadStarted = false;
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
      this.cacheAudioAfterPlaybackStarts(fileId, type);
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
    if (!this.audioUrlCache[fileId] && this.persistentAudioCache[fileId]) {
      this.getPersistentAudioPath(fileId).then((savedPath) => {
        if (savedPath) playSrc(savedPath);
        else this.playAudioSource(fileId, onFailure, type);
      });
      return;
    }
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
  cacheAudioAfterPlaybackStarts(fileId, type) {
    const shouldCache = !!type && type !== 'attack' && type !== 'defense' && /^(cloud|https?):\/\//.test(fileId);
    if (!shouldCache || this.persistentAudioCache[fileId]) return;
    this.ensureAudioCached(fileId).then((cachedPath) => {
      if (!cachedPath) console.warn('[scorer] silent background audio cache failed', fileId);
    });
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
    const storedStyle = wx.getStorageSync(VOICE_STYLE_KEY) || 'standard';
    const style = this.data.voiceOptions.some((item) => item.id === storedStyle) ? storedStyle : 'standard';
    const voiceMode = wx.getStorageSync(VOICE_MODE_KEY) === 'full' ? 'full' : 'simple';
    const latestEvent = this.data.events && this.data.events[0] ? this.data.events[0].action : '';
    const voiceData = {
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
    };
    const text = voiceMode === 'full' ? buildScoreVoice(voiceData, style) : buildSimpleScoreVoice(voiceData);
    this.setVoiceButtonActive(true);
    this.setData({ playingType: 'voice', currentAudioName: '语音播报' });
    const result = await callCloud('sxCreateScoreVoice', {
      text,
      style,
      skipCredit: true
    });
    const source = result && (result.tempFileURL || result.fileID);
    if (!result || !result.ok || !source) {
      wx.showToast({ title: voiceToastText(result), icon: 'none' });
      this.setVoiceButtonActive(false);
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
