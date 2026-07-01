Page({
  data: {
    name: '',
    location: '',
    date: '',
    tournaments: []
  },
  onShow() {
    this.setData({ tournaments: wx.getStorageSync('tournaments') || [] });
  },
  onNameInput(event) { this.setData({ name: event.detail.value }); },
  onLocationInput(event) { this.setData({ location: event.detail.value }); },
  onDateInput(event) { this.setData({ date: event.detail.value }); },
  saveTournament() {
    if (!this.data.name.trim()) {
      wx.showToast({ title: '请填写赛事名称', icon: 'none' });
      return;
    }
    const item = {
      id: Date.now(),
      name: this.data.name,
      location: this.data.location,
      date: this.data.date
    };
    const tournaments = [item].concat(this.data.tournaments);
    wx.setStorageSync('tournaments', tournaments);
    this.setData({ name: '', location: '', date: '', tournaments });
  }
});
