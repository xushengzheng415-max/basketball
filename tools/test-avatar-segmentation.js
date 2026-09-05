'use strict';

const assert = require('assert');
const { resetTokenCache, segmentPortrait } = require('../cloudfunctions/sxUploadAvatar/portrait-segmentation');

async function main() {
  resetTokenCache();
  const calls = [];
  const requester = async (url, options) => {
    calls.push({ url, options });
    if (url.includes('/oauth/2.0/token')) return { access_token: 'test-token', expires_in: 3600 };
    assert.ok(url.includes('/rest/2.0/image-classify/v1/body_seg'));
    assert.ok(String(options.body).includes('type=foreground'));
    return { foreground: Buffer.from('transparent-png').toString('base64'), person_num: 1, log_id: 12345 };
  };
  const result = await segmentPortrait(Buffer.from('avatar-jpg'), {
    BAIDU_AIP_API_KEY: 'api-key',
    BAIDU_AIP_SECRET_KEY: 'secret-key'
  }, requester);
  assert.strictEqual(result.buffer.toString(), 'transparent-png');
  assert.strictEqual(result.personNum, 1);
  assert.strictEqual(calls.length, 2);

  resetTokenCache();
  await assert.rejects(
    () => segmentPortrait(Buffer.from('avatar-jpg'), {}, requester),
    (error) => error.code === 'MISSING_CONFIG'
  );
  console.log('avatar segmentation tests passed');
}

main().catch((error) => { console.error(error); process.exit(1); });
