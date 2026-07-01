Page({
  data: {
    homeName: '主队',
    awayName: '客队',
    homeScore: 0,
    awayScore: 0,
    started: false,
    events: [],
    latestEvent: '暂无得分记录'
  },
  onHomeInput(event) {
    this.setData({ homeName: event.detail.value || '主队' });
  },
  onAwayInput(event) {
    this.setData({ awayName: event.detail.value || '客队' });
  },
  startMatch() {
    this.setData({ started: true });
  },
  addHome1() { this.addScore('home', 1); },
  addHome2() { this.addScore('home', 2); },
  addHome3() { this.addScore('home', 3); },
  addAway1() { this.addScore('away', 1); },
  addAway2() { this.addScore('away', 2); },
  addAway3() { this.addScore('away', 3); },
  addScore(side, points) {
    const isHome = side === 'home';
    const team = isHome ? this.data.homeName : this.data.awayName;
    const event = { side, points, text: `${team} +${points}` };
    const nextEvents = [event].concat(this.data.events);
    this.setData({
      homeScore: isHome ? this.data.homeScore + points : this.data.homeScore,
      awayScore: isHome ? this.data.awayScore : this.data.awayScore + points,
      events: nextEvents,
      latestEvent: event.text
    });
  },
  undo() {
    const events = this.data.events.slice();
    const latest = events.shift();
    if (!latest) return;
    const isHome = latest.side === 'home';
    this.setData({
      homeScore: isHome ? Math.max(0, this.data.homeScore - latest.points) : this.data.homeScore,
      awayScore: isHome ? this.data.awayScore : Math.max(0, this.data.awayScore - latest.points),
      events,
      latestEvent: events[0] ? events[0].text : '暂无得分记录'
    });
  },
  resetMatch() {
    this.setData({
      homeScore: 0,
      awayScore: 0,
      started: false,
      events: [],
      latestEvent: '暂无得分记录'
    });
  },
  finishMatch() {
    const result = {
      homeName: this.data.homeName,
      awayName: this.data.awayName,
      homeScore: this.data.homeScore,
      awayScore: this.data.awayScore,
      endedAt: new Date().toLocaleString()
    };
    wx.setStorageSync('latestMatchResult', result);
    wx.showToast({ title: '赛果已生成', icon: 'success' });
    setTimeout(() => wx.switchTab({ url: '/pages/home/index' }), 500);
  }
});
