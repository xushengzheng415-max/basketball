const cloud = require('wx-server-sdk');
const crypto = require('crypto');
const https = require('https');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const TTS_HOST = 'tts.tencentcloudapi.com';
const TTS_SERVICE = 'tts';
const TTS_VERSION = '2019-08-23';
const TTS_ACTION = 'TextToVoice';
const TTS_ALGORITHM = 'TC3-HMAC-SHA256';

function toTime(value) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' || typeof value === 'number') return new Date(value).getTime();
  if (value.$date) return new Date(value.$date).getTime();
  return 0;
}

function isFeatureEnabled(entitlement, feature) {
  const features = entitlement.features || [];
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

async function hasEntitlement(openid, feature) {
  const result = await db.collection('sx_entitlements')
    .where({ openid, status: 'active' })
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();

  return (result.data || []).some((item) => (
    isFeatureEnabled(item, feature) && isNotExpired(item) && isQuotaAvailable(item)
  ));
}

async function findVoiceCredit(openid) {
  const result = await db.collection('sx_entitlements')
    .where({ openid, status: 'active' })
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();

  return (result.data || []).find((item) => (
    isFeatureEnabled(item, 'score_voice')
    && isNotExpired(item)
    && Number(item.voiceCredits || 0) > 0
  ));
}

async function consumeVoiceCredit(entitlement) {
  if (!entitlement || !entitlement._id) return null;
  const field = 'voiceCredits';
  const current = Number(entitlement[field] || 0);
  if (current <= 0) return null;
  await db.collection('sx_entitlements').doc(entitlement._id).update({
    data: {
      [field]: _.inc(-1),
      updatedAt: db.serverDate()
    }
  });
  return {
    creditField: field,
    remaining: Math.max(0, current - 1)
  };
}

function buildVoiceConfig(style) {
  const styleMap = {
    standard: {
      voiceType: Number(process.env.TTS_VOICE_STANDARD || process.env.TTS_VOICE_TYPE || 101001),
      voiceName: 'Saixiaoyu',
      speed: 0,
      volume: 2
    },
    live: {
      voiceType: Number(process.env.TTS_VOICE_LIVE || 101054),
      voiceName: 'Saixiaozhi',
      speed: 0.8,
      volume: 4
    },
    kids: {
      voiceType: Number(process.env.TTS_VOICE_KIDS || 101015),
      voiceName: 'Saixiaomeng',
      speed: -0.4,
      volume: 2
    }
  };
  return styleMap[style] || styleMap.standard;
}

function sha256(message, encoding) {
  return crypto.createHash('sha256').update(message).digest(encoding);
}

function hmacSha256(key, message, encoding) {
  return crypto.createHmac('sha256', key).update(message).digest(encoding);
}

function getCredential() {
  const secretId = process.env.SXF_TTS_SECRET_ID;
  const secretKey = process.env.SXF_TTS_SECRET_KEY;
  if (!secretId || !secretKey) {
    const error = new Error('missing_tts_secret');
    error.code = 'missing_tts_secret';
    throw error;
  }
  return { secretId, secretKey };
}

function buildAuthorization({ secretId, secretKey, timestamp, payload }) {
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${TTS_HOST}\nx-tc-action:${TTS_ACTION.toLowerCase()}\n`;
  const signedHeaders = 'content-type;host;x-tc-action';
  const hashedRequestPayload = sha256(payload, 'hex');
  const canonicalRequest = ['POST', '/', '', canonicalHeaders, signedHeaders, hashedRequestPayload].join('\n');
  const credentialScope = `${date}/${TTS_SERVICE}/tc3_request`;
  const hashedCanonicalRequest = sha256(canonicalRequest, 'hex');
  const stringToSign = [TTS_ALGORITHM, timestamp, credentialScope, hashedCanonicalRequest].join('\n');
  const secretDate = hmacSha256(`TC3${secretKey}`, date);
  const secretService = hmacSha256(secretDate, TTS_SERVICE);
  const secretSigning = hmacSha256(secretService, 'tc3_request');
  const signature = hmacSha256(secretSigning, stringToSign, 'hex');

  return `${TTS_ALGORITHM} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

function postTencentTts(params) {
  const { secretId, secretKey } = getCredential();
  const region = process.env.TTS_REGION || 'ap-guangzhou';
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify(params);
  const authorization = buildAuthorization({ secretId, secretKey, timestamp, payload });

  const options = {
    method: 'POST',
    hostname: TTS_HOST,
    path: '/',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json; charset=utf-8',
      Host: TTS_HOST,
      'X-TC-Action': TTS_ACTION,
      'X-TC-Timestamp': String(timestamp),
      'X-TC-Version': TTS_VERSION,
      'X-TC-Region': region
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        let parsed;
        try {
          parsed = JSON.parse(body);
        } catch (error) {
          error.message = `TTS response parse failed: ${body.slice(0, 200)}`;
          reject(error);
          return;
        }
        if (parsed.Response && parsed.Response.Error) {
          const error = new Error(parsed.Response.Error.Message || 'Tencent TTS failed');
          error.code = parsed.Response.Error.Code;
          error.requestId = parsed.Response.RequestId;
          reject(error);
          return;
        }
        resolve(parsed.Response || parsed);
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function saveVoiceLog(data) {
  try {
    await db.collection('sx_voice_logs').add({ data });
  } catch (error) {
    console.warn('[sxCreateScoreVoice] save log skipped', error);
  }
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const text = String(event.text || '').trim();
  const style = event.style || 'standard';

  if (!text) return { ok: false, code: 'empty_text', message: '\u8bf7\u5148\u751f\u6210\u9700\u8981\u64ad\u62a5\u7684\u6587\u6848' };
  if (text.length > 500) return { ok: false, code: 'text_too_long', message: '\u64ad\u62a5\u6587\u6848\u8fc7\u957f\uff0c\u8bf7\u7f29\u77ed\u540e\u518d\u8bd5' };

  const voiceEntitlement = await findVoiceCredit(openid);
  if (!voiceEntitlement) {
    return { ok: false, code: 'no_voice_credit', message: '\u5f53\u524d\u6ca1\u6709\u53ef\u7528\u7684 AI \u64ad\u62a5\u6b21\u6570\u3002\u53ef\u8ba2\u8d2d 50/150/400 \u6b21\u64ad\u62a5\u5305\uff0c\u7528\u5b8c\u518d\u8865\u5145\u3002' };
  }

  const voice = buildVoiceConfig(style);
  const sessionId = `sxf-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const params = {
    Text: text,
    SessionId: sessionId,
    VoiceType: voice.voiceType,
    Codec: process.env.TTS_CODEC || 'mp3',
    SampleRate: Number(process.env.TTS_SAMPLE_RATE || 16000),
    Speed: voice.speed,
    Volume: voice.volume,
    PrimaryLanguage: 1
  };

  try {
    const response = await postTencentTts(params);
    const audioBase64 = response.Audio;
    if (!audioBase64) return { ok: false, code: 'empty_audio', message: '\u8bed\u97f3\u751f\u6210\u6210\u529f\u4f46\u672a\u8fd4\u56de\u97f3\u9891' };

    const cloudPath = `score-voice/${openid}/${sessionId}.mp3`;
    const upload = await cloud.uploadFile({
      cloudPath,
      fileContent: Buffer.from(audioBase64, 'base64')
    });

    const temp = await cloud.getTempFileURL({ fileList: [upload.fileID] });
    const tempFileURL = temp.fileList && temp.fileList[0] ? temp.fileList[0].tempFileURL : '';

    await saveVoiceLog({
      openid,
      unionid: wxContext.UNIONID || '',
      text,
      style,
      voiceType: voice.voiceType,
      voiceName: voice.voiceName,
      fileID: upload.fileID,
      tempFileURL,
      sessionId,
      requestId: response.RequestId || '',
      createdAt: db.serverDate()
    });
    const credit = await consumeVoiceCredit(voiceEntitlement);

    return {
      ok: true,
      fileID: upload.fileID,
      tempFileURL,
      text,
      style,
      voiceType: voice.voiceType,
      voiceName: voice.voiceName,
      credit,
      sessionId,
      requestId: response.RequestId || ''
    };
  } catch (error) {
    console.error('[sxCreateScoreVoice] tts failed', error);
    return { ok: false, code: error.code || 'tts_failed', message: error.message || '\u817e\u8baf\u4e91 TTS \u751f\u6210\u5931\u8d25' };
  }
};
