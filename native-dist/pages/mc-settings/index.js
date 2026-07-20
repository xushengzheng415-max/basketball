const { callCloud } = require('../../utils/cloud');

const AUDIO_SETTINGS_KEY = 'sx_mc_audio_settings';
const CLOUD_AUDIO_MAP_KEY = 'sx_mc_audio_map';
const CLOUD_AUDIO_ITEMS_KEY = 'sx_mc_audio_items';
const VOICE_STYLE_KEY = 'sx_score_voice_style';
const CUSTOM_SLOTS_KEY = 'sx_mc_custom_slots';
const CUSTOM_SLOT_DETAILS_KEY = 'sx_mc_custom_slot_details';
const VOICE_MODE_KEY = 'sx_score_voice_mode';
const ASSET_BASE = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/pages/mc-settings/';
const VOICE_PREVIEW_TEXT = {
  simple: '第一节还剩八分二十六秒，蜂巢U10A对星火U10，十二比十。',
  full: '第一节还剩八分二十六秒，蜂巢U10A十二比十领先星火U10。双方比分紧咬，比赛越来越精彩。'
};

const defaultSettings = {
  masterEnabled: true,
  volume: 70,
  soundPackage: 'default',
  twoEnabled: true,
  threeEnabled: true,
  buzzerEnabled: true,
  pauseAutoEnabled: true,
  categoryEnabled: {
    attack: true,
    defense: true,
    pause: true,
    buzzer: true,
    countdown: true
  },
  modes: {
    attack: 'fixed',
    defense: 'fixed',
    pause: 'random',
    buzzer: 'fixed',
    countdown: 'fixed'
  },
  selectedAudio: {}
};

const defaultAudioItems = [
  { channel: 'attack', name: '进攻音效1', fileID: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/进攻防守音乐/进攻音效1.mp3' },
  { channel: 'attack', name: '进攻音效2', fileID: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/进攻防守音乐/进攻音效2.mp3' },
  { channel: 'attack', name: '进攻音效3', fileID: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/进攻防守音乐/进攻音效3.mp3' },
  { channel: 'defense', name: '防守音效1', fileID: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/进攻防守音乐/防守音效1.mp3' },
  { channel: 'defense', name: '防守音效2', fileID: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/进攻防守音乐/防守音效2.mp3' },
  { channel: 'defense', name: '防守音效3', fileID: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/进攻防守音乐/防守音效3.mp3' },
  { channel: 'pause', name: '暂停音乐1', fileID: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/暂停休息音乐/暂停音乐1.mp3' },
  { channel: 'pause', name: '暂停音乐2', fileID: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/暂停休息音乐/暂停音乐2.mp3' },
  { channel: 'buzzer', name: '蜂鸣器', fileID: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/比赛音效/蜂鸣器.mp3' },
  { channel: 'countdown', name: '倒计时5秒', fileID: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/比赛音效/倒计时5秒.mp3' },
  { channel: 'two', name: '2分音效', fileID: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/比赛音效/2分进球音效.mp3' },
  { channel: 'three', name: '3分音效', fileID: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/比赛音效/三分球.mp3' },
  { channel: 'miss', name: '投篮未进', fileID: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/自定义音效/投篮未进音效.mp3' },
  { channel: 'cheer', name: '欢呼声', fileID: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/自定义音效/欢呼声(1).mp3' },
  { channel: 'shout', name: '冲锋号', fileID: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/自定义音效/冲锋号.mp3' },
  { channel: 'entry', name: '出场音乐', fileID: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/自定义音效/出场音乐.mp3' },
  { channel: 'anthem', name: '国歌', fileID: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/自定义音效/国歌.mp3' },
  { channel: 'freeThrowMade', name: '罚进音效', fileID: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/自定义音效/罚进音效.mp3' },
  { channel: 'freeThrowMiss', name: '罚球失误', fileID: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/自定义音效/罚球失误.mp3' }
];

const voiceOptions = [
  { id: 'standard', name: '赛小智' },
  { id: 'live', name: '赛小锦' },
  { id: 'kids', name: '赛小萌' }
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

const categorySeed = [
  { key: 'attack', name: '进攻音效', icon: 'icon-basketball-common.png', sourceKeys: ['attack'] },
  { key: 'defense', name: '防守音效', icon: 'icon-shield-common.png', sourceKeys: ['defense'] },
  { key: 'pause', name: '暂停音乐', icon: 'icon-pause-common.png', sourceKeys: ['rest', 'pause'] },
  { key: 'buzzer', name: '蜂鸣器', icon: 'icon-whistle-common.png', sourceKeys: ['buzzer'] },
  { key: 'countdown', name: '倒计时音效', icon: 'icon-pause-common.png', sourceKeys: ['countdown'] }
];

const customAudioSourceKeys = ['two', 'three', 'miss', 'cheer', 'shout', 'horn', 'entry', 'anthem', 'freeThrowMade', 'freeThrowMiss'];

const customCategory = {
  key: 'custom',
  name: '自定义音效',
  sourceKeys: customAudioSourceKeys,
  fallbackNames: ['2分音效', '3分音效', '投篮未进', '欢呼声', '冲锋号', '出场音乐', '国歌', '罚进音效', '罚球失误'],
  fallbackChannels: ['two', 'three', 'miss', 'cheer', 'horn', 'entry', 'anthem', 'freeThrowMade', 'freeThrowMiss']
};

function normalizeSettings(saved) {
  const value = saved && typeof saved === 'object' ? saved : {};
  return Object.assign({}, defaultSettings, value, {
    twoEnabled: true,
    threeEnabled: true,
    categoryEnabled: Object.assign({}, defaultSettings.categoryEnabled, value.categoryEnabled || {}),
    modes: Object.assign({}, defaultSettings.modes, value.modes || {}),
    selectedAudio: Object.assign({}, value.selectedAudio || {})
  });
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

  if (!options.length && category.fallbackNames) {
    category.fallbackNames.forEach((name, index) => {
      options.push({ id: `placeholder-${category.key}-${index}`, name, source: '', channel: (category.fallbackChannels || [])[index] || '' });
    });
  }

  return options;
}

function buildCategories(settings, audioMap, audioItems) {
  return categorySeed.map((category) => {
    const options = collectAudioOptions(category, audioMap, audioItems);
    const selectedId = settings.selectedAudio[category.key];
    const selected = options.find((item) => item.id === selectedId) || options[0] || {};
    const mode = settings.modes[category.key] || 'fixed';
    return Object.assign({}, category, {
      iconUrl: ASSET_BASE + category.icon,
      options,
      selectedName: selected.name || '暂无音效',
      selectedSource: selected.source || '',
      mode,
      modeText: mode === 'random' ? '随机' : '单曲循环',
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

function buildCustomSlots(audioMap, audioItems) {
  const options = collectAudioOptions(customCategory, audioMap, audioItems);
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
    channel: item.channel || ''
  })));
}

function buildCustomModalOptions(options, slots, editingIndex) {
  const currentSlots = Array.isArray(slots) ? slots : [];
  return (Array.isArray(options) ? options : []).map((option) => {
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
    tts_failed: '播报试听生成失败'
  };
  return messageMap[code] || '播报试听生成失败';
}

Page({
  audioUrlCache: null,
  audioRequestId: 0,
  currentAudioSource: '',

  data: {
    assetBase: ASSET_BASE,
    settings: normalizeSettings(),
    categories: [],
    voiceOptions,
    voiceStyle: 'standard',
    voiceName: '赛小智',
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
    cloudLoading: false
  },

  onLoad() {
    this.audioUrlCache = Object.create(null);
    this.audio = wx.createInnerAudioContext();
    this.audio.onEnded(() => {
      this.currentAudioSource = '';
      this.setData({ playingKey: '' });
    });
    this.audio.onStop(() => this.setData({ playingKey: '' }));
    this.audio.onError((error) => {
      const source = this.currentAudioSource;
      if (source && this.audioUrlCache) delete this.audioUrlCache[source];
      this.currentAudioSource = '';
      console.warn('[mc-settings] audio preview failed', error);
      this.setData({ playingKey: '' });
      wx.showToast({ title: '音效加载失败，请重试', icon: 'none' });
    });
  },

  onShow() {
    this.refresh();
    this.loadCloudAudioLibrary();
  },

  onUnload() {
    this.audioRequestId += 1;
    this.currentAudioSource = '';
    if (this.audio) this.audio.destroy();
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
      categories: buildCategories(settings, audioMap, audioItems),
      voiceStyle,
      voiceName: voice.name,
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
    this.setData({
      settings: normalized,
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

  openVoiceModal() {
    this.setData({
      modalVisible: true,
      modalTitle: '选择得分播报员',
      modalType: 'voice',
      modalCategoryKey: '',
      modalOptions: voiceOptions
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
      modalOptions: category.options
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
    this.playAudio(slot.source, `custom-${index}`);
  },

  chooseModalOption(event) {
    const optionIndex = Number(event.currentTarget.dataset.index);
    const modalOption = this.data.modalOptions[optionIndex];
    if (!modalOption) return;
    const id = modalOption.id;
    const type = this.data.modalType;
    if (type === 'package') {
      this.applySettings(Object.assign({}, this.data.settings, { soundPackage: id }));
    } else if (type === 'voice') {
      const voice = voiceOptions.find((item) => item.id === id) || voiceOptions[0];
      wx.setStorageSync(VOICE_STYLE_KEY, voice.id);
      this.setData({ voiceStyle: voice.id, voiceName: voice.name });
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
    this.playAudio(category.selectedSource, key);
  },

  async playVoicePreview() {
    wx.showLoading({ title: '生成试听中' });
    const result = await callCloud('sxCreateScoreVoice', {
      text: VOICE_PREVIEW_TEXT[this.data.voiceMode] || VOICE_PREVIEW_TEXT.simple,
      style: this.data.voiceStyle,
      skipCredit: true
    });
    wx.hideLoading();
    const source = result && (result.tempFileURL || result.fileID);
    if (!result || !result.ok || !source) {
      wx.showToast({ title: voiceToastText(result), icon: 'none' });
      return;
    }
    this.playAudio(source, 'voice');
  },

  async resolveAudioSource(source) {
    if (!source || source.indexOf('cloud://') !== 0) return source || '';
    if (this.audioUrlCache[source]) return this.audioUrlCache[source];

    const resolveTempUrl = () => new Promise((resolve, reject) => {
      if (!wx.cloud || !wx.cloud.getTempFileURL) {
        reject(new Error('client_cloud_audio_unavailable'));
        return;
      }
      wx.cloud.getTempFileURL({
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
      if (!wx.cloud || !wx.cloud.downloadFile) {
        reject(new Error('client_cloud_audio_download_unavailable'));
        return;
      }
      wx.cloud.downloadFile({
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

  async playAudio(source, key) {
    if (!this.audio) return;
    if (this.data.playingKey === key) {
      this.audioRequestId += 1;
      this.currentAudioSource = '';
      this.audio.stop();
      this.setData({ playingKey: '' });
      return;
    }
    const requestId = this.audioRequestId + 1;
    this.audioRequestId = requestId;
    this.audio.stop();
    this.currentAudioSource = source;
    this.setData({ playingKey: key });
    try {
      const playableSource = await this.resolveAudioSource(source);
      if (requestId !== this.audioRequestId) return;
      if (!playableSource) throw new Error('cloud_audio_url_unavailable');
      this.audio.volume = Math.max(0, Math.min(1, this.data.settings.volume / 100));
      this.audio.src = playableSource;
      this.audio.play();
    } catch (error) {
      console.warn('[mc-settings] resolve audio failed', source, error);
      if (requestId === this.audioRequestId) {
        this.currentAudioSource = '';
        this.setData({ playingKey: '' });
        wx.showToast({ title: '云端音效地址获取失败', icon: 'none' });
      }
    }
  },

  saveSettings() {
    wx.setStorageSync(AUDIO_SETTINGS_KEY, this.data.settings);
    wx.showToast({ title: '设置已保存', icon: 'success' });
  }
});
