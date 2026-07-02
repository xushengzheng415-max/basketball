const { checkEntitlement } = require('../../utils/entitlement');

const categories = [
  { name: '比赛音效', desc: '用于关键回合、进球和现场提示。', tracks: [
    { name: '蜂鸣器', src: '/assets/audio/buzzer.mp3' },
    { name: '2分进球有效', src: '/assets/audio/two-pointer.mp3' },
    { name: '三分球', src: '/assets/audio/three-pointer.mp3' },
    { name: '投篮未进', src: '/assets/audio/miss.mp3' },
    { name: '欢呼声', src: '/assets/audio/cheer.mp3' }
  ] },
  { name: '进攻防守音乐', desc: '比赛中点击随机播放。', tracks: [
    { name: '进攻音乐', src: '/assets/audio/attack-1.mp3' },
    { name: '防守音乐', src: '/assets/audio/defense-1.mp3' }
  ] }
];

Page({
  audio: null,
  data: { categories, mcUnlocked: false },
  onLoad() {
    this.audio = wx.createInnerAudioContext();
  },
  async onShow() {
    const entitlement = await checkEntitlement('mc_system');
    this.setData({ mcUnlocked: !!entitlement.active });
  },
  onUnload() {
    if (this.audio) this.audio.destroy();
  },
  goBuy() {
    wx.navigateTo({ url: '/pages/products/index' });
  },
  playTrack(event) {
    if (!this.data.mcUnlocked) {
      wx.showToast({ title: '购买后解锁播放', icon: 'none' });
      return;
    }
    const src = event.currentTarget.dataset.src;
    if (!src || !this.audio) return;
    this.audio.stop();
    this.audio.src = src;
    this.audio.play();
  }
});
