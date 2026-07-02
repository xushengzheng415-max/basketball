const { callCloud } = require('../../utils/cloud');
const { checkEntitlement } = require('../../utils/entitlement');
const { voiceStyles, buildScoreVoice } = require('../../utils/scoreVoice');

const cloudAudioPrefixes = [
  'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/mc-mp3/',
  'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/636c-cloudbase-d4g93f0re5f3274c1-1446269281mc-mp3/'
];
const audioFiles = (names, folders) => {
  const list = Array.isArray(names) ? names : [names];
  const dirs = folders || [''];
  return cloudAudioPrefixes.reduce((all, prefix) => (
    all.concat(dirs.reduce((items, dir) => (
      items.concat(list.map((name) => `${prefix}${dir}${name}`))
    ), []))
  ), []);
};

const defaultAudioMap = {
  buzzer: audioFiles(['蜂鸣器.mp3', 'buzzer.mp3'], ['比赛音效/', '']),
  three: audioFiles(['三分球.mp3', 'three-pointer.mp3'], ['比赛音效/', '']),
  two: audioFiles(['2分进球音效.mp3', 'two-pointer.mp3'], ['比赛音效/', '']),
  miss: audioFiles(['投篮未进音效.mp3', 'miss.mp3'], ['比赛音效/', '']),
  cheer: audioFiles(['欢呼声.mp3', 'cheer.mp3'], ['比赛音效/', '']),
  attack: audioFiles(['进攻音效1.mp3', '进攻音乐1.mp3', 'attack-1.mp3'], ['进攻防守音乐/', '']),
  defense: audioFiles(['防守音效1.mp3', '防守音乐1.mp3', 'defense-1.mp3'], ['进攻防守音乐/', '']),
  rest: audioFiles([
    'Fort Minor - Remember the Name_L.mp3',
    'Studio 99 - Its My Life_L.mp3',
    '暂停休息音乐.mp3',
    '暂停休息音乐1.mp3',
    '休息音乐.mp3',
    '休息音乐1.mp3'
  ], ['暂停休息音乐/', ''])
};

function formatClock(totalSeconds) {
  const safe = Math.max(0, totalSeconds);
  const minutes = String(Math.floor(safe / 60)).padStart(2, '0');
  const seconds = String(safe % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function randomItem(list) {
  if (!list || !list.length) return '';
  return list[Math.floor(Math.random() * list.length)];
}

function getAudioMap() {
  const saved = wx.getStorageSync('sx_mc_audio_map') || {};
  return Object.assign({}, defaultAudioMap, saved);
}

function getTempAudioSrc(src) {
  if (!src || typeof src !== 'string') return Promise.resolve('');
  if (!src.startsWith('cloud://')) return Promise.resolve(src);
  if (!wx.cloud || !wx.cloud.getTempFileURL) return Promise.resolve('');
  return new Promise((resolve) => {
    wx.cloud.getTempFileURL({
      fileList: [src],
      success(res) {
        const item = res.fileList && res.fileList[0];
        if (item && item.status === 0 && item.tempFileURL) {
          resolve(item.tempFileURL);
        } else {
          console.warn('MC 音效云文件不可用', src, item);
          resolve('');
        }
      },
      fail(err) { console.warn('MC 音效临时地址失败', src, err); resolve(''); }
    });
  });
}

async function getTempAudioSrcByCloudFunction(src) {
  if (!src || !src.startsWith('cloud://')) return '';
  const result = await callCloud('sxGetAudioUrl', { fileID: src });
  if (result && result.ok && result.tempFileURL) return result.tempFileURL;
  console.warn('MC 音效云函数临时地址失败', src, result);
  return '';
}

async function getPlayableAudioSrc(srcOrList) {
  const list = Array.isArray(srcOrList) ? srcOrList : [srcOrList];
  for (let i = 0; i < list.length; i += 1) {
    let src = await getTempAudioSrc(list[i]);
    if (!src) src = await getTempAudioSrcByCloudFunction(list[i]);
    if (src) return src;
  }
  console.warn('MC 音效全部候选均不可用', list);
  return '';
}

Page({
  timer: null,
  longPressTimer: null,
  longPressSide: '',
  audio: null,
  data: {
    homeName: '主队',
    awayName: '客队',
    homeScore: 0,
    awayScore: 0,
    homeScorePulse: false,
    awayScorePulse: false,
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
    clockRunning: false,
    mcUnlocked: false,
    mcStatus: '购买后解锁 MC 音效',
    voiceStyles,
    voiceStyle: 'standard',
    voiceButtonText: '播报比分',
    voiceText: '',
    voiceLoading: false,
    mcPanelOpen: false,
    audioMap: getAudioMap(),
    bgmType: '',
    bgmLabel: '',
    longPressActive: false,
    longPressProgress: 0,
    longPressText: ''
  },
  onLoad() {
    this.audio = wx.createInnerAudioContext();
  },
  async onShow() {
    const entitlement = await checkEntitlement('mc_system');
    const mcUnlocked = !!entitlement.active;
    this.setData({
      mcUnlocked,
      mcStatus: mcUnlocked ? 'MC 音效已解锁' : '购买后解锁 MC 音效'
    });
    this.loadAudioLibrary();
  },
  onUnload() {
    this.stopClock();
    this.stopLongPress();
    this.stopAudio();
  },
  onHide() {
    this.stopClock();
    this.stopLongPress();
    this.stopAudio();
  },
  stopAudio() {
    if (this.audio) this.audio.stop();
    if (this.data.bgmType) this.setData({ bgmType: '', bgmLabel: '' });
  },
  ensureMc(silent) {
    if (this.data.mcUnlocked) return true;
    if (!silent) wx.showToast({ title: '购买 Pro 后解锁 MC 系统', icon: 'none' });
    return false;
  },
  async loadAudioLibrary() {
    const result = await callCloud('sxGetAudioLibrary', {});
    if (!result || !result.ok || !result.audioMap) return;
    const merged = Object.assign({}, defaultAudioMap, result.audioMap);
    wx.setStorageSync('sx_mc_audio_map', result.audioMap);
    this.setData({ audioMap: merged });
  },
  async playSound(key, silent) {
    if (!this.ensureMc(silent)) return false;
    const src = await getPlayableAudioSrc(this.data.audioMap[key]);
    if (!src || !this.audio) {
      if (!silent) wx.showToast({ title: 'MC 音效待配置', icon: 'none' });
      return false;
    }
    this.audio.stop();
    this.audio.loop = false;
    this.audio.src = src;
    this.audio.play();
    if (this.data.bgmType) this.setData({ bgmType: '' });
    return true;
  },
  async playRandomBgm(type) {
    if (!this.ensureMc(false)) return;
    if (this.data.bgmType === type) {
      if (this.audio) this.audio.stop();
      this.setData({ bgmType: '', bgmLabel: '' });
      wx.showToast({ title: '音乐已暂停', icon: 'none' });
      return;
    }
    const list = this.data.audioMap[type] || [];
    const src = await getPlayableAudioSrc(list);
    if (!src || !this.audio) {
      wx.showToast({ title: 'MC 音效待配置', icon: 'none' });
      return;
    }
    this.audio.stop();
    this.audio.loop = true;
    this.audio.src = src;
    this.audio.play();
    const label = this.getBgmLabel(type);
    this.setData({ bgmType: type, bgmLabel: label });
    wx.showToast({ title: label, icon: 'none' });
  },
  playAttackMusic() { this.playRandomBgm('attack'); },
  playDefenseMusic() { this.playRandomBgm('defense'); },
  stopBgm() { this.stopAudio(); wx.showToast({ title: '音乐已停止', icon: 'none' }); },
  getBgmLabel(type) {
    if (type === 'attack') return '进攻音乐';
    if (type === 'defense') return '防守音乐';
    if (type === 'rest') return '休息音乐';
    return '音乐';
  },
  playTwoSound() { this.playSound('two', false); },
  playMissSound() { this.playSound('miss', false); },
  playCheerSound() { this.playSound('cheer', false); },
  toggleMcPanel() { this.setData({ mcPanelOpen: !this.data.mcPanelOpen }); },
  closeMcPanel() { this.setData({ mcPanelOpen: false }); },
  setVoiceStyle(event) {
    const style = event.currentTarget.dataset.id || 'standard';
    this.setData({ voiceStyle: style });
  },
  async announceScore() {
    if (!this.ensureMc(false) || this.data.voiceLoading) return;
    const text = buildScoreVoice({
      homeName: this.data.homeName,
      awayName: this.data.awayName,
      homeScore: this.data.homeScore,
      awayScore: this.data.awayScore,
      period: this.data.period,
      totalPeriods: this.data.totalPeriods,
      clockText: this.data.clockText,
      clockSeconds: this.data.clockSeconds,
      timerMode: this.data.timerMode,
      latestEvent: this.data.latestEvent
    }, this.data.voiceStyle);

    this.setData({ voiceText: text, voiceLoading: true, voiceButtonText: '生成中' });
    wx.showLoading({ title: '生成播报' });
    const result = await callCloud('sxCreateScoreVoice', { text, style: this.data.voiceStyle });
    wx.hideLoading();
    this.setData({ voiceLoading: false, voiceButtonText: '播报比分' });

    if (!result || !result.ok) {
      wx.showModal({
        title: 'AI 比分播报',
        content: result && result.message ? `${result.message}\n\n${text}` : text,
        confirmText: '确定',
        showCancel: false
      });
      return;
    }

    this.playVoiceFile(result.tempFileURL || result.fileID, text);
  },
  playVoiceFile(src, fallbackText) {
    if (!src || !this.audio) {
      wx.showModal({ title: 'AI 比分播报', content: fallbackText, showCancel: false });
      return;
    }
    this.audio.stop();
    this.audio.loop = false;
    this.audio.src = src;
    this.audio.play();
    if (this.data.bgmType) this.setData({ bgmType: '' });
    wx.showToast({ title: '正在播报', icon: 'none' });
  },
  askBreakMusic(title) {
    if (!this.data.mcUnlocked) return;
    wx.showModal({
      title,
      content: '要播放暂停/休息音乐吗？',
      confirmText: '播放',
      cancelText: '不用',
      success: (res) => {
        if (res.confirm) this.playRandomBgm('rest');
      }
    });
  },
  onHomeInput(event) { this.setData({ homeName: event.detail.value }); },
  onAwayInput(event) { this.setData({ awayName: event.detail.value }); },
  applyPeriodMinutes(value) {
    const minutes = Math.min(60, Math.max(1, Number(value) || 10));
    const seconds = this.data.timerMode === 'down' ? minutes * 60 : 0;
    this.stopClock();
    this.setData({ periodMinutes: minutes, clockSeconds: seconds, clockText: formatClock(seconds), clockRunning: false });
  },
  setPeriodPreset(event) { this.applyPeriodMinutes(event.currentTarget.dataset.value); },
  decreasePeriodMinutes() { this.applyPeriodMinutes(this.data.periodMinutes - 1); },
  increasePeriodMinutes() { this.applyPeriodMinutes(this.data.periodMinutes + 1); },
  applyTotalPeriods(value) {
    const totalPeriods = Math.min(12, Math.max(1, Number(value) || 4));
    this.setData({ totalPeriods, period: Math.min(this.data.period, totalPeriods) });
  },
  setPeriodCountPreset(event) { this.applyTotalPeriods(event.currentTarget.dataset.value); },
  decreasePeriodCount() { this.applyTotalPeriods(this.data.totalPeriods - 1); },
  increasePeriodCount() { this.applyTotalPeriods(this.data.totalPeriods + 1); },
  setTimerMode(event) {
    const timerMode = event.currentTarget.dataset.mode;
    const seconds = timerMode === 'down' ? this.data.periodMinutes * 60 : 0;
    this.stopClock();
    this.setData({ timerMode, timerModeText: timerMode === 'down' ? '倒计时' : '正计时', clockSeconds: seconds, clockText: formatClock(seconds), clockRunning: false });
  },
  startMatch() {
    const seconds = this.data.timerMode === 'down' ? this.data.periodMinutes * 60 : 0;
    const homeName = (this.data.homeName || '').trim() || '主队';
    const awayName = (this.data.awayName || '').trim() || '客队';
    this.setData({ homeName, awayName, started: true, period: 1, clockSeconds: seconds, clockText: formatClock(seconds), clockRunning: false });
  },
  toggleClock() {
    if (this.data.clockRunning) {
      this.stopClock();
      this.playSound('buzzer', true);
      this.askBreakMusic('比赛暂停');
      return;
    }
    this.setData({ clockRunning: true });
    this.timer = setInterval(() => {
      const next = this.data.timerMode === 'down' ? this.data.clockSeconds - 1 : this.data.clockSeconds + 1;
      if (this.data.timerMode === 'down' && next <= 0) {
        this.setData({ clockSeconds: 0, clockText: '00:00' });
        this.stopClock();
        this.playSound('buzzer', true);
        this.askBreakMusic('本节结束');
        wx.showToast({ title: '本节时间到', icon: 'none' });
        return;
      }
      this.setData({ clockSeconds: next, clockText: formatClock(next) });
    }, 1000);
  },
  stopClock() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.data.clockRunning) this.setData({ clockRunning: false });
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
    this.playSound('buzzer', true);
    this.askBreakMusic('本节结束');
    this.setData({ period: this.data.period + 1, clockSeconds: seconds, clockText: formatClock(seconds) });
  },
  addHome1() { this.addScore('home', 1); },
  addHome2() { this.addScore('home', 2); this.playSound('two', true); },
  addAway1() { this.addScore('away', 1); },
  addAway2() { this.addScore('away', 2); this.playSound('two', true); },
  startHome3Press() { this.startLongPress('home'); },
  startAway3Press() { this.startLongPress('away'); },
  stopLongPress() {
    if (this.longPressTimer) clearInterval(this.longPressTimer);
    this.longPressTimer = null;
    this.longPressSide = '';
    if (this.data.longPressActive) this.setData({ longPressActive: false, longPressProgress: 0, longPressText: '' });
  },
  startLongPress(side) {
    this.stopLongPress();
    this.longPressSide = side;
    const team = side === 'home' ? this.data.homeName : this.data.awayName;
    this.setData({ longPressActive: true, longPressProgress: 0, longPressText: `${team} 三分确认中` });
    this.playSound('three', true);
    let progress = 0;
    this.longPressTimer = setInterval(() => {
      progress += 10;
      this.setData({ longPressProgress: progress });
      if (progress >= 100) {
        clearInterval(this.longPressTimer);
        this.longPressTimer = null;
        const confirmedSide = this.longPressSide;
        this.longPressSide = '';
        this.setData({ longPressActive: false, longPressProgress: 0, longPressText: '' });
        this.addScore(confirmedSide, 3);
      }
    }, 80);
  },
  addHomeFoul() { this.addFoul('home', 1); },
  addAwayFoul() { this.addFoul('away', 1); },
  subtractHomeFoul() { this.addFoul('home', -1); },
  subtractAwayFoul() { this.addFoul('away', -1); },
  addScore(side, points) {
    const isHome = side === 'home';
    const team = isHome ? this.data.homeName : this.data.awayName;
    const event = { type: 'score', side, points, text: `${team} +${points}` };
    const nextEvents = [event].concat(this.data.events);
    const pulseKey = isHome ? 'homeScorePulse' : 'awayScorePulse';
    this.setData({
      homeScore: isHome ? this.data.homeScore + points : this.data.homeScore,
      awayScore: isHome ? this.data.awayScore : this.data.awayScore + points,
      events: nextEvents,
      latestEvent: event.text,
      [pulseKey]: false
    });
    setTimeout(() => this.setData({ [pulseKey]: true }), 20);
    setTimeout(() => this.setData({ [pulseKey]: false }), 520);
  },
  addFoul(side, delta) {
    const isHome = side === 'home';
    const current = isHome ? this.data.homeFouls : this.data.awayFouls;
    const next = Math.max(0, current + delta);
    if (next === current) return;
    const team = isHome ? this.data.homeName : this.data.awayName;
    const event = { type: 'foul', side, delta, text: delta > 0 ? `${team} 犯规 +1` : `${team} 犯规 -1` };
    const nextEvents = [event].concat(this.data.events);
    this.setData({ homeFouls: isHome ? next : this.data.homeFouls, awayFouls: isHome ? this.data.awayFouls : next, events: nextEvents, latestEvent: event.text });
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
    this.stopLongPress();
    const seconds = this.data.timerMode === 'down' ? this.data.periodMinutes * 60 : 0;
    this.setData({ homeScore: 0, awayScore: 0, homeFouls: 0, awayFouls: 0, started: false, events: [], latestEvent: '暂无记录', period: 1, clockSeconds: seconds, clockText: formatClock(seconds), clockRunning: false });
  },
  finishMatch() {
    this.stopClock();
    this.stopLongPress();
    this.playSound('buzzer', true);
    const result = { homeName: this.data.homeName, awayName: this.data.awayName, homeScore: this.data.homeScore, awayScore: this.data.awayScore, homeFouls: this.data.homeFouls, awayFouls: this.data.awayFouls, period: this.data.period, totalPeriods: this.data.totalPeriods, clockText: this.data.clockText, endedAt: new Date().toLocaleString() };
    wx.setStorageSync('latestMatchResult', result);
    callCloud('sxSaveMatchResult', { result });
    wx.showToast({ title: '赛果已生成', icon: 'success' });
    setTimeout(() => wx.switchTab({ url: '/pages/home/index' }), 500);
  }
});
