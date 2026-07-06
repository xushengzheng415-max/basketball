const { callCloud } = require('../../utils/cloud');

const AUDIO_SETTINGS_KEY = 'sx_mc_audio_settings';
const QUICK_SLOTS_KEY = 'sx_mc_quick_slots';
const LOCAL_AUDIO_KEY = 'sx_mc_local_audio_map';
const CLOUD_AUDIO_MAP_KEY = 'sx_mc_audio_map';
const CLOUD_AUDIO_ITEMS_KEY = 'sx_mc_audio_items';
const audioExtensions = ['mp3', 'm4a', 'wav', 'aac'];

const defaultSettings = {
  twoEnabled: true,
  threeEnabled: true,
  localAudioEnabled: true,
  modes: {
    two: 'fixed',
    three: 'fixed',
    rest: 'random',
    defense: 'random',
    attack: 'random',
    buzzer: 'fixed',
    start: 'fixed',
    ambience: 'random'
  }
};

const categoriesSeed = [
  { key: 'two', label: '2\u5206\u97f3\u6548', hint: '\u8fdb\u7403 2 \u5206\u65f6\u89e6\u53d1', hasMode: true },
  { key: 'three', label: '3\u5206\u97f3\u6548', hint: '\u957f\u6309 3 \u5206\u65f6\u89e6\u53d1', hasMode: true },
  { key: 'rest', label: '\u4f11\u606f\u97f3\u4e50', hint: '\u6682\u505c\u548c\u5c0f\u8282\u7ed3\u675f\u540e\u4f7f\u7528', hasMode: true },
  { key: 'defense', label: '\u9632\u5b88\u97f3\u4e50', hint: '\u53ef\u5faa\u73af\u64ad\u653e', hasMode: true },
  { key: 'attack', label: '\u8fdb\u653b\u97f3\u4e50', hint: '\u53ef\u5faa\u73af\u64ad\u653e', hasMode: true },
  { key: 'buzzer', label: '\u8702\u9e23\u5668', hint: '\u5c0f\u8282\u7ed3\u675f\u3001\u6bd4\u8d5b\u7ed3\u675f\u548c\u6682\u505c', hasMode: true },
  { key: 'start', label: '\u6bd4\u8d5b\u5f00\u59cb\u97f3\u6548', hint: '\u6b63\u5f0f\u5f00\u59cb\u6bd4\u8d5b\u65f6\u64ad\u653e', hasMode: true },
  { key: 'voice', label: '\u64ad\u62a5\u8bed\u97f3\u5305', hint: '\u9009\u62e9 AI \u6bd4\u5206\u64ad\u62a5\u97f3\u8272', hasMode: false, isVoice: true },
  { key: 'ambience', label: '\u6c1b\u56f4\u97f3\u6548', hint: '\u6b22\u547c\u3001\u638c\u58f0\u3001\u6295\u7bee\u672a\u8fdb', hasMode: true }
];

const voicePackageOptions = [
  { id: 'standard', name: '\u8d5b\u5c0f\u667a', desc: '\u7a33\u91cd\u6e05\u6670\uff0c\u9002\u5408\u5e38\u89c4\u6bd4\u8d5b\u64ad\u62a5' },
  { id: 'live', name: '\u8d5b\u5c0f\u747e', desc: '\u66f4\u6709\u73b0\u573a\u611f\uff0c\u9002\u5408 MC \u64ad\u62a5' },
  { id: 'kids', name: '\u8d5b\u5c0f\u840c', desc: '\u8f7b\u677e\u53cb\u597d\uff0c\u9002\u5408\u5c11\u513f\u8d5b\u4e8b' }
];

const actionOptions = [
  { key: 'cheer', label: '\u6b22\u547c' },
  { key: 'applause', label: '\u638c\u58f0' },
  { key: 'two', label: '2\u5206' },
  { key: 'three', label: '3\u5206' },
  { key: 'miss', label: '\u672a\u8fdb' },
  { key: 'buzzer', label: '\u8702\u9e23' },
  { key: 'start', label: '\u5f00\u59cb' },
  { key: 'rest', label: '\u4f11\u606f' },
  { key: 'attack', label: '\u8fdb\u653b' },
  { key: 'defense', label: '\u9632\u5b88' }
];

const defaultQuickSlots = [
  { id: 1, key: '1', action: 'cheer', label: '\u6b22\u547c' },
  { id: 2, key: '2', action: 'two', label: '2\u5206' },
  { id: 3, key: '3', action: 'three', label: '3\u5206' },
  { id: 4, key: '4', action: 'miss', label: '\u672a\u8fdb' },
  { id: 5, key: '5', action: 'attack', label: '\u8fdb\u653b' },
  { id: 6, key: '6', action: 'defense', label: '\u9632\u5b88' }
];

const categorySourceKeys = { ambience: ['ambience', 'cheer', 'applause', 'miss'] };
const channelLabels = { cheer: '\u6b22\u547c', applause: '\u638c\u58f0', miss: '\u6295\u7bee\u672a\u8fdb' };

function getSettings() {
  const saved = wx.getStorageSync(AUDIO_SETTINGS_KEY) || {};
  return Object.assign({}, defaultSettings, saved, {
    modes: Object.assign({}, defaultSettings.modes, saved.modes || {})
  });
}

function getLocalAudioMap() {
  const saved = wx.getStorageSync(LOCAL_AUDIO_KEY) || {};
  return saved && typeof saved === 'object' ? saved : {};
}

function saveLocalAudioMap(map) {
  wx.setStorageSync(LOCAL_AUDIO_KEY, map || {});
}

function getCloudAudioMap() {
  const saved = wx.getStorageSync(CLOUD_AUDIO_MAP_KEY) || {};
  return saved && typeof saved === 'object' ? saved : {};
}

function getCloudAudioItems() {
  const saved = wx.getStorageSync(CLOUD_AUDIO_ITEMS_KEY) || [];
  return Array.isArray(saved) ? saved : [];
}

function normalizeAudioList(list) {
  if (!list) return [];
  return Array.isArray(list) ? list.filter(Boolean) : [list].filter(Boolean);
}

function getFileName(src) {
  if (!src) return '';
  const clean = String(src).split('?')[0];
  const name = clean.slice(clean.lastIndexOf('/') + 1);
  try { return decodeURIComponent(name); } catch (e) { return name; }
}

function getSourceKeys(key) {
  return categorySourceKeys[key] || [key];
}

function collectLocalAudio(key, localAudioMap) {
  return getSourceKeys(key).reduce((all, sourceKey) => {
    const list = Array.isArray(localAudioMap[sourceKey]) ? localAudioMap[sourceKey] : [];
    return all.concat(list.map((item, index) => ({
      id: 'local-' + sourceKey + '-' + (item.id || index),
      sourceId: item.filePath || item.id || String(index),
      name: item.name || getFileName(item.filePath) || '\u672c\u673a\u97f3\u6548',
      sourceText: '\u672c\u673a',
      sourceClass: 'local',
      channelText: sourceKey !== key && channelLabels[sourceKey] ? channelLabels[sourceKey] : ''
    })));
  }, []);
}

function collectCloudAudio(key, cloudAudioMap, cloudAudioItems) {
  const keys = getSourceKeys(key);
  const seen = Object.create(null);
  const items = [];
  (cloudAudioItems || []).forEach((item) => {
    const channel = item.channel || item.type || '';
    const fileID = item.fileID || item.fileId || '';
    if (!keys.includes(channel) || !fileID || seen[fileID]) return;
    seen[fileID] = true;
    items.push({
      id: 'cloud-' + channel + '-' + fileID,
      sourceId: fileID,
      name: item.name || getFileName(fileID) || '\u4e91\u7aef\u97f3\u6548',
      sourceText: '\u4e91\u7aef',
      sourceClass: 'cloud',
      channelText: channel !== key && channelLabels[channel] ? channelLabels[channel] : ''
    });
  });
  keys.forEach((sourceKey) => {
    normalizeAudioList((cloudAudioMap || {})[sourceKey]).forEach((fileID, index) => {
      if (!fileID || seen[fileID]) return;
      seen[fileID] = true;
      items.push({
        id: 'cloud-' + sourceKey + '-' + index,
        sourceId: fileID,
        name: getFileName(fileID) || '\u4e91\u7aef\u97f3\u6548',
        sourceText: '\u4e91\u7aef',
        sourceClass: 'cloud',
        channelText: sourceKey !== key && channelLabels[sourceKey] ? channelLabels[sourceKey] : ''
      });
    });
  });
  return items;
}

function getQuickSlots() {
  const saved = wx.getStorageSync(QUICK_SLOTS_KEY);
  if (!Array.isArray(saved) || !saved.length) return defaultQuickSlots;
  const labelMap = Object.create(null);
  actionOptions.forEach((item) => { labelMap[item.key] = item.label; });
  return defaultQuickSlots.map((fallback, index) => {
    const item = saved[index] || fallback;
    const action = labelMap[item.action] ? item.action : fallback.action;
    return Object.assign({}, fallback, item, { action, label: labelMap[action] || item.label || fallback.label });
  });
}

function buildCategories(settings, localAudioMap, cloudAudioMap, cloudAudioItems) {
  return categoriesSeed.map((item) => {
    const mode = settings.modes[item.key] || 'fixed';
    if (item.isVoice) {
      return Object.assign({}, item, {
        mode,
        audioItems: [],
        hasAudioItems: false,
        currentAudioText: '\u8bf7\u5728\u4e0a\u65b9\u9009\u62e9\u64ad\u62a5\u8bed\u97f3\u5305'
      });
    }
    const localItems = collectLocalAudio(item.key, localAudioMap);
    const cloudItems = collectCloudAudio(item.key, cloudAudioMap, cloudAudioItems);
    const preferred = settings.localAudioEnabled !== false && localItems.length ? localItems : cloudItems;
    const allItems = (settings.localAudioEnabled !== false ? localItems.concat(cloudItems) : cloudItems).slice(0, 16);
    const currentId = preferred[0] && preferred[0].id;
    const markedItems = allItems.map((audio) => Object.assign({}, audio, {
      currentClass: mode === 'fixed' && audio.id === currentId ? 'current' : '',
      currentText: mode === 'fixed' && audio.id === currentId ? '\u5f53\u524d' : ''
    }));
    const total = localItems.length + cloudItems.length;
    const currentAudioText = total
      ? (mode === 'random' ? ('\u5f53\u524d\uff1a\u968f\u673a\u64ad\u653e ' + total + ' \u4e2a\u97f3\u6548') : ('\u5f53\u524d\uff1a' + (preferred[0] ? preferred[0].name : '\u6682\u65e0\u53ef\u7528\u97f3\u6548')))
      : '\u5f53\u524d\uff1a\u672a\u5bfc\u5165\u672c\u673a\u97f3\u6548\uff0c\u672a\u8bfb\u5230\u4e91\u7aef\u97f3\u4e50\u5e93';
    return Object.assign({}, item, {
      mode,
      modeText: mode === 'random' ? '\u968f\u673a\u64ad\u653e' : '\u56fa\u5b9a\u64ad\u653e',
      randomClass: mode === 'random' ? 'active' : '',
      fixedClass: mode === 'fixed' ? 'active' : '',
      localCount: localItems.length,
      cloudCount: cloudItems.length,
      localText: '\u672c\u673a ' + localItems.length + ' \u4e2a\uff0c\u4e91\u7aef ' + cloudItems.length + ' \u4e2a',
      currentAudioText,
      audioItems: markedItems,
      hasAudioItems: markedItems.length > 0,
      audioMoreText: total > markedItems.length ? ('\u8fd8\u6709 ' + (total - markedItems.length) + ' \u4e2a\u672a\u663e\u793a') : ''
    });
  });
}

Page({
  data: {
    settings: defaultSettings,
    categories: [],
    cloudLoading: false,
    quickSlots: [],
    actionOptions,
    editingSlotId: 0,
    voicePackageOptions: [],
    voiceStyle: 'standard'
  },
  onShow() {
    this.refresh();
    this.loadCloudAudioLibrary();
  },
  refresh() {
    const settings = getSettings();
    const localAudioMap = getLocalAudioMap();
    const cloudAudioMap = getCloudAudioMap();
    const cloudAudioItems = getCloudAudioItems();
    const voiceStyle = wx.getStorageSync('sx_score_voice_style') || 'standard';
    const voiceOptions = voicePackageOptions.map((item) => Object.assign({}, item, { activeClass: item.id === voiceStyle ? 'active' : '' }));
    this.setData({
      settings,
      categories: buildCategories(settings, localAudioMap, cloudAudioMap, cloudAudioItems),
      quickSlots: getQuickSlots(),
      voicePackageOptions: voiceOptions,
      voiceStyle,
      editingSlotId: 0
    });
  },
  async loadCloudAudioLibrary() {
    if (this.data.cloudLoading) return;
    this.setData({ cloudLoading: true });
    const result = await callCloud('sxGetAudioLibrary', {});
    if (result && result.ok) {
      if (result.audioMap) wx.setStorageSync(CLOUD_AUDIO_MAP_KEY, result.audioMap);
      if (Array.isArray(result.items)) wx.setStorageSync(CLOUD_AUDIO_ITEMS_KEY, result.items);
      this.refresh();
    }
    this.setData({ cloudLoading: false });
  },
  toggleSetting(event) {
    const key = event.currentTarget.dataset.key;
    const settings = Object.assign({}, this.data.settings, { [key]: event.detail.value });
    const localAudioMap = getLocalAudioMap();
    const cloudAudioMap = getCloudAudioMap();
    const cloudAudioItems = getCloudAudioItems();
    this.setData({ settings, categories: buildCategories(settings, localAudioMap, cloudAudioMap, cloudAudioItems) }, () => this.saveSettings(true));
  },
  setMode(event) {
    const key = event.currentTarget.dataset.key;
    const mode = event.currentTarget.dataset.mode;
    const settings = Object.assign({}, this.data.settings, {
      modes: Object.assign({}, this.data.settings.modes, { [key]: mode })
    });
    const localAudioMap = getLocalAudioMap();
    const cloudAudioMap = getCloudAudioMap();
    const cloudAudioItems = getCloudAudioItems();
    this.setData({ settings, categories: buildCategories(settings, localAudioMap, cloudAudioMap, cloudAudioItems) }, () => this.saveSettings(true));
  },
  importLocalAudio(event) {
    const key = event.currentTarget.dataset.key;
    const category = categoriesSeed.find((item) => item.key === key);
    if (!key || !category || category.isVoice) return;
    if (!wx.chooseMessageFile) {
      wx.showToast({ title: '\u5f53\u524d\u5fae\u4fe1\u7248\u672c\u4e0d\u652f\u6301\u9009\u62e9\u6587\u4ef6', icon: 'none' });
      return;
    }
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: audioExtensions,
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file || !file.path) {
          wx.showToast({ title: '\u672a\u9009\u62e9\u97f3\u9891\u6587\u4ef6', icon: 'none' });
          return;
        }
        const fsManager = wx.getFileSystemManager && wx.getFileSystemManager();
        if (!fsManager || !fsManager.saveFile) {
          this.addLocalAudio(key, file.name || category.label, file.path);
          return;
        }
        fsManager.saveFile({
          tempFilePath: file.path,
          success: (saved) => this.addLocalAudio(key, file.name || category.label, saved.savedFilePath || file.path),
          fail: () => this.addLocalAudio(key, file.name || category.label, file.path)
        });
      }
    });
  },
  addLocalAudio(key, name, filePath) {
    const map = getLocalAudioMap();
    const list = Array.isArray(map[key]) ? map[key].slice() : [];
    list.unshift({ id: String(Date.now()), name: name || key, filePath, createdAt: Date.now() });
    map[key] = list.slice(0, 12);
    saveLocalAudioMap(map);
    this.refresh();
    wx.showToast({ title: '\u5df2\u5bfc\u5165\u672c\u673a\u97f3\u6548', icon: 'success' });
  },
  clearLocalAudio(event) {
    const key = event.currentTarget.dataset.key;
    const map = getLocalAudioMap();
    const list = Array.isArray(map[key]) ? map[key] : [];
    const fsManager = wx.getFileSystemManager && wx.getFileSystemManager();
    if (fsManager && fsManager.unlink) {
      list.forEach((item) => {
        if (item && item.filePath) {
          try { fsManager.unlink({ filePath: item.filePath }); } catch (e) {}
        }
      });
    }
    delete map[key];
    saveLocalAudioMap(map);
    this.refresh();
    wx.showToast({ title: '\u5df2\u6e05\u9664', icon: 'none' });
  },
  editSlot(event) {
    this.setData({ editingSlotId: Number(event.currentTarget.dataset.id || 0) });
  },
  setVoiceStyle(event) {
    const voiceStyle = event.currentTarget.dataset.id || 'standard';
    wx.setStorageSync('sx_score_voice_style', voiceStyle);
    const voicePackageOptions = this.data.voicePackageOptions.map((item) => Object.assign({}, item, { activeClass: item.id === voiceStyle ? 'active' : '' }));
    this.setData({ voiceStyle, voicePackageOptions });
    wx.showToast({ title: '\u8bed\u97f3\u5305\u5df2\u66f4\u65b0', icon: 'success' });
  },
  chooseSlotAction(event) {
    const id = this.data.editingSlotId;
    const action = event.currentTarget.dataset.action;
    const option = this.data.actionOptions.find((item) => item.key === action);
    if (!id || !option) return;
    const quickSlots = this.data.quickSlots.map((slot) => (
      slot.id === id ? Object.assign({}, slot, { action: option.key, label: option.label }) : slot
    ));
    wx.setStorageSync(QUICK_SLOTS_KEY, quickSlots);
    this.setData({ quickSlots, editingSlotId: 0 });
    wx.showToast({ title: '\u5feb\u6377\u952e\u5df2\u66f4\u65b0', icon: 'success' });
  },
  saveSettings(silent) {
    wx.setStorageSync(AUDIO_SETTINGS_KEY, this.data.settings);
    if (!silent) wx.showToast({ title: '\u8bbe\u7f6e\u5df2\u4fdd\u5b58', icon: 'success' });
  }
});
