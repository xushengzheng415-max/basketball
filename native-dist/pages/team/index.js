Page({
  data: {
    name: '',
    number: '',
    players: []
  },
  onShow() {
    this.setData({ players: wx.getStorageSync('players') || [] });
  },
  onNameInput(event) { this.setData({ name: event.detail.value }); },
  onNumberInput(event) { this.setData({ number: event.detail.value }); },
  addPlayer() {
    if (!this.data.name.trim()) {
      wx.showToast({ title: '请填写球员姓名', icon: 'none' });
      return;
    }
    const item = { id: Date.now(), name: this.data.name, number: this.data.number };
    const players = this.data.players.concat(item);
    wx.setStorageSync('players', players);
    this.setData({ name: '', number: '', players });
  }
});
