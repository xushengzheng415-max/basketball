const fallbackProduct = {
  id: 'single',
  name: '赛小蜂 Pro · 单场体验',
  desc: '解锁一场比赛的 MC 系统和计分板 2.0。',
  featureSummary: 'MC 现场音频系统 + 计分板 2.0 球员数据统计',
  price: '4.90',
  originalPrice: '9.90',
  promoLabel: '首场价'
};

Page({
  data: {
    product: fallbackProduct,
    profile: null
  },
  onLoad() {
    const product = wx.getStorageSync('pendingOrderProduct') || fallbackProduct;
    const profile = wx.getStorageSync('userProfile') || null;
    this.setData({ product, profile });
  },
  payNow() {
    const order = {
      orderNo: `SXF${Date.now()}`,
      product: this.data.product,
      user: this.data.profile,
      paidAt: new Date().toLocaleString(),
      status: 'paid'
    };
    wx.setStorageSync('latestPaidOrder', order);
    wx.navigateTo({ url: '/pages/pay-result/index' });
  }
});