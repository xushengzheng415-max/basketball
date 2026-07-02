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
  if (!phoneCode) return '';
  try {
    const result = await cloud.openapi.phonenumber.getPhoneNumber({ code: phoneCode });
    return (result && result.phoneInfo && result.phoneInfo.phoneNumber) || '';
  } catch (error) {
    console.warn('[sxLogin] get phone number failed', error);
    const wrapped = new Error('手机号授权失败，请重新登录');
    wrapped.code = 'phone_auth_failed';
    throw wrapped;
  }
}

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext();
  const now = db.serverDate();
  const openid = wxContext.OPENID;
  const unionid = wxContext.UNIONID || '';
  const profile = event.profile || {};
  if ((profile.mode || 'wechat') === 'wechat' && !event.phoneCode) {
    return { ok: false, code: 'phone_code_required', message: '请先授权手机号后登录' };
  }

  let phoneNumber = '';
  try {
    phoneNumber = await getPhoneNumber(event.phoneCode || '');
  } catch (error) {
    return { ok: false, code: error.code || 'phone_auth_failed', message: error.message || '手机号授权失败，请重新登录' };
  }

  const user = {
    openid,
    unionid,
    nickName: profile.nickName || '微信用户',
    avatarUrl: profile.avatarUrl || '',
    mode: profile.mode || 'wechat',
    phoneNumber: phoneNumber || profile.phoneNumber || '',
    lastLoginAt: now,
    updatedAt: now
  };

  const existed = await db.collection('sx_users').where({ openid }).limit(1).get();
  if (existed.data.length) {
    await db.collection('sx_users').doc(existed.data[0]._id).update({ data: user });
    await ensureVoiceTrial(openid, unionid, now);
    return { ok: true, openid, unionid, phoneNumber: user.phoneNumber, userId: existed.data[0]._id };
  }

  const created = await db.collection('sx_users').add({ data: Object.assign({}, user, { createdAt: now }) });
  await ensureVoiceTrial(openid, unionid, now);
  return { ok: true, openid, unionid, phoneNumber: user.phoneNumber, userId: created._id };
};
