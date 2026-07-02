const cloud = require('wx-server-sdk');
const tencentcloud = require('tencentcloud-sdk-nodejs-tts');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const TtsClient = tencentcloud.tts.v20190823.Client;

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

function buildVoiceConfig(style) {
  const baseVoiceType = Number(process.env.TTS_VOICE_TYPE || 101001);
  const styleMap = {
    standard: { voiceType: Number(process.env.TTS_VOICE_STANDARD || baseVoiceType), speed: 0, volume: 2 },
    live: { voiceType: Number(process.env.TTS_VOICE_LIVE || baseVoiceType), speed: 0.8, volume: 4 },
    kids: { voiceType: Number(process.env.TTS_VOICE_KIDS || baseVoiceType), speed: -0.4, volume: 2 }
  };
  return styleMap[style] || styleMap.standard;
}

function getTtsClient() {
  const secretId = process.env.TENCENTCLOUD_SECRET_ID;
  const secretKey = process.env.TENCENTCLOUD_SECRET_KEY;
  if (!secretId || !secretKey) {
    const error = new Error('missing_tencentcloud_secret');
    error.code = 'missing_tencentcloud_secret';
    throw error;
  }

  return new TtsClient({
    credential: { secretId, secretKey },
    region: process.env.TTS_REGION || 'ap-guangzhou',
    profile: {
      httpProfile: { endpoint: 'tts.tencentcloudapi.com' }
    }
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

  if (!text) return { ok: false, code: 'empty_text', message: '播报文案不能为空' };
  if (text.length > 500) return { ok: false, code: 'text_too_long', message: '播报文案过长' };

  const entitled = await hasEntitlement(openid, 'mc_system');
  if (!entitled) return { ok: false, code: 'no_entitlement', message: '购买 Pro 后解锁 AI 播报' };

  let client;
  try {
    client = getTtsClient();
  } catch (error) {
    return { ok: false, code: error.code || 'config_error', message: '请先配置腾讯云 TTS 密钥环境变量' };
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
    const response = await client.TextToVoice(params);
    const audioBase64 = response.Audio;
    if (!audioBase64) return { ok: false, code: 'empty_audio', message: '腾讯云未返回音频' };

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
      fileID: upload.fileID,
      sessionId,
      requestId: response.RequestId || '',
      createdAt: db.serverDate()
    });

    return {
      ok: true,
      fileID: upload.fileID,
      text,
      style,
      voiceType: voice.voiceType,
      sessionId,
      requestId: response.RequestId || ''
    };
  } catch (error) {
    console.error('[sxCreateScoreVoice] tts failed', error);
    return { ok: false, code: error.code || 'tts_failed', message: error.message || '语音合成失败' };
  }
};