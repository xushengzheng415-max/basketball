const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function ensureVoiceTrial(openid, unionid, now) {
  const existed = await db.collection('sx_entitlements')
    .where({ openid, productId: 'voice_trial_10' })
    .limit(1)
    .get();
  if (existed.data && existed.data.length) return;

  await db.collection('sx_entitlements').add({
    data: {
      openid,
      unionid,
      productId: 'voice_trial_10',
      productName: 'AI 比分播报体验额度',
      features: ['score_voice'],
      voiceCredits: 10,
      shareCredits: 0,
      status: 'active',
      source: 'new_user_trial',
      scope: 'quota',
      startedAt: now,
      createdAt: now,
      updatedAt: now
    }
  });
}

async function getPhoneNumber(phoneCode) {
  if (!phoneCode) return { phoneNumber: '', failed: true, message: '未收到手机号授权码' };

  try {
    const result = await cloud.openapi.phonenumber.getPhoneNumber({ code: phoneCode });
    return {
      phoneNumber: (result && result.phoneInfo && result.phoneInfo.phoneNumber) || '',
      failed: false,
      message: ''
    };
  } catch (error) {
    console.warn('[sxLogin] get phone number failed', error);
    const errorCode = error && (error.errCode || error.errcode || error.code) || '';
    const errorMessage = error && (error.errMsg || error.message) || '';
    return {
      phoneNumber: '',
      failed: true,
      code: errorCode,
      message: errorMessage || (errorCode ? '手机号授权失败：' + errorCode : '手机号授权失败')
    };
  }
}

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext();
  const now = db.serverDate();
  const openid = wxContext.OPENID;
  const unionid = wxContext.UNIONID || '';
  const profile = event.profile || {};
  const mode = profile.mode || 'wechat';

  const phonePromise = mode === 'wechat'
    ? getPhoneNumber(event.phoneCode || '')
    : Promise.resolve({ phoneNumber: '', failed: false, message: '', code: '' });
  const userPromise = db.collection('sx_users').where({ openid }).limit(1).get();
  const [phoneResult, existed] = await Promise.all([phonePromise, userPromise]);
  const phoneNumber = phoneResult.phoneNumber || '';
  const phoneAuthMessage = phoneResult.message || '';
  const phoneAuthCode = phoneResult.code || '';
  const existingUser = existed.data && existed.data[0] ? existed.data[0] : null;
  const resolvedPhoneNumber = phoneNumber || (existingUser && existingUser.phoneNumber) || profile.phoneNumber || '';
  const effectivePhoneAuthFailed = mode === 'wechat' && !resolvedPhoneNumber;

  if (effectivePhoneAuthFailed) {
    return {
      ok: true,
      openid,
      unionid,
      phoneNumber: '',
      phoneAuthFailed: true,
      phoneAuthMessage,
      phoneAuthCode,
      userId: existingUser ? existingUser._id : ''
    };
  }

  const user = {
    openid,
    unionid,
    nickName: profile.nickName || '微信用户',
    avatarUrl: profile.avatarUrl || '',
    mode,
    phoneNumber: resolvedPhoneNumber,
    phoneAuthFailed: false,
    phoneAuthMessage,
    lastLoginAt: now,
    updatedAt: now
  };

  if (existed.data.length) {
    await Promise.all([
      db.collection('sx_users').doc(existed.data[0]._id).update({ data: user }),
      ensureVoiceTrial(openid, unionid, now)
    ]);
    return { ok: true, openid, unionid, phoneNumber: user.phoneNumber, phoneAuthFailed: false, phoneAuthMessage, phoneAuthCode, userId: existed.data[0]._id };
  }

  const created = await db.collection('sx_users').add({ data: Object.assign({}, user, { createdAt: now }) });
  await ensureVoiceTrial(openid, unionid, now);
  return { ok: true, openid, unionid, phoneNumber: user.phoneNumber, phoneAuthFailed: false, phoneAuthMessage, phoneAuthCode, userId: created._id };
};
