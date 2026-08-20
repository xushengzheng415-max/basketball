const CLOUD_ASSET_ROOT = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/';

function cloudAsset(path) {
  const cleanPath = String(path || '').replace(/^\/?assets\//, '');
  return `${CLOUD_ASSET_ROOT}${cleanPath}`;
}

module.exports = {
  CLOUD_ASSET_ROOT,
  cloudAsset
};
