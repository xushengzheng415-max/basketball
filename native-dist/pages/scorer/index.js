function formatClock(totalSeconds) {
  const safe = Math.max(0, totalSeconds || 0);
  const minutes = String(Math.floor(safe / 60)).padStart(2, '0');
  const seconds = String(safe % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function nowText() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
}

function defaultPlayers(side) {
  const base = side === 'home'
    ? [
      ['23', '\u6797\u6d69', 'PG', 'avatar-left-23.png'],
      ['7', '\u5f20\u5b50\u8f69', 'SG', 'avatar-left-7.png'],
      ['11', '\u674e\u5965\u7136', 'SF', 'avatar-left-11.png'],
      ['34', '\u5218\u5b87\u8fb0', 'PF', 'avatar-left-34.png'],
      ['30', '\u8d75\u5b50\u58a8', 'C', 'avatar-left-30.png']
    ]
    : [
      ['7', '\u738b\u5b50\u8f69', 'PG', 'avatar-right-7.png'],
      ['11', '\u674e\u5965\u7136', 'SG', 'avatar-right-11.png'],
      ['9', '\u9648\u5b50\u777f', 'SF', 'avatar-right-9.png'],
      ['24', '\u5468\u5b87\u822a', 'PF', 'avatar-right-24.png'],
      ['33', '\u5434\u5929\u4f51', 'C', 'avatar-right-33.png']
    ];
  return base.map((item, index) => ({
    id: `${side}-${index}`,
    number: item[0],
    name: item[1],
    position: item[2],
    avatar: `/assets/pages/scorer-v2/teams/${item[3]}`
  }));
}

Page({
  timer: null,
  resizeHandler: null,
  longPressTimer: null,
  longPressTick: null,
  longPressSide: '',
  data: {
    started: false,
    isLandscape: true,
    layoutMode: '',
    layoutSwitchText: '\u7ad6\u7248',
    titleText: 'PAD横屏比分板',
    text: {
      back: '\u2039',
      appName: '赛小蜂篮球',
      quickStart: '快速开始比赛',
      setupDesc: '设置队伍、节次和时长，自动进入新版计分板。',
      startMatch: '开始比赛',
      homeName: '主队名称',
      awayName: '客队名称',
      homePlaceholder: '请输入主队名称',
      awayPlaceholder: '请输入客队名称',
      periodMinutes: '每节时长',
      minute: '分钟',
      minuteShort: '分',
      totalPeriods: '比赛节数',
      periodUnit: '节',
      timerMode: '计时方式',
      countdown: '倒计时',
      countup: '正计时',
      periodPrefix: '第',
      networkGood: '网络良好',
      synced: '已同步',
      starter: '首发',
      bench: '替补',
      totalFouls: '累计犯规',
      timeout: '暂停',
      foul: '犯规',
      substitution: '换人',
      pause: '暂停',
      start: '开始',
      reset: '重置',
      prevPeriod: '上一节',
      nextPeriod: '下一节',
      swapCourt: '交换场地',
      recentActions: '最近操作',
      clear: '清空',
      mcManager: 'MC音效管理',
      currentPlaying: '当前播放：',
      attackSound: '进攻音效',
      defenseSound: '防守音效',
      scoreVoice: '得分播报',
      restMusic: '暂停音乐',
      subSound: '换人提示',
      mvpSound: 'MVP音效',
      volume: '音量控制',
      stopAudio: '停止播放'
    },    matchName: 'U10\u7ec4 \u51b3\u8d5b',
    homeName: '\u4e3b\u961f',
    awayName: '\u5ba2\u961f',
    homeLogo: '/assets/pages/scorer-v2/teams/team-logo-left.png',
    awayLogo: '/assets/pages/scorer-v2/teams/team-logo-right.png',
    homeScore: 0,
    awayScore: 0,
    homeScorePulse: false,
    awayScorePulse: false,
    homeFouls: 0,
    awayFouls: 0,
    homeTimeouts: 0,
    awayTimeouts: 0,
    period: 1,
    totalPeriods: 4,
    periodMinutes: 10,
    durationOptions: [6, 8, 10, 12],
    periodOptions: [2, 4, 6],
    timerMode: 'down',
    clockSeconds: 600,
    clockText: '10:00',
    clockRunning: false,
    homeStarters: [],
    awayStarters: [],
    homeBench: [
      { id: 'hb-1', number: '2', name: '\u738b\u6893\u8c6a' },
      { id: 'hb-2', number: '8', name: '\u9648\u5929\u5b87' }
    ],
    awayBench: [
      { id: 'ab-1', number: '5', name: '\u5f90\u660e\u8f69' },
      { id: 'ab-2', number: '12', name: '\u8d75\u4e00\u822a' }
    ],
    events: [],
    currentAudioName: '',
    noAudioText: '\u65e0',
    playingType: '',
    volume: 80,
    longPressActive: false,
    longPressText: '',
    longPressProgress: 0,
    techActions: [
      { key: 'score', name: '\u5f97\u5206', icon: '/assets/pages/scorer-v2/icons/icon-tech-score-clean.png' },
      { key: 'rebound', name: '\u7bee\u677f', icon: '/assets/pages/scorer-v2/icons/icon-tech-rebound-clean.png' },
      { key: 'assist', name: '\u52a9\u653b', icon: '/assets/pages/scorer-v2/icons/icon-tech-assist-clean.png' },
      { key: 'steal', name: '\u62a2\u65ad', icon: '/assets/pages/scorer-v2/icons/icon-tech-steal-clean.png' },
      { key: 'block', name: '\u76d6\u5e3d', icon: '/assets/pages/scorer-v2/icons/icon-tech-block-clean.png' },
      { key: 'turnover', name: '\u5931\u8bef', icon: '/assets/pages/scorer-v2/icons/icon-tech-turnover-clean.png' }
    ]
  },

  onLoad() {
    this.detectOrientation();
    this.setData({ homeStarters: defaultPlayers('home'), awayStarters: defaultPlayers('away') });
    if (wx.onWindowResize) {
      this.resizeHandler = () => this.detectOrientation();
      wx.onWindowResize(this.resizeHandler);
    }
  },

  onUnload() {
    this.clearClock();
    this.clearLongPress();
    if (wx.offWindowResize && this.resizeHandler) wx.offWindowResize(this.resizeHandler);
  },

  detectOrientation() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const isLandscape = info.windowWidth >= info.windowHeight;
    this.setData({ isLandscape, layoutMode: isLandscape ? 'landscape' : 'portrait', layoutSwitchText: isLandscape ? '\u7ad6\u7248' : '\u6a2a\u7248', titleText: isLandscape ? 'PAD\u6a2a\u5c4f\u6bd4\u5206\u677f' : '\u88c1\u5224\u6bd4\u5206\u677f' });
  },

  toggleLayoutMode() {
    const isLandscape = !this.data.isLandscape;
    this.setData({ isLandscape, layoutMode: isLandscape ? 'landscape' : 'portrait', layoutSwitchText: isLandscape ? '\u7ad6\u7248' : '\u6a2a\u7248', titleText: isLandscape ? 'PAD\u6a2a\u5c4f\u6bd4\u5206\u677f' : '\u88c1\u5224\u6bd4\u5206\u677f' });
  },

  onHomeInput(event) { this.setData({ homeName: event.detail.value }); },
  onAwayInput(event) { this.setData({ awayName: event.detail.value }); },
  setTimerMode(event) {
    const timerMode = event.currentTarget.dataset.mode;
    const clockSeconds = timerMode === 'down' ? this.data.periodMinutes * 60 : 0;
    this.setData({ timerMode, clockSeconds, clockText: formatClock(clockSeconds), clockRunning: false });
    this.clearClock();
  },
  applyPeriodMinutes(value) {
    const periodMinutes = Math.max(1, Math.min(60, Number(value) || 10));
    const clockSeconds = this.data.timerMode === 'down' ? periodMinutes * 60 : 0;
    this.setData({ periodMinutes, clockSeconds, clockText: formatClock(clockSeconds), clockRunning: false });
    this.clearClock();
  },
  decreasePeriodMinutes() { this.applyPeriodMinutes(this.data.periodMinutes - 1); },
  increasePeriodMinutes() { this.applyPeriodMinutes(this.data.periodMinutes + 1); },
  setPeriodPreset(event) { this.applyPeriodMinutes(Number(event.currentTarget.dataset.value)); },
  applyPeriodCount(value) {
    const totalPeriods = Math.max(1, Math.min(12, Number(value) || 4));
    this.setData({ totalPeriods, period: Math.min(this.data.period, totalPeriods) });
  },
  decreasePeriodCount() { this.applyPeriodCount(this.data.totalPeriods - 1); },
  increasePeriodCount() { this.applyPeriodCount(this.data.totalPeriods + 1); },
  setPeriodCountPreset(event) { this.applyPeriodCount(Number(event.currentTarget.dataset.value)); },

  startMatch() {
    const homeName = (this.data.homeName || '').trim() || '\u4e3b\u961f';
    const awayName = (this.data.awayName || '').trim() || '\u5ba2\u961f';
    const clockSeconds = this.data.timerMode === 'down' ? this.data.periodMinutes * 60 : 0;
    this.setData({ started: true, homeName, awayName, period: 1, clockSeconds, clockText: formatClock(clockSeconds), clockRunning: false });
    this.detectOrientation();
  },

  clearClock() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  },
  toggleClock() {
    if (this.data.clockRunning) {
      this.clearClock();
      this.setData({ clockRunning: false });
      return;
    }
    this.setData({ clockRunning: true });
    this.timer = setInterval(() => {
      let next = this.data.timerMode === 'down' ? this.data.clockSeconds - 1 : this.data.clockSeconds + 1;
      if (this.data.timerMode === 'down' && next <= 0) {
        next = 0;
        this.clearClock();
        this.setData({ clockRunning: false });
      }
      this.setData({ clockSeconds: next, clockText: formatClock(next) });
    }, 1000);
  },
  resetClock() {
    const clockSeconds = this.data.timerMode === 'down' ? this.data.periodMinutes * 60 : 0;
    this.clearClock();
    this.setData({ clockRunning: false, clockSeconds, clockText: formatClock(clockSeconds) });
  },
  prevPeriod() { this.setData({ period: Math.max(1, this.data.period - 1) }); this.resetClock(); },
  nextPeriod() { this.setData({ period: Math.min(this.data.totalPeriods, this.data.period + 1) }); this.resetClock(); },
  selectPeriod() {
    const list = Array.from({ length: this.data.totalPeriods }, (_, index) => `Q${index + 1}`);
    wx.showActionSheet({ itemList: list, success: (res) => { this.setData({ period: res.tapIndex + 1 }); this.resetClock(); } });
  },

  addHome1() { this.addScore('home', 1); },
  addHome2() { this.addScore('home', 2); this.playMcAudio('two', '2\u5206\u97f3\u6548'); },
  addHome3() { this.addScore('home', 3); },
  addAway1() { this.addScore('away', 1); },
  addAway2() { this.addScore('away', 2); this.playMcAudio('two', '2\u5206\u97f3\u6548'); },
  addAway3() { this.addScore('away', 3); },

  startHome3Press() { this.startLongPress('home'); },
  startAway3Press() { this.startLongPress('away'); },
  startLongPress(side) {
    this.clearLongPress();
    this.longPressSide = side;
    this.playMcAudio('three', '3\u5206\u97f3\u6548');
    this.setData({ longPressActive: true, longPressText: '\u957f\u6309\u4e09\u5206\u786e\u8ba4\u4e2d', longPressProgress: 0 });
    let progress = 0;
    this.longPressTick = setInterval(() => {
      progress = Math.min(100, progress + 8);
      this.setData({ longPressProgress: progress });
    }, 50);
    this.longPressTimer = setTimeout(() => {
      this.addScore(side, 3);
      this.clearLongPress();
    }, 650);
  },
  stopLongPress() { this.clearLongPress(); },
  clearLongPress() {
    if (this.longPressTimer) clearTimeout(this.longPressTimer);
    if (this.longPressTick) clearInterval(this.longPressTick);
    this.longPressTimer = null;
    this.longPressTick = null;
    this.longPressSide = '';
    this.setData({ longPressActive: false, longPressProgress: 0 });
  },

  addScore(side, points) {
    const scoreKey = side === 'home' ? 'homeScore' : 'awayScore';
    const pulseKey = side === 'home' ? 'homeScorePulse' : 'awayScorePulse';
    const team = side === 'home' ? this.data.homeName : this.data.awayName;
    const nextHome = side === 'home' ? this.data.homeScore + points : this.data.homeScore;
    const nextAway = side === 'away' ? this.data.awayScore + points : this.data.awayScore;
    const patch = {};
    patch[scoreKey] = this.data[scoreKey] + points;
    patch[pulseKey] = true;
    patch.events = [{ id: Date.now(), time: nowText(), team, action: `\u5f97\u5206 +${points}`, score: `${nextHome}-${nextAway}` }].concat(this.data.events).slice(0, 8);
    this.setData(patch);
    setTimeout(() => { const reset = {}; reset[pulseKey] = false; this.setData(reset); }, 420);
  },
  addHomeFoul() { this.addCounter('homeFouls', this.data.homeName, '\u72af\u89c4'); },
  addAwayFoul() { this.addCounter('awayFouls', this.data.awayName, '\u72af\u89c4'); },
  addHomeTimeout() { this.addCounter('homeTimeouts', this.data.homeName, '\u6682\u505c'); },
  addAwayTimeout() { this.addCounter('awayTimeouts', this.data.awayName, '\u6682\u505c'); },
  addCounter(key, team, action) {
    const patch = {};
    patch[key] = this.data[key] + 1;
    patch.events = [{ id: Date.now(), time: nowText(), team, action, score: `${this.data.homeScore}-${this.data.awayScore}` }].concat(this.data.events).slice(0, 8);
    this.setData(patch);
  },

  confirmReset() {
    wx.showModal({
      title: '\u786e\u8ba4\u91cd\u7f6e',
      content: '\u662f\u5426\u6e05\u7a7a\u5f53\u524d\u6bd4\u5206\u5e76\u91cd\u5f00\u672c\u573a\u6bd4\u8d5b\uff1f',
      success: (res) => {
        if (!res.confirm) return;
        this.clearClock();
        const clockSeconds = this.data.timerMode === 'down' ? this.data.periodMinutes * 60 : 0;
        this.setData({ homeScore: 0, awayScore: 0, homeFouls: 0, awayFouls: 0, homeTimeouts: 0, awayTimeouts: 0, events: [], period: 1, clockRunning: false, clockSeconds, clockText: formatClock(clockSeconds) });
      }
    });
  },
  swapSides() {
    this.setData({
      homeName: this.data.awayName,
      awayName: this.data.homeName,
      homeScore: this.data.awayScore,
      awayScore: this.data.homeScore,
      homeFouls: this.data.awayFouls,
      awayFouls: this.data.homeFouls,
      homeTimeouts: this.data.awayTimeouts,
      awayTimeouts: this.data.homeTimeouts,
      homeLogo: this.data.awayLogo,
      awayLogo: this.data.homeLogo,
      homeStarters: this.data.awayStarters,
      awayStarters: this.data.homeStarters,
      homeBench: this.data.awayBench,
      awayBench: this.data.homeBench
    });
  },
  clearEvents() { this.setData({ events: [] }); },

  playAttack() { this.toggleMcAudio('attack', '\u8fdb\u653b\u97f3\u6548'); },
  playDefense() { this.toggleMcAudio('defense', '\u9632\u5b88\u97f3\u6548'); },
  playRestMusic() { this.toggleMcAudio('rest', '\u6682\u505c\u97f3\u4e50'); },
  playSubSound() { this.playMcAudio('sub', '\u6362\u4eba\u63d0\u793a'); },
  playMvpSound() { this.playMcAudio('mvp', 'MVP\u97f3\u6548'); },
  announceScore() { this.playMcAudio('voice', `${this.data.homeName || '\u4e3b\u961f'} ${this.data.homeScore} \u6bd4 ${this.data.awayScore} ${this.data.awayName || '\u5ba2\u961f'}`); },
  toggleMcAudio(type, name) {
    if (this.data.playingType === type) return this.stopAudio();
    this.playMcAudio(type, name);
  },
  playMcAudio(type, name) { this.setData({ playingType: type, currentAudioName: name }); },
  stopAudio() { this.setData({ playingType: '', currentAudioName: '' }); },
  setVolume(event) { this.setData({ volume: event.detail.value }); },
  recordTech(event) { wx.showToast({ title: '\u8bb0\u5f55' + event.currentTarget.dataset.key, icon: 'none' }); },

  goBack() {
    const pages = getCurrentPages ? getCurrentPages() : [];
    if (pages.length > 1) {
      wx.navigateBack();
      return;
    }
    wx.reLaunch({ url: '/pages/home/index' });
  },
  goSettings() { wx.navigateTo({ url: '/pages/mc-settings/index' }); },
  openHomeSub() { wx.showToast({ title: '\u6362\u4eba\u529f\u80fd\u5f85\u63a5\u5165\u7403\u5458\u5e93', icon: 'none' }); },
  openAwaySub() { wx.showToast({ title: '\u6362\u4eba\u529f\u80fd\u5f85\u63a5\u5165\u7403\u5458\u5e93', icon: 'none' }); }
});