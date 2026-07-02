const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const DAY = 24 * 60 * 60 * 1000;
const VOICE_CREDITS = {
  voice_light: 50,
  voice_standard: 150,
  voice_team: 400,
  voice_credits_50: 50,
  voice_credits_150: 150,
  voice_credits_400: 400
};

function createOrderNo() {
  return `SXF${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
}

function buildEntitlement(product, orderNo, wxContext, now) {
  const productId = product.id || '';
  const data = {
    openid: wxContext.OPENID,
    unionid: wxContext.UNIONID || '',
    orderNo,
    productId,
    productName: product.name || '',
    features: [],
    status: 'active',
    source: 'mock_paid_order',
    startedAt: now,
    createdAt: now,
    updatedAt: now
  };

  if (productId === 'mc_day') {
    data.features = ['mc_system'];
    data.scope = 'day';
    data.expiresAt = new Date(Date.now() + DAY);
  } else if (productId === 'mc_month') {
    data.features = ['mc_system'];
    data.scope = 'monthly';
    data.expiresAt = new Date(Date.now() + 30 * DAY);
  } else if (productId === 'mc_lifetime') {
    data.features = ['mc_system'];
    data.scope = 'lifetime';
  } else if (VOICE_CREDITS[productId]) {
    data.features = ['score_voice'];
    data.scope = 'voice_pack';
    data.voiceCredits = VOICE_CREDITS[productId];
  } else if (productId === 'single') {
    data.features = ['mc_system'];
    data.scope = 'single_match';
    data.usageLimit = 1;
    data.remainingUses = 1;
  } else if (productId === 'monthly') {
    data.features = ['mc_system'];
    data.scope = 'monthly';
    data.expiresAt = new Date(Date.now() + 30 * DAY);
  } else if (productId === 'lifetime') {
    data.features = ['mc_system'];
    data.scope = 'lifetime';
  } else {
    data.features = Array.isArray(product.features) && product.features.length ? product.features : ['mc_system'];
  }

  return data;
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const product = event.product || {};
  const now = db.serverDate();
  const orderNo = createOrderNo();
  const status = event.mockPaid === false ? 'pending' : 'mock_paid';

  const order = {
    orderNo,
    openid: wxContext.OPENID,
    unionid: wxContext.UNIONID || '',
    product,
    amount: Number(product.price || 0),
    originalAmount: Number(product.originalPrice || product.price || 0),
    status,
    payChannel: 'wechat_pay_pending',
    createdAt: now,
    updatedAt: now
  };

  const created = await db.collection('sx_orders').add({ data: order });

  let entitlement = null;
  if (status === 'mock_paid') {
    entitlement = buildEntitlement(product, orderNo, wxContext, now);
    const entitlementCreated = await db.collection('sx_entitlements').add({ data: entitlement });
    entitlement._id = entitlementCreated._id;
  }

  return { ok: true, orderId: created._id, orderNo, status, entitlement };
};
