const categories = [
  {
    name: '比赛音效',
    desc: '用于关键回合、进球和现场提示。',
    tracks: ['24秒倒计时5秒', '蜂鸣器', '欢呼声', '三分球']
  },
  {
    name: '进攻防守音乐',
    desc: '适合攻防转换和现场带动。',
    tracks: ['Let\'s Go Tigers', 'Charge', 'Defense', '防守音效1']
  },
  {
    name: '暂停休息音乐',
    desc: '用于暂停、节间休息和暖场。',
    tracks: ['Remember the Name', 'Its My Life']
  },
  {
    name: '仪式音乐',
    desc: '适合开场、升旗和正式仪式。',
    tracks: ['义勇军进行曲']
  }
];

Page({
  data: { categories },
  goBuy() {
    wx.navigateTo({ url: '/pages/products/index' });
  },
  playLocked() {
    wx.showToast({ title: '购买后解锁播放', icon: 'none' });
  }
});