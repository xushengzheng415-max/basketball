const features = [
  {
    id: 'mc',
    name: 'MC 现场音频系统',
    tag: '付费功能',
    desc: '内置比赛音效、进攻防守音乐、暂停休息音乐和国歌，适合现场主持快速播放。',
    points: ['蜂鸣器、欢呼、三分球音效', '进攻/防守气氛音乐', '暂停休息音乐与国歌']
  },
  {
    id: 'stats2',
    name: '计分板 2.0 球员数据统计',
    tag: '付费功能',
    desc: '在基础计分外记录球员数据，支持得分、犯规、篮板、助攻等技术统计。',
    points: ['按球员记录技术数据', '赛后球员数据汇总', '适合球队复盘与赛事运营']
  }
];

const plans = [
  {
    id: 'single',
    name: '单场体验',
    scene: '临时活动 / 单场比赛',
    price: '9.90',
    promoPrice: '4.90',
    promoLabel: '首场价',
    desc: '解锁一场比赛的 MC 系统和计分板 2.0。'
  },
  {
    id: 'monthly',
    name: '月度会员',
    scene: '训练营 / 月赛 / 高频使用',
    price: '39.90',
    promoPrice: '19.90',
    promoLabel: '首月价',
    desc: '30 天内不限场次使用付费功能。'
  },
  {
    id: 'lifetime',
    name: '买断授权',
    scene: '长期运营 / 固定场馆',
    price: '199.00',
    promoPrice: '99.00',
    promoLabel: '惊喜价',
    desc: '一次购买，长期使用当前两大付费功能。'
  }
];

Page({
  data: { features, plans },
  previewFeature(event) {
    const id = event.currentTarget.dataset.id;
    if (id === 'mc') {
      wx.navigateTo({ url: '/pages/mc-system/index' });
      return;
    }
    wx.navigateTo({ url: '/pages/stats-scorer/index' });
  },
  selectPlan(event) {
    const plan = plans.find((item) => item.id === event.currentTarget.dataset.id);
    const product = Object.assign({}, plan, {
      name: `赛小蜂 Pro · ${plan.name}`,
      price: plan.promoPrice,
      originalPrice: plan.price,
      featureSummary: 'MC 现场音频系统 + 计分板 2.0 球员数据统计',
      desc: plan.desc
    });
    wx.setStorageSync('pendingOrderProduct', product);
    wx.navigateTo({ url: '/pages/order/index' });
  }
});