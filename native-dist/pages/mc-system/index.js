const { checkEntitlement } = require('../../utils/entitlement');

const categories = [
  {
    name: '比赛音效',
    desc: '用于关键回合、进球和现场提示。',
    tracks: [
      { name: '蜂鸣器', src: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/audio/buzzer.mp3' },
      { name: '2分进球有效', src: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/audio/two-pointer.mp3' },
      { name: '三分球', src: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/audio/three-pointer.mp3' },
      { name: '投篮未进', src: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/audio/miss.mp3' },
      { name: '欢呼声', src: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/audio/cheer.mp3' }
    ]
  },
  {
    name: '进攻防守音乐',
    desc: '比赛中点按随机播放，一路音频不叠加。',
    tracks: [
      { name: '进攻音乐', src: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/audio/attack-1.mp3' },
      { name: '防守音乐', src: 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/audio/defense-1.mp3' }
    ]
  }
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
      wx.showToast({ title: '分享或付费后解锁播放', icon: 'none' });
      return;
    }
    const src = event.currentTarget.dataset.src;
    if (!src || !this.audio) return;
    this.audio.stop();
    this.audio.src = src;
    this.audio.play();
  }
});
