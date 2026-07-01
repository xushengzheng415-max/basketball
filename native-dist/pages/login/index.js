Page({
  data: {
    agreed: true
  },
  toggleAgreement() {
    this.setData({ agreed: !this.data.agreed });
  },
  ensureAgreed() {
    if (this.data.agreed) return true;
    wx.showToast({ title: '请先勾选用户协议', icon: 'none' });
    return false;
  },
  loginByWechat() {
    if (!this.ensureAgreed()) return;
    wx.getUserProfile({
      desc: '用于完善赛小蜂篮球个人资料',
      success: (res) => {
        const profile = {
          loggedIn: true,
          mode: 'wechat',
          avatarUrl: res.userInfo.avatarUrl || '',
          nickName: res.userInfo.nickName || '赛小蜂用户',
          loggedAt: Date.now()
        };
        wx.setStorageSync('loginProfile', profile);
        wx.setStorageSync('userProfile', profile);
        wx.switchTab({ url: '/pages/home/index' });
      },
      fail: () => {
        wx.showToast({ title: '已取消登录', icon: 'none' });
      }
    });
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
    wx.switchTab({ url: '/pages/home/index' });
  }
});