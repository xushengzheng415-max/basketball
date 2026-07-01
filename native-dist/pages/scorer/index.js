function formatClock(totalSeconds) {
  const safe = Math.max(0, totalSeconds);
  const minutes = String(Math.floor(safe / 60)).padStart(2, '0');
  const seconds = String(safe % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

Page({
  timer: null,
  data: {
    homeName: '主队',
    awayName: '客队',
    homeScore: 0,
    awayScore: 0,
    homeFouls: 0,
    awayFouls: 0,
    started: false,
    events: [],
    latestEvent: '暂无记录',
    period: 1,
    totalPeriods: 4,
    periodOptions: [2, 4, 6],
    periodMinutes: 10,
    durationOptions: [6, 8, 10, 12],
    timerMode: 'down',
    timerModeText: '倒计时',
    clockSeconds: 600,
    clockText: '10:00',
    clockRunning: false
  },
  onUnload() {
    this.stopClock();
  },
  onHide() {
    this.stopClock();
  },
  onHomeInput(event) {
    this.setData({ homeName: event.detail.value || '主队' });
  },
  onAwayInput(event) {
    this.setData({ awayName: event.detail.value || '客队' });
  },
  applyPeriodMinutes(value) {
    const minutes = Math.min(60, Math.max(1, Number(value) || 10));
    const seconds = this.data.timerMode === 'down' ? minutes * 60 : 0;
    this.setData({ periodMinutes: minutes, clockSeconds: seconds, clockText: formatClock(seconds) });
  },
  setPeriodPreset(event) {
    this.applyPeriodMinutes(event.currentTarget.dataset.value);
  },
  decreasePeriodMinutes() {
    this.applyPeriodMinutes(this.data.periodMinutes - 1);
  },
  increasePeriodMinutes() {
    this.applyPeriodMinutes(this.data.periodMinutes + 1);
  },
  applyTotalPeriods(value) {
    const totalPeriods = Math.min(8, Math.max(1, Number(value) || 4));
    this.setData({ totalPeriods, period: Math.min(this.data.period, totalPeriods) });
  },
  setPeriodCountPreset(event) {
    this.applyTotalPeriods(event.currentTarget.dataset.value);
  },
  decreasePeriodCount() {
    this.applyTotalPeriods(this.data.totalPeriods - 1);
  },
  increasePeriodCount() {
    this.applyTotalPeriods(this.data.totalPeriods + 1);
  },
  setTimerMode(event) {
    const timerMode = event.currentTarget.dataset.mode;
    const seconds = timerMode === 'down' ? this.data.periodMinutes * 60 : 0;
    this.stopClock();
    this.setData({
      timerMode,
      timerModeText: timerMode === 'down' ? '倒计时' : '正计时',
      clockSeconds: seconds,
      clockText: formatClock(seconds),
      clockRunning: false
    });
  },
  startMatch() {
    const seconds = this.data.timerMode === 'down' ? this.data.periodMinutes * 60 : 0;
    this.setData({
      started: true,
      period: 1,
      clockSeconds: seconds,
      clockText: formatClock(seconds),
      clockRunning: false
    });
  },
  toggleClock() {
    if (this.data.clockRunning) {
      this.stopClock();
      return;
    }
    this.setData({ clockRunning: true });
    this.timer = setInterval(() => {
      const next = this.data.timerMode === 'down' ? this.data.clockSeconds - 1 : this.data.clockSeconds + 1;
      if (this.data.timerMode === 'down' && next <= 0) {
        this.setData({ clockSeconds: 0, clockText: '00:00' });
        this.stopClock();
        wx.showToast({ title: '本节时间到', icon: 'none' });
        return;
      }
      this.setData({ clockSeconds: next, clockText: formatClock(next) });
    }, 1000);
  },
  stopClock() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.data.clockRunning) {
      this.setData({ clockRunning: false });
    }
  },
  resetClock() {
    const seconds = this.data.timerMode === 'down' ? this.data.periodMinutes * 60 : 0;
    this.stopClock();
    this.setData({ clockSeconds: seconds, clockText: formatClock(seconds) });
  },
  nextPeriod() {
    if (this.data.period >= this.data.totalPeriods) {
      wx.showToast({ title: '已到最后一节', icon: 'none' });
      return;
    }
    const seconds = this.data.timerMode === 'down' ? this.data.periodMinutes * 60 : 0;
    this.stopClock();
    this.setData({ period: this.data.period + 1, clockSeconds: seconds, clockText: formatClock(seconds) });
  },
  addHome1() { this.addScore('home', 1); },
  addHome2() { this.addScore('home', 2); },
  addHome3() { this.addScore('home', 3); },
  addAway1() { this.addScore('away', 1); },
  addAway2() { this.addScore('away', 2); },
  addAway3() { this.addScore('away', 3); },
  addHomeFoul() { this.addFoul('home', 1); },
  addAwayFoul() { this.addFoul('away', 1); },
  subtractHomeFoul() { this.addFoul('home', -1); },
  subtractAwayFoul() { this.addFoul('away', -1); },
  addScore(side, points) {
    const isHome = side === 'home';
    const team = isHome ? this.data.homeName : this.data.awayName;
    const event = { type: 'score', side, points, text: `${team} +${points}` };
    const nextEvents = [event].concat(this.data.events);
    this.setData({
      homeScore: isHome ? this.data.homeScore + points : this.data.homeScore,
      awayScore: isHome ? this.data.awayScore : this.data.awayScore + points,
      events: nextEvents,
      latestEvent: event.text
    });
  },
  addFoul(side, delta) {
    const isHome = side === 'home';
    const current = isHome ? this.data.homeFouls : this.data.awayFouls;
    const next = Math.max(0, current + delta);
    if (next === current) return;
    const team = isHome ? this.data.homeName : this.data.awayName;
    const event = {
      type: 'foul',
      side,
      delta,
      text: delta > 0 ? `${team} 犯规 +1` : `${team} 犯规 -1`
    };
    const nextEvents = [event].concat(this.data.events);
    this.setData({
      homeFouls: isHome ? next : this.data.homeFouls,
      awayFouls: isHome ? this.data.awayFouls : next,
      events: nextEvents,
      latestEvent: event.text
    });
  },
  undo() {
    const events = this.data.events.slice();
    const latest = events.shift();
    if (!latest) return;
    const isHome = latest.side === 'home';
    const patch = { events, latestEvent: events[0] ? events[0].text : '暂无记录' };

    if (latest.type === 'score') {
      patch.homeScore = isHome ? Math.max(0, this.data.homeScore - latest.points) : this.data.homeScore;
      patch.awayScore = isHome ? this.data.awayScore : Math.max(0, this.data.awayScore - latest.points);
    }

    if (latest.type === 'foul') {
      patch.homeFouls = isHome ? Math.max(0, this.data.homeFouls - latest.delta) : this.data.homeFouls;
      patch.awayFouls = isHome ? this.data.awayFouls : Math.max(0, this.data.awayFouls - latest.delta);
    }

    this.setData(patch);
  },
  resetMatch() {
    this.stopClock();
    const seconds = this.data.timerMode === 'down' ? this.data.periodMinutes * 60 : 0;
    this.setData({
      homeScore: 0,
      awayScore: 0,
      homeFouls: 0,
      awayFouls: 0,
      started: false,
      events: [],
      latestEvent: '暂无记录',
      period: 1,
      clockSeconds: seconds,
      clockText: formatClock(seconds),
      clockRunning: false
    });
  },
  finishMatch() {
    this.stopClock();
    const result = {
      homeName: this.data.homeName,
      awayName: this.data.awayName,
      homeScore: this.data.homeScore,
      awayScore: this.data.awayScore,
      homeFouls: this.data.homeFouls,
      awayFouls: this.data.awayFouls,
      period: this.data.period,
      totalPeriods: this.data.totalPeriods,
      clockText: this.data.clockText,
      endedAt: new Date().toLocaleString()
    };
    wx.setStorageSync('latestMatchResult', result);
    wx.showToast({ title: '赛果已生成', icon: 'success' });
    setTimeout(() => wx.switchTab({ url: '/pages/home/index' }), 500);
  }
});