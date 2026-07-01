Page({
  data: {
    latestResult: null
  },
  onShow() {
    const latestResult = wx.getStorageSync('latestMatchResult') || null;
    this.setData({ latestResult });
  },
  goScorer() {
    wx.navigateTo({ url: '/pages/scorer/index' });
  },
  goProducts() {
    wx.navigateTo({ url: '/pages/products/index' });
  },
  goTournament() {
    wx.switchTab({ url: '/pages/tournament/index' });
  },
  goTeam() {
    wx.switchTab({ url: '/pages/team/index' });
  }
});
