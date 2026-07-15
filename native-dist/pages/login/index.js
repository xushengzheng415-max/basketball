const { callCloud } = require('../../utils/cloud');

Page({
  data: {
    agreed: false,
    agreementCheckClass: '',
    loggingIn: false,
    buttonText: '手机号快捷登录',
    redirectPath: ''
  },

  onLoad(options) {
    const rawPath = (options && options.redirect) || '';
    let redirectPath = '';
    try {
      redirectPath = decodeURIComponent(rawPath);
    } catch (error) {
      redirectPath = '';
    }
    if (redirectPath.indexOf('/pages/') !== 0) redirectPath = '';
    this.setData({ redirectPath });
  },

  toggleAgreement() {
    if (this.data.loggingIn) return;
    const agreed = !this.data.agreed;
    this.setData({
      agreed,
      agreementCheckClass: agreed ? 'checked' : ''
    });
  },

  promptAgreement() {
    wx.showToast({ title: '请先阅读并勾选用户协议和隐私政策', icon: 'none' });
  },

  showUserAgreement() {
    wx.showModal({
      title: '用户服务协议',
      content: '赛小蜂篮球为用户提供赛事管理、比赛计分和教务数据服务。登录后请遵守平台规则，不得上传违法、侵权或虚假内容。',
      showCancel: false,
      confirmText: '我知道了',
      confirmColor: '#ff5a00'
    });
  },

  openPrivacyPolicy() {
    if (typeof wx.openPrivacyContract !== 'function') {
      wx.showToast({ title: '请升级客户端后查看隐私政策', icon: 'none' });
      return;
    }
    wx.openPrivacyContract({
      fail: () => wx.showToast({ title: '隐私政策暂时无法打开', icon: 'none' })
    });
  },

  loginByPhone(event) {
    if (!this.data.agreed) {
      this.promptAgreement();
      return;
    }
    if (this.data.loggingIn) return;

    const detail = event.detail || {};
    const errMsg = detail.errMsg || '';
    const phoneCode = detail.code || '';
    if ((errMsg && errMsg.indexOf('ok') < 0) || !phoneCode) {
      wx.showToast({ title: '未完成手机号授权', icon: 'none' });
      return;
    }

    this.finishPhoneLogin(phoneCode);
  },

  async finishPhoneLogin(phoneCode) {
    const profile = {
      loggedIn: true,
      mode: 'wechat',
      avatarUrl: '',
      nickName: '赛小蜂用户',
      loggedAt: Date.now()
    };

    this.setData({ loggingIn: true, buttonText: '正在登录' });
    wx.showLoading({ title: '登录中' });

    try {
      const result = await callCloud('sxLogin', { profile, phoneCode });
      if (!result || !result.ok) {
        throw new Error((result && result.message) || '登录失败，请稍后重试');
      }
      if (result.phoneAuthFailed || !result.phoneNumber) {
        throw new Error('手机号验证失败，请重新授权');
      }

      const savedProfile = Object.assign({}, profile, {
        userId: result.userId || '',
        wxOpenId: result.openid || '',
        wxUnionId: result.unionid || '',
        phoneNumber: result.phoneNumber
      });

      wx.setStorageSync('loginProfile', savedProfile);
      wx.setStorageSync('userProfile', savedProfile);
      if (this.data.redirectPath) {
        wx.redirectTo({ url: this.data.redirectPath });
        return;
      }
      wx.reLaunch({ url: '/pages/home/index' });
    } catch (error) {
      wx.showToast({ title: error.message || '登录失败，请稍后重试', icon: 'none' });
    } finally {
      wx.hideLoading();
      this.setData({ loggingIn: false, buttonText: '手机号快捷登录' });
    }
  }
});
