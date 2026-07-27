const {
  RESOURCE_APPID,
  RESOURCE_ENV,
  initCloud,
  installSharedResourcePageAdapter
} = require('./utils/cloud');

installSharedResourcePageAdapter();

function setupUpdateManager() {
  if (typeof wx === 'undefined' || typeof wx.getUpdateManager !== 'function') {
    return;
  }

  const updateManager = wx.getUpdateManager();
  let updatePromptShown = false;

  updateManager.onUpdateReady(() => {
    if (updatePromptShown) {
      return;
    }

    updatePromptShown = true;
    wx.showModal({
      title: '发现新版本',
      content: '新版本已准备完成，点击“立即更新”后将重新打开小程序。',
      confirmText: '立即更新',
      cancelText: '稍后',
      success(result) {
        if (result.confirm) {
          updateManager.applyUpdate();
        }
      }
    });
  });

  updateManager.onUpdateFailed(() => {
    console.warn('[update] new mini program package download failed');
  });
}

App({
  onLaunch() {
    setupUpdateManager();
    initCloud().catch((error) => console.warn('[cloud] shared environment init failed', error));
  },
  globalData: {
    cloudEnv: RESOURCE_ENV,
    cloudEnvName: 'cloudbase',
    cloudResourceAppid: RESOURCE_APPID,
    rosterReady: null
  }
});
