'use strict';

const cloud = require('wx-server-sdk');
const crypto = require('crypto');
const https = require('https');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const COLLECTIONS = { gates: 'sx_service_follow_gates', bindings: 'sx_service_account_bindings', outbox: 'sx_tournament_notification_outbox' };
const TEMPLATE_KEYS = { registration: 'SXF_SERVICE_TEMPLATE_TOURNAMENT_REGISTRATION', review: 'SXF_SERVICE_TEMPLATE_TOURNAMENT_REVIEW_RESULT', announcement: 'SXF_SERVICE_TEMPLATE_TOURNAMENT_ANNOUNCEMENT', match_task: 'SXF_SERVICE_TEMPLATE_TOURNAMENT_ANNOUNCEMENT' };
const DEFAULT_TEMPLATE_IDS = {
  registration: 'Tk3n4bd-ErmHd4SXP8llZClWRSsjB_uem_CAvfQSe5U',
  review: '99MNTTBVx9S4UQt6XZkQ4-O4hMG926S1eBJLxAfXZ0w',
  announcement: 'bi50KZvRjUSTpAhyf9Hc_B-vlnX8_dXdf0zd2C2XRvA'
  ,match_task: 'bi50KZvRjUSTpAhyf9Hc_B-vlnX8_dXdf0zd2C2XRvA'
};
const GATE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
let cachedAccessToken = { value: '', expireAt: 0 };

function now() { return Date.now(); }
function clean(value, length = 160) { return String(value || '').trim().slice(0, length); }
function id(prefix) { return `${prefix}_${crypto.randomBytes(12).toString('hex')}`; }
function currentOpenid() { const context = cloud.getWXContext(); return clean(context.FROM_OPENID || context.OPENID, 100); }
function templateIdOf(type) { return clean(process.env[TEMPLATE_KEYS[type]] || DEFAULT_TEMPLATE_IDS[type], 300); }
function configuredTemplates() { return Object.keys(TEMPLATE_KEYS).reduce((result, type) => { result[type] = !!templateIdOf(type); return result; }, {}); }
async function ensureCollection(name) { try { await db.collection(name).limit(1).get(); } catch (error) { try { await db.createCollection(name); } catch (ignored) {} } }
async function ensureCollections() { for (const name of Object.values(COLLECTIONS)) await ensureCollection(name); }
async function first(name, where) { const result = await db.collection(name).where(where).limit(1).get(); return result.data && result.data[0] ? result.data[0] : null; }
function httpRequest(options, body) { return new Promise((resolve, reject) => { const request = https.request(options, (response) => { const chunks = []; response.on('data', (chunk) => chunks.push(chunk)); response.on('end', () => resolve(Buffer.concat(chunks))); }); request.on('error', reject); if (body) request.write(body); request.end(); }); }
async function requestJson(method, path, payload) { const body = payload ? JSON.stringify(payload) : ''; const raw = await httpRequest({ host: 'api.weixin.qq.com', path, method, headers: body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : undefined }, body); try { return JSON.parse(raw.toString('utf8')); } catch (error) { throw new Error('解析微信服务号响应失败'); } }
function requestBridge(url, bridgeKey, payload) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const body = JSON.stringify(payload || {});
    const request = https.request({
      protocol: target.protocol, host: target.hostname, port: target.port || 443,
      path: target.pathname + target.search, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'X-SXF-Bridge-Key': bridgeKey }
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (error) { reject(new Error('服务号中转响应格式异常')); }
      });
    });
    request.on('error', reject); request.write(body); request.end();
  });
}
async function getServiceAccessToken() {
  const appId = clean(process.env.SXF_SERVICE_ACCOUNT_APPID, 100); const appSecret = clean(process.env.SXF_SERVICE_ACCOUNT_APPSECRET, 200);
  if (!appId || !appSecret) throw new Error('服务号 AppID 或 AppSecret 未配置');
  if (cachedAccessToken.value && cachedAccessToken.expireAt > now() + 300000) return cachedAccessToken.value;
  const response = await requestJson('GET', `/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}`);
  if (!response || !response.access_token) throw new Error(`获取服务号 access_token 失败：${response && (response.errmsg || response.errcode) || '未知错误'}`);
  cachedAccessToken = { value: response.access_token, expireAt: now() + Math.max(300, Number(response.expires_in || 7200) - 300) * 1000 }; return cachedAccessToken.value;
}
function serviceOAuthStart(event) {
  const appId = clean(process.env.SXF_SERVICE_ACCOUNT_APPID, 100);
  const state = clean(event.state, 120);
  const redirectUri = clean(event.redirectUri, 500);
  if (!appId) throw new Error('服务号 AppID 未配置');
  if (!/^[a-zA-Z0-9_-]{16,120}$/.test(state)) throw new Error('服务号授权状态无效');
  if (redirectUri !== 'https://www.sxfbasketball.cn/education-oauth-callback.html') throw new Error('服务号授权回调地址无效');
  return { ok: true, authorizeUrl: `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=snsapi_base&state=${encodeURIComponent(state)}#wechat_redirect` };
}
async function exchangeServiceOAuth(event) {
  const appId = clean(process.env.SXF_SERVICE_ACCOUNT_APPID, 100); const appSecret = clean(process.env.SXF_SERVICE_ACCOUNT_APPSECRET, 200); const code = clean(event.code, 200);
  if (!appId || !appSecret || !code) throw new Error('服务号授权配置或code无效');
  const token = await requestJson('GET', `/sns/oauth2/access_token?appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}&code=${encodeURIComponent(code)}&grant_type=authorization_code`);
  if (!token.access_token || !token.openid) throw new Error(`服务号授权失败：${token.errmsg || token.errcode || '未知错误'}`);
  let follower = {};
  try {
    const serviceToken = await getServiceAccessToken();
    follower = await requestJson('GET', `/cgi-bin/user/info?access_token=${encodeURIComponent(serviceToken)}&openid=${encodeURIComponent(token.openid)}&lang=zh_CN`);
    if (follower.errcode) follower = {};
  } catch (_) {}
  return { ok: true, openid: clean(token.openid, 100), unionid: clean(follower.unionid || token.unionid, 100), nickName: clean(follower.nickname || '微信家长', 80), avatarUrl: clean(follower.headimgurl, 500), subscribed: follower.subscribe === 1 ? true : follower.subscribe === 0 ? false : null };
}
async function makeFollowQr(scene) {
  const bridgeUrl = clean(process.env.SXF_SERVICE_BRIDGE_URL || 'https://api.saixiaofeng.com/wechat/service-account/follow-qrcode', 500);
  const bridgeKey = clean(process.env.SXF_SERVICE_BRIDGE_KEY, 300);
  if (!bridgeKey) throw new Error('服务号中转密钥未配置');
  const response = await requestBridge(bridgeUrl, bridgeKey, { scene });
  if (!response || !response.ok || !response.imageBase64) throw new Error('服务号关注二维码暂不可用');
  const image = Buffer.from(response.imageBase64, 'base64');
  if (!image || !image.length) throw new Error('下载服务号关注二维码失败');
  const upload = await cloud.uploadFile({ cloudPath: `service-follow-qrcodes/${scene}.jpg`, fileContent: image });
  const urls = await cloud.getTempFileURL({ fileList: [upload.fileID] }); const item = urls.fileList && urls.fileList[0] ? urls.fileList[0] : {};
  return { fileID: upload.fileID, url: item.tempFileURL || '' };
}
async function createEducationParentQr(event) {
  const gateKey = clean(event.gateKey, 100), organizationId = clean(event.organizationId, 100), campusId = clean(event.campusId, 100);
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(gateKey) || !organizationId) throw new Error('教务建档码参数无效');
  const scene = `e${crypto.randomBytes(10).toString('hex')}`; const qr = await makeFollowQr(scene); const gateId = id('edu_follow');
  await db.collection(COLLECTIONS.gates).add({ data: { gateId, scene, kind: 'education_student', educationGateKey: gateKey, organizationId, campusId, status: 'waiting', qrFileID: qr.fileID, qrUrl: qr.url, expiresAt: now() + GATE_TTL_MS, createdAt: now(), updatedAt: now() } });
  return { ok: true, gateId, qrUrl: qr.url, qrFileID: qr.fileID, expiresAt: now() + GATE_TTL_MS };
}
async function createFollowGate(event) {
  const miniOpenid = currentOpenid(); if (!miniOpenid) throw new Error('请先登录微信后再报名');
  const eventId = clean(event.eventId, 100); const inviteKey = clean(event.inviteKey, 100); if (!eventId || !inviteKey) throw new Error('邀请信息无效');
  const binding = await first(COLLECTIONS.bindings, { miniOpenid, subscribed: true }); if (binding) return { ok: true, followed: true, gateId: '', qrUrl: '' };
  const existing = await first(COLLECTIONS.gates, { miniOpenid, eventId, inviteKey, status: 'waiting' });
  if (existing && Number(existing.expiresAt || 0) > now() && existing.qrUrl) return { ok: true, followed: false, gateId: existing.gateId, qrUrl: existing.qrUrl };
  const gateId = id('follow'); const scene = `t${crypto.randomBytes(10).toString('hex')}`; const qr = await makeFollowQr(scene);
  const record = { gateId, scene, miniOpenid, eventId, inviteKey, status: 'waiting', qrFileID: qr.fileID, qrUrl: qr.url, expiresAt: now() + GATE_TTL_MS, createdAt: now(), updatedAt: now() };
  await db.collection(COLLECTIONS.gates).add({ data: record }); return { ok: true, followed: false, gateId, qrUrl: qr.url };
}
async function checkFollowGate(event) {
  const miniOpenid = currentOpenid(); const gateId = clean(event.gateId, 100); if (!miniOpenid || !gateId) throw new Error('关注校验信息无效');
  const gate = await first(COLLECTIONS.gates, { gateId, miniOpenid }); if (!gate) throw new Error('关注校验已失效，请重新打开邀请');
  return { ok: true, ready: gate.status === 'followed' && Number(gate.expiresAt || 0) > now(), status: gate.status || 'waiting' };
}
async function bindingStatus() {
  const miniOpenid = currentOpenid();
  if (!miniOpenid) throw new Error('请先登录微信后再查询服务号绑定状态');
  const binding = await first(COLLECTIONS.bindings, { miniOpenid, subscribed: true });
  const grants = binding && binding.notificationGrants || {};
  return {
    ok: true,
    bound: !!(binding && binding.officialOpenid),
    subscribed: !!(binding && binding.subscribed),
    grants: {
      registration: grants.registration === true,
      review: grants.review === true,
      announcement: grants.announcement === true
    }
  };
}
async function recordAuthorization(event) {
  const miniOpenid = currentOpenid();
  if (!miniOpenid) throw new Error('请先登录微信后再保存通知授权');
  const binding = await first(COLLECTIONS.bindings, { miniOpenid, subscribed: true });
  if (!binding || !binding.officialOpenid) throw new Error('请先完成服务号绑定');
  const source = event.grants && typeof event.grants === 'object' ? event.grants : {};
  const grants = Object.assign({}, binding.notificationGrants || {});
  ['registration', 'review', 'announcement'].forEach((key) => {
    if (source[key] === true) grants[key] = true;
  });
  await db.collection(COLLECTIONS.bindings).doc(binding._id).update({ data: {
    notificationGrants: grants, notificationGrantUpdatedAt: now(), updatedAt: now()
  } });
  return { ok: true, grants };
}
function templateData(record) {
  const payload = record.payload || {};
  const tournamentName = clean(payload.tournamentName || '篮球赛事', 20);
  const teamName = clean(payload.teamName || '参赛球队', 20);
  if (record.type === 'registration') return {
    data: { thing1: tournamentName, number2: String(Number(payload.playerCount || 0)), thing3: clean(payload.note || `${teamName}已提交报名`, 20) },
    legacyData: { first: '收到新的球队报名', keyword1: tournamentName, keyword2: teamName, remark: clean(payload.note || '请进入小程序及时审核', 100) }
  };
  if (record.type === 'review') return {
    data: {
      phrase1: payload.status === 'approved' ? '审核通过' : payload.status === 'withdrawn' ? '已移出赛事' : '审核驳回', thing2: tournamentName,
      time3: clean(payload.reviewedAtText || '', 30), thing4: clean(payload.note || '请进入小程序查看', 20), thing5: clean(payload.reviewerName || '赛事创建者', 20)
    },
    legacyData: { first: '球队报名审核结果', keyword1: tournamentName, keyword2: teamName, keyword3: payload.status === 'approved' ? '审核通过' : payload.status === 'withdrawn' ? '已移出赛事' : '审核驳回', remark: clean(payload.note || '请进入小程序查看详情', 100) }
  };
  return {
    data: { thing1: tournamentName, thing2: clean(payload.announcementName || '赛事公告', 20), time3: clean(payload.publishedAtText || '', 30), phrase4: clean(payload.category || '赛事通知', 10) },
    legacyData: { first: '赛事公告已发布', keyword1: tournamentName, keyword2: clean(payload.announcementName || '赛事公告', 100), remark: clean(payload.note || '请进入小程序查看', 100) }
  };
}
function sendBridgeUrl() {
  const configured = clean(process.env.SXF_SERVICE_BRIDGE_SEND_URL, 500);
  if (configured) return configured;
  return clean(process.env.SXF_SERVICE_BRIDGE_URL || 'https://api.saixiaofeng.com/wechat/service-account/follow-qrcode', 500).replace(/\/follow-qrcode(?:\?.*)?$/, '/send-notification');
}
function customerServiceBridgeUrl() {
  const configured = clean(process.env.SXF_SERVICE_BRIDGE_CUSTOMER_URL, 500);
  if (configured) return configured;
  return clean(process.env.SXF_SERVICE_BRIDGE_URL || 'https://api.saixiaofeng.com/wechat/service-account/follow-qrcode', 500).replace(/\/follow-qrcode(?:\?.*)?$/, '/send-customer-service');
}
async function sendBindingWelcome(binding) {
  if (!binding || !binding._id || !binding.officialOpenid || binding.subscribed !== true) return { ok: false, skipped: true };
  const followedAt = Number(binding.followedAt || binding.updatedAt || 0);
  if (Number(binding.welcomeSentAt || 0) >= followedAt && followedAt > 0) return { ok: true, skipped: true };
  const bridgeKey = clean(process.env.SXF_SERVICE_BRIDGE_KEY, 300);
  if (!bridgeKey) throw new Error('服务号中转密钥未配置');
  const response = await requestBridge(customerServiceBridgeUrl(), bridgeKey, {
    officialOpenid: binding.officialOpenid,
    content: '感谢您，赛小蜂篮球服务号已与小程序账号绑定成功。\n\n赛事球队报名、审核结果和赛事公告将优先通过服务号提醒；请继续完成对应的通知授权。'
  });
  if (!response || !response.ok) throw new Error(`服务号绑定确认消息发送失败${response && response.errorCode ? `（${response.errorCode}）` : ''}`);
  await db.collection(COLLECTIONS.bindings).doc(binding._id).update({ data: { welcomeSentAt: now(), updatedAt: now() } });
  return { ok: true, skipped: false };
}
async function deliverRecord(record) {
  if (!record || !record._id) throw new Error('通知记录不存在');
  const binding = await first(COLLECTIONS.bindings, { miniOpenid: record.recipientMiniOpenid, subscribed: true });
  if (!binding || !binding.officialOpenid) {
    await db.collection(COLLECTIONS.outbox).doc(record._id).update({ data: { status: 'waiting_follow_bind', updatedAt: now() } });
    return { ok: true, status: 'waiting_follow_bind' };
  }
  if (record.type === 'match_task') {
    const bridgeKey = clean(process.env.SXF_SERVICE_BRIDGE_KEY, 300);
    if (!bridgeKey) throw new Error('服务号中转密钥未配置');
    const payload = record.payload || {};
    const response = await requestBridge(customerServiceBridgeUrl(), bridgeKey, {
      officialOpenid: binding.officialOpenid,
      content: `【比赛准备任务】\n${clean(payload.tournamentName || '篮球赛事', 40)}\n${clean(payload.teamName || '', 30)}\n${clean(payload.note || '请打开赛小蜂篮球小程序，在工作台完成比赛准备。', 100)}`
    });
    if (!response || !response.ok) throw new Error(`服务号比赛任务提醒失败${response && response.errorCode ? `（${response.errorCode}）` : ''}`);
    await db.collection(COLLECTIONS.outbox).doc(record._id).update({ data: { recipientOfficialOpenid: binding.officialOpenid, status: 'delivered', deliveryMode: 'customer_service', deliveredAt: now(), updatedAt: now(), lastError: '' } });
    return { ok: true, status: 'delivered' };
  }
  const templateId = templateIdOf(record.type);
  if (!templateId) throw new Error('服务号通知模板未配置');
  const bridgeKey = clean(process.env.SXF_SERVICE_BRIDGE_KEY, 300);
  if (!bridgeKey) throw new Error('服务号中转密钥未配置');
  const message = templateData(record);
  try {
    const targetPage = record.type === 'match_task' && record.payload && record.payload.matchId
      ? `pages/match-preparation/index?matchId=${encodeURIComponent(clean(record.payload.matchId, 100))}`
      : `pages/tournament-detail/index?id=${encodeURIComponent(clean(record.payload && record.payload.eventId, 100))}&tab=teams`;
    const response = await requestBridge(sendBridgeUrl(), bridgeKey, {
      officialOpenid: binding.officialOpenid, templateId,
      page: targetPage,
      miniProgram: { appid: 'wx06d735da15276acd', pagepath: targetPage },
      data: message.data, legacyData: message.legacyData
    });
    if (!response || !response.ok) throw new Error(`服务号中转发送失败${response && response.errorCode ? `（${response.errorCode}）` : ''}`);
    await db.collection(COLLECTIONS.outbox).doc(record._id).update({ data: {
      recipientOfficialOpenid: binding.officialOpenid, status: 'delivered', deliveryMode: clean(response.mode, 30),
      deliveredAt: now(), updatedAt: now(), lastError: ''
    } });
    return { ok: true, status: 'delivered' };
  } catch (error) {
    await db.collection(COLLECTIONS.outbox).doc(record._id).update({ data: {
      recipientOfficialOpenid: binding.officialOpenid, status: 'failed', retryCount: Number(record.retryCount || 0) + 1,
      lastError: clean(error.message, 200), lastAttemptAt: now(), updatedAt: now()
    } });
    throw error;
  }
}
async function deliverNotification(event) {
  const notificationId = clean(event.notificationId, 100);
  if (!notificationId) throw new Error('通知编号无效');
  const record = await first(COLLECTIONS.outbox, { notificationId });
  if (!record) throw new Error('通知记录不存在');
  if (record.status === 'delivered') return { ok: true, status: 'delivered' };
  return deliverRecord(record);
}
async function deliverPendingForBinding(event) {
  const miniOpenid = clean(event.miniOpenid, 100);
  if (!miniOpenid) throw new Error('绑定用户无效');
  const pending = await db.collection(COLLECTIONS.outbox).where({ recipientMiniOpenid: miniOpenid, status: db.command.in(['queued', 'waiting_follow_bind', 'failed']) }).limit(20).get();
  let delivered = 0;
  for (const record of pending.data || []) {
    try { const result = await deliverRecord(record); if (result.status === 'delivered') delivered += 1; } catch (error) { console.warn('[tournament-notification] pending delivery failed', record.notificationId, error.message); }
  }
  return { ok: true, delivered };
}
async function retryFailedNotifications() {
  const failed = await db.collection(COLLECTIONS.outbox).where({ status: 'failed' }).limit(20).get();
  let delivered = 0;
  let failedCount = 0;
  for (const record of failed.data || []) {
    try { const result = await deliverRecord(record); if (result.status === 'delivered') delivered += 1; }
    catch (error) { failedCount += 1; console.warn('[tournament-notification] retry failed', record.notificationId, error.message); }
  }
  return { ok: true, attempted: (failed.data || []).length, delivered, failed: failedCount };
}
async function retryMatchTaskNotifications() {
  const failed = await db.collection(COLLECTIONS.outbox).where({ type: 'match_task', status: db.command.in(['failed', 'queued', 'waiting_follow_bind']) }).limit(50).get();
  let delivered = 0, failedCount = 0;
  for (const record of failed.data || []) {
    try { const result = await deliverRecord(record); if (result.status === 'delivered') delivered += 1; }
    catch (error) { failedCount += 1; console.warn('[tournament-notification] match task retry failed', record.notificationId, error.message); }
  }
  return { ok: true, attempted: (failed.data || []).length, delivered, failed: failedCount };
}
async function afterBinding(event) {
  const miniOpenid = clean(event.miniOpenid, 100);
  if (!miniOpenid) throw new Error('绑定用户无效');
  const binding = await first(COLLECTIONS.bindings, { miniOpenid, subscribed: true });
  if (!binding) throw new Error('服务号绑定记录不存在');
  const pending = await deliverPendingForBinding({ miniOpenid });
  return { ok: true, delivered: Number(pending.delivered || 0) };
}
async function sendPendingBindingWelcomes() {
  const result = await db.collection(COLLECTIONS.bindings).where({ subscribed: true }).limit(20).get();
  let sent = 0; let failed = 0;
  for (const binding of result.data || []) {
    try { const response = await sendBindingWelcome(binding); if (response.skipped !== true) sent += 1; }
    catch (error) { failed += 1; console.warn('[tournament-notification] welcome migration failed', error.message); }
  }
  return { ok: true, checked: (result.data || []).length, sent, failed };
}
exports.main = async (event = {}) => {
  try {
    await ensureCollections(); const bridgeConfigured = !!clean(process.env.SXF_SERVICE_BRIDGE_KEY, 300); const templates = configuredTemplates();
    if (event.action === 'configStatus') return { ok: true, serviceBridgeConfigured: bridgeConfigured, templates };
    if (event.action === 'serviceOAuthStart') return serviceOAuthStart(event);
    if (event.action === 'exchangeServiceOAuth') return await exchangeServiceOAuth(event);
    if (event.action === 'createFollowGate') return await createFollowGate(event);
    if (event.action === 'createEducationParentQr') return await createEducationParentQr(event);
    if (event.action === 'checkFollowGate') return await checkFollowGate(event);
    if (event.action === 'bindingStatus') return await bindingStatus();
    if (event.action === 'recordAuthorization') return await recordAuthorization(event);
    if (event.action === 'deliverNotification') return await deliverNotification(event);
    if (event.action === 'deliverPendingForBinding') return await deliverPendingForBinding(event);
    if (event.action === 'retryFailed') return await retryFailedNotifications();
    if (event.action === 'retryMatchTasks') return await retryMatchTaskNotifications();
    if (event.action === 'afterBinding') return await afterBinding(event);
    if (event.action === 'sendPendingBindingWelcomes') return await sendPendingBindingWelcomes();
    throw new Error('不支持的赛事通知操作');
  } catch (error) { console.error('[sxTournamentNotification]', error); return { ok: false, message: error.message || '赛事通知服务暂不可用' }; }
};
