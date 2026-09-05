'use strict';

const cloud = require('wx-server-sdk');
const crypto = require('crypto');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const C = { invites: 'sx_edu_invites', students: 'sx_education_students', users: 'sx_platform_users', identities: 'sx_wechat_identities', organizations: 'sx_organizations', audits: 'sx_education_audit_logs' };
const now = () => Date.now();
const id = (prefix) => `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
const clean = (value, length = 200) => String(value || '').trim().slice(0, length);
const hash = (value) => crypto.createHash('sha256').update(String(value || '')).digest('hex');
function parseIdentityNumber(value) {
  const number = clean(value, 18).replace(/\s+/g, '').toUpperCase();
  if (!number) return null;
  if (!/^[1-9]\d{16}[\dX]$/.test(number)) throw new Error('请输入有效的18位身份证号');
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checks = '10X98765432';
  const total = weights.reduce((sum, weight, index) => sum + Number(number[index]) * weight, 0);
  if (checks[total % 11] !== number[17]) throw new Error('身份证号校验位不正确');
  const birthDate = `${number.slice(6, 10)}-${number.slice(10, 12)}-${number.slice(12, 14)}`;
  const birth = new Date(Date.UTC(Number(number.slice(6, 10)), Number(number.slice(10, 12)) - 1, Number(number.slice(12, 14))));
  if (Number.isNaN(birth.getTime()) || birth.getUTCFullYear() !== Number(number.slice(6, 10)) || birth.getUTCMonth() + 1 !== Number(number.slice(10, 12)) || birth.getUTCDate() !== Number(number.slice(12, 14)) || birth.getTime() > now()) throw new Error('身份证号中的出生日期不正确');
  return { birthDate, gender: Number(number[16]) % 2 === 1 ? '男' : '女', identityNumberHash: hash(`cn-id:${number}`), identityNumberMasked: `${number.slice(0, 3)}***********${number.slice(-4)}` };
}
async function first(name, query) { const result = await db.collection(name).where(query).limit(1).get(); return result.data && result.data[0] || null; }
async function add(name, data) { return db.collection(name).add({ data }); }
async function patch(target, data) { return db.collection(C.invites).doc(target._id).update({ data: { ...data, updatedAt: now() } }); }
function bodyOf(event) { if (event.body && typeof event.body === 'string') { try { return JSON.parse(event.body); } catch (_) { return {}; } } return event.body && typeof event.body === 'object' ? event.body : {}; }
function queryOf(event) { return event.queryStringParameters || event.query || {}; }
function json(data, statusCode = 200) { return { statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': 'https://www.sxfbasketball.cn', 'Access-Control-Allow-Headers': 'Content-Type' }, body: JSON.stringify(data) }; }
function redirect(location) { return { statusCode: 302, headers: { Location: location, 'Cache-Control': 'no-store' }, body: '' }; }
async function gateByKey(gateKey) { const gate = await first(C.invites, { gateKey: clean(gateKey, 100), type: 'student_gate', status: 'active' }); if (!gate) throw new Error('学员建档码无效或已停用'); return gate; }
async function sessionOf(token) { const session = await first(C.invites, { tokenHash: hash(token), type: 'guardian_session', status: 'active' }); if (!session || Number(session.expiresAt || 0) < now()) throw new Error('家长登录已失效，请重新扫码'); return session; }

async function ensurePlatformIdentity(profile) {
  let identity = await first(C.identities, { identityKey: `official_account:${profile.openid}`, status: 'active' });
  if (!identity && profile.unionid) identity = await first(C.identities, { unionid: profile.unionid, status: 'active' });
  let platformUserId = identity && identity.platformUserId;
  if (!platformUserId) {
    platformUserId = id('platform_user');
    await add(C.users, { platformUserId, nickName: profile.nickName, avatarUrl: profile.avatarUrl, status: 'active', createdAt: now(), updatedAt: now() });
  }
  if (!identity || identity.identityKey !== `official_account:${profile.openid}`) await add(C.identities, { identityId: id('wx_identity'), identityKey: `official_account:${profile.openid}`, surface: 'official_account', openid: profile.openid, unionid: profile.unionid, platformUserId, status: 'active', createdAt: now(), updatedAt: now() });
  return platformUserId;
}

async function handle(event) {
  const query = queryOf(event), body = bodyOf(event), action = clean(body.action || query.action, 40);
  if ((event.httpMethod || '').toUpperCase() === 'OPTIONS') return json({ ok: true });
  if (action === 'gateInfo') {
    const gate = await gateByKey(body.gateKey || query.gate);
    const organization = await first(C.organizations, { organizationId: gate.organizationId });
    return json({ ok: true, gateId: gate.inviteId, organizationId: gate.organizationId, organizationName: organization && organization.name || '篮球机构', campusId: gate.campusId, serviceQrUrl: gate.serviceQrUrl || '' });
  }
  if (action === 'oauthStart') {
    const gate = await gateByKey(query.gate || body.gateKey);
    const state = crypto.randomBytes(18).toString('base64url');
    await add(C.invites, { inviteId: id('edu_oauth'), type: 'guardian_oauth_state', organizationId: gate.organizationId, campusId: gate.campusId, gateKey: gate.gateKey, tokenHash: hash(state), status: 'pending', expiresAt: now() + 10 * 60 * 1000, createdAt: now(), updatedAt: now() });
    const redirectUri = 'https://www.sxfbasketball.cn/education-oauth-callback.html';
    const response = await cloud.callFunction({ name: 'sxTournamentNotification', data: { action: 'serviceOAuthStart', state, redirectUri } });
    const result = response && response.result || {};
    if (!result.ok || !result.authorizeUrl) throw new Error(result.message || '服务号授权暂不可用');
    return redirect(result.authorizeUrl);
  }
  if (action === 'oauthCallback') {
    const stateRecord = await first(C.invites, { type: 'guardian_oauth_state', tokenHash: hash(query.state), status: 'pending' });
    if (!stateRecord || Number(stateRecord.expiresAt || 0) < now()) throw new Error('服务号授权状态已失效');
    const response = await cloud.callFunction({ name: 'sxTournamentNotification', data: { action: 'exchangeServiceOAuth', code: query.code } });
    const profile = response && response.result || {};
    if (!profile.ok || !profile.openid) throw new Error(profile.message || '服务号身份读取失败');
    if (profile.subscribed === false) throw new Error('请先关注赛小蜂篮球服务号，再从服务号建档消息进入');
    const platformUserId = await ensurePlatformIdentity(profile);
    const sessionToken = crypto.randomBytes(28).toString('base64url');
    await add(C.invites, { inviteId: id('edu_guardian_session'), type: 'guardian_session', organizationId: stateRecord.organizationId, campusId: stateRecord.campusId, gateKey: stateRecord.gateKey, platformUserId, officialOpenid: profile.openid, tokenHash: hash(sessionToken), status: 'active', expiresAt: now() + 7 * 24 * 60 * 60 * 1000, createdAt: now(), updatedAt: now() });
    await patch(stateRecord, { status: 'used', usedAt: now(), tokenHash: '' });
    return json({ ok: true, sessionToken, gateKey: stateRecord.gateKey, redirectUrl: `https://www.sxfbasketball.cn/education-student-onboarding.html?gate=${encodeURIComponent(stateRecord.gateKey)}#session=${encodeURIComponent(sessionToken)}` });
  }
  if (action === 'me') {
    const session = await sessionOf(body.sessionToken);
    const user = await first(C.users, { platformUserId: session.platformUserId });
    return json({ ok: true, guardian: { platformUserId: session.platformUserId, nickName: user && user.nickName || '微信家长', avatarUrl: user && user.avatarUrl || '' } });
  }
  if (action === 'uploadAvatar') {
    const session = await sessionOf(body.sessionToken); const gate = await gateByKey(body.gateKey);
    if (session.organizationId !== gate.organizationId) throw new Error('无权使用该建档码');
    const mime = clean(body.mime, 40); const base64 = clean(body.base64, 2 * 1024 * 1024);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) throw new Error('照片仅支持JPG、PNG或WEBP');
    const buffer = Buffer.from(base64.replace(/^data:[^;]+;base64,/, ''), 'base64');
    if (!buffer.length || buffer.length > 900 * 1024) throw new Error('裁剪图过大，请缩小后重试');
    const extension = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    const response = await cloud.callFunction({
      name: 'sxUploadAvatar',
      data: {
        base64: buffer.toString('base64'),
        ext: extension,
        internalEducationAvatar: true
      }
    });
    const result = response && response.result || {};
    if (!result.ok || !result.fileID) throw new Error(result.error || '人像分割失败，请调整照片后重试');
    let previewUrl = '';
    try {
      const temporary = await cloud.getTempFileURL({ fileList: [result.fileID] });
      previewUrl = temporary && temporary.fileList && temporary.fileList[0] && temporary.fileList[0].tempFileURL || '';
    } catch (_) {}
    return json({ ok: true, fileID: result.fileID, previewUrl, segmented: true });
  }
  if (action === 'submitStudent') {
    const session = await sessionOf(body.sessionToken); const gate = await gateByKey(body.gateKey);
    if (session.organizationId !== gate.organizationId) throw new Error('无权使用该建档码');
    const source = body.student || {};
    const identity = parseIdentityNumber(source.identityNumber);
    const name = clean(source.name, 50), birthDate = identity ? identity.birthDate : clean(source.birthDate, 20), gender = identity ? identity.gender : clean(source.gender, 10), guardianName = clean(source.guardianName, 50), guardianPhone = clean(source.guardianPhone, 30), guardianRelation = clean(source.guardianRelation, 20);
    if (!name || !birthDate || !gender || !guardianName || !guardianPhone || !guardianRelation || source.privacyConsent !== true) throw new Error('请完整填写必填资料并同意隐私说明');
    const duplicate = identity && await first(C.students, { organizationId: gate.organizationId, identityNumberHash: identity.identityNumberHash }) || await first(C.students, { organizationId: gate.organizationId, guardianPlatformUserId: session.platformUserId, name, birthDate });
    if (duplicate) return json({ ok: true, duplicate: true, studentId: duplicate.studentId, confirmationStatus: duplicate.confirmationStatus });
    const studentId = id('student');
    await add(C.students, { studentId, organizationId: gate.organizationId, campusId: gate.campusId, name, birthDate, gender, guardianName, guardianPhone, guardianRelation, guardianPlatformUserId: session.platformUserId, avatarUrl: clean(source.avatarUrl, 500), school: clean(source.school, 100), grade: clean(source.grade, 30), note: clean(source.note, 300), identityNumberHash: identity && identity.identityNumberHash || '', identityNumberMasked: identity && identity.identityNumberMasked || '', identityDerivedAt: identity ? now() : 0, source: 'guardian_qr', confirmationStatus: 'pending', status: 'pending', privacyConsentAt: now(), createdAt: now(), updatedAt: now() });
    await add(C.audits, { auditId: id('edu_audit'), organizationId: gate.organizationId, campusId: gate.campusId, actorPlatformUserId: session.platformUserId, actorSurface: 'official_account', action: 'education.student.guardian.submit', target: studentId, detail: {}, createdAt: now() });
    return json({ ok: true, studentId, confirmationStatus: 'pending' });
  }
  if (action === 'myStudents') {
    const session = await sessionOf(body.sessionToken);
    const result = await db.collection(C.students).where({ organizationId: session.organizationId, guardianPlatformUserId: session.platformUserId }).limit(50).get();
    return json({ ok: true, students: result.data || [] });
  }
  throw new Error('不支持的家长建档操作');
}

exports.main = async (event = {}) => {
  try { return await handle(event); }
  catch (error) { console.error('[sxEducationPublic]', error); return json({ ok: false, message: error.message || '家长建档服务暂不可用' }, 400); }
};
