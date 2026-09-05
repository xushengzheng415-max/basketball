'use strict';

const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const GATES = 'sx_service_follow_gates';
const BINDINGS = 'sx_service_account_bindings';
const EDUCATION_INVITES = 'sx_edu_invites';
const PLATFORM_USERS = 'sx_platform_users';
const WECHAT_IDENTITIES = 'sx_wechat_identities';
const TEMPLATE_GRANTS = {
  'Tk3n4bd-ErmHd4SXP8llZClWRSsjB_uem_CAvfQSe5U': 'registration',
  '99MNTTBVx9S4UQt6XZkQ4-O4hMG926S1eBJLxAfXZ0w': 'review',
  'bi50KZvRjUSTpAhyf9Hc_B-vlnX8_dXdf0zd2C2XRvA': 'announcement'
};

function clean(value, length = 300) { return String(value || '').trim().slice(0, length); }
function xmlValue(xml, name) {
  const match = String(xml || '').match(new RegExp(`<${name}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${name}>|<${name}>([\\s\\S]*?)<\\/${name}>`));
  return clean(match ? (match[1] || match[2] || '') : '');
}
function signatureValid(query) {
  const token = clean(process.env.SXF_SERVICE_CALLBACK_TOKEN, 200);
  if (!token) return false;
  const expected = crypto.createHash('sha1').update([token, clean(query.timestamp), clean(query.nonce)].sort().join('')).digest('hex');
  return expected === clean(query.signature, 100);
}
function response(body) {
  const content = String(body || 'success');
  return { statusCode: 200, headers: { 'Content-Type': content.startsWith('<xml>') ? 'application/xml; charset=utf-8' : 'text/plain; charset=utf-8' }, body: content };
}
function queryOf(event) { return event.queryStringParameters || event.query || event.params || {}; }
function bodyOf(event) { const body = event.body || event.rawBody || ''; return event.isBase64Encoded ? Buffer.from(body, 'base64').toString('utf8') : String(body || ''); }
function cdata(value) { return String(value || '').replace(/\]\]>/g, '] ]>'); }
function textReply(toUser, fromUser, content) {
  return `<xml><ToUserName><![CDATA[${cdata(toUser)}]]></ToUserName><FromUserName><![CDATA[${cdata(fromUser)}]]></FromUserName><CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime><MsgType><![CDATA[text]]></MsgType><Content><![CDATA[${cdata(content)}]]></Content></xml>`;
}
function authorizationReply(toUser, fromUser, bound) {
  const title = bound ? '账号已绑定，点击完成赛事通知授权' : '请先回小程序绑定服务号账号';
  const description = bound ? '依次允许球队报名、审核结果和赛事公告提醒。' : '绑定成功后，在服务号发送“授权”即可继续。';
  const url = bound ? 'https://www.sxfbasketball.cn/service-subscribe.html?v=202608221915&role=all' : 'https://www.sxfbasketball.cn/';
  return `<xml><ToUserName><![CDATA[${cdata(toUser)}]]></ToUserName><FromUserName><![CDATA[${cdata(fromUser)}]]></FromUserName><CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime><MsgType><![CDATA[news]]></MsgType><ArticleCount>1</ArticleCount><Articles><item><Title><![CDATA[${cdata(title)}]]></Title><Description><![CDATA[${cdata(description)}]]></Description><PicUrl><![CDATA[]]></PicUrl><Url><![CDATA[${cdata(url)}]]></Url></item></Articles></xml>`;
}
function educationStudentReply(toUser, fromUser, gateKey, sessionToken, alreadyFollowed) {
  const url = `https://www.sxfbasketball.cn/education-student-onboarding.html?gate=${encodeURIComponent(gateKey)}#session=${encodeURIComponent(sessionToken)}`;
  const title = alreadyFollowed ? '已关注，继续为孩子建立训练档案' : '关注成功，为孩子建立训练档案';
  return `<xml><ToUserName><![CDATA[${cdata(toUser)}]]></ToUserName><FromUserName><![CDATA[${cdata(fromUser)}]]></FromUserName><CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime><MsgType><![CDATA[news]]></MsgType><ArticleCount>1</ArticleCount><Articles><item><Title><![CDATA[${cdata(title)}]]></Title><Description><![CDATA[填写孩子基础资料，提交后由校区确认课程、课包和班级。]]></Description><PicUrl><![CDATA[]]></PicUrl><Url><![CDATA[${cdata(url)}]]></Url></item></Articles></xml>`;
}
async function educationGuardianSession(gate, officialOpenid) {
  const identityKey = `official_account:${officialOpenid}`;
  let identityResult = await db.collection(WECHAT_IDENTITIES).where({ identityKey, status: 'active' }).limit(1).get();
  let identity = identityResult.data && identityResult.data[0], platformUserId = identity && identity.platformUserId;
  if (!platformUserId) {
    platformUserId = `platform_user_${crypto.randomBytes(12).toString('hex')}`;
    await db.collection(PLATFORM_USERS).add({ data: { platformUserId, nickName: '微信家长', avatarUrl: '', status: 'active', createdAt: Date.now(), updatedAt: Date.now() } });
    await db.collection(WECHAT_IDENTITIES).add({ data: { identityId: `wx_identity_${crypto.randomBytes(12).toString('hex')}`, identityKey, surface: 'official_account', openid: officialOpenid, unionid: '', platformUserId, status: 'active', createdAt: Date.now(), updatedAt: Date.now() } });
  }
  const sessionToken = crypto.randomBytes(28).toString('base64url');
  await db.collection(EDUCATION_INVITES).add({ data: { inviteId: `edu_guardian_session_${crypto.randomBytes(12).toString('hex')}`, type: 'guardian_session', organizationId: gate.organizationId, campusId: gate.campusId || '', gateKey: gate.educationGateKey, platformUserId, officialOpenid, tokenHash: crypto.createHash('sha256').update(sessionToken).digest('hex'), status: 'active', expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, createdAt: Date.now(), updatedAt: Date.now() } });
  return sessionToken;
}
async function updateBinding(miniOpenid, officialOpenid, subscribed) {
  const result = await db.collection(BINDINGS).where({ miniOpenid }).limit(1).get();
  const data = { miniOpenid, officialOpenid, subscribed, updatedAt: Date.now(), followedAt: subscribed ? Date.now() : 0 };
  if (result.data && result.data[0]) return db.collection(BINDINGS).doc(result.data[0]._id).update({ data });
  return db.collection(BINDINGS).add({ data: Object.assign({}, data, { createdAt: Date.now() }) });
}
async function updateNotificationGrants(officialOpenid, xml) {
  const result = await db.collection(BINDINGS).where({ officialOpenid }).limit(20).get();
  if (!result.data || !result.data.length) return;
  const grants = {};
  const blocks = String(xml || '').match(/<List>[\s\S]*?<\/List>/g) || [];
  blocks.forEach((block) => {
    const key = TEMPLATE_GRANTS[xmlValue(block, 'TemplateId')];
    const status = xmlValue(block, 'SubscribeStatusString').toLowerCase();
    if (key) grants[key] = status === 'accept';
  });
  if (!Object.keys(grants).length) return;
  for (const binding of result.data) {
    await db.collection(BINDINGS).doc(binding._id).update({ data: {
      notificationGrants: Object.assign({}, binding.notificationGrants || {}, grants),
      notificationGrantUpdatedAt: Date.now(), updatedAt: Date.now()
    } });
  }
}
async function handleEvent(xml) {
  const eventName = xmlValue(xml, 'Event'); const officialOpenid = xmlValue(xml, 'FromUserName'); const serviceOpenid = xmlValue(xml, 'ToUserName'); const eventKey = xmlValue(xml, 'EventKey');
  if (!officialOpenid) return;
  if (xmlValue(xml, 'MsgType') === 'text') {
    const content = xmlValue(xml, 'Content');
    if (!/绑定|授权|通知|赛事/.test(content)) return;
    const result = await db.collection(BINDINGS).where({ officialOpenid, subscribed: true }).limit(1).get();
    const binding = result.data && result.data[0];
    if (/授权/.test(content)) return authorizationReply(officialOpenid, serviceOpenid, !!binding);
    return textReply(officialOpenid, serviceOpenid, binding
      ? '您的赛小蜂篮球服务号账号已与小程序绑定成功。\n\n球队报名、审核结果和赛事公告将优先通过服务号提醒；通知授权可在小程序赛事页面中管理。'
      : '当前服务号账号尚未与赛小蜂篮球小程序绑定。请回到小程序赛事邀请页面，点击“绑定服务号账号”并扫码完成绑定。');
  }
  if (String(eventName || '').toLowerCase() === 'subscribe_msg_popup_event') {
    await updateNotificationGrants(officialOpenid, xml);
    return '';
  }
  if (eventName === 'unsubscribe') {
    const result = await db.collection(BINDINGS).where({ officialOpenid }).limit(20).get();
    for (const item of result.data || []) await db.collection(BINDINGS).doc(item._id).update({ data: { subscribed: false, updatedAt: Date.now() } });
    return '';
  }
  if (!['subscribe', 'SCAN'].includes(eventName)) return;
  const scene = eventKey.replace(/^qrscene_/, ''); if (!scene) return;
  const result = await db.collection(GATES).where({ scene, status: 'waiting' }).limit(1).get(); const gate = result.data && result.data[0];
  if (!gate || Number(gate.expiresAt || 0) < Date.now()) return;
  if (gate.kind === 'education_student' && gate.educationGateKey) {
    if (gate.lastOfficialOpenid === officialOpenid && Date.now() - Number(gate.lastScannedAt || 0) < 30000) return '';
    await db.collection(GATES).doc(gate._id).update({ data: { lastOfficialOpenid: officialOpenid, lastScannedAt: Date.now(), scanCount: Number(gate.scanCount || 0) + 1, updatedAt: Date.now() } });
    const sessionToken = await educationGuardianSession(gate, officialOpenid);
    return educationStudentReply(officialOpenid, serviceOpenid, gate.educationGateKey, sessionToken, eventName === 'SCAN');
  }
  await db.collection(GATES).doc(gate._id).update({ data: { status: 'followed', officialOpenid, followedAt: Date.now(), updatedAt: Date.now() } });
  await updateBinding(gate.miniOpenid, officialOpenid, true);
  return authorizationReply(officialOpenid, serviceOpenid, true);
}
exports.main = async (event = {}) => {
  const query = queryOf(event);
  if (!signatureValid(query)) return { statusCode: 401, body: 'invalid signature' };
  const method = String(event.httpMethod || (event.requestContext && event.requestContext.http && event.requestContext.http.method) || 'GET').toUpperCase();
  if (method === 'GET') return response(query.echostr || 'success');
  try { return response(await handleEvent(bodyOf(event)) || 'success'); }
  catch (error) { console.error('[sxServiceAccountCallback]', error); return response('success'); }
};
