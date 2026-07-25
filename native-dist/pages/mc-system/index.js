const { resolveCloudFileURLs } = require('../../utils/cloud');

const categories = [
  {
    name: '比赛音效',
    desc: '用于关键回合、进球和现场提示。',
    tracks: [
      { name: '蜂鸣器', src: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/ui-assets/assets/audio/buzzer.mp3' },
      { name: '2分进球有效', src: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/ui-assets/assets/audio/two-pointer.mp3' },
      { name: '三分球', src: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/ui-assets/assets/audio/three-pointer.mp3' },
      { name: '投篮未进', src: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/ui-assets/assets/audio/miss.mp3' },
      { name: '欢呼声', src: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/ui-assets/assets/audio/cheer.mp3' }
    ]
  },
  {
    name: '进攻防守音乐',
    desc: '比赛中点按随机播放，一路音频不叠加。',
    tracks: [
      { name: '进攻音乐', src: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/ui-assets/assets/audio/attack-1.mp3' },
      { name: '防守音乐', src: 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/ui-assets/assets/audio/defense-1.mp3' }
    ]
  }
];

Page({
  audio: null,
  data: { categories },
  onLoad() {
    this.audio = wx.createInnerAudioContext();
  },
  onUnload() {
    if (this.audio) this.audio.destroy();
  },
  async playTrack(event) {
    const src = event.currentTarget.dataset.src;
    if (!src || !this.audio) return;
    try {
      const urlMap = await resolveCloudFileURLs([src]);
      const playableSource = urlMap[src] || src;
      this.audio.stop();
      this.audio.src = playableSource;
      this.audio.play();
    } catch (error) {
      console.warn('[mc-system] resolve audio failed', error);
      wx.showToast({ title: '音效加载失败，请重试', icon: 'none' });
    }
  }
});
