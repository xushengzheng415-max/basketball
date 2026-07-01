const statGroups = [
  { name: '得分记录', items: ['1 分', '2 分', '3 分', '罚球命中率'] },
  { name: '基础技术统计', items: ['篮板', '助攻', '抢断', '盖帽'] },
  { name: '比赛管理', items: ['犯规', '暂停', '节次', '上场球员'] },
  { name: '赛后汇总', items: ['球员得分榜', '球队技术统计', '单场 MVP 参考'] }
];

Page({
  data: { statGroups },
  goBuy() {
    wx.navigateTo({ url: '/pages/products/index' });
  }
});