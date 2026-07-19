const { checkEntitlement } = require('./entitlement');

const EDUCATION_FEATURE = 'education_system';
const EDUCATION_ACCESS_CACHE_KEY = 'educationAccessV1';
const CACHE_MAX_AGE = 5 * 60 * 1000;

function readCachedEducationAccess() {
  try {
    const cached = wx.getStorageSync(EDUCATION_ACCESS_CACHE_KEY);
    if (!cached || typeof cached !== 'object') return null;
    return cached;
  } catch (error) {
    console.warn('[education-access] cache read failed', error);
    return null;
  }
}

function writeCachedEducationAccess(access) {
  try {
    wx.setStorageSync(EDUCATION_ACCESS_CACHE_KEY, access);
  } catch (error) {
    console.warn('[education-access] cache write failed', error);
  }
}

async function refreshEducationAccess() {
  const entitlement = await checkEntitlement(EDUCATION_FEATURE);
  const access = {
    active: !!(entitlement && entitlement.active),
    feature: EDUCATION_FEATURE,
    checkedAt: Date.now(),
    source: entitlement && entitlement.source || 'none',
    detail: entitlement && entitlement.detail || null
  };
  writeCachedEducationAccess(access);
  return access;
}

async function getEducationAccess(options) {
  const forceRefresh = !!(options && options.forceRefresh);
  const cached = readCachedEducationAccess();
  if (!forceRefresh && cached && Date.now() - Number(cached.checkedAt || 0) < CACHE_MAX_AGE) {
    return cached;
  }
  return refreshEducationAccess();
}

function openEducationAccountPage() {
  wx.navigateTo({
    url: '/pages/education-product/index',
    fail: () => wx.redirectTo({ url: '/pages/education-product/index' })
  });
}

function showEducationDemoNotice() {
  return new Promise((resolve) => {
    wx.showModal({
      title: '\u6559\u52a1\u6f14\u793a\u6a21\u5f0f',
      content: '\u5f53\u524d\u9875\u9762\u4ec5\u7528\u4e8e\u9884\u89c8\u529f\u80fd\u3002\u6559\u52a1\u8d26\u6237\u9700\u7531 PC \u7aef\u4e0b\u53d1\u5e76\u5b8c\u6210\u5f00\u6237\u540e\uff0c\u624d\u53ef\u4fdd\u5b58\u3001\u63d0\u4ea4\u6216\u53d1\u5e03\u771f\u5b9e\u4e1a\u52a1\u6570\u636e\u3002',
      cancelText: '\u7ee7\u7eed\u9884\u89c8',
      confirmText: '\u4e86\u89e3\u5f00\u6237',
      confirmColor: '#ff7900',
      success: (result) => {
        if (result.confirm) openEducationAccountPage();
        resolve(false);
      },
      fail: () => resolve(false)
    });
  });
}

async function requireEducationAccess() {
  const access = await getEducationAccess({ forceRefresh: true });
  if (access.active) return true;
  await showEducationDemoNotice();
  return false;
}

module.exports = {
  EDUCATION_FEATURE,
  getEducationAccess,
  refreshEducationAccess,
  requireEducationAccess,
  showEducationDemoNotice,
  openEducationAccountPage
};
