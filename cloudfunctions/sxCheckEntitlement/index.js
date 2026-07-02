const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function toTime(value) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' || typeof value === 'number') return new Date(value).getTime();
  if (value.$date) return new Date(value.$date).getTime();
  return 0;
}

function isFeatureEnabled(entitlement, feature) {
  const features = entitlement.features || [];
  if (!feature) return true;
  return features.indexOf(feature) >= 0;
}

function isNotExpired(entitlement) {
  const expiresAt = toTime(entitlement.expiresAt);
  return !expiresAt || expiresAt > Date.now();
}

function isQuotaAvailable(entitlement) {
  if (typeof entitlement.remainingUses !== 'number') return true;
  return entitlement.remainingUses > 0;
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const feature = event.feature || 'mc_system';

  const result = await db.collection('sx_entitlements')
    .where({
      openid: wxContext.OPENID,
      status: 'active'
    })
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();

  const entitlement = (result.data || []).find((item) => (
    isFeatureEnabled(item, feature) && isNotExpired(item) && isQuotaAvailable(item)
  ));

  return {
    ok: true,
    active: !!entitlement,
    feature,
    source: 'sx_entitlements',
    entitlement: entitlement ? {
      id: entitlement._id,
      productId: entitlement.productId || '',
      productName: entitlement.productName || '',
      features: entitlement.features || [],
      scope: entitlement.scope || '',
      remainingUses: entitlement.remainingUses,
      voiceCredits: entitlement.voiceCredits || 0,
      shareCredits: entitlement.shareCredits || 0,
      expiresAt: entitlement.expiresAt || null,
      source: entitlement.source || ''
    } : null
  };
};
