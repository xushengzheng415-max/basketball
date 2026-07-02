const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function normalizeCode(value) {
  return String(value || '').trim().replace(/\s+/g, '').toUpperCase();
}

function toTime(value) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' || typeof value === 'number') return new Date(value).getTime();
  if (value.$date) return new Date(value.$date).getTime();
  return 0;
}

function buildEntitlement(code, wxContext, now) {
  const durationDays = Math.max(0, Number(code.durationDays || 31));
  const entitlement = {
    openid: wxContext.OPENID,
    unionid: wxContext.UNIONID || '',
    redeemCode: code.code,
    redeemCodeId: code._id,
    batchId: code.batchId || '',
    productId: code.productId || code.plan || 'pro_month',
    productName: code.productName || '赛小蜂 Pro 会员',
    features: Array.isArray(code.features) && code.features.length ? code.features : ['mc_system', 'stats_scorer_2'],
    status: 'active',
    source: 'redeem_code',
    startedAt: now,
    createdAt: now,
    updatedAt: now
  };

  if (durationDays > 0) {
    entitlement.scope = 'redeem_days';
    entitlement.expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
  } else {
    entitlement.scope = 'lifetime';
  }

  return entitlement;
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { ok: false, message: '请先登录后再兑换' };

  const codeText = normalizeCode(event && event.code);
  if (!codeText) return { ok: false, message: '请输入会员兑换码' };

  const codeRes = await db.collection('sx_redeem_codes').where({ code: codeText }).limit(1).get();
  const code = codeRes.data && codeRes.data[0];
  if (!code) return { ok: false, message: '兑换码不存在' };
  if (code.status === 'used') return { ok: false, message: '这个兑换码已经被使用' };
  if (code.status !== 'unused') return { ok: false, message: '这个兑换码不可用' };

  const codeExpiresAt = toTime(code.expiresAt);
  if (codeExpiresAt && codeExpiresAt <= Date.now()) {
    return { ok: false, message: '这个兑换码已过期' };
  }

  const now = db.serverDate();
  const updateRes = await db.collection('sx_redeem_codes').where({
    code: codeText,
    status: 'unused'
  }).update({
    data: {
      status: 'used',
      usedByOpenid: openid,
      usedByUnionid: wxContext.UNIONID || '',
      usedAt: now,
      updatedAt: now
    }
  });

  if (!updateRes.stats || !updateRes.stats.updated) {
    return { ok: false, message: '兑换码状态已变化，请刷新后重试' };
  }

  const entitlement = buildEntitlement(code, wxContext, now);
  const created = await db.collection('sx_entitlements').add({ data: entitlement });

  return {
    ok: true,
    message: '会员兑换成功',
    entitlement: Object.assign({ _id: created._id }, entitlement, {
      expiresAt: entitlement.expiresAt || null
    })
  };
};
