const { callCloud } = require('../../utils/cloud');

Page({
  data: {
    agreed: true,
    loggingIn: false
  },
  toggleAgreement() {
    this.setData({ agreed: !this.data.agreed });
  },
  ensureAgreed() {
    if (this.data.agreed) return true;
    wx.showToast({ title: '请先勾选用户协议', icon: 'none' });
    return false;
  },
  loginByWechat(event) {
    if (!this.ensureAgreed() || this.data.loggingIn) return;

    const detail = event.detail || {};
    if (detail.errMsg && detail.errMsg.indexOf('ok') < 0) {
      wx.showToast({ title: '需要授权手机号后登录', icon: 'none' });
      return;
    }

    wx.getUserProfile({
      desc: '用于完善赛小蜂篮球个人资料',
      success: (res) => {
        this.finishWechatLogin({
          phoneCode: detail.code || '',
          userInfo: res.userInfo || {}
        });
      },
      fail: () => {
        this.finishWechatLogin({
          phoneCode: detail.code || '',
          userInfo: {}
        });
      }
    });
  },
  async finishWechatLogin(options) {
    const userInfo = options.userInfo || {};
    const profile = {
      loggedIn: true,
      mode: 'wechat',
      avatarUrl: userInfo.avatarUrl || '',
      nickName: userInfo.nickName || '微信用户',
      loggedAt: Date.now()
    };

    this.setData({ loggingIn: true });
    wx.showLoading({ title: '登录中' });
    const result = await callCloud('sxLogin', {
      profile,
      phoneCode: options.phoneCode || ''
    });
    wx.hideLoading();
    this.setData({ loggingIn: false });

    if (!result || !result.ok) {
      wx.showToast({ title: result && result.message ? result.message : '登录失败', icon: 'none' });
      return;
    }

    const savedProfile = Object.assign({}, profile, {
      userId: result.userId || '',
      wxOpenId: result.openid || '',
      wxUnionId: result.unionid || '',
      phoneNumber: result.phoneNumber || ''
    });

    wx.setStorageSync('loginProfile', savedProfile);
    wx.setStorageSync('userProfile', savedProfile);
    wx.switchTab({ url: '/pages/home/index' });
  },
  enterAsGuest() {
    if (!this.ensureAgreed()) return;
    const profile = {
      loggedIn: true,
      mode: 'guest',
      avatarUrl: '',
      nickName: '游客用户',
      loggedAt: Date.now()
    };
    wx.setStorageSync('loginProfile', profile);
    wx.setStorageSync('userProfile', profile);
    callCloud('sxLogin', { profile });
    wx.navigateTo({ url: '/pages/scorer/index' });
  }
});
