const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function getBody(event) {
  if (!event) return {};
  if (typeof event.body === 'string') {
    try { return JSON.parse(event.body); } catch (error) { return {}; }
  }
  return event.body || event;
}

function decryptResource(resource) {
  const apiV3Key = process.env.SXF_WXPAY_API_V3_KEY;
  if (!apiV3Key) {
    const error = new Error('missing_wxpay_api_v3_key');
    error.code = 'missing_wxpay_api_v3_key';
    throw error;
  }
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(apiV3Key, 'utf8'), Buffer.from(resource.nonce, 'utf8'));
  decipher.setAuthTag(Buffer.from(resource.tag, 'base64'));
  decipher.setAAD(Buffer.from(resource.associated_data || '', 'utf8'));
  const decoded = Buffer.concat([
    decipher.update(Buffer.from(resource.ciphertext, 'base64')),
    decipher.final()
  ]).toString('utf8');
  return JSON.parse(decoded);
}

function buildEntitlement(product, orderNo, paidAt) {
  const productId = product.id || '';
  const data = {
    orderNo,
    productId,
    productName: product.name || '',
    features: ['mc_system', 'stats_scorer_2'],
    status: 'active',
    source: 'wechat_pay',
    startedAt: paidAt,
    createdAt: paidAt,
    updatedAt: paidAt
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

async function activateEntitlement(order, transaction) {
  const now = db.serverDate();
  const exists = await db.collection('sx_entitlements').where({ orderNo: order.orderNo, status: 'active' }).limit(1).get();
  if (exists.data && exists.data.length) return;

  const entitlement = buildEntitlement(order.product || {}, order.orderNo, now);
  entitlement.openid = order.openid;
  entitlement.unionid = order.unionid || '';
  entitlement.transactionId = transaction.transaction_id || '';
  await db.collection('sx_entitlements').add({ data: entitlement });
}

exports.main = async (event) => {
  const body = getBody(event);
  try {
    if (!body.resource) return { code: 'FAIL', message: 'missing resource' };
    const transaction = decryptResource(body.resource);
    const orderNo = transaction.out_trade_no;
    if (!orderNo) return { code: 'FAIL', message: 'missing out_trade_no' };

    const orders = await db.collection('sx_orders').where({ orderNo }).limit(1).get();
    if (!orders.data || !orders.data.length) return { code: 'FAIL', message: 'order not found' };
    const order = orders.data[0];

    const paid = transaction.trade_state === 'SUCCESS';
    await db.collection('sx_orders').doc(order._id).update({
      data: {
        status: paid ? 'paid' : 'pay_not_success',
        transactionId: transaction.transaction_id || '',
        tradeState: transaction.trade_state || '',
        payerOpenid: transaction.payer && transaction.payer.openid ? transaction.payer.openid : '',
        paidAt: paid ? db.serverDate() : null,
        wxpayNotify: transaction,
        updatedAt: db.serverDate()
      }
    });

    if (paid) await activateEntitlement(order, transaction);
    return { code: 'SUCCESS', message: '成功' };
  } catch (error) {
    console.error('[sxWxPayNotify] failed', error);
    return { code: 'FAIL', message: error.message || 'notify failed' };
  }
};