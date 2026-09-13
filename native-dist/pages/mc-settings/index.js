const { callCloud, cloud } = require('../../utils/cloud');
const { disposeAudioContext, fadeAudioVolume, isCurrentAudio, startAudioTransition, stopAudioTransition } = require('../../utils/audio-crossfade');
const defaultWarmupAudio = require('../../utils/default-warmup-audio');

const AUDIO_SETTINGS_KEY = 'sx_mc_audio_settings';
const CLOUD_AUDIO_MAP_KEY = 'sx_mc_audio_map';
const CLOUD_AUDIO_ITEMS_KEY = 'sx_mc_audio_items';
const VOICE_STYLE_KEY = 'sx_score_voice_style';
const CUSTOM_SLOTS_KEY = 'sx_mc_custom_slots';
const CUSTOM_SLOT_DETAILS_KEY = 'sx_mc_custom_slot_details';
const VOICE_MODE_KEY = 'sx_score_voice_mode';
const LOCAL_AUDIO_LIBRARY_KEY = 'sx_mc_local_audio_library_v1';
const LOCAL_AUDIO_LIMIT = 20;
const LOCAL_AUDIO_MAX_BYTES = 15 * 1024 * 1024;
const ASSET_BASE = 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/ui-assets/assets/pages/mc-settings/';
const MC_ASSET_FILES = [
  'background-mc-settings-clean.png',
  'icon-back-common.png',
  'icon-volume-common.png',
  'icon-package-common.png',
  'icon-chevron-right-common.png',
  'icon-music-common.png',
  'icon-play-common.png',
  'icon-replace-common.png',
  'icon-whistle-common.png',
  'icon-pause-common.png',
  'icon-basketball-common.png',
  'icon-shield-common.png'
];
const MC_ASSET_ALIASES = {
  background: 'background-mc-settings-clean.png',
  back: 'icon-back-common.png',
  volume: 'icon-volume-common.png',
  package: 'icon-package-common.png',
  chevron: 'icon-chevron-right-common.png',
  music: 'icon-music-common.png',
  play: 'icon-play-common.png',
  replace: 'icon-replace-common.png',
  whistle: 'icon-whistle-common.png',
  pause: 'icon-pause-common.png'
};
const initialAssetUrls = () => {
  const urls = Object.fromEntries(MC_ASSET_FILES.map((file) => [file, ASSET_BASE + file]));
  Object.entries(MC_ASSET_ALIASES).forEach(([alias, file]) => { urls[alias] = urls[file]; });
  return urls;
};
const VOICE_PREVIEW_TEXT = {
  simple: '第一节还剩八分二十六秒，蜂巢U10A对星火U10，十二比十。',
  full: '第一节还剩八分二十六秒，蜂巢U10A十二比十领先星火U10。双方比分紧咬，比赛越来越精彩。'
};

const defaultSettings = {
  modeDefaultsVersion: 4,
  masterEnabled: true,
  volume: 70,
  commonVolume: 100,
  customVolume: 100,
  soundPackage: 'default',
  twoEnabled: true,
  threeEnabled: true,
  buzzerEnabled: true,
  pauseAutoEnabled: true,
  customMixMode: 'duck',
  categoryEnabled: {
    warmup: true,
    attack: true,
    defense: true,
    pause: true,
    buzzer: true,
    countdown: true
  },
  modes: {
    warmup: 'random',
    attack: 'random',
    defense: 'random',
    pause: 'random',
    buzzer: 'fixed',
    countdown: 'fixed'
  },
  selectedAudio: {}
};

const defaultAudioItems = [
  { channel: 'attack', name: '进攻音效1', fileID: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/mc-mp3/进攻防守音乐/进攻音效1.mp3' },
  { channel: 'attack', name: '进攻音效2', fileID: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/mc-mp3/进攻防守音乐/进攻音效2.mp3' },
  { channel: 'attack', name: '进攻音效3', fileID: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/mc-mp3/进攻防守音乐/进攻音效3.mp3' },
  { channel: 'defense', name: '防守音效1', fileID: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/mc-mp3/进攻防守音乐/防守音效1.mp3' },
  { channel: 'defense', name: '防守音效2', fileID: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/mc-mp3/进攻防守音乐/防守音效2.mp3' },
  { channel: 'defense', name: '防守音效3', fileID: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/mc-mp3/进攻防守音乐/防守音效3.mp3' },
  { channel: 'pause', name: '暂停音乐1', fileID: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/mc-mp3/暂停休息音乐/暂停音乐1.mp3' },
  { channel: 'pause', name: '暂停音乐2', fileID: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/mc-mp3/暂停休息音乐/暂停音乐2.mp3' },
  { channel: 'buzzer', name: '蜂鸣器', fileID: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/mc-mp3/比赛音效/蜂鸣器.mp3' },
  { channel: 'countdown', name: '倒计时5秒', fileID: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/mc-mp3/比赛音效/倒计时5秒.mp3' },
  { channel: 'two', name: '2分音效', fileID: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/mc-mp3/比赛音效/2分进球音效.mp3' },
  { channel: 'three', name: '3分音效', fileID: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/mc-mp3/比赛音效/三分球.mp3' },
  { channel: 'miss', name: '投篮未进', fileID: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/mc-mp3/自定义音效/投篮未进音效.mp3' },
  { channel: 'cheer', name: '欢呼声', fileID: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/mc-mp3/自定义音效/欢呼声(1).mp3' },
  { channel: 'shout', name: '冲锋号', fileID: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/mc-mp3/自定义音效/冲锋号.mp3' },
  { channel: 'entry', name: '出场音乐', fileID: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/mc-mp3/自定义音效/出场音乐.mp3' },
  { channel: 'anthem', name: '国歌', fileID: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/mc-mp3/自定义音效/国歌.mp3' },
  { channel: 'freeThrowMade', name: '罚进音效', fileID: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/mc-mp3/自定义音效/罚进音效.mp3' },
  { channel: 'freeThrowMiss', name: '罚球失误', fileID: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/mc-mp3/自定义音效/罚球失误.mp3' }
].concat(defaultWarmupAudio);

const voiceOptions = [
  { id: 'live', name: '男声', note: '现场有力' },
  { id: 'standard', name: '女声', note: '清晰自然' },
  { id: 'kids', name: '童声', note: '活力童声' }
];

const voiceModeOptions = [
  { id: 'simple', name: '简约播报', note: '比分、节次和比赛时间' },
  { id: 'full', name: '完整播报', note: '增加赛况和情绪表达' }
];

function buildVoiceModeOptions(activeId) {
  return voiceModeOptions.map((item) => Object.assign({}, item, {
    activeClass: item.id === activeId ? 'active' : ''
  }));
}

function buildVoiceOptions(activeId) {
  return voiceOptions.map((item) => Object.assign({}, item, {
    activeClass: item.id === activeId ? 'active' : ''
  }));
}

const categorySeed = [
  { key: 'warmup', name: '暖场音乐', icon: 'icon-music-common.png', sourceKeys: ['warmup'] },
  { key: 'attack', name: '进攻音效', icon: 'icon-basketball-common.png', sourceKeys: ['attack'] },
  { key: 'defense', name: '防守音效', icon: 'icon-shield-common.png', sourceKeys: ['defense'] },
  { key: 'pause', name: '暂停音乐', icon: 'icon-pause-common.png', sourceKeys: ['rest', 'pause'] },
  { key: 'buzzer', name: '蜂鸣器', icon: 'icon-whistle-common.png', sourceKeys: ['buzzer'] },
  { key: 'countdown', name: '倒计时音效', icon: 'icon-pause-common.png', sourceKeys: ['countdown'] }
];

const customAudioSourceKeys = ['two', 'three', 'miss', 'cheer', 'shout', 'horn', 'entry', 'anthem', 'freeThrowMade', 'freeThrowMiss', 'ambience'];

const customCategory = {
  key: 'custom',
  name: '自定义音效',
  sourceKeys: customAudioSourceKeys,
  fallbackNames: ['2分音效', '3分音效', '投篮未进', '欢呼声', '冲锋号', '出场音乐', '国歌', '罚进音效', '罚球失误'],
  fallbackChannels: ['two', 'three', 'miss', 'cheer', 'horn', 'entry', 'anthem', 'freeThrowMade', 'freeThrowMiss']
};

function normalizeSettings(saved) {
  const value = saved && typeof saved === 'object' ? saved : {};
  const modes = Object.assign({}, defaultSettings.modes, value.modes || {});
  if (Number(value.modeDefaultsVersion || 0) < 2) {
    modes.attack = 'random';
    modes.defense = 'random';
  }
  if (Number(value.modeDefaultsVersion || 0) < 4) modes.warmup = 'random';
  return Object.assign({}, defaultSettings, value, {
    modeDefaultsVersion: 4,
    customMixMode: value.customMixMode === 'stop' ? 'stop' : 'duck',
    commonVolume: Math.max(0, Math.min(100, Number(value.commonVolume == null ? 100 : value.commonVolume))),
    customVolume: Math.max(0, Math.min(100, Number(value.customVolume == null ? 100 : value.customVolume))),
    twoEnabled: true,
    threeEnabled: true,
    categoryEnabled: Object.assign({}, defaultSettings.categoryEnabled, value.categoryEnabled || {}),
    modes,
    selectedAudio: Object.assign({}, value.selectedAudio || {})
  });
}

function customMixModeText(mode) {
  return mode === 'stop' ? '停止背景音乐' : '背景音减小';
}

function normalizeList(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function fileName(source) {
  if (!source) return '';
  const clean = String(source).split('?')[0];
  const name = clean.slice(clean.lastIndexOf('/') + 1);
  try {
    return decodeURIComponent(name).replace(/\.[^.]+$/, '');
  } catch (error) {
    return name.replace(/\.[^.]+$/, '');
  }
}

function collectAudioOptions(category, audioMap, audioItems) {
  const seen = Object.create(null);
  const options = [];
  const keys = category.sourceKeys;

  (audioItems || []).concat(defaultAudioItems).forEach((item) => {
    const channel = item.channel || item.type || '';
    const source = item.fileID || item.fileId || item.src || '';
    if (!keys.includes(channel) || !source || seen[source]) return;
    seen[source] = true;
    options.push({
      id: source,
      name: item.name || fileName(source) || category.name,
      source,
      channel: channel === 'shout' ? 'horn' : channel
    });
  });

  keys.forEach((key) => {
    normalizeList((audioMap || {})[key]).forEach((source) => {
      if (!source || seen[source]) return;
      seen[source] = true;
      options.push({ id: source, name: fileName(source) || category.name, source, channel: key === 'shout' ? 'horn' : key });
    });
  });

  if (category.key === 'warmup') {
    localAudioLibrary().filter((item) => item.channel === 'warmup').forEach((item) => {
      if (!item.source || seen[item.source]) return;
      seen[item.source] = true;
      options.unshift({ id: item.source, localId: item.id, name: item.name, source: item.source, channel: 'warmup', localOnly: true, note: '仅此设备' });
    });
  }

  if (!options.length && category.fallbackNames) {
    category.fallbackNames.forEach((name, index) => {
      options.push({ id: `placeholder-${category.key}-${index}`, name, source: '', channel: (category.fallbackChannels || [])[index] || '' });
    });
  }

  return options;
}

function buildCategories(settings, audioMap, audioItems, assetUrls) {
  return categorySeed.map((category) => {
    const options = collectAudioOptions(category, audioMap, audioItems);
    const selectedId = settings.selectedAudio[category.key];
    const selected = options.find((item) => item.id === selectedId) || options[0] || {};
    const mode = settings.modes[category.key] || 'fixed';
    return Object.assign({}, category, {
      iconUrl: (assetUrls && assetUrls[category.icon]) || ASSET_BASE + category.icon,
      options,
      selectedName: selected.name || '暂无音效',
      selectedSource: selected.source || '',
      mode,
      modeText: category.key === 'warmup'
        ? ({ random: '随机连续', sequence: '顺序连续', single: '单首循环', current: '播放当前' }[mode] || '随机连续')
        : (mode === 'random' ? '随机' : '单曲循环'),
      enabled: settings.categoryEnabled[category.key] !== false
    });
  });
}

function decorateCustomSlots(slots) {
  return (Array.isArray(slots) ? slots : []).map((item, index) => Object.assign({}, item, {
    position: index + 1,
    displayIcon: item.channel === 'two' ? '2' : (item.channel === 'three' ? '3' : String(index + 1))
  }));
}

function localAudioLibrary() {
  const saved = wx.getStorageSync(LOCAL_AUDIO_LIBRARY_KEY);
  return Array.isArray(saved) ? saved.filter((item) => item && item.id && item.source) : [];
}

function saveLocalAudioLibrary(items) {
  wx.setStorageSync(LOCAL_AUDIO_LIBRARY_KEY, Array.isArray(items) ? items.slice(0, LOCAL_AUDIO_LIMIT) : []);
}

function buildCustomSlots(audioMap, audioItems) {
  const options = collectAudioOptions(customCategory, audioMap, audioItems);
  localAudioLibrary().filter((item) => item.channel !== 'warmup').forEach((item) => {
    if (options.some((option) => option.id === item.id)) return;
    options.unshift(Object.assign({}, item, { localOnly: true, note: '仅此设备' }));
  });

  customCategory.fallbackNames.forEach((name, index) => {
    if (options.length >= customCategory.fallbackNames.length) return;
    if (!options.some((item) => item.name === name)) {
      options.push({
        id: `placeholder-custom-${index}`,
        name,
        source: '',
        channel: customCategory.fallbackChannels[index] || ''
      });
    }
  });
  const saved = wx.getStorageSync(CUSTOM_SLOTS_KEY);
  const savedIds = Array.isArray(saved) ? saved : [];
  const selected = savedIds
    .map((id) => options.find((item) => item.id === id))
    .filter(Boolean);
  options.forEach((option) => {
    if (selected.length < 6 && !selected.some((item) => item.id === option.id)) selected.push(option);
  });
  return {
    options,
    slots: decorateCustomSlots(selected.slice(0, 6))
  };
}

function saveCustomSlots(slots) {
  const normalized = Array.isArray(slots) ? slots : [];
  wx.setStorageSync(CUSTOM_SLOTS_KEY, normalized.map((item) => item.id));
  wx.setStorageSync(CUSTOM_SLOT_DETAILS_KEY, normalized.map((item) => ({
    id: item.id || '',
    name: item.name || '',
    source: item.source || '',
    channel: item.channel || '',
    localOnly: item.localOnly === true
  })));
}

function buildCustomModalOptions(options, slots, editingIndex) {
  const currentSlots = Array.isArray(slots) ? slots : [];
  const rows = (Array.isArray(options) ? options : []).map((option) => {
    const slotIndex = currentSlots.findIndex((slot) => slot.id === option.id);
    if (slotIndex < 0) {
      return Object.assign({}, option, {
        slotPositionText: '未选中',
        slotPositionClass: 'unselected'
      });
    }
    const position = Number(currentSlots[slotIndex].position) || slotIndex + 1;
    const isCurrent = slotIndex === editingIndex;
    return Object.assign({}, option, {
      slotPositionText: isCurrent ? `当前第${position}格` : `第${position}格`,
      slotPositionClass: isCurrent ? 'current' : 'selected'
    });
  });
  return [{ id: '__local_upload__', name: '上传本机音效', note: '不上传云端，仅保存在此设备', localUpload: true }].concat(rows);
}

function voiceToastText(result) {
  if (!result) return '播报试听生成失败';
  const code = result.code || '';
  const messageMap = {
    empty_text: '请先生成需要播报的文案',
    text_too_long: '播报文案过长，请缩短后再试',
    no_voice_credit: 'AI 播报暂不可用，请稍后重试',
    empty_audio: '语音生成成功但未返回音频',
    missing_tts_secret: '语音服务密钥未配置',
    tts_credential_invalid: '语音服务凭据已失效，请联系管理员',
    tts_permission_missing: '语音播报权限未开通，请联系管理员',
    tts_failed: '播报试听生成失败'
  };
  return messageMap[code] || '播报试听生成失败';
}

Page({
  audioUrlCache: null,
  audioRequestId: 0,
  voicePreviewRequestId: 0,
  currentAudioSource: '',
  audioContext: null,
  audioRetiringContexts: null,
  audioFadeTimer: null,

  data: {
    assetBase: ASSET_BASE,
    assetUrls: initialAssetUrls(),
    settings: normalizeSettings(),
    categories: [],
    voiceOptions: buildVoiceOptions('standard'),
    voiceStyle: 'standard',
    voiceMode: 'simple',
    voiceModeOptions: buildVoiceModeOptions('simple'),
    voicePreviewText: VOICE_PREVIEW_TEXT.simple,
    packageName: '默认音效包',
    modalVisible: false,
    modalTitle: '',
    modalType: '',
    modalCategoryKey: '',
    modalOptions: [],
    editingSlotIndex: -1,
    customSlots: [],
    customOptions: [],
    playingKey: '',
    cloudLoading: false,
    customMixModeText: customMixModeText('duck')
  },

  onLoad() {
    this.audioUrlCache = Object.create(null);
    this.loadAssetUrls();
  },

  onShow() {
    this.refresh();
    this.loadCloudAudioLibrary();
  },

  onUnload() {
    this.audioRequestId += 1;
    this.voicePreviewRequestId += 1;
    this.currentAudioSource = '';
    this.previewVolumeGroup = '';
    stopAudioTransition(this);
  },

  refresh() {
    const settings = normalizeSettings(wx.getStorageSync(AUDIO_SETTINGS_KEY));
    const audioMap = wx.getStorageSync(CLOUD_AUDIO_MAP_KEY) || {};
    const audioItems = wx.getStorageSync(CLOUD_AUDIO_ITEMS_KEY) || [];
    const storedVoiceStyle = wx.getStorageSync(VOICE_STYLE_KEY) || 'standard';
    const voice = voiceOptions.find((item) => item.id === storedVoiceStyle) || voiceOptions[0];
    const voiceStyle = voice.id;
    if (voiceStyle !== storedVoiceStyle) wx.setStorageSync(VOICE_STYLE_KEY, voiceStyle);
    const storedVoiceMode = wx.getStorageSync(VOICE_MODE_KEY);
    const voiceMode = storedVoiceMode === 'full' ? 'full' : 'simple';
    const custom = buildCustomSlots(audioMap, audioItems);
    saveCustomSlots(custom.slots);
    this.setData({
      settings,
      customMixModeText: customMixModeText(settings.customMixMode),
      categories: buildCategories(settings, audioMap, audioItems, this.data.assetUrls),
      voiceStyle,
      voiceOptions: buildVoiceOptions(voiceStyle),
      voiceMode,
      voiceModeOptions: buildVoiceModeOptions(voiceMode),
      voicePreviewText: VOICE_PREVIEW_TEXT[voiceMode],
      packageName: settings.soundPackage === 'custom' ? '自定义音效包' : '默认音效包',
      customSlots: custom.slots,
      customOptions: custom.options
    });
  },

  async loadCloudAudioLibrary() {
    if (this.data.cloudLoading) return;
    this.setData({ cloudLoading: true });
    try {
      const result = await callCloud('sxGetAudioLibrary', {});
      if (result && result.ok) {
        if (result.audioMap) wx.setStorageSync(CLOUD_AUDIO_MAP_KEY, result.audioMap);
        if (Array.isArray(result.items)) wx.setStorageSync(CLOUD_AUDIO_ITEMS_KEY, result.items);
        this.refresh();
      }
    } finally {
      this.setData({ cloudLoading: false });
    }
  },

  goBack() {
    wx.navigateBack();
  },

  updateSetting(event) {
    const key = event.currentTarget.dataset.key;
    const value = event.detail.value;
    const settings = Object.assign({}, this.data.settings, { [key]: value });
    this.applySettings(settings);
  },

  updateVolume(event) {
    const settings = Object.assign({}, this.data.settings, { volume: Number(event.detail.value || 0) });
    this.applySettings(settings);
  },

  previewVolumeChanging(event) {
    const requestedKey = event.currentTarget.dataset.key;
    const key = requestedKey === 'customVolume' ? 'customVolume' : (requestedKey === 'commonVolume' ? 'commonVolume' : 'volume');
    const settings = normalizeSettings(Object.assign({}, this.data.settings, { [key]: Number(event.detail.value || 0) }));
    this.setData({ settings });
    this.syncPlayingPreviewVolume(settings);
  },

  syncPlayingPreviewVolume(settings) {
    const context = this.audioContext;
    if (!context) return;
    const normalized = normalizeSettings(settings || this.data.settings);
    const groupVolume = this.previewVolumeGroup === 'custom' ? normalized.customVolume : normalized.commonVolume;
    const targetVolume = Math.max(0, Math.min(1, normalized.volume / 100 * groupVolume / 100));
    fadeAudioVolume(this, context, targetVolume, 60);
  },

  updateCategoryVolume(event) {
    const key = event.currentTarget.dataset.key === 'customVolume' ? 'customVolume' : 'commonVolume';
    this.applySettings(Object.assign({}, this.data.settings, { [key]: Number(event.detail.value || 0) }));
  },

  previewCategoryVolume(event) {
    const group = event.currentTarget.dataset.group === 'custom' ? 'custom' : 'common';
    if (group === 'custom') {
      const slot = (this.data.customSlots || []).find((item) => item && item.source);
      if (!slot) return wx.showToast({ title: '请先添加自定义音效', icon: 'none' });
      this.playAudio(slot.source, 'volume-custom', 'custom');
      return;
    }
    const category = (this.data.categories || []).find((item) => item && item.selectedSource && item.key !== 'warmup')
      || (this.data.categories || []).find((item) => item && item.selectedSource);
    if (!category) return wx.showToast({ title: '暂无可试听音效', icon: 'none' });
    this.playAudio(category.selectedSource, 'volume-common', 'common');
  },

  changeCustomMixMode() {
    const values = ['stop', 'duck'];
    wx.showActionSheet({
      itemList: ['停止背景音乐', '背景音减小'],
      success: (result) => this.applySettings(Object.assign({}, this.data.settings, { customMixMode: values[result.tapIndex] || 'duck' }))
    });
  },

  toggleCategory(event) {
    const key = event.currentTarget.dataset.key;
    const categoryEnabled = Object.assign({}, this.data.settings.categoryEnabled, {
      [key]: event.detail.value
    });
    this.applySettings(Object.assign({}, this.data.settings, { categoryEnabled }));
  },

  applySettings(settings) {
    const normalized = normalizeSettings(settings);
    const audioMap = wx.getStorageSync(CLOUD_AUDIO_MAP_KEY) || {};
    const audioItems = wx.getStorageSync(CLOUD_AUDIO_ITEMS_KEY) || [];
    wx.setStorageSync(AUDIO_SETTINGS_KEY, normalized);
    this.syncPlayingPreviewVolume(normalized);
    this.setData({
      settings: normalized,
      customMixModeText: customMixModeText(normalized.customMixMode),
      categories: buildCategories(normalized, audioMap, audioItems),
      packageName: normalized.soundPackage === 'custom' ? '自定义音效包' : '默认音效包'
    });
  },

  openPackageModal() {
    this.setData({
      modalVisible: true,
      modalTitle: '选择当前音效包',
      modalType: 'package',
      modalCategoryKey: '',
      modalOptions: [
        { id: 'default', name: '默认音效包', note: '免费使用' },
        { id: 'custom', name: '自定义音效包', note: '可配置' }
      ]
    });
  },

  selectVoice(event) {
    const id = event.currentTarget.dataset.id;
    const voice = voiceOptions.find((item) => item.id === id) || voiceOptions[0];
    wx.setStorageSync(VOICE_STYLE_KEY, voice.id);
    this.setData({
      voiceStyle: voice.id,
      voiceOptions: buildVoiceOptions(voice.id)
    }, () => this.generateVoicePreview(false));
  },

  async loadAssetUrls() {
    const entries = await Promise.all(MC_ASSET_FILES.map(async (file) => {
      try { return [file, await this.resolveAudioSource(ASSET_BASE + file)]; }
      catch (error) {
        console.warn('[mc-settings] asset resolve failed', file, error);
        return [file, ASSET_BASE + file];
      }
    }));
    const assetUrls = Object.fromEntries(entries);
    Object.entries(MC_ASSET_ALIASES).forEach(([alias, file]) => { assetUrls[alias] = assetUrls[file]; });
    this.setData({
      assetUrls,
      categories: buildCategories(this.data.settings, wx.getStorageSync(CLOUD_AUDIO_MAP_KEY) || {}, wx.getStorageSync(CLOUD_AUDIO_ITEMS_KEY) || [], assetUrls)
    });
  },

  selectVoiceMode(event) {
    const id = event.currentTarget.dataset.id === 'full' ? 'full' : 'simple';
    wx.setStorageSync(VOICE_MODE_KEY, id);
    this.setData({
      voiceMode: id,
      voiceModeOptions: buildVoiceModeOptions(id),
      voicePreviewText: VOICE_PREVIEW_TEXT[id]
    });
  },

  openAudioModal(event) {
    const key = event.currentTarget.dataset.key;
    const category = this.data.categories.find((item) => item.key === key);
    if (!category) return;
    this.setData({
      modalVisible: true,
      modalTitle: `选择${category.name}`,
      modalType: 'audio',
      modalCategoryKey: key,
      modalOptions: key === 'warmup'
        ? [{ id: '__local_upload__', name: '添加暖场音乐', note: '从微信文件选择，仅保存在此设备', localUpload: true }].concat(category.options)
        : category.options
    });
  },

  replaceCustomSlot(event) {
    const editingSlotIndex = Number(event.currentTarget.dataset.index);
    this.setData({
      modalVisible: true,
      modalTitle: '替换自定义音效',
      modalType: 'custom-slot',
      modalOptions: buildCustomModalOptions(this.data.customOptions, this.data.customSlots, editingSlotIndex),
      editingSlotIndex
    });
  },

  moveCustomSlot(event) {
    const index = Number(event.currentTarget.dataset.index);
    const direction = Number(event.currentTarget.dataset.direction);
    const target = index + direction;
    const slots = this.data.customSlots.slice();
    if (index < 0 || target < 0 || index >= slots.length || target >= slots.length) return;
    const current = slots[index];
    slots[index] = slots[target];
    slots[target] = current;
    const normalized = decorateCustomSlots(slots);
    saveCustomSlots(normalized);
    this.setData({ customSlots: normalized });
  },

  playCustomSlot(event) {
    const index = Number(event.currentTarget.dataset.index);
    const slot = this.data.customSlots[index];
    if (!slot || !slot.source) {
      wx.showToast({ title: '暂无可试听音效', icon: 'none' });
      return;
    }
    this.playAudio(slot.source, `custom-${index}`, 'custom');
  },

  chooseModalOption(event) {
    const optionIndex = Number(event.currentTarget.dataset.index);
    const modalOption = this.data.modalOptions[optionIndex];
    if (!modalOption) return;
    const id = modalOption.id;
    const type = this.data.modalType;
    if (id === '__local_upload__') {
      this.chooseLocalAudio(type === 'custom-slot' ? this.data.editingSlotIndex : -1, type === 'audio' ? this.data.modalCategoryKey : 'custom');
      return;
    }
    if (type === 'package') {
      this.applySettings(Object.assign({}, this.data.settings, { soundPackage: id }));
    } else if (type === 'audio') {
      const key = this.data.modalCategoryKey;
      const selectedAudio = Object.assign({}, this.data.settings.selectedAudio, { [key]: id });
      this.applySettings(Object.assign({}, this.data.settings, { selectedAudio }));
    } else if (type === 'custom-slot') {
      const option = this.data.customOptions.find((item) => item.id === id);
      const index = this.data.editingSlotIndex;
      if (option && index >= 0) {
        const slots = this.data.customSlots.slice();
        const duplicateIndex = slots.findIndex((item) => item.id === option.id);
        if (duplicateIndex >= 0 && duplicateIndex !== index) {
          const previous = slots[index];
          slots[index] = option;
          slots[duplicateIndex] = previous;
        } else {
          slots[index] = option;
        }
        const normalized = decorateCustomSlots(slots);
        saveCustomSlots(normalized);
        this.setData({ customSlots: normalized });
      }
    }
    this.closeModal();
  },

  chooseLocalAudio(editingSlotIndex, targetCategory) {
    if (!wx.chooseMessageFile || !wx.saveFile) {
      wx.showToast({ title: '当前微信版本不支持本机音效', icon: 'none' });
      return;
    }
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['mp3', 'm4a', 'aac', 'wav'],
      success: (result) => {
        const file = result.tempFiles && result.tempFiles[0];
        if (!file) return;
        const extension = String(file.name || '').split('.').pop().toLowerCase();
        if (!['mp3', 'm4a', 'aac', 'wav'].includes(extension)) {
          wx.showToast({ title: '仅支持MP3、M4A、AAC或WAV', icon: 'none' });
          return;
        }
        if (Number(file.size || 0) > LOCAL_AUDIO_MAX_BYTES) {
          wx.showToast({ title: '单个音效不能超过15MB', icon: 'none' });
          return;
        }
        const library = localAudioLibrary();
        if (library.length >= LOCAL_AUDIO_LIMIT) {
          wx.showToast({ title: '本机音效最多20个，请先删除', icon: 'none' });
          return;
        }
        wx.saveFile({
          tempFilePath: file.path,
          success: (saved) => {
            const item = {
              id: `local-audio-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
              name: String(file.name || '本机音效').replace(/\.[^.]+$/, '').slice(0, 24),
              source: saved.savedFilePath,
              channel: targetCategory === 'warmup' ? 'warmup' : 'local',
              localOnly: true,
              size: Number(file.size || 0),
              savedAt: Date.now()
            };
            saveLocalAudioLibrary([item].concat(library));
            if (targetCategory === 'warmup') {
              const selectedAudio = Object.assign({}, this.data.settings.selectedAudio, { warmup: item.source });
              this.applySettings(Object.assign({}, this.data.settings, { selectedAudio }));
            } else {
              const custom = buildCustomSlots(wx.getStorageSync(CLOUD_AUDIO_MAP_KEY) || {}, wx.getStorageSync(CLOUD_AUDIO_ITEMS_KEY) || []);
              const slots = this.data.customSlots.slice();
              if (editingSlotIndex >= 0 && editingSlotIndex < slots.length) slots[editingSlotIndex] = item;
              const normalized = decorateCustomSlots(slots);
              saveCustomSlots(normalized);
              this.setData({ customOptions: custom.options, customSlots: normalized });
            }
            this.closeModal();
            wx.showToast({ title: '已保存到本机', icon: 'success' });
          },
          fail: () => wx.showToast({ title: '本机存储空间不足', icon: 'none' })
        });
      }
    });
  },

  renameLocalAudio(event) {
    const id = event.currentTarget.dataset.id;
    const library = localAudioLibrary();
    const item = library.find((audio) => audio.id === id);
    if (!item) return;
    wx.showModal({
      title: '音效名称',
      editable: true,
      placeholderText: item.name,
      success: (result) => {
        const name = String(result.content || '').trim().slice(0, 24);
        if (!result.confirm || !name) return;
        saveLocalAudioLibrary(library.map((audio) => audio.id === id ? Object.assign({}, audio, { name }) : audio));
        this.refresh();
      }
    });
  },

  deleteLocalAudio(event) {
    const id = event.currentTarget.dataset.id;
    const library = localAudioLibrary();
    const item = library.find((audio) => audio.id === id);
    if (!item) return;
    wx.showModal({
      title: '删除本机音效',
      content: item.name,
      confirmText: '删除',
      confirmColor: '#d93934',
      success: (result) => {
        if (!result.confirm) return;
        saveLocalAudioLibrary(library.filter((audio) => audio.id !== id));
        if (wx.removeSavedFile) wx.removeSavedFile({ filePath: item.source, fail: () => {} });
        this.refresh();
        this.closeModal();
      }
    });
  },

  closeModal() {
    this.setData({
      modalVisible: false,
      modalTitle: '',
      modalType: '',
      modalCategoryKey: '',
      modalOptions: [],
      editingSlotIndex: -1
    });
  },

  stopPropagation() {},

  changeMode(event) {
    const key = event.currentTarget.dataset.key;
    const current = this.data.settings.modes[key] || 'fixed';
    if (key === 'warmup') {
      const values = ['random', 'sequence', 'single', 'current'];
      wx.showActionSheet({
        itemList: ['随机连续', '顺序连续', '单首循环', '播放当前'],
        success: (result) => {
          const modes = Object.assign({}, this.data.settings.modes, { warmup: values[result.tapIndex] || 'random' });
          this.applySettings(Object.assign({}, this.data.settings, { modes }));
        }
      });
      return;
    }
    const modes = Object.assign({}, this.data.settings.modes, {
      [key]: current === 'fixed' ? 'random' : 'fixed'
    });
    this.applySettings(Object.assign({}, this.data.settings, { modes }));
  },

  playCategory(event) {
    const key = event.currentTarget.dataset.key;
    const category = this.data.categories.find((item) => item.key === key);
    if (!category || !category.selectedSource) {
      wx.showToast({ title: '暂无可试听音效', icon: 'none' });
      return;
    }
    this.playAudio(category.selectedSource, key, 'common');
  },

  async playVoicePreview() {
    return this.generateVoicePreview(true);
  },

  async generateVoicePreview(showLoading) {
    const requestId = this.voicePreviewRequestId + 1;
    this.voicePreviewRequestId = requestId;
    const voiceStyle = this.data.voiceStyle;
    if (showLoading) wx.showLoading({ title: '生成试听中' });
    const result = await callCloud('sxCreateScoreVoice', {
      text: VOICE_PREVIEW_TEXT[this.data.voiceMode] || VOICE_PREVIEW_TEXT.simple,
      style: voiceStyle,
      skipCredit: true
    });
    if (showLoading) wx.hideLoading();
    if (requestId !== this.voicePreviewRequestId || voiceStyle !== this.data.voiceStyle) return;
    const source = result && (result.tempFileURL || result.fileID);
    if (!result || !result.ok || !source) {
      wx.showToast({ title: voiceToastText(result), icon: 'none' });
      return;
    }
    this.playAudio(source, 'voice', 'common');
  },

  async resolveAudioSource(source) {
    if (!source || source.indexOf('cloud://') !== 0) return source || '';
    if (this.audioUrlCache[source]) return this.audioUrlCache[source];

    const resolveTempUrl = () => new Promise((resolve, reject) => {
    if (!cloud || !cloud.getTempFileURL) {
        reject(new Error('client_cloud_audio_unavailable'));
        return;
      }
    cloud.getTempFileURL({
        fileList: [source],
        success: (result) => {
          const item = result.fileList && result.fileList[0];
          const url = item && item.tempFileURL;
          const invalidStatus = item && typeof item.status === 'number' && item.status !== 0;
          if (!item || !url || invalidStatus) {
            reject(new Error((item && item.errMsg) || 'cloud_audio_url_unavailable'));
            return;
          }
          resolve(url);
        },
        fail: reject
      });
    });
    const downloadTempFile = () => new Promise((resolve, reject) => {
    if (!cloud || !cloud.downloadFile) {
        reject(new Error('client_cloud_audio_download_unavailable'));
        return;
      }
    cloud.downloadFile({
        fileID: source,
        success: (result) => {
          const tempFilePath = result && result.tempFilePath;
          if (!tempFilePath) {
            reject(new Error('cloud_audio_download_failed'));
            return;
          }
          resolve(tempFilePath);
        },
        fail: reject
      });
    });

    let lastError = null;
    try {
      const url = await resolveTempUrl();
      this.audioUrlCache[source] = url;
      return url;
    } catch (error) {
      lastError = error;
    }

    try {
      const tempFilePath = await downloadTempFile();
      this.audioUrlCache[source] = tempFilePath;
      return tempFilePath;
    } catch (error) {
      lastError = error;
    }

    const result = await callCloud('sxGetAudioUrl', { fileID: source });
    const tempUrl = result && result.ok && result.tempFileURL;
    if (!tempUrl) {
      const message = (result && result.message) || (lastError && lastError.message) || 'cloud_audio_url_unavailable';
      throw new Error(message);
    }
    this.audioUrlCache[source] = tempUrl;
    return tempUrl;
  },

  async playAudio(source, key, volumeGroup) {
    if (!wx.createInnerAudioContext) return;
    if (this.data.playingKey === key) {
      this.audioRequestId += 1;
      this.currentAudioSource = '';
      this.previewVolumeGroup = '';
      stopAudioTransition(this);
      this.setData({ playingKey: '' });
      return;
    }
    const requestId = this.audioRequestId + 1;
    this.audioRequestId = requestId;
    this.currentAudioSource = source;
    this.previewVolumeGroup = volumeGroup === 'custom' ? 'custom' : 'common';
    this.setData({ playingKey: key });
    try {
      const playableSource = await this.resolveAudioSource(source);
      if (requestId !== this.audioRequestId) return;
      if (!playableSource) throw new Error('cloud_audio_url_unavailable');
      const context = wx.createInnerAudioContext();
      context.src = playableSource;
      context.onEnded(() => {
        if (!isCurrentAudio(this, context)) return disposeAudioContext(context);
        this.currentAudioSource = '';
        this.previewVolumeGroup = '';
        this.setData({ playingKey: '' });
        stopAudioTransition(this);
      });
      context.onError((error) => {
        if (!isCurrentAudio(this, context)) return disposeAudioContext(context);
        const failedSource = this.currentAudioSource;
        if (failedSource && this.audioUrlCache) delete this.audioUrlCache[failedSource];
        this.currentAudioSource = '';
        this.previewVolumeGroup = '';
        console.warn('[mc-settings] audio preview failed', error);
        this.setData({ playingKey: '' });
        stopAudioTransition(this);
        wx.showToast({ title: source.indexOf('wxfile://') === 0 ? '本机音效已失效，请重新上传' : '音效加载失败，请重试', icon: 'none' });
      });
      const groupVolume = volumeGroup === 'custom' ? this.data.settings.customVolume : this.data.settings.commonVolume;
      const targetVolume = Math.max(0, Math.min(1, (this.data.settings.volume / 100) * (Number(groupVolume) / 100)));
      startAudioTransition(this, context, key === 'voice' ? 'voice' : key, targetVolume);
    } catch (error) {
      console.warn('[mc-settings] resolve audio failed', source, error);
      if (requestId === this.audioRequestId) {
        this.currentAudioSource = '';
        this.setData({ playingKey: '' });
        wx.showToast({ title: source.indexOf('cloud://') === 0 ? '云端音效地址获取失败' : '本机音效读取失败', icon: 'none' });
      }
    }
  },

  saveSettings() {
    wx.setStorageSync(AUDIO_SETTINGS_KEY, this.data.settings);
    wx.showToast({ title: '设置已保存', icon: 'success' });
  }
});
