const { callCloud } = require('../../utils/cloud');

function cloudErrorMessage(result) {
  if (!result) return '登录服务无响应，请稍后重试';
  if (result.message) return result.message;
  const error = result.error || {};
  return error.errMsg || error.message || '登录失败，请稍后重试';
}

function phoneAuthErrorMessage(result) {
  const raw = String((result && (result.phoneAuthMessage || result.phoneAuthCode)) || '').toLowerCase();
  console.warn('[login] phone authorization failed', result);
  if (raw.includes('-604101') || raw.includes('48001') || raw.includes('unauthorized') || raw.includes('permission')) {
    return '小程序尚未开通手机号能力';
  }
  if (raw.includes('40029') || raw.includes('40163') || raw.includes('invalid code') || raw.includes('been used')) {
    return '授权码已失效，请重新点击登录';
  }
  if (raw.includes('quota') || raw.includes('limit')) {
    return '手机号验证次数已达上限';
  }
  if (raw.includes('function') && raw.includes('not')) {
    return '登录云函数尚未部署';
  }
  return '手机号验证失败，请检查云函数日志';
}

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
        throw new Error(cloudErrorMessage(result));
      }
      if (result.phoneAuthFailed || !result.phoneNumber) {
        throw new Error(phoneAuthErrorMessage(result));
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
