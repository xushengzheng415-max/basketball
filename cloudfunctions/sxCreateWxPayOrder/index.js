const cloud = require('wx-server-sdk');
const crypto = require('crypto');
const https = require('https');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const WXPAY_HOST = 'api.mch.weixin.qq.com';
const JSAPI_PATH = '/v3/pay/transactions/jsapi';

function env(name) {
  return process.env[name] || '';
}

function requiredConfig() {
  const config = {
    appid: env('SXF_WXPAY_APPID') || 'wx06d735da15276acd',
    mchid: env('SXF_WXPAY_MCHID') || '1114763686',
    serialNo: env('SXF_WXPAY_SERIAL_NO'),
    privateKey: normalizePrivateKey(env('SXF_WXPAY_PRIVATE_KEY')),
    notifyUrl: env('SXF_WXPAY_NOTIFY_URL')
  };
  const missing = [];
  if (!config.serialNo) missing.push('SXF_WXPAY_SERIAL_NO');
  if (!config.privateKey) missing.push('SXF_WXPAY_PRIVATE_KEY');
  if (!config.notifyUrl) missing.push('SXF_WXPAY_NOTIFY_URL');
  return { config, missing };
}

function normalizePrivateKey(value) {
  return String(value || '').replace(/\\n/g, '\n').trim();
}

function createOrderNo() {
  return `SXF${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
}

function toCents(value) {
  const cents = Math.round(Number(value || 0) * 100);
  return Math.max(1, cents || 1);
}

function signWithPrivateKey(message, privateKey) {
  return crypto.createSign('RSA-SHA256').update(message).sign(privateKey, 'base64');
}

function buildAuthorization({ method, urlPath, timestamp, nonceStr, body, config }) {
  const message = `${method}\n${urlPath}\n${timestamp}\n${nonceStr}\n${body}\n`;
  const signature = signWithPrivateKey(message, config.privateKey);
  return `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchid}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${config.serialNo}"`;
}

function postJson({ path, body, config }) {
  const method = 'POST';
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = crypto.randomBytes(16).toString('hex');
  const authorization = buildAuthorization({ method, urlPath: path, timestamp, nonceStr, body, config });

  const options = {
    hostname: WXPAY_HOST,
    path,
    method,
    headers: {
      Authorization: authorization,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'SaixiaofengBasketball/1.0'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let parsed = {};
        if (raw) {
          try {
            parsed = JSON.parse(raw);
          } catch (error) {
            error.message = `WeChat Pay response parse failed: ${raw.slice(0, 200)}`;
            reject(error);
            return;
          }
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const error = new Error(parsed.message || raw || 'WeChat Pay request failed');
          error.code = parsed.code || `HTTP_${res.statusCode}`;
          error.detail = parsed;
          reject(error);
          return;
        }
        resolve(parsed);
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function buildPaymentParams({ appid, prepayId, privateKey }) {
  const timeStamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = crypto.randomBytes(16).toString('hex');
  const packageValue = `prepay_id=${prepayId}`;
  const paySign = signWithPrivateKey(`${appid}\n${timeStamp}\n${nonceStr}\n${packageValue}\n`, privateKey);
  return {
    timeStamp,
    nonceStr,
    package: packageValue,
    signType: 'RSA',
    paySign
  };
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const product = event.product || {};
  const { config, missing } = requiredConfig();
  if (missing.length) {
    return { ok: false, code: 'missing_wxpay_config', message: `Missing WeChat Pay env: ${missing.join(', ')}` };
  }

  const orderNo = createOrderNo();
  const total = toCents(product.price || product.promoPrice || 0);
  const body = JSON.stringify({
    appid: config.appid,
    mchid: config.mchid,
    description: product.name || 'Saixiaofeng Basketball paid feature',
    out_trade_no: orderNo,
    notify_url: config.notifyUrl,
    amount: { total, currency: 'CNY' },
    payer: { openid: wxContext.OPENID },
    attach: JSON.stringify({ productId: product.id || '', feature: product.featureSummary || '' })
  });

  const now = db.serverDate();
  await db.collection('sx_orders').add({
    data: {
      orderNo,
      openid: wxContext.OPENID,
      unionid: wxContext.UNIONID || '',
      product,
      amount: total / 100,
      amountCents: total,
      status: 'pending',
      payChannel: 'wechat_pay_jsapi',
      createdAt: now,
      updatedAt: now
    }
  });

  try {
    const prepay = await postJson({ path: JSAPI_PATH, body, config });
    const payment = buildPaymentParams({ appid: config.appid, prepayId: prepay.prepay_id, privateKey: config.privateKey });
    await db.collection('sx_orders').where({ orderNo }).update({
      data: { prepayId: prepay.prepay_id, updatedAt: db.serverDate() }
    });
    return { ok: true, orderNo, prepayId: prepay.prepay_id, payment };
  } catch (error) {
    console.error('[sxCreateWxPayOrder] failed', error);
    await db.collection('sx_orders').where({ orderNo }).update({
      data: { status: 'pay_create_failed', errorCode: error.code || '', errorMessage: error.message || '', updatedAt: db.serverDate() }
    });
    return { ok: false, code: error.code || 'wxpay_create_failed', message: error.message || 'WeChat Pay order failed' };
  }
};
