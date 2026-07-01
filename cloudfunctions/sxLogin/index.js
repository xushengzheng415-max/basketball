const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const now = db.serverDate();
  const openid = wxContext.OPENID;
  const unionid = wxContext.UNIONID || '';
  const profile = event.profile || {};

  const user = {
    openid,
    unionid,
    nickName: profile.nickName || '微信用户',
    avatarUrl: profile.avatarUrl || '',
    mode: profile.mode || 'wechat',
    phoneNumber: profile.phoneNumber || '',
    lastLoginAt: now,
    updatedAt: now
  };

  const existed = await db.collection('sx_users').where({ openid }).limit(1).get();
  if (existed.data.length) {
    await db.collection('sx_users').doc(existed.data[0]._id).update({ data: user });
    return { ok: true, openid, unionid, userId: existed.data[0]._id };
  }

  const created = await db.collection('sx_users').add({ data: Object.assign({}, user, { createdAt: now }) });
  return { ok: true, openid, unionid, userId: created._id };
};