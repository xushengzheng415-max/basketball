const { callCloud } = require('./cloud');

const ENTITLEMENT_CACHE_KEY = 'proEntitlement';
const PAID_ORDER_KEY = 'latestPaidOrder';

function orderHasFeature(order, feature) {
  if (!order || !(order.status === 'paid' || order.cloudStatus === 'mock_paid')) return false;
  const product = order.product || {};
  const productId = product.id || '';
  if (feature === 'mc_system') {
    return ['mc_day', 'mc_month', 'mc_lifetime', 'single', 'monthly', 'lifetime'].indexOf(productId) >= 0
      || (Array.isArray(product.features) && product.features.indexOf('mc_system') >= 0);
  }
  if (feature === 'score_voice') {
    return ['voice_light', 'voice_standard', 'voice_team', 'voice_credits_50', 'voice_credits_150', 'voice_credits_400'].indexOf(productId) >= 0
      || (Array.isArray(product.features) && product.features.indexOf('score_voice') >= 0);
  }
  return false;
}

function hasLocalPaidOrder(feature) {
  const order = wx.getStorageSync(PAID_ORDER_KEY);
  return orderHasFeature(order, feature || 'mc_system');
}

function cacheEntitlement(entitlement) {
  wx.setStorageSync(ENTITLEMENT_CACHE_KEY, entitlement || null);
}

async function checkEntitlement(feature) {
  const targetFeature = feature || 'mc_system';
  const localFallback = hasLocalPaidOrder(targetFeature);
  const result = await callCloud('sxCheckEntitlement', { feature: targetFeature });

  if (result && result.ok) {
    const entitlement = {
      active: !!result.active,
      feature: targetFeature,
      source: result.source || 'cloud',
      checkedAt: Date.now(),
      detail: result.entitlement || null
    };
    cacheEntitlement(entitlement);
    return entitlement;
  }

  return {
    active: localFallback,
    feature: targetFeature,
    source: localFallback ? 'local_paid_order_fallback' : 'none',
    checkedAt: Date.now(),
    detail: null
  };
}

module.exports = { checkEntitlement, hasLocalPaidOrder };
