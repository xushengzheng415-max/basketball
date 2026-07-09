const { callCloud } = require('../../utils/cloud');

const AUDIO_SETTINGS_KEY = 'sx_mc_audio_settings';
const CLOUD_AUDIO_MAP_KEY = 'sx_mc_audio_map';
const CLOUD_AUDIO_ITEMS_KEY = 'sx_mc_audio_items';
const VOICE_STYLE_KEY = 'sx_score_voice_style';
const CUSTOM_SLOTS_KEY = 'sx_mc_custom_slots';
const QUICK_SLOTS_KEY = 'sx_mc_quick_slots';
const ASSET_BASE = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/pages/mc-settings/';
const VOICE_PREVIEW_TEXT = '你好，我是赛小蜂播报员，很高兴为您服务';

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
    buzzer: true
  },
  modes: {
    attack: 'fixed',
    defense: 'fixed',
    pause: 'random',
    buzzer: 'fixed'
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
  { channel: 'miss', name: '投篮未进', fileID: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/自定义音效/投篮未进音效.mp3' },
  { channel: 'cheer', name: '欢呼声', fileID: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/自定义音效/欢呼声.mp3' },
  { channel: 'shout', name: '冲锋号', fileID: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/自定义音效/冲锋号.mp3' },
  { channel: 'entry', name: '出场音乐', fileID: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/自定义音效/出场音乐.mp3' },
  { channel: 'anthem', name: '国歌', fileID: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/自定义音效/国歌.mp3' },
  { channel: 'other', name: '其他', fileID: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/自定义音效/国歌.mp3' }
];

const voiceOptions = [
  { id: 'standard', name: '赛小智' },
  { id: 'live', name: '赛小瑾' },
  { id: 'kids', name: '赛小萌' }
];

const categorySeed = [
  { key: 'attack', name: '进攻音效', icon: 'icon-basketball-common.png', sourceKeys: ['attack'] },
  { key: 'defense', name: '防守音效', icon: 'icon-shield-common.png', sourceKeys: ['defense'] },
  { key: 'pause', name: '暂停音乐', icon: 'icon-pause-common.png', sourceKeys: ['rest', 'pause'] },
  { key: 'buzzer', name: '蜂鸣器', icon: 'icon-whistle-common.png', sourceKeys: ['buzzer'] }
];

const customCategory = {
  key: 'custom',
  name: '自定义音效',
  sourceKeys: ['miss', 'cheer', 'shout', 'entry', 'anthem', 'other'],
  fallbackNames: ['投篮未进', '欢呼声', '冲锋号', '出场音乐', '国歌', '其他']
};

const shortcutActions = [
  { id: 'score-two', name: '2分得分' },
  { id: 'score-three', name: '3分得分' },
  { id: 'miss', name: '投篮未进' },
  { id: 'cheer', name: '欢呼声' },
  { id: 'horn', name: '冲锋号' },
  { id: 'attack', name: '进攻音效' },
  { id: 'defense', name: '防守音效' },
  { id: 'pause', name: '暂停音乐' },
  { id: 'buzzer', name: '蜂鸣器' },
  { id: 'foul', name: '犯规' },
  { id: 'timeout', name: '暂停' },
  { id: 'substitution', name: '换人' },
  { id: 'undo', name: '撤销操作' }
];

const defaultQuickSlots = [
  { id: 1, key: '1', action: 'attack', name: '进攻音效' },
  { id: 2, key: '2', action: 'defense', name: '防守音效' },
  { id: 3, key: '3', action: 'score-two', name: '2分得分' },
  { id: 4, key: '4', action: 'score-three', name: '3分得分' },
  { id: 5, key: '5', action: 'miss', name: '投篮未进' },
  { id: 6, key: '6', action: 'buzzer', name: '蜂鸣器' }
];

function normalizeSettings(saved) {
  const value = saved && typeof saved === 'object' ? saved : {};
  return Object.assign({}, defaultSettings, value, {
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
      source
    });
  });

  keys.forEach((key) => {
    normalizeList((audioMap || {})[key]).forEach((source) => {
      if (!source || seen[source]) return;
      seen[source] = true;
      options.push({ id: source, name: fileName(source) || category.name, source });
    });
  });

  if (!options.length && category.fallbackNames) {
    category.fallbackNames.forEach((name, index) => {
      options.push({ id: `placeholder-${category.key}-${index}`, name, source: '' });
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

function buildCustomSlots(audioMap, audioItems) {
  const options = collectAudioOptions(customCategory, audioMap, audioItems);
  customCategory.fallbackNames.forEach((name, index) => {
    if (options.length >= 6) return;
    if (!options.some((item) => item.name === name)) {
      options.push({ id: `placeholder-custom-${index}`, name, source: '' });
    }
  });
  const saved = wx.getStorageSync(CUSTOM_SLOTS_KEY);
  const savedIds = Array.isArray(saved) ? saved : [];
  const selected = savedIds
    .map((id) => options.find((item) => item.id === id))
    .filter(Boolean);
  options.forEach((option) => {
    if (selected.length < 4 && !selected.some((item) => item.id === option.id)) selected.push(option);
  });
  return {
    options,
    slots: selected.slice(0, 4).map((item, index) => Object.assign({}, item, { position: index + 1 }))
  };
}

function getQuickSlots() {
  const saved = wx.getStorageSync(QUICK_SLOTS_KEY);
  if (!Array.isArray(saved) || saved.length !== 6) return defaultQuickSlots;
  return defaultQuickSlots.map((fallback, index) => {
    const slot = saved[index] || fallback;
    const action = shortcutActions.find((item) => item.id === slot.action);
    return Object.assign({}, fallback, slot, { name: action ? action.name : fallback.name });
  });
}

function voiceToastText(result) {
  if (!result) return '播报试听生成失败';
  const code = result.code || '';
  const messageMap = {
    empty_text: '请先生成需要播报的文案',
    text_too_long: '播报文案过长，请缩短后再试',
    no_voice_credit: '当前没有可用的 AI 播报次数',
    empty_audio: '语音生成成功但未返回音频',
    missing_tts_secret: '语音服务密钥未配置',
    tts_failed: '播报试听生成失败'
  };
  return messageMap[code] || '播报试听生成失败';
}

Page({
  data: {
    assetBase: ASSET_BASE,
    settings: normalizeSettings(),
    categories: [],
    voiceOptions,
    voiceStyle: 'standard',
    voiceName: '赛小智',
    packageName: '默认音效包',
    modalVisible: false,
    modalTitle: '',
    modalType: '',
    modalCategoryKey: '',
    modalOptions: [],
    editingSlotIndex: -1,
    editingShortcutId: 0,
    customSlots: [],
    customOptions: [],
    quickSlots: [],
    playingKey: '',
    cloudLoading: false
  },

  onLoad() {
    this.audio = wx.createInnerAudioContext();
    this.audio.onEnded(() => this.setData({ playingKey: '' }));
    this.audio.onStop(() => this.setData({ playingKey: '' }));
    this.audio.onError(() => {
      this.setData({ playingKey: '' });
      wx.showToast({ title: '音效暂时无法播放', icon: 'none' });
    });
  },

  onShow() {
    this.refresh();
    this.loadCloudAudioLibrary();
  },

  onUnload() {
    if (this.audio) this.audio.destroy();
  },

  refresh() {
    const settings = normalizeSettings(wx.getStorageSync(AUDIO_SETTINGS_KEY));
    const audioMap = wx.getStorageSync(CLOUD_AUDIO_MAP_KEY) || {};
    const audioItems = wx.getStorageSync(CLOUD_AUDIO_ITEMS_KEY) || [];
    const voiceStyle = wx.getStorageSync(VOICE_STYLE_KEY) || 'standard';
    const voice = voiceOptions.find((item) => item.id === voiceStyle) || voiceOptions[0];
    const custom = buildCustomSlots(audioMap, audioItems);
    this.setData({
      settings,
      categories: buildCategories(settings, audioMap, audioItems),
      voiceStyle,
      voiceName: voice.name,
      packageName: settings.soundPackage === 'custom' ? '自定义音效包（付费）' : '默认音效包',
      customSlots: custom.slots,
      customOptions: custom.options,
      quickSlots: getQuickSlots()
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
    wx.setStorageSync(AUDIO_SETTINGS_KEY, settings);
    this.setData({
      settings,
      categories: buildCategories(
        settings,
        wx.getStorageSync(CLOUD_AUDIO_MAP_KEY) || {},
        wx.getStorageSync(CLOUD_AUDIO_ITEMS_KEY) || []
      ),
      packageName: settings.soundPackage === 'custom' ? '自定义音效包（付费）' : '默认音效包'
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
        { id: 'custom', name: '自定义音效包', note: '付费功能' }
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
    if (this.data.settings.soundPackage !== 'custom') {
      wx.showModal({
        title: '自定义音效包',
        content: '四宫格音效替换属于自定义音效包功能，请先选择自定义音效包。',
        showCancel: false
      });
      return;
    }
    this.setData({
      modalVisible: true,
      modalTitle: '替换自定义音效',
      modalType: 'custom-slot',
      modalOptions: this.data.customOptions,
      editingSlotIndex: Number(event.currentTarget.dataset.index),
      editingShortcutId: 0
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
    const normalized = slots.map((item, slotIndex) => Object.assign({}, item, { position: slotIndex + 1 }));
    wx.setStorageSync(CUSTOM_SLOTS_KEY, normalized.map((item) => item.id));
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

  editShortcut(event) {
    this.setData({
      modalVisible: true,
      modalTitle: `设置快捷键 ${event.currentTarget.dataset.key}`,
      modalType: 'shortcut',
      modalOptions: shortcutActions,
      editingShortcutId: Number(event.currentTarget.dataset.id),
      editingSlotIndex: -1
    });
  },

  chooseModalOption(event) {
    const id = event.currentTarget.dataset.id;
    const type = this.data.modalType;
    if (type === 'package') {
      if (id === 'custom') {
        wx.showModal({
          title: '自定义音效包（付费）',
          content: '当前版本暂未开通在线购买，选择后可预览自定义配置入口。',
          confirmText: '继续选择',
          success: (result) => {
            if (!result.confirm) return;
            this.applySettings(Object.assign({}, this.data.settings, { soundPackage: id }));
            this.closeModal();
          }
        });
        return;
      }
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
        const normalized = slots.map((item, slotIndex) => Object.assign({}, item, { position: slotIndex + 1 }));
        wx.setStorageSync(CUSTOM_SLOTS_KEY, normalized.map((item) => item.id));
        this.setData({ customSlots: normalized });
      }
    } else if (type === 'shortcut') {
      const action = shortcutActions.find((item) => item.id === id);
      const shortcutId = this.data.editingShortcutId;
      if (action && shortcutId) {
        const quickSlots = this.data.quickSlots.map((slot) => (
          slot.id === shortcutId ? Object.assign({}, slot, { action: action.id, name: action.name }) : slot
        ));
        wx.setStorageSync(QUICK_SLOTS_KEY, quickSlots);
        this.setData({ quickSlots });
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
      editingSlotIndex: -1,
      editingShortcutId: 0
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
      text: VOICE_PREVIEW_TEXT,
      style: this.data.voiceStyle
    });
    wx.hideLoading();
    const source = result && (result.tempFileURL || result.fileID);
    if (!result || !result.ok || !source) {
      wx.showToast({ title: voiceToastText(result), icon: 'none' });
      return;
    }
    this.playAudio(source, 'voice');
  },

  playAudio(source, key) {
    if (!this.audio) return;
    if (this.data.playingKey === key) {
      this.audio.stop();
      return;
    }
    this.audio.stop();
    this.audio.volume = Math.max(0, Math.min(1, this.data.settings.volume / 100));
    this.audio.src = source;
    this.setData({ playingKey: key });
    this.audio.play();
  },

  saveSettings() {
    wx.setStorageSync(AUDIO_SETTINGS_KEY, this.data.settings);
    wx.showToast({ title: '设置已保存', icon: 'success' });
  }
});
