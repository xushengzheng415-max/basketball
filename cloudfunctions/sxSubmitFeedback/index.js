const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const content = String(event.content || '').trim();
  if (!content) return { ok: false, message: '反馈内容不能为空' };

  const item = {
    openid: wxContext.OPENID,
    unionid: wxContext.UNIONID || '',
    type: event.type || '功能建议',
    content,
    contact: String(event.contact || '').trim(),
    user: event.user || {},
    status: 'new',
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  };

  const res = await db.collection('sx_feedback').add({ data: item });
  return { ok: true, id: res._id };
};