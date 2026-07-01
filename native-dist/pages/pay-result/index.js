Page({
  data: {
    order: {
      orderNo: '--',
      product: { name: '赛事服务', price: '0.00' },
      paidAt: '--'
    }
  },
  onLoad() {
    const order = wx.getStorageSync('latestPaidOrder');
    if (order) this.setData({ order });
  },
  backHome() {
    wx.switchTab({ url: '/pages/home/index' });
  }
});
