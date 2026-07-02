const proFeatures = [
  {
    id: 'mc',
    name: 'MC 现场音效控制',
    tag: '分享解锁',
    desc: '比赛蜂鸣器、进攻防守音乐、暂停休息音乐和现场音效。发朋友圈兑换 1 天 VIP，需要用的时候当天解锁。',
    points: ['基础计分继续可用', '分享朋友圈解锁当天 MC', '不想分享也可直接付费解锁']
  }
];

const sharePlans = [
  {
    id: 'share_day',
    name: '朋友圈兑换 1 天 VIP',
    price: '免费',
    badge: '当天使用',
    desc: '发朋友圈或转发小程序后，兑换当天 MC 音效控制权限。什么时候比赛，什么时候发。',
    action: '去分享'
  }
];

const mcPaidPlans = [
  {
    id: 'mc_day',
    name: '当天 MC 音效 VIP',
    price: '9.9',
    priceText: '9.9 元',
    badge: '当天有效',
    desc: '不发朋友圈，今天这场比赛直接解锁 MC 音效控制。'
  },
  {
    id: 'mc_month',
    name: '月度 MC 音效 VIP',
    price: '19.9',
    priceText: '19.9 元',
    badge: '30 天',
    desc: '适合近期多场比赛、训练赛和小型赛事。'
  },
  {
    id: 'mc_lifetime',
    name: '永久 MC 音效 VIP',
    price: '99',
    priceText: '99 元',
    badge: '永久',
    desc: '一次解锁当前 MC 音效控制功能。'
  }
];

const voicePlans = [
  {
    id: 'voice_light',
    name: 'AI 播报体验包',
    price: '9.9',
    priceText: '9.9 元',
    desc: '适合偶尔打一两场比赛的用户，按播报次数消耗。',
    action: '购买播报包'
  },
  {
    id: 'voice_standard',
    name: 'AI 播报标准包',
    price: '19.9',
    priceText: '19.9 元',
    desc: '适合一场比赛频繁播报比分和现场气氛。',
    action: '购买播报包'
  },
  {
    id: 'voice_team',
    name: 'AI 播报球队包',
    price: '39.9',
    priceText: '39.9 元',
    desc: '适合训练营、月赛和固定球队长期使用。',
    action: '购买播报包'
  }
];

const shareTitle = '我在用赛小蜂篮球计分器，比赛计分和现场音效都挺顺手';

function openOrder(plan, featureSummary) {
  wx.setStorageSync('pendingOrderProduct', {
    id: plan.id,
    name: plan.name,
    price: plan.price,
    originalPrice: plan.price,
    featureSummary,
    desc: plan.desc
  });
  wx.navigateTo({ url: '/pages/order/index' });
}

Page({
  data: {
    proFeatures,
    sharePlans,
    mcPaidPlans,
    voicePlans,
    showMcPay: false
  },
  onShareAppMessage() {
    return {
      title: shareTitle,
      path: '/pages/login/index?from=share_mc',
      imageUrl: '/assets/home/basketball-icon.png'
    };
  },
  onShareTimeline() {
    return {
      title: shareTitle,
      query: 'from=timeline_mc',
      imageUrl: '/assets/home/basketball-icon.png'
    };
  },
  previewFeature() {
    wx.navigateTo({ url: '/pages/mc-system/index' });
  },
  selectSharePlan() {
    wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] });
    wx.showModal({
      title: '分享免费解锁',
      content: '文案已经配好。发朋友圈或转发后，可兑换当天 MC 音效 VIP。',
      confirmText: '去分享',
      cancelText: '直接付费',
      success: (res) => {
        if (res.cancel) {
          this.setData({ showMcPay: true });
        }
      }
    });
  },
  closeMcPay() {
    this.setData({ showMcPay: false });
  },
  selectMcPaidPlan(event) {
    const plan = mcPaidPlans.find((item) => item.id === event.currentTarget.dataset.id);
    if (!plan) return;
    openOrder(plan, 'MC 现场音效控制');
  },
  selectVoicePlan(event) {
    const plan = voicePlans.find((item) => item.id === event.currentTarget.dataset.id);
    if (!plan) return;
    openOrder(plan, 'AI 比分播报额度包');
  }
});
