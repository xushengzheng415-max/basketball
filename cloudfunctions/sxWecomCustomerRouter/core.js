const crypto = require('crypto');
const https = require('https');

const TOKEN_SAFETY_WINDOW_MS = 5 * 60 * 1000;
let tokenCache = { value: '', expiresAt: 0 };

function decodeXml(value) {
  return String(value || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function parseXmlFields(xml) {
  const result = {};
  const pattern = /<([A-Za-z][A-Za-z0-9_]*)>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))<\/\1>/g;
  let match;
  while ((match = pattern.exec(String(xml || '')))) {
    result[match[1]] = decodeXml(match[2] !== undefined ? match[2] : match[3]);
  }
  return result;
}

function createSignature(token, timestamp, nonce, encrypted) {
  return crypto
    .createHash('sha1')
    .update([token, timestamp, nonce, encrypted].map((item) => String(item || '')).sort().join(''))
    .digest('hex');
}

function timingSafeEqualText(left, right) {
  const a = Buffer.from(String(left || ''), 'utf8');
  const b = Buffer.from(String(right || ''), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function verifySignature(token, timestamp, nonce, encrypted, signature) {
  return timingSafeEqualText(createSignature(token, timestamp, nonce, encrypted), signature);
}

function decodeEncodingAesKey(encodingAesKey) {
  const normalized = String(encodingAesKey || '').trim();
  if (!/^[A-Za-z0-9+/]{43}$/.test(normalized)) {
    throw new Error('invalid_wecom_encoding_aes_key');
  }
  const key = Buffer.from(`${normalized}=`, 'base64');
  if (key.length !== 32) throw new Error('invalid_wecom_encoding_aes_key_length');
  return key;
}

function removeWechatPadding(buffer) {
  if (!buffer.length) throw new Error('empty_wecom_plaintext');
  const pad = buffer[buffer.length - 1];
  if (pad < 1 || pad > 32 || pad > buffer.length) throw new Error('invalid_wecom_padding');
  for (let index = buffer.length - pad; index < buffer.length; index += 1) {
    if (buffer[index] !== pad) throw new Error('invalid_wecom_padding');
  }
  return buffer.subarray(0, buffer.length - pad);
}

function decryptWechatPayload(encrypted, encodingAesKey, expectedReceiverId) {
  const key = decodeEncodingAesKey(encodingAesKey);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, key.subarray(0, 16));
  decipher.setAutoPadding(false);
  const padded = Buffer.concat([
    decipher.update(Buffer.from(String(encrypted || ''), 'base64')),
    decipher.final()
  ]);
  const plain = removeWechatPadding(padded);
  if (plain.length < 20) throw new Error('invalid_wecom_plaintext');
  const messageLength = plain.readUInt32BE(16);
  const messageStart = 20;
  const messageEnd = messageStart + messageLength;
  if (messageEnd > plain.length) throw new Error('invalid_wecom_message_length');
  const message = plain.subarray(messageStart, messageEnd).toString('utf8');
  const receiverId = plain.subarray(messageEnd).toString('utf8');
  if (expectedReceiverId && receiverId !== expectedReceiverId) {
    throw new Error('wecom_receiver_id_mismatch');
  }
  return { message, receiverId };
}

function parseRules(raw) {
  if (!raw) return [];
  let rules;
  try {
    rules = JSON.parse(raw);
  } catch (error) {
    throw new Error('invalid_wecom_channel_rules_json');
  }
  if (!Array.isArray(rules)) throw new Error('invalid_wecom_channel_rules_json');
  return rules.map((rule) => {
    if (!rule || typeof rule !== 'object' || !String(rule.state || '').trim()) {
      throw new Error('invalid_wecom_channel_rule');
    }
    const welcome = rule.welcome && typeof rule.welcome === 'object' ? rule.welcome : {};
    const attachments = Array.isArray(welcome.attachments) ? welcome.attachments.slice(0, 9) : [];
    return {
      state: String(rule.state).trim(),
      tagIds: Array.isArray(rule.tagIds) ? rule.tagIds.map(String).filter(Boolean) : [],
      identitySelector: !!rule.identitySelector,
      welcome: {
        text: String(welcome.text || ''),
        attachments
      }
    };
  });
}

function parseIdentityConfig(raw) {
  if (!raw) return {};
  let config;
  try {
    config = JSON.parse(raw);
  } catch (error) {
    throw new Error('invalid_wecom_identity_config_json');
  }
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('invalid_wecom_identity_config_json');
  }
  const result = {};
  for (const [role, value] of Object.entries(config)) {
    if (!/^[a-z][a-z0-9_-]{1,31}$/.test(role) || !value || typeof value !== 'object') {
      throw new Error('invalid_wecom_identity_role');
    }
    if (!value.tagId || !value.imageUrl || !value.label) throw new Error('invalid_wecom_identity_role');
    result[role] = {
      label: String(value.label),
      description: String(value.description || ''),
      tagId: String(value.tagId),
      removeTagIds: Array.isArray(value.removeTagIds) ? value.removeTagIds.map(String).filter(Boolean) : [],
      imageUrl: String(value.imageUrl)
    };
  }
  return result;
}

function identityKey(secret) {
  const value = String(secret || '');
  if (value.length < 32) throw new Error('invalid_wecom_identity_signing_key');
  return crypto.createHash('sha256').update(value, 'utf8').digest();
}

function createIdentityToken(payload, secret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', identityKey(secret), iv);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

function verifyIdentityToken(token, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  let input;
  try {
    input = Buffer.from(String(token || ''), 'base64url');
  } catch (error) {
    throw new Error('invalid_identity_token');
  }
  if (input.length < 29) throw new Error('invalid_identity_token');
  const iv = input.subarray(0, 12);
  const tag = input.subarray(12, 28);
  const encrypted = input.subarray(28);
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', identityKey(secret), iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    const payload = JSON.parse(plaintext);
    if (!payload || !payload.externalUserId || !payload.userId || !payload.exp) throw new Error('invalid');
    if (Number(payload.exp) < nowSeconds) throw new Error('expired_identity_token');
    return payload;
  } catch (error) {
    if (error.message === 'expired_identity_token') throw error;
    throw new Error('invalid_identity_token');
  }
}

function findRule(eventData, rules) {
  if (!eventData || eventData.Event !== 'change_external_contact') return null;
  if (eventData.ChangeType !== 'add_external_contact') return null;
  const state = String(eventData.State || '').trim();
  if (!state) return null;
  return rules.find((rule) => rule.state === state) || null;
}

function requestJson(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : Buffer.from(JSON.stringify(body), 'utf8');
    const request = https.request({
      hostname: 'qyapi.weixin.qq.com',
      port: 443,
      path,
      method,
      headers: payload ? {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': payload.length
      } : undefined,
      timeout: 8000
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let data;
        try {
          data = JSON.parse(text);
        } catch (error) {
          reject(new Error(`invalid_wecom_api_response_${response.statusCode || 0}`));
          return;
        }
        if ((response.statusCode || 500) >= 400 || data.errcode) {
          const apiError = new Error(`wecom_api_error_${data.errcode || response.statusCode || 500}`);
          apiError.errcode = data.errcode;
          apiError.errmsg = data.errmsg;
          reject(apiError);
          return;
        }
        resolve(data);
      });
    });
    request.on('timeout', () => request.destroy(new Error('wecom_api_timeout')));
    request.on('error', reject);
    if (payload) request.write(payload);
    request.end();
  });
}

async function getAccessToken(corpId, secret) {
  const now = Date.now();
  if (tokenCache.value && tokenCache.expiresAt - TOKEN_SAFETY_WINDOW_MS > now) return tokenCache.value;
  const path = `/cgi-bin/gettoken?corpid=${encodeURIComponent(corpId)}&corpsecret=${encodeURIComponent(secret)}`;
  const data = await requestJson('GET', path);
  tokenCache = {
    value: data.access_token,
    expiresAt: now + Number(data.expires_in || 7200) * 1000
  };
  return tokenCache.value;
}

async function addCustomerTags(accessToken, eventData, tagIds, removeTagIds = []) {
  if (!tagIds.length && !removeTagIds.length) return { skipped: true };
  return requestJson(
    'POST',
    `/cgi-bin/externalcontact/mark_tag?access_token=${encodeURIComponent(accessToken)}`,
    {
      userid: eventData.UserID,
      external_userid: eventData.ExternalUserID,
      add_tag: tagIds,
      remove_tag: removeTagIds
    }
  );
}

async function sendWelcome(accessToken, welcomeCode, welcome) {
  if (!welcomeCode) return { skipped: true, reason: 'missing_welcome_code' };
  const payload = { welcome_code: welcomeCode };
  if (welcome.text) payload.text = { content: welcome.text };
  if (welcome.attachments.length) payload.attachments = welcome.attachments;
  if (!payload.text && !payload.attachments) return { skipped: true, reason: 'empty_welcome' };
  return requestJson(
    'POST',
    `/cgi-bin/externalcontact/send_welcome_msg?access_token=${encodeURIComponent(accessToken)}`,
    payload
  );
}

async function processCustomerEvent(eventData, config, dependencies = {}) {
  const rules = config.rules || [];
  const rule = findRule(eventData, rules);
  if (!rule) return { handled: false, reason: 'channel_not_matched' };
  if (!eventData.UserID || !eventData.ExternalUserID) {
    throw new Error('invalid_add_external_contact_event');
  }

  const getToken = dependencies.getAccessToken || getAccessToken;
  const markTags = dependencies.addCustomerTags || addCustomerTags;
  const welcomeSender = dependencies.sendWelcome || sendWelcome;
  const accessToken = await getToken(config.corpId, config.contactSecret);
  await markTags(accessToken, eventData, rule.tagIds);
  let welcome = rule.welcome;
  if (rule.identitySelector) {
    if (!config.identitySigningKey || !config.identitySelectorUrl) throw new Error('missing_wecom_identity_selector_config');
    const now = Math.floor(Date.now() / 1000);
    const token = createIdentityToken({
      externalUserId: eventData.ExternalUserID,
      userId: eventData.UserID,
      state: rule.state,
      exp: now + Number(config.identityTokenTtlSeconds || 7 * 24 * 60 * 60)
    }, config.identitySigningKey);
    const separator = config.identitySelectorUrl.includes('?') ? '&' : '?';
    welcome = {
      text: rule.welcome.text || '您好，欢迎联系赛小蜂篮球！请先选择您的身份。',
      attachments: [{
        msgtype: 'link',
        link: {
          title: '请选择您的身份',
          desc: '机构人员或赛事主理人，一键进入对应交流群',
          url: `${config.identitySelectorUrl}${separator}token=${encodeURIComponent(token)}`
        }
      }]
    };
  }
  const welcomeResult = await welcomeSender(accessToken, eventData.WelcomeCode, welcome);
  return {
    handled: true,
    state: rule.state,
    tagged: rule.tagIds.length > 0,
    welcomed: !welcomeResult.skipped
  };
}

function resetTokenCache() {
  tokenCache = { value: '', expiresAt: 0 };
}

module.exports = {
  addCustomerTags,
  createSignature,
  createIdentityToken,
  decodeEncodingAesKey,
  decryptWechatPayload,
  findRule,
  getAccessToken,
  parseRules,
  parseIdentityConfig,
  parseXmlFields,
  processCustomerEvent,
  removeWechatPadding,
  requestJson,
  resetTokenCache,
  sendWelcome,
  verifyIdentityToken,
  verifySignature
};
