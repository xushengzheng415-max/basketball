const {
  RESOURCE_APPID,
  RESOURCE_ENV,
  initCloud,
  installSharedResourcePageAdapter
} = require('./utils/cloud');

installSharedResourcePageAdapter();

App({
  onLaunch() {
    initCloud().catch((error) => console.warn('[cloud] shared environment init failed', error));
  },
  globalData: {
    cloudEnv: RESOURCE_ENV,
    cloudEnvName: 'cloudbase',
    cloudResourceAppid: RESOURCE_APPID,
    rosterReady: null
  }
});
