Page({
  touchStartX: 0,
  data: {
    latestResult: null,
    showResultDelete: false
  },
  onShow() {
    const latestResult = wx.getStorageSync('latestMatchResult') || null;
    this.setData({ latestResult, showResultDelete: false });
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
  },
  onResultTouchStart(event) {
    this.touchStartX = event.changedTouches[0].clientX;
  },
  onResultTouchEnd(event) {
    const endX = event.changedTouches[0].clientX;
    const deltaX = endX - this.touchStartX;
    if (deltaX < -40) {
      this.setData({ showResultDelete: true });
    }
    if (deltaX > 40) {
      this.setData({ showResultDelete: false });
    }
  },
  deleteLatestResult() {
    wx.removeStorageSync('latestMatchResult');
    this.setData({ latestResult: null, showResultDelete: false });
    wx.showToast({ title: '赛果已删除', icon: 'none' });
  }
});