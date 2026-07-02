const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

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
    features: ['mc_system', 'stats_scorer_2'],
    status: 'active',
    source: 'mock_paid_order',
    startedAt: now,
    createdAt: now,
    updatedAt: now
  };

  if (productId === 'single') {
    data.scope = 'single_match';
    data.usageLimit = 1;
    data.remainingUses = 1;
  }

  if (productId === 'monthly') {
    data.scope = 'monthly';
    data.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  if (productId === 'lifetime') {
    data.scope = 'lifetime';
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
