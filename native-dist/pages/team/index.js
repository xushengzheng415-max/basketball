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
  }
});