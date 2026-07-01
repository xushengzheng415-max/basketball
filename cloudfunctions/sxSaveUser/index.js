const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const now = db.serverDate();
  const openid = wxContext.OPENID;
  const profile = event.profile || {};

  const data = {
    openid,
    unionid: wxContext.UNIONID || profile.wxUnionId || '',
    nickName: profile.nickName || '赛小蜂用户',
    avatarUrl: profile.avatarUrl || '',
    phoneNumber: profile.phoneNumber || '',
    mode: profile.mode || 'wechat',
    updatedAt: now
  };

  const existed = await db.collection('sx_users').where({ openid }).limit(1).get();
  if (existed.data.length) {
    await db.collection('sx_users').doc(existed.data[0]._id).update({ data });
    return { ok: true, userId: existed.data[0]._id, openid };
  }

  const created = await db.collection('sx_users').add({ data: Object.assign({}, data, { createdAt: now }) });
  return { ok: true, userId: created._id, openid };
};