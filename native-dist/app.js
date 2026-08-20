const cloudEnv = 'cloudbase-d4g93f0re5f3274c1';
const { pullRoster } = require('./utils/roster-sync');

App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: cloudEnv,
        traceUser: true
      });
      this.globalData.rosterReady = pullRoster().catch((error) => {
        console.warn('[app] preload roster failed', error);
        return null;
      });
    } else {
      this.globalData.rosterReady = Promise.resolve(null);
    }
  },
  globalData: {
    cloudEnv,
    cloudEnvName: 'cloudbase',
    rosterReady: null
  }
});
