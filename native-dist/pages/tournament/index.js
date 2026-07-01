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
  onNameInput(event) {
    this.setData({ name: event.detail.value });
  },
  onLocationInput(event) {
    this.setData({ location: event.detail.value });
  },
  onDateInput(event) {
    this.setData({ date: event.detail.value });
  },
  saveTournament() {
    const name = this.data.name.trim();
    if (!name) {
      wx.showToast({ title: '请填写赛事名称', icon: 'none' });
      return;
    }

    const tournament = {
      id: Date.now(),
      name,
      location: this.data.location.trim(),
      date: this.data.date.trim()
    };
    const tournaments = [tournament].concat(this.data.tournaments);
    wx.setStorageSync('tournaments', tournaments);
    this.setData({ name: '', location: '', date: '', tournaments });
    wx.showToast({ title: '赛事已保存', icon: 'success' });
  },
  openTournament(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/tournament-detail/index?id=${id}` });
  }
});