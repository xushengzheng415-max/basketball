const cloud = require('wx-server-sdk');
const https = require('https');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 赛小蜂篮球小程序（前端签发手机号授权码的小程序）自己的 appid 与 AppSecret。
// 由于 sxLogin 部署在「共享自赛小蜂足球」的云环境里，直接调 cloud.openapi
// 会用足球 appid 兑换授权码，导致 40013 invalid appid。因此取手机号必须走
// 篮球小程序自己的 access_token + HTTPS 接口。
const BASKETBALL_APPID = process.env.SXF_BASKETBALL_APPID || 'wx06d735da15276acd';
const BASKETBALL_APPSECRET = process.env.SXF_BASKETBALL_APPSECRET || '';

function httpsPostJson(host, path, bodyObject) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(bodyObject);
    const req = https.request(
      {
        host,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch (parseError) {
            reject(new Error('解析微信响应失败: ' + raw));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// 稳定版 access_token（云函数实例级缓存，约 2 小时有效）
let cachedAccessToken = { token: '', expireAt: 0 };
async function getStableAccessToken() {
  const now = Date.now();
  if (cachedAccessToken.token && cachedAccessToken.expireAt > now + 300000) {
    return cachedAccessToken.token;
  }
  if (!BASKETBALL_APPSECRET) {
    throw new Error('未配置赛小蜂篮球 AppSecret（请在 sxLogin 云函数环境变量中设置 SXF_BASKETBALL_APPSECRET）');
  }
  const res = await httpsPostJson('api.weixin.qq.com', '/cgi-bin/stable_token', {
    grant_type: 'client_credential',
    appid: BASKETBALL_APPID,
    secret: BASKETBALL_APPSECRET
  });
  if (!res || !res.access_token) {
    throw new Error('获取 access_token 失败: ' + JSON.stringify(res));
  }
  cachedAccessToken = {
    token: res.access_token,
    expireAt: now + ((res.expires_in || 7200) - 300) * 1000
  };
  return res.access_token;
}

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
  if (!phoneCode) return { phoneNumber: '', failed: true, message: '未收到手机号授权码', code: '' };

  // 云函数所在环境「共享自赛小蜂足球」，cloud.openapi.getPhoneNumber 会用足球 appid
  // 兑换篮球签发的手机号授权码 → 40013 invalid appid。
  // 必须改用篮球小程序自己的 appid + AppSecret，走 HTTPS 接口换号。
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const accessToken = await getStableAccessToken();
      const res = await httpsPostJson(
        'api.weixin.qq.com',
        '/wxa/business/getuserphonenumber?access_token=' + encodeURIComponent(accessToken),
        { code: phoneCode }
      );
      const errCode = (res && (res.errcode || res.errCode)) || 0;
      if (errCode === 0 && res.phone_info) {
        const phoneNumber = res.phone_info.phoneNumber || res.phone_info.purePhoneNumber || '';
        if (phoneNumber) {
          return { phoneNumber, failed: false, message: '', code: '' };
        }
        lastError = new Error('手机号信息解析失败');
      } else {
        const errMsg = (res && (res.errmsg || res.errMsg)) || '';
        lastError = new Error('微信返回 errcode=' + errCode + ' ' + errMsg);
        // 40029/40163 表示授权码已使用/失效，重试无意义，直接退出
        if (String(errCode) === '40029' || String(errCode) === '40163') break;
      }
    } catch (error) {
      lastError = error;
    }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return {
    phoneNumber: '',
    failed: true,
    code: (lastError && (lastError.errCode || lastError.errcode || lastError.code)) || '',
    message: (lastError && (lastError.errMsg || lastError.message)) || '手机号授权失败'
  };
}

async function ensureCollection(name) {
  try { await db.collection(name).limit(1).get(); } catch (error) {
    try { await db.createCollection(name); } catch (ignored) {}
  }
}

async function ensurePlatformIdentity(openid, unionid, existingUser, profile) {
  await ensureCollection('sx_platform_users');
  await ensureCollection('sx_wechat_identities');
  const identityKey = 'mini_program:' + openid;
  const identityRes = await db.collection('sx_wechat_identities').where({ identityKey }).limit(1).get();
  if (identityRes.data && identityRes.data[0]) return identityRes.data[0].platformUserId;

  let platformUser = null;
  if (existingUser && existingUser.platformUserId) {
    const res = await db.collection('sx_platform_users').where({ platformUserId: existingUser.platformUserId }).limit(1).get();
    platformUser = res.data && res.data[0];
  }
  if (!platformUser && unionid) {
    const res = await db.collection('sx_platform_users').where({ unionid }).limit(1).get();
    platformUser = res.data && res.data[0];
  }
  if (!platformUser) {
    const platformUserId = 'pu_' + require('crypto').randomBytes(12).toString('hex');
    await db.collection('sx_platform_users').add({ data: {
      platformUserId,
      unionid,
      nickName: profile.nickName || (existingUser && existingUser.nickName) || '微信用户',
      avatarUrl: profile.avatarUrl || (existingUser && existingUser.avatarUrl) || '',
      phoneNumber: profile.phoneNumber || (existingUser && existingUser.phoneNumber) || '',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    } });
    platformUser = { platformUserId };
  }
  await db.collection('sx_wechat_identities').add({ data: {
    identityKey,
    platformUserId: platformUser.platformUserId,
    provider: 'wechat',
    surface: 'mini_program',
    openid,
    unionid,
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now()
  } });
  if (existingUser && !existingUser.platformUserId) {
    await db.collection('sx_users').doc(existingUser._id).update({ data: { platformUserId: platformUser.platformUserId, updatedAt: db.serverDate() } });
  }
  return platformUser.platformUserId;
}

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext();
  const now = db.serverDate();
  const openid = wxContext.FROM_OPENID || wxContext.OPENID;
  const unionid = wxContext.FROM_UNIONID || wxContext.UNIONID || '';
  const profile = event.profile || {};
  const mode = profile.mode || 'wechat';

  const hasProvidedPhone = !!(event.phoneNumber && String(event.phoneNumber).length >= 11);
  const phonePromise = hasProvidedPhone
    ? Promise.resolve({ phoneNumber: event.phoneNumber, failed: false, message: '', code: '' })
    : mode === 'wechat'
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
    const platformUserId = await ensurePlatformIdentity(openid, unionid, existingUser, profile);
    return {
      ok: true,
      openid,
      unionid,
      phoneNumber: '',
      phoneAuthFailed: true,
      phoneAuthMessage,
      phoneAuthCode,
      userId: existingUser ? existingUser._id : '',
      platformUserId
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
    const platformUserId = await ensurePlatformIdentity(openid, unionid, existingUser, Object.assign({}, profile, { phoneNumber: user.phoneNumber }));
    await Promise.all([
      db.collection('sx_users').doc(existed.data[0]._id).update({ data: Object.assign({}, user, { platformUserId }) }),
      ensureVoiceTrial(openid, unionid, now)
    ]);
    return { ok: true, openid, unionid, phoneNumber: user.phoneNumber, phoneAuthFailed: false, phoneAuthMessage, phoneAuthCode, userId: existed.data[0]._id, platformUserId };
  }

  const platformUserId = await ensurePlatformIdentity(openid, unionid, null, Object.assign({}, profile, { phoneNumber: user.phoneNumber }));
  const created = await db.collection('sx_users').add({ data: Object.assign({}, user, { platformUserId, createdAt: now }) });
  await ensureVoiceTrial(openid, unionid, now);
  return { ok: true, openid, unionid, phoneNumber: user.phoneNumber, phoneAuthFailed: false, phoneAuthMessage, phoneAuthCode, userId: created._id, platformUserId };
};
