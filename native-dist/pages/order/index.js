const { callCloud } = require('../../utils/cloud');

const fallbackProduct = {
  id: 'single',
  name: '赛小蜂 Pro · 单场体验',
  desc: '解锁一场比赛的 MC 系统和计分板 2.0。',
  featureSummary: 'MC 现场音频系统 + 计分板 2.0 球员数据统计',
  price: '4.90',
  originalPrice: '9.90',
  promoLabel: '首场价'
};

function requestPayment(payment) {
  return new Promise((resolve, reject) => {
    wx.requestPayment({
      timeStamp: payment.timeStamp,
      nonceStr: payment.nonceStr,
      package: payment.package,
      signType: payment.signType || 'RSA',
      paySign: payment.paySign,
      success: resolve,
      fail: reject
    });
  });
}

Page({
  data: {
    product: fallbackProduct,
    profile: null,
    paying: false
  },
  onLoad() {
    const product = wx.getStorageSync('pendingOrderProduct') || fallbackProduct;
    const profile = wx.getStorageSync('userProfile') || null;
    this.setData({ product, profile });
  },
  async payNow() {
    if (this.data.paying) return;
    this.setData({ paying: true });
    wx.showLoading({ title: '创建订单' });

    const wxPayOrder = await callCloud('sxCreateWxPayOrder', { product: this.data.product });
    if (wxPayOrder && wxPayOrder.ok && wxPayOrder.payment) {
      try {
        wx.hideLoading();
        await requestPayment(wxPayOrder.payment);
        wx.setStorageSync('latestPaidOrder', {
          orderNo: wxPayOrder.orderNo,
          product: this.data.product,
          user: this.data.profile,
          status: 'pending_confirm',
          paidAt: new Date().toLocaleString()
        });
        wx.showToast({ title: '支付成功', icon: 'success' });
        wx.navigateTo({ url: '/pages/pay-result/index' });
      } catch (error) {
        wx.showToast({ title: '支付未完成', icon: 'none' });
      } finally {
        this.setData({ paying: false });
      }
      return;
    }

    console.warn('[order] wxpay unavailable, fallback to mock pay', wxPayOrder);
    await this.mockPay();
    this.setData({ paying: false });
  },
  async mockPay() {
    const order = {
      orderNo: `SXF${Date.now()}`,
      product: this.data.product,
      user: this.data.profile,
      paidAt: new Date().toLocaleString(),
      status: 'paid'
    };
    const cloudOrder = await callCloud('sxCreateOrder', { product: this.data.product, mockPaid: true });
    wx.hideLoading();
    if (cloudOrder && cloudOrder.orderNo) {
      order.orderNo = cloudOrder.orderNo;
      order.cloudStatus = cloudOrder.status;
      if (cloudOrder.entitlement) {
        wx.setStorageSync('proEntitlement', {
          active: true,
          feature: 'mc_system',
          source: 'cloud_order',
          checkedAt: Date.now(),
          detail: cloudOrder.entitlement
        });
      }
    }
    wx.setStorageSync('latestPaidOrder', order);
    wx.navigateTo({ url: '/pages/pay-result/index' });
  }
});