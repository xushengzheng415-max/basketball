const { callCloud } = require('./cloud');

const ENTITLEMENT_CACHE_KEY = 'proEntitlement';
const PAID_ORDER_KEY = 'latestPaidOrder';

function hasLocalPaidOrder() {
  const order = wx.getStorageSync(PAID_ORDER_KEY);
  return !!(order && (order.status === 'paid' || order.cloudStatus === 'mock_paid'));
}

function cacheEntitlement(entitlement) {
  wx.setStorageSync(ENTITLEMENT_CACHE_KEY, entitlement || null);
}

async function checkEntitlement(feature) {
  const localFallback = hasLocalPaidOrder();
  const result = await callCloud('sxCheckEntitlement', { feature });

  if (result && result.ok) {
    const entitlement = {
      active: !!result.active,
      feature,
      source: result.source || 'cloud',
      checkedAt: Date.now(),
      detail: result.entitlement || null
    };
    cacheEntitlement(entitlement);
    return entitlement;
  }

  return {
    active: localFallback,
    feature,
    source: localFallback ? 'local_paid_order_fallback' : 'none',
    checkedAt: Date.now(),
    detail: null
  };
}

module.exports = { checkEntitlement, hasLocalPaidOrder };
