const defaultSettings = {
  appName: '赛小蜂篮球',
  defaultPeriodMinutes: 10,
  defaultTotalPeriods: 4,
  defaultTimerMode: 'down'
};

Page({
  data: {
    settings: defaultSettings,
    durationOptions: [6, 8, 10, 12],
    periodOptions: [2, 4, 6]
  },
  onShow() {
    const saved = wx.getStorageSync('appSettings') || {};
    const settings = Object.assign({}, defaultSettings, saved);
    this.setData({ settings });
  },
  saveSettings(nextSettings) {
    const settings = Object.assign({}, this.data.settings, nextSettings);
    wx.setStorageSync('appSettings', settings);
    this.setData({ settings });
  },
  onAppNameInput(event) {
    this.saveSettings({ appName: event.detail.value || '赛小蜂篮球' });
  },
  setDuration(event) {
    this.saveSettings({ defaultPeriodMinutes: Number(event.currentTarget.dataset.value) });
  },
  decreaseDuration() {
    this.saveSettings({ defaultPeriodMinutes: Math.max(1, this.data.settings.defaultPeriodMinutes - 1) });
  },
  increaseDuration() {
    this.saveSettings({ defaultPeriodMinutes: Math.min(60, this.data.settings.defaultPeriodMinutes + 1) });
  },
  setPeriods(event) {
    this.saveSettings({ defaultTotalPeriods: Number(event.currentTarget.dataset.value) });
  },
  decreasePeriods() {
    this.saveSettings({ defaultTotalPeriods: Math.max(1, this.data.settings.defaultTotalPeriods - 1) });
  },
  increasePeriods() {
    this.saveSettings({ defaultTotalPeriods: Math.min(8, this.data.settings.defaultTotalPeriods + 1) });
  },
  setTimerMode(event) {
    this.saveSettings({ defaultTimerMode: event.currentTarget.dataset.mode });
  },
  clearLocalData() {
    wx.showModal({
      title: '清空本地数据',
      content: '会删除赛果、赛事和球员库，基础设置会保留。',
      confirmColor: '#d83b01',
      success: (res) => {
        if (!res.confirm) return;
        wx.removeStorageSync('latestMatchResult');
        wx.removeStorageSync('tournaments');
        wx.removeStorageSync('players');
        wx.showToast({ title: '已清空', icon: 'none' });
      }
    });
  }
});