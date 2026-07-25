const CLOUD_ASSET_ROOT = 'cloud://sxf-basketball-d9gp6yt0rd1f7be4d.7378-sxf-basketball-d9gp6yt0rd1f7be4d-1419431905/ui-assets/assets/';

function cloudAsset(path) {
  const cleanPath = String(path || '').replace(/^\/?assets\//, '');
  return `${CLOUD_ASSET_ROOT}${cleanPath}`;
}

module.exports = {
  CLOUD_ASSET_ROOT,
  cloudAsset
};
