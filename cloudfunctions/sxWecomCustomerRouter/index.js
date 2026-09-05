const {
  decryptWechatPayload,
  parseRules,
  parseXmlFields,
  processCustomerEvent,
  verifySignature
} = require('./core');

const TEXT_HEADERS = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'no-store'
};

function httpResponse(body, statusCode = 200) {
  return { statusCode, headers: TEXT_HEADERS, body: String(body) };
}

function normalizeMethod(event) {
  return String(event && (event.httpMethod || (event.requestContext && event.requestContext.httpMethod)) || 'POST').toUpperCase();
}

function getQuery(event) {
  const direct = event && event.queryStringParameters && typeof event.queryStringParameters === 'object'
    ? event.queryStringParameters
    : {};
  return Object.assign({}, direct, {
    msg_signature: direct.msg_signature || (event && event.msg_signature),
    timestamp: direct.timestamp || (event && event.timestamp),
    nonce: direct.nonce || (event && event.nonce),
    echostr: direct.echostr || (event && event.echostr)
  });
}

function getBody(event) {
  if (!event) return '';
  let body = event.body !== undefined ? event.body : event;
  if (event.isBase64Encoded && typeof body === 'string') {
    body = Buffer.from(body, 'base64').toString('utf8');
  }
  if (typeof body === 'string') return body;
  return body && body.xml ? String(body.xml) : String(body || '');
}

function getConfig() {
  const config = {
    enabled: String(process.env.WECOM_ROUTER_ENABLED || '').toLowerCase() === 'true',
    corpId: String(process.env.WECOM_CORP_ID || '').trim(),
    contactSecret: String(process.env.WECOM_CONTACT_SECRET || '').trim(),
    callbackToken: String(process.env.WECOM_CALLBACK_TOKEN || '').trim(),
    encodingAesKey: String(process.env.WECOM_ENCODING_AES_KEY || '').trim(),
    rules: parseRules(process.env.WECOM_CHANNEL_RULES_JSON || '[]'),
    identitySigningKey: String(process.env.WECOM_IDENTITY_SIGNING_KEY || ''),
    identitySelectorUrl: String(process.env.WECOM_IDENTITY_SELECTOR_URL || ''),
    identityTokenTtlSeconds: Number(process.env.WECOM_IDENTITY_TOKEN_TTL_SECONDS || 604800)
  };
  if (!config.corpId || !config.callbackToken || !config.encodingAesKey) {
    throw new Error('missing_wecom_callback_config');
  }
  return config;
}

function decryptIncoming(query, encrypted, config) {
  if (!verifySignature(
    config.callbackToken,
    query.timestamp,
    query.nonce,
    encrypted,
    query.msg_signature
  )) {
    throw new Error('invalid_wecom_signature');
  }
  return decryptWechatPayload(encrypted, config.encodingAesKey, config.corpId);
}

exports.main = async (event) => {
  try {
    const method = normalizeMethod(event);
    const query = getQuery(event);
    const config = getConfig();

    if (method === 'GET') {
      if (!query.echostr) return httpResponse('missing echostr', 400);
      const decrypted = decryptIncoming(query, query.echostr, config);
      return httpResponse(decrypted.message);
    }

    if (method !== 'POST') return httpResponse('method not allowed', 405);
    const envelope = parseXmlFields(getBody(event));
    if (!envelope.Encrypt) return httpResponse('missing Encrypt', 400);
    const decrypted = decryptIncoming(query, envelope.Encrypt, config);
    const eventData = parseXmlFields(decrypted.message);

    if (!config.enabled) {
      console.info('[sxWecomCustomerRouter] callback verified; router disabled');
      return httpResponse('success');
    }
    if (!config.contactSecret) throw new Error('missing_wecom_contact_secret');

    const result = await processCustomerEvent(eventData, config);
    console.info('[sxWecomCustomerRouter] processed', {
      handled: result.handled,
      reason: result.reason || '',
      state: result.state || '',
      tagged: !!result.tagged,
      welcomed: !!result.welcomed
    });
    return httpResponse('success');
  } catch (error) {
    console.error('[sxWecomCustomerRouter] failed', {
      code: error.message || 'unknown_error',
      errcode: error.errcode || 0
    });
    const clientError = /signature|receiver|echostr|Encrypt/.test(error.message || '');
    return httpResponse(clientError ? 'invalid request' : 'temporary failure', clientError ? 403 : 500);
  }
};
