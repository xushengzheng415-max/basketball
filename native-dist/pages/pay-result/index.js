Page({
  data: {
    order: {
      orderNo: '--',
      product: { name: '赛小蜂 Pro', price: '0.00' },
      paidAt: '--'
    }
  },
  onLoad() {
    const order = wx.getStorageSync('latestPaidOrder');
    if (order) this.setData({ order });
  },
  backHome() {
    wx.reLaunch({ url: '/pages/home/index' });
  }
});