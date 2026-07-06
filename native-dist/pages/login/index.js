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
    const errMsg = detail.errMsg || '';
    if (errMsg && errMsg.indexOf('ok') < 0) {
      wx.showToast({ title: '需要授权手机号后登录', icon: 'none' });
      return;
    }

    const phoneCode = detail.code || '';
    wx.getUserProfile({
      desc: '用于完善赛小蜂篮球个人资料',
      success: (res) => {
        this.finishWechatLogin({ phoneCode, userInfo: res.userInfo || {} });
      },
      fail: () => {
        this.finishWechatLogin({ phoneCode, userInfo: {} });
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
      const message = result && result.message ? result.message : '登录失败，请稍后重试';
      wx.showToast({ title: message, icon: 'none' });
      return;
    }

    const savedProfile = Object.assign({}, profile, {
      userId: result.userId || '',
      wxOpenId: result.openid || '',
      wxUnionId: result.unionid || '',
      phoneNumber: result.phoneNumber || '',
      phoneAuthFailed: !!result.phoneAuthFailed
    });

    wx.setStorageSync('loginProfile', savedProfile);
    wx.setStorageSync('userProfile', savedProfile);

    if (result.phoneAuthFailed) {
      wx.showToast({ title: '已登录，手机号稍后可补授权', icon: 'none' });
      setTimeout(() => wx.reLaunch({ url: '/pages/home/index' }), 600);
      return;
    }

    wx.reLaunch({ url: '/pages/home/index' });
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