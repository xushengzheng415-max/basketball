const crypto = require('crypto');
const fs = require('fs');

function parseEnv(file) {
  const values = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) values[match[1]] = match[2].trim();
  }
  return values;
}

function pad32(buffer) {
  const count = 32 - (buffer.length % 32 || 32) || 32;
  return Buffer.concat([buffer, Buffer.alloc(count, count)]);
}

function encryptEcho(message, corpId, encodingAesKey) {
  const key = Buffer.from(`${encodingAesKey}=`, 'base64');
  const body = Buffer.from(message, 'utf8');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(body.length);
  const plain = pad32(Buffer.concat([
    crypto.randomBytes(16),
    length,
    body,
    Buffer.from(corpId, 'utf8')
  ]));
  const cipher = crypto.createCipheriv('aes-256-cbc', key, key.subarray(0, 16));
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(plain), cipher.final()]).toString('base64');
}

async function main() {
  const envPath = process.argv[2];
  if (!envPath) throw new Error('missing env path');
  const env = parseEnv(envPath);
  const message = `callback-verification-${crypto.randomBytes(8).toString('hex')}`;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomBytes(8).toString('hex');
  const encrypted = encryptEcho(message, env.WECOM_CORP_ID, env.WECOM_ENCODING_AES_KEY);
  const signature = crypto
    .createHash('sha1')
    .update([env.WECOM_CALLBACK_TOKEN, timestamp, nonce, encrypted].sort().join(''))
    .digest('hex');
  const url = new URL('https://api.saixiaofeng.com/wecom/doc-assistant');
  url.searchParams.set('msg_signature', signature);
  url.searchParams.set('timestamp', timestamp);
  url.searchParams.set('nonce', nonce);
  url.searchParams.set('echostr', encrypted);
  const response = await fetch(url);
  const body = await response.text();
  if (!response.ok || body !== message) throw new Error(`callback verification failed: ${response.status}`);
  console.log(JSON.stringify({ http_status: response.status, decrypted_echo_matches: true }));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
