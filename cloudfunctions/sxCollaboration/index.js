const cloud = require('wx-server-sdk');
const crypto = require('crypto');
const https = require('https');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const COLLECTIONS = {
  users: 'sx_platform_users', identities: 'sx_wechat_identities', organizations: 'sx_organizations',
  memberships: 'sx_organization_memberships', pcChallenges: 'sx_pc_login_challenges',
  tournaments: 'sx_tournaments', tournamentInvites: 'sx_tournament_invites', tournamentTeams: 'sx_tournament_teams',
  tournamentTasks: 'sx_tournament_tasks', serviceOutbox: 'sx_tournament_notification_outbox', miniNotices: 'sx_tournament_notice_logs',
  tasks: 'sx_match_tasks', assignments: 'sx_match_assignments', rosters: 'sx_match_rosters',
  staff: 'sx_match_staff', stats: 'sx_stat_assignments', batches: 'sx_notification_batches',
  deliveries: 'sx_notification_deliveries', confirmations: 'sx_confirmation_records', audit: 'sx_audit_logs'
};

const now = () => Date.now();
const id = (prefix) => `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
const clean = (value, length = 120) => String(value || '').trim().slice(0, length);
const list = (value, max = 100) => Array.isArray(value) ? value.slice(0, max) : [];
const hash = (value) => crypto.createHash('sha256').update(String(value || '')).digest('hex');
const collaborationOrganizationAllowlist = () => String(process.env.SXF_COLLAB_ORG_ALLOWLIST || '').split(',').map((value) => value.trim()).filter(Boolean);
const TRIAL_DURATION_MS = 365 * 24 * 60 * 60 * 1000;
const BASKETBALL_APPID = process.env.SXF_BASKETBALL_APPID || 'wx06d735da15276acd';
const BASKETBALL_APPSECRET = process.env.SXF_BASKETBALL_APPSECRET || '';
const MINI_REVIEW_TEMPLATE_ID = process.env.SXF_MINI_TEMPLATE_TOURNAMENT_REVIEW || 'jp0LDnCgS6w5xyLSJQyLnOuilLV94MNAtzvQtuGw8XE';
const PC_AUTH_ENV_VERSION = ['develop', 'trial', 'release'].includes(process.env.SXF_PC_AUTH_ENV_VERSION)
  ? process.env.SXF_PC_AUTH_ENV_VERSION
  : 'trial';
const WECHAT_OPEN_APPID = process.env.SXF_WECHAT_OPEN_APPID || 'wx8ccbf5e5f2e51d5c';
const WECHAT_OPEN_APPSECRET = process.env.SXF_WECHAT_OPEN_APPSECRET || '';
const WECHAT_OPEN_REDIRECT_URI = process.env.SXF_WECHAT_OPEN_REDIRECT_URI || 'https://www.sxfbasketball.cn/admin/wechat-login-callback.html';
const REGISTRATION_QR_ENV_VERSION = ['trial', 'release'].includes(process.env.SXF_REGISTRATION_QR_ENV_VERSION)
  ? process.env.SXF_REGISTRATION_QR_ENV_VERSION
  : 'trial';
let wechatAccessTokenCache = { token: '', expiresAt: 0 };

function wechatRequest(host, path, payload) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(JSON.stringify(payload || {}));
    const request = https.request({ host, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': body.length } }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({ headers: response.headers, body: Buffer.concat(chunks) }));
    });
    request.on('error', reject);
    request.write(body);
    request.end();
  });
}

function wechatGetJson(host, path) {
  return new Promise((resolve, reject) => {
    const request = https.get({ host, path, headers: { Accept: 'application/json' } }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch (_) { reject(new Error('微信登录接口返回异常')); }
      });
    });
    request.on('error', reject);
  });
}

async function exchangeWechatWebsiteCode(code) {
  if (!WECHAT_OPEN_APPID || !WECHAT_OPEN_APPSECRET) throw new Error('微信开放平台网站应用尚未完成密钥配置');
  const token = await wechatGetJson('api.weixin.qq.com', `/sns/oauth2/access_token?appid=${encodeURIComponent(WECHAT_OPEN_APPID)}&secret=${encodeURIComponent(WECHAT_OPEN_APPSECRET)}&code=${encodeURIComponent(code)}&grant_type=authorization_code`);
  if (!token.access_token || !token.openid) throw new Error(`微信授权失败：${token.errcode || ''} ${token.errmsg || ''}`.trim());
  const profile = await wechatGetJson('api.weixin.qq.com', `/sns/userinfo?access_token=${encodeURIComponent(token.access_token)}&openid=${encodeURIComponent(token.openid)}&lang=zh_CN`);
  if (profile.errcode) throw new Error(`获取微信身份失败：${profile.errcode} ${profile.errmsg || ''}`.trim());
  return {
    surface: 'website',
    openid: clean(profile.openid || token.openid, 100),
    unionid: clean(profile.unionid || token.unionid, 100),
    nickName: clean(profile.nickname || '微信用户', 80),
    avatarUrl: clean(profile.headimgurl, 500)
  };
}

async function wechatAccessToken() {
  if (wechatAccessTokenCache.token && wechatAccessTokenCache.expiresAt > now() + 5 * 60 * 1000) return wechatAccessTokenCache.token;
  if (!BASKETBALL_APPSECRET) throw new Error('微信小程序码尚未配置 AppSecret');
  const response = await wechatRequest('api.weixin.qq.com', '/cgi-bin/stable_token', { grant_type: 'client_credential', appid: BASKETBALL_APPID, secret: BASKETBALL_APPSECRET });
  const data = JSON.parse(response.body.toString('utf8'));
  if (!data.access_token) throw new Error(`获取小程序接口凭证失败：${data.errcode || ''} ${data.errmsg || ''}`.trim());
  wechatAccessTokenCache = { token: data.access_token, expiresAt: now() + (Number(data.expires_in || 7200) - 300) * 1000 };
  return wechatAccessTokenCache.token;
}

async function sendMiniRegistrationReview(openid, tournament, team, status, note) {
  if (!openid || !MINI_REVIEW_TEMPLATE_ID) throw new Error('小程序通知接收人或模板未配置');
  const token = await wechatAccessToken();
  const response = await wechatRequest('api.weixin.qq.com', `/cgi-bin/message/subscribe/send?access_token=${encodeURIComponent(token)}`, {
    touser: openid,
    template_id: MINI_REVIEW_TEMPLATE_ID,
    page: `pages/tournament-detail/index?id=${encodeURIComponent(tournament.eventId)}&tab=teams`,
    miniprogram_state: process.env.SXF_MINI_SUBSCRIBE_STATE || 'trial',
    lang: 'zh_CN',
    data: {
      thing1: { value: clean(tournament.name, 20) },
      thing2: { value: clean(team.name, 20) },
      thing3: { value: status === 'approved' ? '审核通过' : '审核驳回' },
      thing4: { value: clean(note || (status === 'approved' ? '可进入赛事，等待对阵发布' : '请查看驳回原因后重新提交'), 20) }
    }
  });
  const result = JSON.parse(response.body.toString('utf8'));
  if (Number(result.errcode || 0) !== 0) throw new Error(`小程序通知发送失败（${result.errcode || '未知'}）：${result.errmsg || ''}`);
  return { ok: true };
}

async function deliverRegistrationReviewNotifications(tournament, team, status, note) {
  await ensureCollections([COLLECTIONS.miniNotices, COLLECTIONS.serviceOutbox]);
  const result = { mini: 'skipped', service: 'skipped', errors: [] };
  if (!team.ownerOpenid) {
    result.errors.push('球队领队尚未绑定微信身份');
    return result;
  }
  const reviewedAt = now();
  try {
    await sendMiniRegistrationReview(team.ownerOpenid, tournament, team, status, note);
    result.mini = 'sent';
    await add(COLLECTIONS.miniNotices, { noticeId: id('tnotice'), type: 'review', recipientOpenid: team.ownerOpenid, eventId: tournament.eventId, tournamentName: clean(tournament.name, 100), teamName: clean(team.name, 100), status: 'sent', detail: '已提交微信小程序订阅消息', channel: 'mini_subscribe', createdAt: reviewedAt, updatedAt: reviewedAt });
  } catch (error) {
    result.mini = 'failed';
    result.errors.push(error.message);
    await add(COLLECTIONS.miniNotices, { noticeId: id('tnotice'), type: 'review', recipientOpenid: team.ownerOpenid, eventId: tournament.eventId, tournamentName: clean(tournament.name, 100), teamName: clean(team.name, 100), status: 'failed', detail: clean(error.message, 200), channel: 'mini_subscribe', createdAt: reviewedAt, updatedAt: reviewedAt });
  }
  const notificationId = id('tn');
  await add(COLLECTIONS.serviceOutbox, {
    notificationId, type: 'review', recipientMiniOpenid: team.ownerOpenid, recipientOfficialOpenid: '', status: 'queued', retryCount: 0,
    payload: { eventId: tournament.eventId, tournamentName: clean(tournament.name, 100), teamName: clean(team.name, 100), playerCount: list(team.players, 50).length, status, note: clean(note, 200), reviewerName: '赛事主办方', reviewedAtText: new Date(reviewedAt).toISOString().slice(0, 16).replace('T', ' ') },
    createdAt: reviewedAt, updatedAt: reviewedAt
  });
  try {
    const response = await cloud.callFunction({ name: 'sxTournamentNotification', data: { action: 'deliverNotification', notificationId } });
    const delivery = response && response.result ? response.result : response;
    result.service = delivery && delivery.ok ? (delivery.status || 'queued') : 'failed';
    if (!delivery || !delivery.ok) result.errors.push(clean(delivery && delivery.message || '服务号通知发送失败', 200));
  } catch (error) {
    result.service = 'failed';
    result.errors.push(clean(error.message, 200));
  }
  return result;
}

async function createPcLoginMiniProgramCode(challengeId) {
  const token = await wechatAccessToken();
  const response = await wechatRequest('api.weixin.qq.com', `/wxa/getwxacodeunlimit?access_token=${encodeURIComponent(token)}`, {
    scene: challengeId,
    page: 'pages/pc-auth/index',
    check_path: false,
    env_version: PC_AUTH_ENV_VERSION,
    width: 430,
    auto_color: false,
    line_color: { r: 19, g: 33, b: 42 }
  });
  const contentType = String(response.headers['content-type'] || '');
  if (contentType.includes('application/json')) {
    const data = JSON.parse(response.body.toString('utf8'));
    throw new Error(`生成微信小程序码失败：${data.errcode || ''} ${data.errmsg || ''}`.trim());
  }
  return `data:image/png;base64,${response.body.toString('base64')}`;
}

async function ensureCollection(name) {
  try { await db.collection(name).limit(1).get(); } catch (error) {
    try { await db.createCollection(name); } catch (ignored) {}
  }
}
async function ensureCollections(names) { for (const name of names) await ensureCollection(name); }
async function first(name, query) {
  const res = await db.collection(name).where(query).limit(1).get();
  return res.data && res.data[0] ? res.data[0] : null;
}
async function add(name, data) { return db.collection(name).add({ data }); }
async function patch(name, docId, data) { return db.collection(name).doc(docId).update({ data }); }
async function upsert(name, query, data) {
  const existing = await first(name, query);
  if (existing) { await patch(name, existing._id, Object.assign({}, data, { updatedAt: now() })); return existing._id; }
  const created = await add(name, Object.assign({}, query, data, { createdAt: now(), updatedAt: now() }));
  return created._id;
}
function contextIdentity() {
  const ctx = cloud.getWXContext();
  return { openid: ctx.FROM_OPENID || ctx.OPENID || '', unionid: ctx.FROM_UNIONID || ctx.UNIONID || '' };
}
async function audit(action, actor, target, detail) {
  await ensureCollection(COLLECTIONS.audit);
  await add(COLLECTIONS.audit, { action, actorPlatformUserId: actor || '', target: target || '', detail: detail || {}, createdAt: now() });
}
async function ensurePlatformUser(profile = {}) {
  await ensureCollections([COLLECTIONS.users, COLLECTIONS.identities]);
  const wx = contextIdentity();
  const openid = clean(profile.openid || wx.openid, 100);
  const unionid = clean(profile.unionid || wx.unionid, 100);
  if (!openid && !profile.platformUserId) return null;
  if (profile.platformUserId) return first(COLLECTIONS.users, { platformUserId: clean(profile.platformUserId, 100) });
  const surface = clean(profile.surface || 'mini_program', 30);
  const identityKey = `${surface}:${openid}`;
  let identity = await first(COLLECTIONS.identities, { identityKey });
  if (identity) return first(COLLECTIONS.users, { platformUserId: identity.platformUserId });
  let user = unionid ? await first(COLLECTIONS.users, { unionid }) : null;
  if (!user) {
    const platformUserId = id('pu');
    await add(COLLECTIONS.users, {
      platformUserId, unionid, nickName: clean(profile.nickName || '赛小蜂用户', 80),
      avatarUrl: clean(profile.avatarUrl, 500), phoneNumber: clean(profile.phoneNumber, 30),
      status: 'active', createdAt: now(), updatedAt: now()
    });
    user = await first(COLLECTIONS.users, { platformUserId });
  }
  await upsert(COLLECTIONS.identities, { identityKey }, {
    platformUserId: user.platformUserId, provider: 'wechat', surface, openid, unionid, status: 'active'
  });
  return user;
}
async function requireUser(event) {
  const user = await ensurePlatformUser(event.profile || {});
  if (!user) throw new Error('需要微信身份或平台账号');
  return user;
}

async function organizationProfile(platformUserId) {
  await ensureCollections([COLLECTIONS.organizations, COLLECTIONS.memberships]);
  const memberships = await db.collection(COLLECTIONS.memberships).where({ platformUserId, status: 'active' }).limit(50).get();
  const membership = (memberships.data || [])[0] || null;
  const organization = membership ? await first(COLLECTIONS.organizations, { organizationId: membership.organizationId }) : null;
  return { membership, organization };
}

function workspaceAccess(organization) {
  const trialExpiresAt = Number(organization?.trialExpiresAt || 0);
  const trialActive = trialExpiresAt > now();
  return {
    trialActive,
    trialExpiresAt,
    tournament: true,
    education: trialActive,
    status: trialActive ? 'trial_active' : 'tournament_basic'
  };
}

function normalizedIdentityProfile(event = {}) {
  const identityType = ['institution', 'school', 'organizer'].includes(event.identityType) ? event.identityType : 'institution';
  const profile = event.profile && typeof event.profile === 'object' ? event.profile : {};
  const entityName = clean(profile.entityName || event.name, 100);
  const contactName = clean(profile.contactName, 60);
  const contactPhone = clean(profile.contactPhone, 30);
  const region = {
    province: clean(profile.province, 40),
    city: clean(profile.city, 40),
    district: clean(profile.district, 40)
  };
  const detailType = clean(profile.detailType, 40);
  const logo = clean(profile.logo, 1000);
  if (!entityName || !contactName || !contactPhone || !region.province || !region.city) throw new Error('请完整填写组织名称、地区、联系人和手机号');
  return { identityType, profile: { entityName, contactName, contactPhone, region, detailType, logo } };
}

async function requirePcSession(event = {}) {
  await ensureCollection(COLLECTIONS.pcChallenges);
  const sessionToken = clean(event.sessionToken, 500);
  if (!sessionToken) throw new Error('PC会话已失效，请重新扫码登录');
  const challenge = await first(COLLECTIONS.pcChallenges, { sessionHash: hash(sessionToken), status: 'exchanged' });
  if (!challenge || !challenge.platformUserId || Number(challenge.sessionExpiresAt || 0) < now()) throw new Error('PC会话已失效，请重新扫码登录');
  return challenge;
}

const TEAM_TASK_ROLES = ['home_coach', 'away_coach', 'team_manager', 'home_team', 'away_team', 'assistant'];
const TEAM_MANAGER_ROLES = ['home_coach', 'away_coach', 'team_manager', 'home_team', 'away_team'];

async function requireMatchTaskAccess(user, matchId, options = {}) {
  const res = await db.collection(COLLECTIONS.tasks).where({
    recipientPlatformUserId: user.platformUserId,
    matchId
  }).limit(50).get();
  const teamScope = clean(options.teamScope, 30);
  const allowedRoles = options.allowedRoles || [];
  const allowedOrganizationIds = options.allowedOrganizationIds || [];
  const task = (res.data || []).find((item) => {
    if (!item || item.status === 'invalid' || item.status === 'rejected') return false;
    if (options.requireAccepted && item.status !== 'accepted') return false;
    if (teamScope && item.teamScope !== teamScope) return false;
    if (allowedRoles.length && !allowedRoles.includes(item.role)) return false;
    if (allowedOrganizationIds.length && !allowedOrganizationIds.includes(item.organizationId)) return false;
    return true;
  });
  if (!task) throw new Error('无权操作该场比赛任务');
  return task;
}
function requireAdmin(event) {
  const expected = process.env.SXF_ADMIN_TOKEN || '';
  if (!expected || clean(event.adminToken, 500) !== expected) throw new Error('无后台操作权限');
}
function hasAdminToken(event) {
  const expected = process.env.SXF_ADMIN_TOKEN || '';
  return !!expected && clean(event.adminToken, 500) === expected;
}
function collaborationEnabled(event) {
  if (process.env.SXF_COLLAB_ENABLED === 'true') return true;
  if (hasAdminToken(event)) return true;
  return false;
}
async function identityDomain(action, event) {
  const user = await requireUser(event);
  if (action === 'get') {
    const memberships = await db.collection(COLLECTIONS.memberships).where({ platformUserId: user.platformUserId, status: 'active' }).limit(100).get();
    return { ok: true, platformUserId: user.platformUserId, user, memberships: memberships.data || [] };
  }
  if (action === 'bindIdentity') {
    const surface = clean(event.surface, 30);
    const openid = clean(event.openid, 100);
    if (!surface || !openid) throw new Error('缺少身份类型或openid');
    const identityKey = `${surface}:${openid}`;
    await upsert(COLLECTIONS.identities, { identityKey }, { platformUserId: user.platformUserId, surface, openid, unionid: clean(event.unionid, 100), status: 'active' });
    await audit('identity.bind', user.platformUserId, identityKey, { surface });
    return { ok: true, platformUserId: user.platformUserId };
  }
  if (action === 'createOrganization') {
    await ensureCollections([COLLECTIONS.organizations, COLLECTIONS.memberships]);
    const organizationId = id('org');
    const name = clean(event.name, 100);
    if (!name) throw new Error('机构名称不能为空');
    await add(COLLECTIONS.organizations, { organizationId, name, status: 'active', entitlements: ['free_tournament'], ownerPlatformUserId: user.platformUserId, createdAt: now(), updatedAt: now() });
    await add(COLLECTIONS.memberships, { membershipId: id('mem'), organizationId, platformUserId: user.platformUserId, role: 'owner', scopes: ['organization'], status: 'active', createdAt: now(), updatedAt: now() });
    await audit('organization.create', user.platformUserId, organizationId, { name });
    return { ok: true, organizationId };
  }
  throw new Error('不支持的身份操作');
}

async function pcAuthDomain(action, event) {
  await ensureCollection(COLLECTIONS.pcChallenges);
  if (action === 'createChallenge') {
    const challengeId = id('pc');
    const secret = crypto.randomBytes(24).toString('hex');
    const oauthState = crypto.randomBytes(24).toString('hex');
    await add(COLLECTIONS.pcChallenges, { challengeId, secretHash: hash(secret), oauthStateHash: hash(oauthState), status: 'pending', expiresAt: now() + 5 * 60 * 1000, createdAt: now(), updatedAt: now() });
    if (WECHAT_OPEN_APPID && WECHAT_OPEN_APPSECRET) {
      return {
        ok: true,
        challengeId,
        secret,
        expiresIn: 300,
        wechatLoginReady: true,
        wechatLogin: { appId: WECHAT_OPEN_APPID, scope: 'snsapi_login', redirectUri: WECHAT_OPEN_REDIRECT_URI, state: oauthState }
      };
    }
    try {
      const miniProgramCodeDataUrl = await createPcLoginMiniProgramCode(challengeId);
      return {
        ok: true,
        challengeId,
        secret,
        expiresIn: 300,
        wechatLoginReady: false,
        miniProgramCodeDataUrl,
        miniProgramCodeReady: true,
        miniProgramEnvVersion: PC_AUTH_ENV_VERSION
      };
    } catch (error) {
      return {
        ok: true,
        challengeId,
        secret,
        expiresIn: 300,
        wechatLoginReady: false,
        miniProgramCodeReady: false,
        miniProgramCodeError: error.message || '微信小程序码暂不可用',
        miniProgramCodeDiagnostic: {
          appIdTail: BASKETBALL_APPID.slice(-6),
          secretConfigured: Boolean(BASKETBALL_APPSECRET),
          envVersion: PC_AUTH_ENV_VERSION
        }
      };
    }
  }
  if (action === 'wechatCallback') {
    const code = clean(event.code, 300);
    const state = clean(event.state, 300);
    if (!code || !state) throw new Error('微信授权参数不完整');
    const challenge = await first(COLLECTIONS.pcChallenges, { oauthStateHash: hash(state) });
    if (!challenge || challenge.status !== 'pending' || Number(challenge.expiresAt || 0) < now()) throw new Error('微信登录请求已失效，请刷新PC端二维码');
    const profile = await exchangeWechatWebsiteCode(code);
    const user = await ensurePlatformUser(profile);
    if (!user) throw new Error('无法建立微信平台账号');
    await patch(COLLECTIONS.pcChallenges, challenge._id, { status: 'confirmed', platformUserId: user.platformUserId, confirmedAt: now(), oauthStateHash: '', updatedAt: now() });
    await audit('pc.wechat.login.confirm', user.platformUserId, challenge.challengeId, { surface: 'website', unionidLinked: Boolean(profile.unionid) });
    return { ok: true };
  }
  if (action === 'confirmChallenge') {
    const user = await requireUser(event); const challenge = await first(COLLECTIONS.pcChallenges, { challengeId: clean(event.challengeId, 100) });
    if (!challenge || challenge.status !== 'pending' || challenge.expiresAt < now()) throw new Error('登录确认已失效');
    await patch(COLLECTIONS.pcChallenges, challenge._id, { status: 'confirmed', platformUserId: user.platformUserId, confirmedAt: now(), updatedAt: now() });
    return { ok: true };
  }
  if (action === 'exchange') {
    const challenge = await first(COLLECTIONS.pcChallenges, { challengeId: clean(event.challengeId, 100), secretHash: hash(event.secret) });
    if (!challenge || challenge.status !== 'confirmed' || challenge.expiresAt < now()) throw new Error('登录凭证无效');
    const sessionToken = crypto.randomBytes(32).toString('hex');
    await patch(COLLECTIONS.pcChallenges, challenge._id, { status: 'exchanged', sessionHash: hash(sessionToken), sessionExpiresAt: now() + 30 * 24 * 60 * 60 * 1000, exchangedAt: now(), updatedAt: now() });
    return { ok: true, platformUserId: challenge.platformUserId, sessionToken, expiresIn: 30 * 24 * 3600 };
  }
  if (action === 'status') {
    const challenge = await first(COLLECTIONS.pcChallenges, { challengeId: clean(event.challengeId, 100), secretHash: hash(event.secret) });
    if (!challenge || challenge.expiresAt < now()) return { ok: true, status: 'expired' };
    return { ok: true, status: challenge.status || 'pending' };
  }
  if (action === 'me') {
    const session = await requirePcSession(event);
    const user = await first(COLLECTIONS.users, { platformUserId: session.platformUserId });
    const { membership, organization } = await organizationProfile(session.platformUserId);
    return { ok: true, platformUserId: session.platformUserId, user, membership, organization, access: workspaceAccess(organization) };
  }
  if (action === 'completeOnboarding') {
    const session = await requirePcSession(event);
    const user = await first(COLLECTIONS.users, { platformUserId: session.platformUserId });
    if (!user) throw new Error('微信身份不存在，请重新扫码登录');
    const { identityType, profile } = normalizedIdentityProfile(event);
    const preferredWorkspace = event.preferredWorkspace === 'education' ? 'education' : 'tournament';
    let { membership, organization } = await organizationProfile(session.platformUserId);
    const timestamp = now();
    if (!organization) {
      const organizationId = id('org');
      organization = {
        organizationId,
        ownerPlatformUserId: session.platformUserId,
        status: 'active',
        entitlements: ['free_tournament', 'trial_full_access'],
        createdAt: timestamp
      };
      await add(COLLECTIONS.organizations, organization);
      organization = await first(COLLECTIONS.organizations, { organizationId });
      membership = { membershipId: id('mem'), organizationId, platformUserId: session.platformUserId, role: 'owner', scopes: ['organization'], status: 'active', createdAt: timestamp, updatedAt: timestamp };
      await add(COLLECTIONS.memberships, membership);
    }
    const trialStartedAt = Number(organization.trialStartedAt || 0) || timestamp;
    const trialExpiresAt = Number(organization.trialExpiresAt || 0) || trialStartedAt + TRIAL_DURATION_MS;
    const nextOrganization = {
      name: profile.entityName,
      identityType,
      identityProfile: profile,
      primaryWorkspace: preferredWorkspace,
      onboardingCompleted: true,
      onboardingCompletedAt: timestamp,
      trialStartedAt,
      trialExpiresAt,
      entitlementStatus: trialExpiresAt > timestamp ? 'trial_active' : 'tournament_basic',
      entitlements: ['free_tournament', 'trial_full_access'],
      updatedAt: timestamp
    };
    await patch(COLLECTIONS.organizations, organization._id, nextOrganization);
    const updatedOrganization = await first(COLLECTIONS.organizations, { organizationId: organization.organizationId });
    await audit('organization.onboarding.complete', session.platformUserId, organization.organizationId, { identityType, preferredWorkspace, trialExpiresAt });
    return { ok: true, organization: updatedOrganization, membership, access: workspaceAccess(updatedOrganization) };
  }
  if (action === 'setWorkspace') {
    const session = await requirePcSession(event);
    const { organization } = await organizationProfile(session.platformUserId);
    if (!organization) throw new Error('请先完成组织开户');
    const preferredWorkspace = event.preferredWorkspace === 'education' ? 'education' : 'tournament';
    await patch(COLLECTIONS.organizations, organization._id, { primaryWorkspace: preferredWorkspace, updatedAt: now() });
    return { ok: true, preferredWorkspace };
  }
  if (action === 'updateOrganizationProfile') {
    const session = await requirePcSession(event);
    const { organization } = await organizationProfile(session.platformUserId);
    if (!organization) throw new Error('请先完成组织开户');
    const { identityType, profile } = normalizedIdentityProfile(event);
    await patch(COLLECTIONS.organizations, organization._id, { name: profile.entityName, identityType, identityProfile: profile, updatedAt: now() });
    return { ok: true };
  }
  if (action === 'createRegistrationQr') {
    const session = await requirePcSession(event);
    await ensureCollections([COLLECTIONS.tournaments, COLLECTIONS.tournamentInvites, COLLECTIONS.identities]);
    const { organization } = await organizationProfile(session.platformUserId);
    if (!organization) throw new Error('请先完成机构开户');
    const source = event.tournament && typeof event.tournament === 'object' ? event.tournament : {};
    const eventId = clean(source.eventId, 64);
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(eventId)) throw new Error('赛事编号格式不正确');
    const name = clean(source.name || '篮球赛事', 100);
    const existingTournament = await first(COLLECTIONS.tournaments, { eventId });
    if (existingTournament && existingTournament.organizationId && existingTournament.organizationId !== organization.organizationId) throw new Error('该赛事已属于其他机构');
    const miniIdentity = await first(COLLECTIONS.identities, { platformUserId: session.platformUserId, surface: 'mini_program', status: 'active' });
    await upsert(COLLECTIONS.tournaments, { eventId }, {
      name,
      scenarioType: clean(source.scenarioType || 'other', 40),
      competitionFormat: clean(source.competitionFormat || 'single_round_robin', 50),
      status: 'recruiting',
      description: clean(source.description, 500),
      organizationId: organization.organizationId,
      organizationName: clean(organization.name || source.organizationName, 100),
      ownerPlatformUserId: session.platformUserId,
      creatorOpenid: clean(existingTournament?.creatorOpenid || miniIdentity?.openid, 100),
      schoolStage: clean(source.schoolStage, 20),
      gradeCode: clean(source.gradeCode, 20),
      gradeName: clean(source.gradeName, 50),
      groupCount: Math.max(2, Math.min(16, Number(source.groupCount || 2))),
      advanceCount: Math.max(1, Math.min(8, Number(source.advanceCount || 2))),
      registrationOpen: true,
      currentRound: Number(existingTournament?.currentRound || 0),
      completedMatches: Number(existingTournament?.completedMatches || 0),
      totalMatches: Number(existingTournament?.totalMatches || 0)
    });
    let invitation = await first(COLLECTIONS.tournamentInvites, { eventId, status: 'active' });
    if (!invitation) {
      const inviteKey = crypto.randomBytes(6).toString('base64url').slice(0, 8);
      await add(COLLECTIONS.tournamentInvites, { invitationId: id('invite'), eventId, inviteKey, status: 'active', createdByPlatformUserId: session.platformUserId, createdAt: now(), updatedAt: now() });
      invitation = await first(COLLECTIONS.tournamentInvites, { eventId, status: 'active' });
    }
    const qrResponse = await cloud.callFunction({ name: 'sxCreateTournamentQrCode', data: { eventId, inviteKey: invitation.inviteKey, page: 'pages/tournament-register/index', envVersion: REGISTRATION_QR_ENV_VERSION } });
    const qr = qrResponse && qrResponse.result ? qrResponse.result : qrResponse;
    if (!qr || !qr.ok || (!qr.url && !qr.fileID)) throw new Error('报名二维码生成失败');
    await audit('tournament.registration.qr.create', session.platformUserId, eventId, { organizationId: organization.organizationId, inviteKey: invitation.inviteKey, envVersion: REGISTRATION_QR_ENV_VERSION });
    return { ok: true, eventId, tournamentName: name, inviteKey: invitation.inviteKey, qrUrl: qr.url || '', qrFileID: qr.fileID || '', miniProgramPage: 'pages/tournament-register/index', envVersion: REGISTRATION_QR_ENV_VERSION };
  }
  if (action === 'listRegistrationTeams') {
    const session = await requirePcSession(event);
    await ensureCollections([COLLECTIONS.tournaments, 'sx_tournament_teams']);
    const { organization } = await organizationProfile(session.platformUserId);
    if (!organization) throw new Error('请先完成机构开户');
    const eventId = clean(event.eventId, 64);
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(eventId)) throw new Error('赛事编号格式不正确');
    const tournament = await first(COLLECTIONS.tournaments, { eventId });
    if (!tournament) throw new Error('赛事尚未同步到云端，请先生成报名码');
    if (tournament.organizationId && tournament.organizationId !== organization.organizationId) throw new Error('无权查看该赛事报名数据');
    const result = await db.collection('sx_tournament_teams').where({ eventId }).limit(500).get();
    const teams = (result.data || []).filter((team) => team.status !== 'withdrawn').map((team) => ({
      teamId: clean(team.teamId, 100),
      sourceTeamId: clean(team.sourceTeamId, 100),
      name: clean(team.name, 100),
      logo: clean(team.logo, 500),
      coachName: clean(team.coachName, 50),
      phone: clean(team.phone, 30),
      group: clean(team.groupName || team.group || '', 60),
      status: clean(team.status, 30),
      reviewNote: clean(team.reviewNote, 200),
      submittedAt: Number(team.submittedAt || 0),
      reviewedAt: Number(team.reviewedAt || 0),
      updatedAt: Number(team.updatedAt || team.submittedAt || 0),
      players: list(team.players, 50).map((player) => ({
        id: clean(player.id || player.playerId, 100),
        name: clean(player.name, 50),
        number: clean(player.number, 10),
        birth: clean(player.birth, 30),
        position: clean(player.position, 30)
      }))
    }));
    return { ok: true, eventId, teams, syncedAt: now() };
  }
  if (action === 'reviewRegistrationTeam') {
    const session = await requirePcSession(event);
    await ensureCollections([COLLECTIONS.tournaments, COLLECTIONS.tournamentTeams, COLLECTIONS.tournamentTasks, COLLECTIONS.serviceOutbox]);
    const { organization } = await organizationProfile(session.platformUserId);
    if (!organization) throw new Error('请先完成机构开户');
    const eventId = clean(event.eventId, 64);
    const teamId = clean(event.teamId, 100);
    const decision = event.decision === 'approve' ? 'approve' : event.decision === 'reject' ? 'reject' : '';
    const note = clean(event.note, 200);
    if (!eventId || !teamId || !decision) throw new Error('审核参数不完整');
    if (decision === 'reject' && !note) throw new Error('驳回时请填写需要补充的资料');
    const tournament = await first(COLLECTIONS.tournaments, { eventId });
    if (!tournament) throw new Error('赛事不存在');
    if (tournament.organizationId && tournament.organizationId !== organization.organizationId) throw new Error('无权审核该赛事');
    const team = await first(COLLECTIONS.tournamentTeams, { eventId, teamId });
    if (!team) throw new Error('报名球队不存在');
    const status = decision === 'approve' ? 'approved' : 'rejected';
    const reviewedAt = now();
    await patch(COLLECTIONS.tournamentTeams, team._id, { status, reviewNote: note, reviewedAt, updatedAt: reviewedAt });
    const reviewTask = await first(COLLECTIONS.tournamentTasks, { taskKey: `${eventId}:registration_review:${teamId}` });
    if (reviewTask) await patch(COLLECTIONS.tournamentTasks, reviewTask._id, { status: 'completed', unread: false, resolvedAt: reviewedAt, resolution: status, updatedAt: reviewedAt });
    if (team.ownerOpenid) {
      const statusTaskKey = `${eventId}:registration_status:${teamId}`;
      await upsert(COLLECTIONS.tournamentTasks, { taskKey: statusTaskKey }, {
        taskId: id('ttask'), eventId, recipientOpenid: team.ownerOpenid, type: 'registration_status', status: 'pending', unread: true,
        registrationStatus: status, tournamentName: clean(tournament.name, 100), teamId, teamName: clean(team.name, 100),
        submittedAt: Number(team.submittedAt || 0), detail: status === 'approved' ? '报名审核已通过，请关注后续赛程与任务。' : `报名已被驳回：${note}`
      });
      const notificationId = id('tn');
      await add(COLLECTIONS.serviceOutbox, {
        notificationId, type: 'review', recipientMiniOpenid: team.ownerOpenid, recipientOfficialOpenid: '', status: 'queued', retryCount: 0,
        payload: { eventId, tournamentName: clean(tournament.name, 100), teamName: clean(team.name, 100), playerCount: list(team.players, 50).length, status, note, reviewerName: '赛事主办方', reviewedAtText: new Date(reviewedAt).toISOString().slice(0, 16).replace('T', ' ') },
        createdAt: reviewedAt, updatedAt: reviewedAt
      });
      cloud.callFunction({ name: 'sxTournamentNotification', data: { action: 'deliverNotification', notificationId } }).catch((error) => console.warn('[registration-review] service delivery queued', error.message));
    }
    await audit('tournament.registration.review', session.platformUserId, `${eventId}:${teamId}`, { organizationId: organization.organizationId, decision, status });
    return { ok: true, eventId, teamId, status, reviewNote: note, reviewedAt };
  }
  throw new Error('不支持的PC登录操作');
}

async function matchTaskDomain(action, event) {
  await ensureCollections([COLLECTIONS.tasks, COLLECTIONS.assignments, COLLECTIONS.confirmations]);
  const adminActions = ['create', 'createMany', 'reassign', 'invalidate'];
  if (adminActions.includes(action)) requireAdmin(event);
  if (action === 'create' || action === 'createMany') {
    const items = action === 'create' ? [event.task] : list(event.tasks, 500);
    const ids = [];
    for (const raw of items) {
      const task = raw || {}; const matchTaskId = clean(task.matchTaskId, 100) || id('task');
      const scheduleVersion = Math.max(1, Number(task.scheduleVersion || 1));
      const data = {
        matchTaskId, matchId: clean(task.matchId, 100), tournamentId: clean(task.tournamentId, 100), organizationId: clean(task.organizationId, 100),
        recipientPlatformUserId: clean(task.recipientPlatformUserId, 100), role: clean(task.role, 30), teamScope: clean(task.teamScope, 30),
        tournamentName: clean(task.tournamentName, 100), groupName: clean(task.groupName, 60), matchDate: clean(task.matchDate, 20),
        startTime: clean(task.startTime, 20), venue: clean(task.venue, 120), homeTeamName: clean(task.homeTeamName, 80), awayTeamName: clean(task.awayTeamName, 80),
        scheduleVersion, status: 'pending', firstConfirmationStatus: 'pending', secondConfirmationStatus: 'pending', unread: true,
        deepLinkTarget: clean(task.deepLinkTarget, 300), expiresAt: Number(task.expiresAt || 0), updatedAt: now()
      };
      await upsert(COLLECTIONS.tasks, { matchTaskId }, data); ids.push(matchTaskId);
    }
    return { ok: true, taskIds: ids };
  }
  const user = await requireUser(event);
  if (action === 'listMine') {
    const res = await db.collection(COLLECTIONS.tasks).where({ recipientPlatformUserId: user.platformUserId, status: _.neq('invalid') }).limit(100).get();
    const allowlist = list(event.allowedOrganizationIds, 200).map((value) => clean(value, 100)).filter(Boolean);
    const visible = allowlist.length
      ? (res.data || []).filter((task) => allowlist.includes(task.organizationId))
      : (res.data || []);
    return { ok: true, featureEnabled: true, platformUserId: user.platformUserId, tasks: visible.sort((a, b) => String(a.matchDate + a.startTime).localeCompare(String(b.matchDate + b.startTime))) };
  }
  const matchTaskId = clean(event.matchTaskId, 100); const task = await first(COLLECTIONS.tasks, { matchTaskId });
  if (!task || task.recipientPlatformUserId !== user.platformUserId) throw new Error('任务不存在或无权操作');
  const allowedOrganizationIds = list(event.allowedOrganizationIds, 200).map((value) => clean(value, 100)).filter(Boolean);
  if (allowedOrganizationIds.length && !allowedOrganizationIds.includes(task.organizationId)) throw new Error('该机构尚未开放协同功能');
  if (action === 'accept' || action === 'reject') {
    const status = action === 'accept' ? 'accepted' : 'rejected';
    await patch(COLLECTIONS.tasks, task._id, { status, firstConfirmationStatus: status, unread: false, actedAt: now(), updatedAt: now() });
    await upsert(COLLECTIONS.confirmations, { confirmationKey: `${matchTaskId}:${task.scheduleVersion}:first` }, { matchTaskId, recipientPlatformUserId: user.platformUserId, scheduleVersion: task.scheduleVersion, type: 'first', status, confirmedAt: now() });
    return { ok: true, status };
  }
  if (action === 'confirmSecond') {
    await patch(COLLECTIONS.tasks, task._id, { secondConfirmationStatus: 'confirmed', unread: false, secondConfirmedAt: now(), updatedAt: now() });
    await upsert(COLLECTIONS.confirmations, { confirmationKey: `${matchTaskId}:${task.scheduleVersion}:second` }, { matchTaskId, recipientPlatformUserId: user.platformUserId, scheduleVersion: task.scheduleVersion, type: 'second', status: 'confirmed', confirmedAt: now() });
    return { ok: true, status: 'confirmed' };
  }
  if (action === 'markRead') { await patch(COLLECTIONS.tasks, task._id, { unread: false, updatedAt: now() }); return { ok: true }; }
  throw new Error('不支持的任务操作');
}

async function notificationDomain(action, event) {
  await ensureCollections([COLLECTIONS.tasks, COLLECTIONS.batches, COLLECTIONS.deliveries]);
  requireAdmin(event);
  const taskIds = list(event.matchTaskIds, 500).map((v) => clean(v, 100)).filter(Boolean);
  const tasks = [];
  for (const taskId of taskIds) { const task = await first(COLLECTIONS.tasks, { matchTaskId: taskId }); if (task) tasks.push(task); }
  const channels = ['official_account', 'mini_subscription', 'wechat_share'];
  if (action === 'preview') {
    return { ok: true, taskCount: tasks.length, recipients: tasks.map((t) => ({ matchTaskId: t.matchTaskId, recipientPlatformUserId: t.recipientPlatformUserId, role: t.role, channels })) };
  }
  if (action === 'send') {
    const notificationBatchId = id('nb');
    await add(COLLECTIONS.batches, { notificationBatchId, taskIds, scope: event.scope || {}, status: 'processing', createdAt: now(), updatedAt: now() });
    let created = 0;
    for (const task of tasks) for (const channel of channels) {
      const deliveryKey = `${notificationBatchId}:${task.matchTaskId}:${task.recipientPlatformUserId}:${channel}`;
      const configured = channel === 'wechat_share' || !!process.env[`SXF_${channel.toUpperCase()}_TEMPLATE_ID`];
      await upsert(COLLECTIONS.deliveries, { deliveryKey }, { notificationBatchId, matchTaskId: task.matchTaskId, recipientPlatformUserId: task.recipientPlatformUserId, channel, status: configured ? 'queued' : 'not_configured', scheduleVersion: task.scheduleVersion });
      created++;
    }
    await upsert(COLLECTIONS.batches, { notificationBatchId }, { taskIds, status: 'created', deliveryCount: created, completedAt: now() });
    return { ok: true, notificationBatchId, deliveryCount: created };
  }
  if (action === 'status') {
    const notificationBatchId = clean(event.notificationBatchId, 100);
    const batch = await first(COLLECTIONS.batches, { notificationBatchId });
    const deliveries = await db.collection(COLLECTIONS.deliveries).where({ notificationBatchId }).limit(1000).get();
    return { ok: true, batch, deliveries: deliveries.data || [] };
  }
  throw new Error('不支持的通知操作');
}

async function rosterDomain(action, event) {
  await ensureCollections([COLLECTIONS.rosters, COLLECTIONS.tasks]); const user = await requireUser(event);
  const matchId = clean(event.matchId, 100), teamScope = clean(event.teamScope, 30); const key = `${matchId}:${teamScope}`;
  await requireMatchTaskAccess(user, matchId, { teamScope, allowedRoles: action === 'submit' ? TEAM_MANAGER_ROLES : TEAM_TASK_ROLES, requireAccepted: action === 'submit', allowedOrganizationIds: event.allowedOrganizationIds });
  if (action === 'get') return { ok: true, roster: await first(COLLECTIONS.rosters, { rosterKey: key }) };
  if (action === 'submit') {
    const existing = await first(COLLECTIONS.rosters, { rosterKey: key });
    if (existing && existing.locked) throw new Error('名单已锁定');
    const players = list(event.players, 50).map((p) => ({ playerId: clean(p.playerId, 100), name: clean(p.name, 50), number: clean(p.number, 10), starter: p.starter === true }));
    await upsert(COLLECTIONS.rosters, { rosterKey: key }, { matchId, teamScope, organizationId: clean(event.organizationId, 100), submittedBy: user.platformUserId, players, status: 'submitted', submittedAt: now(), locked: false });
    return { ok: true, playerCount: players.length };
  }
  throw new Error('不支持的名单操作');
}

async function staffDomain(action, event) {
  await ensureCollections([COLLECTIONS.staff, COLLECTIONS.tasks]); const user = await requireUser(event);
  const matchId = clean(event.matchId, 100), teamScope = clean(event.teamScope, 30);
  if (action !== 'accept') {
    await requireMatchTaskAccess(user, matchId, { teamScope, allowedRoles: action === 'list' ? TEAM_TASK_ROLES : TEAM_MANAGER_ROLES, requireAccepted: action !== 'list', allowedOrganizationIds: event.allowedOrganizationIds });
  }
  if (action === 'list') { const res = await db.collection(COLLECTIONS.staff).where({ matchId, teamScope }).limit(20).get(); return { ok: true, staff: res.data || [] }; }
  if (action === 'add' || action === 'invite') {
    const existing = await db.collection(COLLECTIONS.staff).where({ matchId, teamScope, role: 'assistant', status: _.in(['pending', 'joined']) }).limit(10).get();
    if ((existing.data || []).length >= 5) throw new Error('每队最多5名助教');
    const platformUserId = clean(event.platformUserId, 100); const invitationToken = crypto.randomBytes(20).toString('hex');
    const staffId = id('staff');
    await add(COLLECTIONS.staff, { staffId, matchId, teamScope, organizationId: clean(event.organizationId, 100), platformUserId, name: clean(event.name, 50), source: clean(event.source || 'temporary', 30), role: 'assistant', status: platformUserId ? 'joined' : 'pending', invitationTokenHash: hash(invitationToken), invitedBy: user.platformUserId, createdAt: now(), updatedAt: now() });
    return { ok: true, staffId, invitationToken: platformUserId ? '' : invitationToken };
  }
  if (action === 'accept') {
    const tokenHash = hash(event.invitationToken); const record = await first(COLLECTIONS.staff, { invitationTokenHash: tokenHash, status: 'pending' });
    if (!record) throw new Error('邀请已失效');
    const allowedOrganizationIds = list(event.allowedOrganizationIds, 200).map((value) => clean(value, 100)).filter(Boolean);
    if (allowedOrganizationIds.length && !allowedOrganizationIds.includes(record.organizationId)) throw new Error('该机构尚未开放协同功能');
    await patch(COLLECTIONS.staff, record._id, { platformUserId: user.platformUserId, status: 'joined', joinedAt: now(), invitationTokenHash: '', updatedAt: now() });
    return { ok: true, staffId: record.staffId };
  }
  throw new Error('不支持的助教操作');
}

async function statDomain(action, event) {
  await ensureCollections([COLLECTIONS.stats, COLLECTIONS.rosters, COLLECTIONS.tasks]); const user = await requireUser(event);
  const matchId = clean(event.matchId, 100), teamScope = clean(event.teamScope, 30);
  await requireMatchTaskAccess(user, matchId, { teamScope, allowedRoles: action === 'list' ? TEAM_TASK_ROLES : TEAM_MANAGER_ROLES, requireAccepted: action !== 'list', allowedOrganizationIds: event.allowedOrganizationIds });
  const roster = await first(COLLECTIONS.rosters, { rosterKey: `${matchId}:${teamScope}` });
  if (roster && roster.locked) throw new Error('开赛后分工已锁定');
  if (action === 'list') { const res = await db.collection(COLLECTIONS.stats).where({ matchId, teamScope, status: 'active' }).limit(500).get(); return { ok: true, assignments: res.data || [] }; }
  if (action === 'assign') {
    const owner = clean(event.ownerPlatformUserId, 100), mode = clean(event.mode, 20); const objectKeys = list(event.objectKeys, 100).map((v) => clean(v, 100)).filter(Boolean);
    for (const objectKey of objectKeys) {
      const assignmentKey = `${matchId}:${teamScope}:${mode}:${objectKey}`;
      const existing = await first(COLLECTIONS.stats, { assignmentKey, status: 'active' });
      if (existing && existing.ownerPlatformUserId !== owner) throw new Error(`已由其他教练负责: ${objectKey}`);
      await upsert(COLLECTIONS.stats, { assignmentKey }, { matchId, teamScope, mode, objectKey, ownerPlatformUserId: owner, assignedBy: user.platformUserId, status: 'active' });
    }
    return { ok: true, assigned: objectKeys.length };
  }
  if (action === 'unassign') {
    const assignment = await first(COLLECTIONS.stats, { assignmentKey: clean(event.assignmentKey, 300), status: 'active' });
    if (!assignment) return { ok: true, removed: false };
    await patch(COLLECTIONS.stats, assignment._id, { status: 'cancelled', cancelledBy: user.platformUserId, updatedAt: now() });
    return { ok: true, removed: true };
  }
  throw new Error('不支持的分工操作');
}

async function readinessDomain(action, event) {
  await ensureCollections([COLLECTIONS.tasks, COLLECTIONS.rosters, COLLECTIONS.staff]);
  const matchId = clean(event.matchId, 100);
  if (action === 'status' && !hasAdminToken(event)) {
    const user = await requireUser(event);
    await requireMatchTaskAccess(user, matchId, { allowedOrganizationIds: event.allowedOrganizationIds });
  }
  const tasks = await db.collection(COLLECTIONS.tasks).where({ matchId }).limit(20).get();
  const rosters = await db.collection(COLLECTIONS.rosters).where({ matchId, status: 'submitted' }).limit(10).get();
  const taskList = tasks.data || [], rosterList = rosters.data || [];
  const refereeAccepted = taskList.some((t) => t.role === 'referee' && t.status === 'accepted');
  const homeRoster = rosterList.some((r) => r.teamScope === 'home'); const awayRoster = rosterList.some((r) => r.teamScope === 'away');
  const ready = refereeAccepted && homeRoster && awayRoster;
  if (action === 'status') return { ok: true, ready, refereeAccepted, homeRoster, awayRoster };
  if (action === 'start') {
    requireAdmin(event); if (!ready) throw new Error('主裁判或双方名单尚未完成');
    for (const roster of rosterList) await patch(COLLECTIONS.rosters, roster._id, { locked: true, lockedAt: now(), updatedAt: now() });
    for (const task of taskList) await patch(COLLECTIONS.tasks, task._id, { onsiteOpened: true, onsiteOpenedAt: now(), updatedAt: now() });
    await audit('match.onsite.open', '', matchId, { refereeAccepted, homeRoster, awayRoster });
    return { ok: true, ready: true, onsiteOpened: true };
  }
  throw new Error('不支持的启动操作');
}

exports.main = async (event = {}) => {
  try {
    const domain = clean(event.domain, 40), action = clean(event.action, 40);
    if (!collaborationEnabled(event) && !['identity', 'pcAuth'].includes(domain)) {
      const allowlist = collaborationOrganizationAllowlist();
      if (!allowlist.length && domain === 'matchTask' && action === 'listMine') return { ok: true, featureEnabled: false, tasks: [] };
      if (!allowlist.length) throw new Error('协同功能尚未开放');
      const allowlistedEvent = Object.assign({}, event, { allowedOrganizationIds: allowlist });
      if (domain === 'matchTask') return await matchTaskDomain(action, allowlistedEvent);
      if (domain === 'roster') return await rosterDomain(action, allowlistedEvent);
      if (domain === 'staff') return await staffDomain(action, allowlistedEvent);
      if (domain === 'statAssignment') return await statDomain(action, allowlistedEvent);
      if (domain === 'readiness') return await readinessDomain(action, allowlistedEvent);
      throw new Error('协同功能尚未开放');
    }
    let result;
    if (domain === 'identity') result = await identityDomain(action, event);
    else if (domain === 'pcAuth') result = await pcAuthDomain(action, event);
    else if (domain === 'matchTask') result = await matchTaskDomain(action, event);
    else if (domain === 'notification') result = await notificationDomain(action, event);
    else if (domain === 'roster') result = await rosterDomain(action, event);
    else if (domain === 'staff') result = await staffDomain(action, event);
    else if (domain === 'statAssignment') result = await statDomain(action, event);
    else if (domain === 'readiness') result = await readinessDomain(action, event);
    else throw new Error('不支持的协同领域');
    return result;
  } catch (error) {
    console.error('[sxCollaboration]', error);
    return { ok: false, error: error.message || String(error) };
  }
};

exports._test = { clean, hash, collaborationEnabled };
