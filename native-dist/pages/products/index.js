const proFeatures = [
  {
    id: 'mc',
    name: 'MC 现场音效系统',
    tag: 'Pro 解锁',
    desc: '蜂鸣器、进攻防守音乐、暂停休息音乐和现场音效，适合比赛现场快速控场。',
    points: ['蜂鸣器、三分、2分有效、未进、欢呼', '进攻/防守音乐一路播放，不叠加', '后台音乐库可持续维护']
  },
  {
    id: 'stats2',
    name: '计分板 2.0 球员数据',
    tag: 'Pro 解锁',
    desc: '在基础计分外记录球员数据，用于赛后复盘、球队统计和赛事运营。',
    points: ['按球员记录技术数据', '赛后生成数据汇总', '适合球队长期沉淀']
  }
];

const proPlans = [
  {
    id: 'share_trial',
    name: '分享试用',
    price: '0',
    badge: '推荐拉新',
    desc: '转发小程序或朋友圈，获得 31 天 Pro 试用。',
    action: '分享解锁'
  },
  {
    id: 'single',
    name: '单场 Pro',
    price: '9.90',
    promo: '首场 4.90',
    desc: '适合临时比赛或单场活动。',
    action: '购买'
  },
  {
    id: 'monthly',
    name: '月度 Pro',
    price: '39.90',
    promo: '首月 19.90',
    desc: '适合训练营、月赛和高频使用。',
    action: '购买'
  },
  {
    id: 'lifetime',
    name: '买断 Pro',
    price: '199',
    promo: '惊喜价 99',
    desc: '适合长期运营和固定场馆。',
    action: '购买'
  }
];

const voicePlans = [
  {
    id: 'voice_free',
    name: '新用户体验额度',
    price: '免费',
    desc: '每个账号默认赠送 10 次 AI 比分播报。',
    action: '登录领取'
  },
  {
    id: 'voice_share',
    name: '分享换积分',
    price: '+10 积分',
    desc: '分享一次获得积分，播报时按次消耗。',
    action: '去分享'
  },
  {
    id: 'voice_pack',
    name: 'AI 播报包',
    price: '单独购买',
    desc: '语音合成有流量成本，后续按次数包售卖。',
    action: '查看'
  }
];

Page({
  data: {
    proFeatures,
    proPlans,
    voicePlans
  },
  onShareAppMessage() {
    return {
      title: '赛小蜂篮球计分器，快速开始一场比赛',
      path: '/pages/login/index'
    };
  },
  previewFeature(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: id === 'mc' ? '/pages/mc-system/index' : '/pages/stats-scorer/index' });
  },
  selectProPlan(event) {
    const plan = proPlans.find((item) => item.id === event.currentTarget.dataset.id);
    if (!plan) return;
    if (plan.id === 'share_trial') {
      wx.showShareMenu({ withShareTicket: true });
      wx.showModal({
        title: '分享试用',
        content: '首版先由后台发放分享试用会员码。正式版会在分享完成后自动发放 31 天 Pro 试用。',
        confirmText: '知道了',
        showCancel: false
      });
      return;
    }
    wx.setStorageSync('pendingOrderProduct', {
      id: plan.id,
      name: `赛小蜂 Pro ${plan.name}`,
      price: plan.promo ? plan.promo.replace(/[^\d.]/g, '') : plan.price,
      originalPrice: plan.price,
      featureSummary: 'MC 现场音效系统 + 计分板 2.0 球员数据',
      desc: plan.desc
    });
    wx.navigateTo({ url: '/pages/order/index' });
  },
  selectVoicePlan(event) {
    const plan = voicePlans.find((item) => item.id === event.currentTarget.dataset.id);
    if (!plan) return;
    wx.showModal({
      title: plan.name,
      content: plan.id === 'voice_pack'
        ? 'AI 语音播报包会单独售卖，避免语音合成流量成本影响 Pro 会员价格。'
        : plan.desc,
      confirmText: '知道了',
      showCancel: false
    });
  }
});
