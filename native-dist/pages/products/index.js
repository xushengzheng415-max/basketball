const copy = {
  kicker: '\u8d5b\u5c0f\u8702\u7bee\u7403',
  title: '\u5206\u4eab\u5148\u89e3\u9501\uff0c\u9700\u8981\u65f6\u518d\u4ed8\u8d39',
  desc: 'MC \u97f3\u6548\u63a7\u5236\u4e3b\u63a8\u5206\u4eab\u670b\u53cb\u5708\u89e3\u9501\u5f53\u5929 VIP\uff1bAI \u6bd4\u5206\u64ad\u62a5\u5305\u53ea\u5728\u6b21\u6570\u4e0d\u8db3\u65f6\u63d0\u9192\u8ba2\u8d2d\u3002',
  shareTitle: '\u5206\u4eab\u53ef\u89e3\u9501',
  directKicker: '\u4e0d\u65b9\u4fbf\u5206\u4eab\uff1f',
  directTitle: '\u76f4\u63a5\u89e3\u9501 MC \u97f3\u6548',
  fold: '\u6536\u8d77',
  voiceTitle: 'AI \u8bed\u97f3\u64ad\u62a5\u5305',
  noticeTitle: '\u5f53\u524d\u7b56\u7565',
  notice: '\u57fa\u7840\u8ba1\u5206\u514d\u8d39\u3002MC \u97f3\u6548\u4f18\u5148\u5f15\u5bfc\u5206\u4eab\u89e3\u9501 1 \u5929\uff0c\u4ed8\u8d39\u5165\u53e3\u4e0d\u653e\u9996\u9875\u3002AI \u64ad\u62a5\u5305\u6309\u6b21\u6570\u5355\u72ec\u8ba1\u8d39\u3002'
};
const sharePlan = {
  id: 'share_day',
  name: '\u670b\u53cb\u5708\u5151\u6362 1 \u5929 VIP',
  price: '\u514d\u8d39',
  badge: '\u5f53\u5929\u4f7f\u7528',
  desc: '\u53d1\u670b\u53cb\u5708\u6216\u8f6c\u53d1\u5c0f\u7a0b\u5e8f\u540e\uff0c\u5151\u6362\u5f53\u5929 MC \u97f3\u6548 VIP\u3002\u4ec0\u4e48\u65f6\u5019\u6bd4\u8d5b\uff0c\u4ec0\u4e48\u65f6\u5019\u53d1\u3002',
  action: '\u53bb\u5206\u4eab'
};
const mcPaidPlans = [
  { id: 'mc_day', name: '\u5f53\u5929 MC \u97f3\u6548 VIP', price: '9.9', priceText: '9.9 \u5143', badge: '\u5f53\u5929\u6709\u6548', desc: '\u4e0d\u53d1\u670b\u53cb\u5708\uff0c\u4eca\u5929\u76f4\u63a5\u89e3\u9501 MC \u97f3\u6548\u3002' },
  { id: 'mc_month', name: '\u6708\u5ea6 MC \u97f3\u6548 VIP', price: '19.9', priceText: '19.9 \u5143', badge: '30 \u5929', desc: '\u9002\u5408\u8fd1\u671f\u591a\u573a\u6bd4\u8d5b\u548c\u8bad\u7ec3\u8d5b\u3002' },
  { id: 'mc_lifetime', name: '\u6c38\u4e45 MC \u97f3\u6548 VIP', price: '99', priceText: '99 \u5143', badge: '\u6c38\u4e45', desc: '\u4e00\u6b21\u89e3\u9501\u5f53\u524d MC \u97f3\u6548\u63a7\u5236\u529f\u80fd\u3002' }
];
const voicePlans = [
  { id: 'voice_credits_50', name: 'AI \u64ad\u62a5\u8f7b\u91cf\u5305', price: '9.9', priceText: '9.9 \u5143', countText: '50 \u6b21\u64ad\u62a5', desc: '\u9002\u5408\u5076\u5c14\u6253\u4e00\u4e24\u573a\u6bd4\u8d5b\u3002', action: '\u8d2d\u4e70 50 \u6b21' },
  { id: 'voice_credits_150', name: 'AI \u64ad\u62a5\u6807\u51c6\u5305', price: '19.9', priceText: '19.9 \u5143', countText: '150 \u6b21\u64ad\u62a5', desc: '\u9002\u5408\u4e00\u573a\u6bd4\u8d5b\u9891\u7e41\u64ad\u62a5\u6bd4\u5206\u3002', action: '\u8d2d\u4e70 150 \u6b21' },
  { id: 'voice_credits_400', name: 'AI \u64ad\u62a5\u7403\u961f\u5305', price: '39.9', priceText: '39.9 \u5143', countText: '400 \u6b21\u64ad\u62a5', desc: '\u9002\u5408\u8bad\u7ec3\u8425\u3001\u6708\u8d5b\u548c\u56fa\u5b9a\u7403\u961f\u3002', action: '\u8d2d\u4e70 400 \u6b21' }
];
const shareTitle = '\u6211\u5728\u7528\u8d5b\u5c0f\u8702\u7bee\u7403\u8ba1\u5206\u76d8\uff0c\u6a2a\u5c4f\u8ba1\u5206\u548c\u73b0\u573a\u97f3\u6548\u5f88\u597d\u7528';
function openOrder(plan, featureSummary) {
  wx.setStorageSync('pendingOrderProduct', { id: plan.id, name: plan.name, price: plan.price, originalPrice: plan.price, featureSummary, desc: plan.desc });
  wx.navigateTo({ url: '/pages/order/index' });
}
Page({
  data: { copy, sharePlan, mcPaidPlans, voicePlans, showMcPay: false, mode: 'mc' },
  onLoad(options) { this.setData({ mode: options && options.type === 'voice' ? 'voice' : 'mc' }); },
  onShareAppMessage() { return { title: shareTitle, path: '/pages/login/index?from=share_mc', imageUrl: '/assets/home/basketball-icon.png' }; },
  onShareTimeline() { return { title: shareTitle, query: 'from=timeline_mc', imageUrl: '/assets/home/basketball-icon.png' }; },
  selectSharePlan() {
    wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] });
    wx.showModal({
      title: '\u5206\u4eab\u514d\u8d39\u89e3\u9501',
      content: '\u5206\u4eab\u6587\u6848\u5df2\u914d\u597d\uff0c\u53d1\u670b\u53cb\u5708\u6216\u8f6c\u53d1\u540e\u53ef\u5151\u6362\u5f53\u5929 MC VIP\u3002',
      confirmText: '\u53bb\u5206\u4eab',
      cancelText: '\u76f4\u63a5\u4ed8\u8d39',
      success: (res) => { if (res.cancel) this.setData({ showMcPay: true }); }
    });
  },
  closeMcPay() { this.setData({ showMcPay: false }); },
  selectMcPaidPlan(event) { const plan = mcPaidPlans.find((item) => item.id === event.currentTarget.dataset.id); if (plan) openOrder(plan, 'MC \u73b0\u573a\u97f3\u6548\u63a7\u5236'); },
  selectVoicePlan(event) { const plan = voicePlans.find((item) => item.id === event.currentTarget.dataset.id); if (plan) openOrder(plan, 'AI \u6bd4\u5206\u64ad\u62a5\u5305'); }
});
