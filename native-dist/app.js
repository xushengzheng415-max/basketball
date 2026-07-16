const cloudEnv = 'cloudbase-d4g93f0re5f3274c1';

App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: cloudEnv,
        traceUser: true
      });
    }
  },
  globalData: {
    cloudEnv,
    cloudEnvName: 'cloudbase',
    rosterReady: null
  }
});
