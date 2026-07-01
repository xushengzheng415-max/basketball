const fallbackProduct = {
  id: 'score',
  name: '现场计分服务包',
  desc: '横屏计分、赛果生成、赛事数据归档。',
  price: '199.00'
};

Page({
  data: {
    product: fallbackProduct,
    buyerName: '',
    phone: ''
  },
  onLoad() {
    const product = wx.getStorageSync('pendingOrderProduct') || fallbackProduct;
    this.setData({ product });
  },
  onNameInput(event) {
    this.setData({ buyerName: event.detail.value });
  },
  onPhoneInput(event) {
    this.setData({ phone: event.detail.value });
  },
  payNow() {
    if (!this.data.buyerName.trim()) {
      wx.showToast({ title: '请填写联系人', icon: 'none' });
      return;
    }
    if (!this.data.phone.trim()) {
      wx.showToast({ title: '请填写手机号', icon: 'none' });
      return;
    }
    const order = {
      orderNo: `SXF${Date.now()}`,
      product: this.data.product,
      buyerName: this.data.buyerName,
      phone: this.data.phone,
      paidAt: new Date().toLocaleString()
    };
    wx.setStorageSync('latestPaidOrder', order);
    wx.navigateTo({ url: '/pages/pay-result/index' });
  }
});
