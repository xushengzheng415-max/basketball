function normalizeNumber(value) {
  return String(value || '').trim();
}

function sortNumbers(numbers) {
  return numbers.sort((a, b) => Number(a) - Number(b));
}

Page({
  data: {
    name: '',
    number: '',
    players: [],
    usedNumbersText: '暂无'
  },
  onShow() {
    this.refreshPlayers();
  },
  refreshPlayers() {
    const players = wx.getStorageSync('players') || [];
    const usedNumbers = sortNumbers(players.map((player) => normalizeNumber(player.number)).filter(Boolean));
    this.setData({
      players,
      usedNumbersText: usedNumbers.length ? usedNumbers.map((number) => `#${number}`).join('、') : '暂无'
    });
  },
  onNameInput(event) {
    this.setData({ name: event.detail.value });
  },
  onNumberInput(event) {
    this.setData({ number: normalizeNumber(event.detail.value) });
  },
  addPlayer() {
    const name = this.data.name.trim();
    const number = normalizeNumber(this.data.number);

    if (!name) {
      wx.showToast({ title: '请填写球员姓名', icon: 'none' });
      return;
    }

    if (!number) {
      wx.showToast({ title: '请填写球衣号码', icon: 'none' });
      return;
    }

    if (this.data.players.some((player) => normalizeNumber(player.number) === number)) {
      wx.showToast({ title: `${number}号已被占用`, icon: 'none' });
      return;
    }

    const players = this.data.players.concat({ id: Date.now(), name, number });
    wx.setStorageSync('players', players);
    this.setData({ name: '', number: '', players });
    this.refreshPlayers();
  },
  deletePlayer(event) {
    const id = event.currentTarget.dataset.id;
    const player = this.data.players.find((item) => String(item.id) === String(id));
    if (!player) return;

    wx.showModal({
      title: '删除球员',
      content: `确定从球员库删除 #${player.number || '--'} ${player.name} 吗？`,
      confirmText: '删除',
      confirmColor: '#d83b01',
      success: (res) => {
        if (!res.confirm) return;
        const players = this.data.players.filter((item) => String(item.id) !== String(id));
        wx.setStorageSync('players', players);
        this.setData({ players });
        this.refreshPlayers();
        wx.showToast({ title: '已删除', icon: 'success' });
      }
    });
  }
});