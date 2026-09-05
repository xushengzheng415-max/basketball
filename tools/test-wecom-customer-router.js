const assert = require('assert');
const crypto = require('crypto');
const {
  createSignature,
  createIdentityToken,
  decryptWechatPayload,
  findRule,
  parseRules,
  parseXmlFields,
  processCustomerEvent,
  verifyIdentityToken,
  verifySignature
} = require('../cloudfunctions/sxWecomCustomerRouter/core');

function addWechatPadding(buffer) {
  const blockSize = 32;
  let amount = blockSize - (buffer.length % blockSize);
  if (!amount) amount = blockSize;
  return Buffer.concat([buffer, Buffer.alloc(amount, amount)]);
}

function encryptWechatPayload(message, encodingAesKey, receiverId) {
  const key = Buffer.from(`${encodingAesKey}=`, 'base64');
  const messageBuffer = Buffer.from(message, 'utf8');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(messageBuffer.length, 0);
  const plain = addWechatPadding(Buffer.concat([
    crypto.randomBytes(16),
    length,
    messageBuffer,
    Buffer.from(receiverId, 'utf8')
  ]));
  const cipher = crypto.createCipheriv('aes-256-cbc', key, key.subarray(0, 16));
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(plain), cipher.final()]).toString('base64');
}

async function run() {
  const corpId = 'ww1234567890abcdef';
  const encodingAesKey = crypto.randomBytes(32).toString('base64').replace(/=$/, '');
  const eventXml = [
    '<xml>',
    `<ToUserName><![CDATA[${corpId}]]></ToUserName>`,
    '<Event><![CDATA[change_external_contact]]></Event>',
    '<ChangeType><![CDATA[add_external_contact]]></ChangeType>',
    '<UserID><![CDATA[sx_operator]]></UserID>',
    '<ExternalUserID><![CDATA[wm_customer]]></ExternalUserID>',
    '<State><![CDATA[sxf_article_entry]]></State>',
    '<WelcomeCode><![CDATA[welcome_code_1]]></WelcomeCode>',
    '</xml>'
  ].join('');
  const encrypted = encryptWechatPayload(eventXml, encodingAesKey, corpId);
  const decrypted = decryptWechatPayload(encrypted, encodingAesKey, corpId);
  assert.strictEqual(decrypted.message, eventXml);
  assert.strictEqual(decrypted.receiverId, corpId);

  const signature = createSignature('token', '123', 'nonce', encrypted);
  assert.strictEqual(verifySignature('token', '123', 'nonce', encrypted, signature), true);
  assert.strictEqual(verifySignature('token', '123', 'nonce', encrypted, 'wrong'), false);

  const eventData = parseXmlFields(eventXml);
  assert.strictEqual(eventData.State, 'sxf_article_entry');
  const rules = parseRules(JSON.stringify([{
    state: 'sxf_article_entry',
    tagIds: ['et_channel'],
    welcome: {
      text: '欢迎联系赛小蜂篮球',
      attachments: [{ msgtype: 'image', image: { pic_url: 'https://example.com/group.png' } }]
    }
  }]));
  assert.strictEqual(findRule(eventData, rules).state, 'sxf_article_entry');
  assert.strictEqual(findRule(Object.assign({}, eventData, { State: '' }), rules), null);

  const calls = [];
  const result = await processCustomerEvent(eventData, {
    corpId,
    contactSecret: 'not-used-in-test',
    rules
  }, {
    getAccessToken: async () => 'token',
    addCustomerTags: async (token, event, tagIds) => calls.push(['tag', token, event.UserID, tagIds]),
    sendWelcome: async (token, code, welcome) => {
      calls.push(['welcome', token, code, welcome.text]);
      return {};
    }
  });
  assert.deepStrictEqual(result, {
    handled: true,
    state: 'sxf_article_entry',
    tagged: true,
    welcomed: true
  });
  assert.strictEqual(calls[0][0], 'tag');
  assert.strictEqual(calls[1][0], 'welcome');

  const signingKey = '0123456789abcdef0123456789abcdef';
  const identityToken = createIdentityToken({
    externalUserId: 'wm_customer',
    userId: 'sx_operator',
    exp: 2000000000
  }, signingKey);
  assert.deepStrictEqual(verifyIdentityToken(identityToken, signingKey, 1900000000), {
    externalUserId: 'wm_customer',
    userId: 'sx_operator',
    exp: 2000000000
  });
  assert.throws(() => verifyIdentityToken(`${identityToken}x`, signingKey, 1900000000), /invalid_identity_token/);

  const selectorRules = parseRules(JSON.stringify([{
    state: 'sxf_official_article_footer',
    tagIds: ['et_source'],
    identitySelector: true,
    welcome: { text: '请选择身份' }
  }]));
  const selectorCalls = [];
  await processCustomerEvent(Object.assign({}, eventData, { State: 'sxf_official_article_footer' }), {
    corpId,
    contactSecret: 'not-used-in-test',
    rules: selectorRules,
    identitySigningKey: signingKey,
    identitySelectorUrl: 'https://api.example.com/wecom/identity'
  }, {
    getAccessToken: async () => 'token',
    addCustomerTags: async () => {},
    sendWelcome: async (tokenValue, code, welcome) => {
      selectorCalls.push(welcome);
      return {};
    }
  });
  assert.strictEqual(selectorCalls[0].attachments.length, 1);
  assert.strictEqual(selectorCalls[0].attachments[0].msgtype, 'link');
  assert.ok(selectorCalls[0].attachments[0].link.url.startsWith('https://api.example.com/wecom/identity?token='));

  const proactiveResult = await processCustomerEvent(
    Object.assign({}, eventData, { State: '', WelcomeCode: '' }),
    { corpId, contactSecret: 'not-used-in-test', rules },
    { getAccessToken: async () => { throw new Error('must_not_call_api'); } }
  );
  assert.deepStrictEqual(proactiveResult, { handled: false, reason: 'channel_not_matched' });

  console.log('sxWecomCustomerRouter tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
