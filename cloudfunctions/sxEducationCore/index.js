'use strict';

const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const command = db.command;

const C = {
  users: 'sx_platform_users',
  identities: 'sx_wechat_identities',
  organizations: 'sx_organizations',
  memberships: 'sx_organization_memberships',
  pcSessions: 'sx_pc_login_challenges',
  courses: 'sx_education_courses',
  invites: 'sx_edu_invites',
  noticeLogs: 'sx_edu_notice_logs',
  coaches: 'sx_education_coach_profiles',
  students: 'sx_education_students',
  classes: 'sx_education_classes',
  classMembers: 'sx_education_class_members',
  schedules: 'sx_education_schedules',
  lessons: 'sx_education_lesson_sessions',
  attendance: 'sx_education_attendance',
  performance: 'sx_education_performance',
  packageTemplates: 'sx_education_package_templates',
  studentPackages: 'sx_education_student_packages',
  ledger: 'sx_edu_consume_ledger',
  submissions: 'sx_edu_lesson_submits',
  reviews: 'sx_education_reviews',
  audits: 'sx_education_audit_logs'
};

const MANAGER_ROLES = new Set(['owner', 'campus_manager', 'manager', 'education_manager']);
const COACH_ROLES = new Set(['coach', 'head_coach', 'assistant_coach']);
const RATING_KEYS = ['attitude', 'focus', 'skill', 'fitness', 'teamwork'];
const ATTENDANCE_STATUS = new Set(['present', 'leave', 'absent', 'makeup', 'makeup_no_charge', 'trial']);
const ACTIVE_LESSON_STATUS = new Set(['scheduled', 'live', 'draft', 'returned']);
const UNIT_MINUTES = new Set([60, 90]);
const COURSE_STATUS = new Set(['recruiting', 'paused', 'archived']);
const CLASS_STATUS = new Set(['preparing', 'recruiting', 'full', 'completed', 'active', 'archived']);

const now = () => Date.now();
let educationCollectionsReady = false;
const uid = (prefix) => `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
const clean = (value, length = 120) => String(value || '').trim().slice(0, length);
const list = (value, max = 100) => Array.isArray(value) ? value.slice(0, max) : [];
const hash = (value) => crypto.createHash('sha256').update(String(value || '')).digest('hex');
const integer = (value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.round(parsed))) : fallback;
};
const timeMinutes = (value) => {
  const match = clean(value, 10).match(/^(\d{1,2}):(\d{2})$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : -1;
};
const chinaDate = (timestamp = now()) => new Date(timestamp + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
const dateOffset = (dateText, days) => {
  const timestamp = new Date(`${dateText}T00:00:00+08:00`).getTime() + days * 24 * 60 * 60 * 1000;
  return chinaDate(timestamp);
};

async function first(name, query) {
  const result = await db.collection(name).where(query).limit(1).get();
  return result.data && result.data[0] ? result.data[0] : null;
}

async function ensureEducationCollections() {
  if (educationCollectionsReady) return;
  for (const name of [C.courses, C.invites, C.noticeLogs]) {
    try { await db.collection(name).limit(1).get(); }
    catch (error) { try { await db.createCollection(name); } catch (ignored) {} }
  }
  educationCollectionsReady = true;
}

async function all(name, query, limit = 500) {
  const result = await db.collection(name).where(query).limit(Math.min(1000, limit)).get();
  return result.data || [];
}

async function add(name, data) {
  return db.collection(name).add({ data });
}

async function update(name, target, data) {
  return db.collection(name).doc(target._id || target).update({ data: { ...data, updatedAt: now() } });
}

async function upsert(name, query, data) {
  const existing = await first(name, query);
  if (existing) {
    await update(name, existing, data);
    return { ...existing, ...data };
  }
  const createdAt = now();
  await add(name, { ...query, ...data, createdAt, updatedAt: createdAt });
  return first(name, query);
}

function normalizeUnitMinutes(value) {
  const unit = integer(value, 60, 1, 1440);
  if (!UNIT_MINUTES.has(unit)) throw new Error('第一期课包单位只支持60或90分钟');
  return unit;
}

function unitsFromMinutes(minutes, unitMinutes) {
  const unit = normalizeUnitMinutes(unitMinutes);
  return Math.round((integer(minutes, 0) / unit) * 100) / 100;
}

function defaultConsumptionMinutes(status, plannedMinutes, rules = {}) {
  const planned = integer(plannedMinutes, 0, 0, 600);
  const defaults = { present: true, leave: false, absent: true, makeup: true, makeup_no_charge: false, trial: false };
  const enabled = Object.prototype.hasOwnProperty.call(rules, status) ? rules[status] === true : defaults[status] === true;
  return enabled ? planned : 0;
}

function normalizeRatings(value) {
  const source = Array.isArray(value)
    ? Object.fromEntries(value.map((item) => [item && item.key, item && item.rating]))
    : (value && typeof value === 'object' ? value : {});
  const result = {};
  for (const key of RATING_KEYS) {
    const rating = Number(source[key]);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('请完整填写五维1‑5分评分');
    result[key] = rating;
  }
  return result;
}

function composeEvaluation(studentName, ratings, keywords) {
  const normalized = normalizeRatings(ratings);
  const tags = list(keywords, 12).map((item) => clean(item, 20)).filter(Boolean);
  const average = RATING_KEYS.reduce((sum, key) => sum + normalized[key], 0) / RATING_KEYS.length;
  const level = average >= 4.5 ? '突出' : average >= 4 ? '优秀' : average >= 3 ? '达标' : '需继续加强';
  const strengths = tags.slice(0, 3).join('、') || '课堂状态稳定';
  const suggestion = tags.slice(3, 6).join('、') || '保持专注，巩固本节训练内容';
  return `${clean(studentName, 30) || '学员'}本节课综合表现${level}，在${strengths}方面表现较好。下一阶段建议${suggestion}。`;
}

async function actor(event) {
  const sessionToken = clean(event.sessionToken, 500);
  if (sessionToken) {
    const session = await first(C.pcSessions, { sessionHash: hash(sessionToken), status: 'exchanged' });
    if (!session || !session.platformUserId || Number(session.sessionExpiresAt || 0) < now()) throw new Error('PC会话已失效，请重新微信登录');
    const user = await first(C.users, { platformUserId: session.platformUserId });
    return { surface: 'pc', platformUserId: session.platformUserId, openid: '', user };
  }
  const context = cloud.getWXContext();
  const openid = clean(event._callerOpenid || context.FROM_OPENID || context.OPENID, 100);
  if (!openid) throw new Error('请先使用微信登录');
  const identity = await first(C.identities, { identityKey: `mini_program:${openid}`, status: 'active' })
    || await first(C.identities, { openid, surface: 'mini_program', status: 'active' });
  if (!identity || !identity.platformUserId) throw new Error('小程序身份尚未绑定平台账号');
  const user = await first(C.users, { platformUserId: identity.platformUserId });
  return { surface: 'mini_program', platformUserId: identity.platformUserId, openid, user };
}

async function access(event, currentActor) {
  const organizationId = clean(event.organizationId, 100);
  let membership = organizationId
    ? await first(C.memberships, { organizationId, platformUserId: currentActor.platformUserId, status: 'active' })
    : null;
  if (!membership) {
    const memberships = await all(C.memberships, { platformUserId: currentActor.platformUserId, status: 'active' }, 50);
    membership = memberships[0] || null;
  }
  if (!membership) throw new Error('当前账号不属于任何机构');
  const organization = await first(C.organizations, { organizationId: membership.organizationId });
  if (!organization) throw new Error('机构不存在');
  return { actor: currentActor, membership, organization, organizationId: membership.organizationId };
}

function allowedCampusIds(membership) {
  const values = [
    ...list(membership.campusIds, 100),
    ...list(membership.scopes, 100).filter((item) => String(item).startsWith('campus:')).map((item) => String(item).slice(7))
  ].map((item) => clean(item, 100)).filter(Boolean);
  return [...new Set(values)];
}

function assertPcManager(ctx, campusId = '') {
  if (ctx.actor.surface !== 'pc') throw new Error('该操作仅限PC端机构/校区负责人');
  if (!MANAGER_ROLES.has(clean(ctx.membership.role, 40))) throw new Error('无PC教务管理权限');
  if (ctx.membership.role === 'owner' || !campusId) return;
  const allowed = allowedCampusIds(ctx.membership);
  if (allowed.length && !allowed.includes(clean(campusId, 100))) throw new Error('无权操作该校区');
}

async function assertMiniCoach(ctx, lesson = null) {
  if (ctx.actor.surface !== 'mini_program') throw new Error('教练只能在小程序执行课堂任务');
  const profile = await first(C.coaches, { organizationId: ctx.organizationId, platformUserId: ctx.actor.platformUserId, status: 'active' });
  if (!profile && !COACH_ROLES.has(clean(ctx.membership.role, 40))) throw new Error('当前账号不是机构教练');
  if (lesson && lesson.coachPlatformUserId && lesson.coachPlatformUserId !== ctx.actor.platformUserId) throw new Error('只能操作本人负责的课堂');
  return profile;
}

async function audit(ctx, action, target, detail = {}) {
  await add(C.audits, {
    auditId: uid('edu_audit'), organizationId: ctx.organizationId, campusId: clean(detail.campusId, 100),
    actorPlatformUserId: ctx.actor.platformUserId, actorSurface: ctx.actor.surface,
    action, target: clean(target, 200), detail, createdAt: now()
  });
}

function baseQuery(ctx, event) {
  const query = { organizationId: ctx.organizationId };
  const campusId = clean(event.campusId, 100);
  if (campusId) query.campusId = campusId;
  return query;
}

async function listDomain(name, ctx, event, limit = 500) {
  if (ctx.actor.surface === 'pc') assertPcManager(ctx, event.campusId);
  return all(name, baseQuery(ctx, event), limit);
}

async function courseDomain(action, ctx, event) {
  assertPcManager(ctx, event.campusId);
  if (action === 'list') {
    const courses = await listDomain(C.courses, ctx, event);
    const [templates, classes] = await Promise.all([all(C.packageTemplates, baseQuery(ctx, event), 1000), all(C.classes, baseQuery(ctx, event), 1000)]);
    return { ok: true, courses: courses.map((course) => ({
      ...course,
      packageCount: templates.filter((item) => item.courseId === course.courseId && item.status !== 'inactive').length,
      classCount: classes.filter((item) => item.courseId === course.courseId && !['completed', 'archived'].includes(item.status)).length
    })) };
  }
  if (action === 'detail') {
    const course = await first(C.courses, { organizationId: ctx.organizationId, courseId: clean(event.courseId, 100) });
    if (!course) throw new Error('课程不存在');
    const [packages, classes] = await Promise.all([
      all(C.packageTemplates, { organizationId: ctx.organizationId, courseId: course.courseId }, 100),
      all(C.classes, { organizationId: ctx.organizationId, courseId: course.courseId }, 100)
    ]);
    return { ok: true, course, packages, classes };
  }
  if (action === 'upsert') {
    const source = event.course || {};
    const courseId = clean(source.courseId, 100) || uid('course');
    const existing = await first(C.courses, { organizationId: ctx.organizationId, courseId });
    const defaultUnitMinutes = normalizeUnitMinutes(source.defaultUnitMinutes || (existing && existing.defaultUnitMinutes) || 60);
    const data = {
      organizationId: ctx.organizationId,
      campusId: clean(source.campusId || event.campusId || (existing && existing.campusId), 100),
      name: clean(source.name || (existing && existing.name), 80),
      category: clean(source.category || (existing && existing.category) || '篮球训练', 40),
      ageMin: integer(source.ageMin, Number(existing && existing.ageMin || 4), 2, 80),
      ageMax: integer(source.ageMax, Number(existing && existing.ageMax || 18), 2, 80),
      defaultUnitMinutes,
      description: clean(source.description || (existing && existing.description), 500),
      status: COURSE_STATUS.has(source.status) ? source.status : clean(existing && existing.status || 'recruiting', 30)
    };
    if (!data.name || data.ageMax < data.ageMin) throw new Error('请填写正确的课程名称和适龄范围');
    const course = await upsert(C.courses, { courseId }, data);
    await audit(ctx, 'education.course.upsert', courseId, { campusId: data.campusId });
    return { ok: true, course };
  }
  if (action === 'status') {
    const course = await first(C.courses, { organizationId: ctx.organizationId, courseId: clean(event.courseId, 100) });
    if (!course || !COURSE_STATUS.has(event.status)) throw new Error('课程或状态无效');
    await update(C.courses, course, { status: event.status });
    await audit(ctx, 'education.course.status', course.courseId, { campusId: course.campusId, status: event.status });
    return { ok: true, status: event.status };
  }
  throw new Error('不支持的课程操作');
}

async function acceptCoachInvite(currentActor, event) {
  if (currentActor.surface !== 'mini_program') throw new Error('教练邀请只能在小程序接受');
  const token = clean(event.invitationToken, 200);
  const invitation = await first(C.invites, { tokenHash: hash(token), type: 'coach', status: 'pending' });
  if (!invitation || Number(invitation.expiresAt || 0) < now()) throw new Error('教练邀请已失效');
  const organization = await first(C.organizations, { organizationId: invitation.organizationId });
  if (!organization) throw new Error('邀请机构不存在');
  const profile = event.profile || {};
  const name = clean(profile.name || (currentActor.user && currentActor.user.nickName), 50);
  const phone = clean(profile.phone, 30);
  if (!name || !phone) throw new Error('请填写教练姓名和手机号');
  const existingMembership = await first(C.memberships, { organizationId: invitation.organizationId, platformUserId: currentActor.platformUserId });
  if (!existingMembership) {
    await add(C.memberships, {
      membershipId: uid('org_member'), organizationId: invitation.organizationId, platformUserId: currentActor.platformUserId,
      role: 'coach', campusIds: invitation.campusId ? [invitation.campusId] : [], scopes: ['education:coach:self'], status: 'active', createdAt: now(), updatedAt: now()
    });
  } else if (existingMembership.status !== 'active') await update(C.memberships, existingMembership, { status: 'active' });
  const coachId = clean(invitation.coachId, 100) || uid('coach');
  const coach = await upsert(C.coaches, { organizationId: invitation.organizationId, platformUserId: currentActor.platformUserId }, {
    coachId, campusId: invitation.campusId, name, phone,
    specialties: list(profile.specialties, 20).map((item) => clean(item, 30)), role: 'coach', status: 'active', joinedAt: now(), lastUsedAt: now()
  });
  await update(C.invites, invitation, { status: 'accepted', acceptedByPlatformUserId: currentActor.platformUserId, acceptedAt: now(), tokenHash: '' });
  await add(C.audits, { auditId: uid('edu_audit'), organizationId: invitation.organizationId, campusId: invitation.campusId, actorPlatformUserId: currentActor.platformUserId, actorSurface: 'mini_program', action: 'education.coach.invite.accept', target: invitation.inviteId, detail: { coachId }, createdAt: now() });
  return { ok: true, organizationId: invitation.organizationId, coach };
}

async function coachDomain(action, ctx, event) {
  assertPcManager(ctx, event.campusId);
  if (action === 'list') {
    const coaches = await listDomain(C.coaches, ctx, event);
    const classes = await all(C.classes, baseQuery(ctx, event), 1000);
    return { ok: true, coaches: coaches.map((coach) => ({ ...coach, classCount: classes.filter((item) => item.primaryCoachPlatformUserId === coach.platformUserId || list(item.assistantCoachPlatformUserIds, 20).includes(coach.platformUserId)).length })) };
  }
  if (action === 'detail') {
    const coach = await first(C.coaches, { organizationId: ctx.organizationId, coachId: clean(event.coachId, 100) });
    if (!coach) throw new Error('教练不存在');
    const classes = await all(C.classes, { organizationId: ctx.organizationId }, 1000);
    return { ok: true, coach, classes: classes.filter((item) => item.primaryCoachPlatformUserId === coach.platformUserId || list(item.assistantCoachPlatformUserIds, 20).includes(coach.platformUserId)) };
  }
  if (action === 'inviteCreate') {
    const token = crypto.randomBytes(20).toString('base64url');
    const inviteId = uid('edu_invite');
    const campusId = clean(event.campusId, 100);
    const expiresAt = now() + 24 * 60 * 60 * 1000;
    await add(C.invites, { inviteId, type: 'coach', organizationId: ctx.organizationId, campusId, tokenHash: hash(token), status: 'pending', expiresAt, createdByPlatformUserId: ctx.actor.platformUserId, createdAt: now(), updatedAt: now() });
    let qr = {};
    try {
      const response = await cloud.callFunction({ name: 'sxCreateTournamentQrCode', data: { mode: 'educationCoach', inviteId, educationInvite: token, page: 'pages/education/index', envVersion: process.env.SXF_EDUCATION_QR_ENV_VERSION || 'trial' } });
      qr = response && response.result || {};
    } catch (error) { console.warn('[education-coach-invite] qr generation failed', error.message); }
    const inviteLink = qr.urlLink || `https://www.sxfbasketball.cn/education-coach-invite.html?token=${encodeURIComponent(token)}`;
    await audit(ctx, 'education.coach.invite.create', inviteId, { campusId, expiresAt });
    return { ok: true, inviteId, invitationToken: token, inviteLink, qrUrl: qr.url || '', qrFileID: qr.fileID || '', expiresAt, status: 'pending' };
  }
  if (action === 'inviteList') {
    const invitations = await all(C.invites, { organizationId: ctx.organizationId, type: 'coach' }, 200);
    return { ok: true, invitations: invitations.map((item) => ({ ...item, tokenHash: undefined })) };
  }
  if (action === 'inviteRevoke') {
    const invitation = await first(C.invites, { organizationId: ctx.organizationId, inviteId: clean(event.inviteId, 100), type: 'coach' });
    if (!invitation || invitation.status !== 'pending') throw new Error('邀请已处理或不存在');
    await update(C.invites, invitation, { status: 'revoked', revokedAt: now(), tokenHash: '' });
    await audit(ctx, 'education.coach.invite.revoke', invitation.inviteId, { campusId: invitation.campusId });
    return { ok: true, status: 'revoked' };
  }
  if (action === 'upsert') {
    const source = event.coach || {};
    const platformUserId = clean(source.platformUserId, 100);
    if (!platformUserId) throw new Error('请先通过微信邀请绑定教练账号');
    const coachId = clean(source.coachId, 100) || uid('coach');
    const data = {
      organizationId: ctx.organizationId, campusId: clean(source.campusId || event.campusId, 100), platformUserId,
      name: clean(source.name, 50), phone: clean(source.phone, 30), specialties: list(source.specialties, 20).map((item) => clean(item, 30)),
      role: clean(source.role || 'coach', 30), status: ['active', 'disabled'].includes(source.status) ? source.status : 'active'
    };
    const coach = await upsert(C.coaches, { organizationId: ctx.organizationId, coachId }, data);
    await audit(ctx, 'education.coach.upsert', coachId, { campusId: data.campusId });
    return { ok: true, coach };
  }
  throw new Error('不支持的教练操作');
}

async function studentDomain(action, ctx, event) {
  assertPcManager(ctx, event.campusId);
  if (action === 'list') {
    const students = await listDomain(C.students, ctx, event);
    const [members, packages, classes, courses] = await Promise.all([all(C.classMembers, baseQuery(ctx, event), 1000), all(C.studentPackages, baseQuery(ctx, event), 1000), all(C.classes, baseQuery(ctx, event), 1000), all(C.courses, baseQuery(ctx, event), 1000)]);
    const enriched = students.map((student) => {
      const member = members.find((item) => item.studentId === student.studentId && item.status === 'active');
      const studentPackage = packages.find((item) => item.studentId === student.studentId && item.status === 'active');
      return { ...student, className: classes.find((item) => item.classId === (member && member.classId))?.name || '', courseName: courses.find((item) => item.courseId === (studentPackage && studentPackage.courseId))?.name || '', remainingMinutes: Number(studentPackage && studentPackage.remainingMinutes || 0), unitMinutes: Number(studentPackage && studentPackage.unitMinutes || 60), validTo: studentPackage && studentPackage.validTo || '' };
    });
    const fileList = enriched.map((item) => item.avatarUrl).filter((value) => String(value || '').startsWith('cloud://'));
    if (fileList.length) {
      try { const response = await cloud.getTempFileURL({ fileList }); const urls = Object.fromEntries((response.fileList || []).map((item) => [item.fileID, item.tempFileURL])); enriched.forEach((item) => { if (urls[item.avatarUrl]) item.avatarUrl = urls[item.avatarUrl]; }); } catch (error) {}
    }
    return { ok: true, students: enriched };
  }
  if (action === 'detail') {
    const student = await first(C.students, { organizationId: ctx.organizationId, studentId: clean(event.studentId, 100) });
    if (!student) throw new Error('学员不存在');
    const [packages, members, attendance] = await Promise.all([all(C.studentPackages, { organizationId: ctx.organizationId, studentId: student.studentId }, 100), all(C.classMembers, { organizationId: ctx.organizationId, studentId: student.studentId }, 100), all(C.attendance, { organizationId: ctx.organizationId, studentId: student.studentId }, 50)]);
    const activeMember = members.find((item) => item.status === 'active');
    const classInfo = activeMember ? await first(C.classes, { organizationId: ctx.organizationId, classId: activeMember.classId }) : null;
    if (String(student.avatarUrl || '').startsWith('cloud://')) { try { const response = await cloud.getTempFileURL({ fileList: [student.avatarUrl] }); if (response.fileList && response.fileList[0] && response.fileList[0].tempFileURL) student.avatarUrl = response.fileList[0].tempFileURL; } catch (error) {} }
    return { ok: true, student, packages, classInfo, attendance: attendance.sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0)).slice(0, 10) };
  }
  if (action === 'gateGet' || action === 'gateRotate') {
    const campusId = clean(event.campusId, 100);
    if (action === 'gateRotate') {
      const active = await all(C.invites, { organizationId: ctx.organizationId, campusId, type: 'student_gate', status: 'active' }, 20);
      for (const item of active) await update(C.invites, item, { status: 'rotated', rotatedAt: now() });
    }
    let gate = action === 'gateGet' ? await first(C.invites, { organizationId: ctx.organizationId, campusId, type: 'student_gate', status: 'active' }) : null;
    if (!gate) {
      const gateKey = crypto.randomBytes(18).toString('base64url');
      gate = await upsert(C.invites, { inviteId: uid('edu_gate') }, { type: 'student_gate', organizationId: ctx.organizationId, campusId, gateKey, reusable: true, status: 'active', createdByPlatformUserId: ctx.actor.platformUserId });
    }
    const gateLink = `https://www.sxfbasketball.cn/education-student-onboarding.html?gate=${encodeURIComponent(gate.gateKey)}`;
    return { ok: true, gateId: gate.inviteId, gateKey: gate.gateKey, gateLink, qrUrl: gate.serviceQrUrl || '', status: gate.status };
  }
  if (action === 'gateQrRefresh') {
    const gate = await first(C.invites, { organizationId: ctx.organizationId, inviteId: clean(event.gateId, 100), type: 'student_gate', status: 'active' });
    if (!gate) throw new Error('建档码不存在或已停用');
    if (gate.serviceQrUrl && Number(gate.serviceQrExpiresAt || 0) >= now() + 24 * 60 * 60 * 1000) return { ok: true, gateId: gate.inviteId, qrUrl: gate.serviceQrUrl, expiresAt: gate.serviceQrExpiresAt, cached: true };
    const response = await cloud.callFunction({ name: 'sxTournamentNotification', data: { action: 'createEducationParentQr', gateKey: gate.gateKey, organizationId: ctx.organizationId, campusId: gate.campusId || '' } });
    const qr = response && response.result || {};
    if (!qr.ok || !qr.qrUrl) throw new Error(qr.message || '服务号建档二维码生成失败');
    await update(C.invites, gate, { serviceGateId: qr.gateId, serviceQrUrl: qr.qrUrl, serviceQrFileID: qr.qrFileID, serviceQrExpiresAt: qr.expiresAt });
    return { ok: true, gateId: gate.inviteId, qrUrl: qr.qrUrl, expiresAt: qr.expiresAt, cached: false };
  }
  if (action === 'gateDisable') {
    const gate = await first(C.invites, { organizationId: ctx.organizationId, inviteId: clean(event.gateId, 100), type: 'student_gate' });
    if (!gate) throw new Error('建档码不存在');
    await update(C.invites, gate, { status: 'disabled', disabledAt: now() });
    await audit(ctx, 'education.student.gate.disable', gate.inviteId, { campusId: gate.campusId });
    return { ok: true, status: 'disabled' };
  }
  if (action === 'confirm' || action === 'reject') {
    const student = await first(C.students, { organizationId: ctx.organizationId, studentId: clean(event.studentId, 100) });
    if (!student || student.confirmationStatus !== 'pending') throw new Error('待确认学员不存在或已处理');
    if (action === 'reject') {
      const reason = clean(event.reason, 300); if (!reason) throw new Error('请填写退回原因');
      await update(C.students, student, { confirmationStatus: 'rejected', status: 'inactive', reviewReason: reason, reviewedAt: now(), reviewedByPlatformUserId: ctx.actor.platformUserId });
      await audit(ctx, 'education.student.reject', student.studentId, { campusId: student.campusId, reason });
      return { ok: true, status: 'rejected' };
    }
    const setup = event.setup || {};
    const course = await first(C.courses, { organizationId: ctx.organizationId, courseId: clean(setup.courseId, 100) });
    const template = await first(C.packageTemplates, { organizationId: ctx.organizationId, templateId: clean(setup.templateId, 100) });
    if (!course || !template || template.courseId !== course.courseId) throw new Error('请选择同一课程下的有效课包');
    const classId = clean(setup.classId, 100);
    const classInfo = classId ? await first(C.classes, { organizationId: ctx.organizationId, classId }) : null;
    if (classInfo && classInfo.courseId !== course.courseId) throw new Error('班级与课程不一致');
    if (classInfo) {
      const currentMembers = await all(C.classMembers, { organizationId: ctx.organizationId, classId, status: 'active' }, 500);
      if (currentMembers.length >= Number(classInfo.capacity || 20)) throw new Error('目标班级已满');
    }
    const studentPackageId = uid('student_pkg');
    const validFrom = clean(setup.validFrom, 20) || chinaDate();
    const validTo = clean(setup.validTo, 20);
    await add(C.studentPackages, {
      studentPackageId, organizationId: ctx.organizationId, campusId: student.campusId, studentId: student.studentId, classId, courseId: course.courseId,
      templateId: template.templateId, templateVersion: Number(template.version || 1), name: template.name, unitMinutes: template.unitMinutes,
      totalMinutes: template.totalMinutes, giftMinutes: template.giftMinutes, paidRemainingMinutes: template.totalMinutes, giftRemainingMinutes: template.giftMinutes,
      remainingMinutes: Number(template.totalMinutes || 0) + Number(template.giftMinutes || 0), saleAmountCents: Math.max(0, integer(setup.saleAmountCents, Number(template.priceCents || 0), 0, 1000000000)),
      validFrom, validTo, status: 'active', unitLocked: false, firstConsumedAt: 0, createdAt: now(), updatedAt: now()
    });
    if (classInfo) {
      await upsert(C.classMembers, { memberKey: `${classId}:${student.studentId}` }, { organizationId: ctx.organizationId, campusId: student.campusId, classId, studentId: student.studentId, defaultStudentPackageId: studentPackageId, status: 'active' });
    }
    await update(C.students, student, { confirmationStatus: 'confirmed', status: classInfo ? 'active' : 'waiting_class', admissionDate: clean(setup.admissionDate, 20) || validFrom, reviewedAt: now(), reviewedByPlatformUserId: ctx.actor.platformUserId });
    await update(C.packageTemplates, template, { assignedCount: Number(template.assignedCount || 0) + 1 });
    await audit(ctx, 'education.student.confirm', student.studentId, { campusId: student.campusId, courseId: course.courseId, templateId: template.templateId, classId });
    return { ok: true, status: classInfo ? 'active' : 'waiting_class', studentPackageId };
  }
  if (action === 'upsert') {
    const source = event.student || {};
    const studentId = clean(source.studentId, 100) || uid('student');
    const data = {
      organizationId: ctx.organizationId, campusId: clean(source.campusId || event.campusId, 100),
      name: clean(source.name, 50), birthDate: clean(source.birthDate, 20), gender: clean(source.gender, 10),
      guardianName: clean(source.guardianName, 50), guardianPlatformUserId: clean(source.guardianPlatformUserId, 100),
      guardianPhone: clean(source.guardianPhone, 30), guardianRelation: clean(source.guardianRelation, 20), avatarUrl: clean(source.avatarUrl, 500),
      school: clean(source.school, 100), grade: clean(source.grade, 30), source: clean(source.source || 'pc_manual', 30),
      confirmationStatus: clean(source.confirmationStatus || 'confirmed', 30), status: ['active', 'inactive', 'waiting_class', 'pending'].includes(source.status) ? source.status : 'active'
    };
    if (!data.name) throw new Error('学员姓名不能为空');
    const student = await upsert(C.students, { organizationId: ctx.organizationId, studentId }, data);
    await audit(ctx, 'education.student.upsert', studentId, { campusId: data.campusId });
    return { ok: true, student };
  }
  throw new Error('不支持的学员操作');
}

async function classDomain(action, ctx, event) {
  assertPcManager(ctx, event.campusId);
  if (action === 'list') {
    const classes = await listDomain(C.classes, ctx, event);
    const [courses, coaches, members, schedules] = await Promise.all([all(C.courses, baseQuery(ctx, event), 1000), all(C.coaches, baseQuery(ctx, event), 1000), all(C.classMembers, baseQuery(ctx, event), 1000), all(C.schedules, baseQuery(ctx, event), 1000)]);
    return { ok: true, classes: classes.map((item) => ({ ...item,
      courseName: courses.find((course) => course.courseId === item.courseId)?.name || '',
      coachName: coaches.find((coach) => coach.platformUserId === item.primaryCoachPlatformUserId)?.name || '',
      studentCount: members.filter((member) => member.classId === item.classId && member.status === 'active').length,
      scheduleSummary: schedules.filter((schedule) => schedule.classId === item.classId && schedule.status === 'active').map((schedule) => `周${'一二三四五六日'[Number(schedule.weekday || 1) - 1]} ${schedule.startTime}`).join('、')
    })) };
  }
  if (action === 'detail') {
    const classInfo = await first(C.classes, { organizationId: ctx.organizationId, classId: clean(event.classId, 100) });
    if (!classInfo) throw new Error('班级不存在');
    const [course, coach, members, schedules] = await Promise.all([
      first(C.courses, { organizationId: ctx.organizationId, courseId: classInfo.courseId }),
      first(C.coaches, { organizationId: ctx.organizationId, platformUserId: classInfo.primaryCoachPlatformUserId }),
      all(C.classMembers, { organizationId: ctx.organizationId, classId: classInfo.classId, status: 'active' }, 500),
      all(C.schedules, { organizationId: ctx.organizationId, classId: classInfo.classId }, 100)
    ]);
    const students = [];
    for (const member of members) { const student = await first(C.students, { organizationId: ctx.organizationId, studentId: member.studentId }); if (student) students.push(student); }
    return { ok: true, classInfo, course, coach, students, schedules };
  }
  if (action === 'upsert') {
    const source = event.classInfo || {};
    const classId = clean(source.classId, 100) || uid('class');
    const data = {
      organizationId: ctx.organizationId, campusId: clean(source.campusId || event.campusId, 100), name: clean(source.name, 80),
      courseId: clean(source.courseId, 100), startDate: clean(source.startDate, 20),
      primaryCoachPlatformUserId: clean(source.primaryCoachPlatformUserId, 100), assistantCoachPlatformUserIds: list(source.assistantCoachPlatformUserIds, 10).map((item) => clean(item, 100)),
      venue: clean(source.venue, 100), capacity: integer(source.capacity, 20, 1, 200),
      defaultPackageTemplateId: clean(source.defaultPackageTemplateId, 100),
      consumptionRules: source.consumptionRules && typeof source.consumptionRules === 'object' ? source.consumptionRules : {},
      performanceRequired: source.performanceRequired !== false, status: CLASS_STATUS.has(source.status) ? source.status : 'preparing'
    };
    const course = await first(C.courses, { organizationId: ctx.organizationId, courseId: data.courseId });
    const coach = await first(C.coaches, { organizationId: ctx.organizationId, platformUserId: data.primaryCoachPlatformUserId, status: 'active' });
    if (!data.name || !course || !coach) throw new Error('请填写班级名称，并选择有效课程和主教练');
    const classInfo = await upsert(C.classes, { organizationId: ctx.organizationId, classId }, data);
    await audit(ctx, 'education.class.upsert', classId, { campusId: data.campusId });
    return { ok: true, classInfo };
  }
  if (action === 'memberUpsert') {
    const source = event.member || {};
    const classId = clean(source.classId, 100), studentId = clean(source.studentId, 100);
    if (!classId || !studentId) throw new Error('请选择班级和学员');
    const classInfo = await first(C.classes, { organizationId: ctx.organizationId, classId });
    const student = await first(C.students, { organizationId: ctx.organizationId, studentId });
    if (!classInfo || !student) throw new Error('班级或学员不存在');
    if ((source.status || 'active') === 'active') {
      const current = await all(C.classMembers, { organizationId: ctx.organizationId, classId, status: 'active' }, 500);
      if (!current.some((item) => item.studentId === studentId) && current.length >= Number(classInfo.capacity || 20)) throw new Error('班级已满，不能继续添加学员');
    }
    const memberKey = `${classId}:${studentId}`;
    const member = await upsert(C.classMembers, { memberKey }, {
      organizationId: ctx.organizationId, campusId: clean(source.campusId || event.campusId, 100), classId, studentId,
      defaultStudentPackageId: clean(source.defaultStudentPackageId, 100), status: ['active', 'removed'].includes(source.status) ? source.status : 'active'
    });
    await audit(ctx, 'education.class.member.upsert', memberKey, { campusId: member.campusId });
    return { ok: true, member };
  }
  throw new Error('不支持的班级操作');
}

async function lessonConflicts(ctx, source, excludeLessonId = '') {
  const lessonDate = clean(source.lessonDate, 20), start = timeMinutes(source.startTime), duration = integer(source.plannedMinutes, 60, 1, 600);
  if (!lessonDate || start < 0) throw new Error('请填写正确的课堂日期和时间');
  const lessons = await all(C.lessons, { organizationId: ctx.organizationId, lessonDate }, 1000);
  const end = start + duration;
  return lessons.filter((item) => item.lessonId !== excludeLessonId && item.status !== 'cancelled').filter((item) => {
    const itemStart = timeMinutes(item.startTime), itemEnd = itemStart + Number(item.plannedMinutes || 60);
    if (itemStart < 0 || !(start < itemEnd && end > itemStart)) return false;
    return item.classId === source.classId || item.coachPlatformUserId === source.coachPlatformUserId || (clean(item.venue, 100) && clean(item.venue, 100) === clean(source.venue, 100));
  }).map((item) => ({ lessonId: item.lessonId, classId: item.classId, coachPlatformUserId: item.coachPlatformUserId, venue: item.venue, startTime: item.startTime, plannedMinutes: item.plannedMinutes }));
}

async function scheduleDomain(action, ctx, event) {
  assertPcManager(ctx, event.campusId);
  if (action === 'list') return { ok: true, schedules: await listDomain(C.schedules, ctx, event) };
  if (action === 'upsert') {
    const source = event.schedule || {};
    const scheduleId = clean(source.scheduleId, 100) || uid('schedule');
    const plannedMinutes = integer(source.plannedMinutes, 60, 1, 600);
    if (![60, 90].includes(plannedMinutes)) throw new Error('第一期排课时长只支持60或90分钟');
    const data = {
      organizationId: ctx.organizationId, campusId: clean(source.campusId || event.campusId, 100), classId: clean(source.classId, 100),
      coachPlatformUserId: clean(source.coachPlatformUserId, 100), weekday: integer(source.weekday, 1, 1, 7),
      startTime: clean(source.startTime, 10), plannedMinutes, venue: clean(source.venue, 100),
      validFrom: clean(source.validFrom, 20), validTo: clean(source.validTo, 20), status: ['active', 'paused'].includes(source.status) ? source.status : 'active'
    };
    if (!data.classId || !data.coachPlatformUserId || !data.startTime) throw new Error('排课缺少班级、教练或开始时间');
    const schedule = await upsert(C.schedules, { organizationId: ctx.organizationId, scheduleId }, data);
    await audit(ctx, 'education.schedule.upsert', scheduleId, { campusId: data.campusId });
    return { ok: true, schedule };
  }
  if (action === 'createLesson') {
    const source = event.lesson || {};
    const lessonId = clean(source.lessonId, 100) || uid('lesson');
    const plannedMinutes = integer(source.plannedMinutes, 60, 1, 600);
    if (![60, 90].includes(plannedMinutes)) throw new Error('第一期课堂时长只支持60或90分钟');
    const data = {
      organizationId: ctx.organizationId, campusId: clean(source.campusId || event.campusId, 100), classId: clean(source.classId, 100),
      scheduleId: clean(source.scheduleId, 100), coachPlatformUserId: clean(source.coachPlatformUserId, 100),
      lessonDate: clean(source.lessonDate, 20), startTime: clean(source.startTime, 10), plannedMinutes,
      venue: clean(source.venue, 100), status: 'scheduled', version: 0, performanceRequired: source.performanceRequired !== false
    };
    if (!data.classId || !data.coachPlatformUserId || !data.lessonDate) throw new Error('课堂缺少班级、教练或日期');
    const conflicts = await lessonConflicts(ctx, data, lessonId);
    if (conflicts.length) return { ok: false, conflict: true, message: '排课存在班级、教练或场地冲突', conflicts };
    const lesson = await upsert(C.lessons, { organizationId: ctx.organizationId, lessonId }, data);
    await audit(ctx, 'education.lesson.create', lessonId, { campusId: data.campusId });
    return { ok: true, lesson };
  }
  if (action === 'week') {
    const weekStart = clean(event.weekStart, 20) || chinaDate();
    const weekEnd = dateOffset(weekStart, 6);
    const lessons = await all(C.lessons, { organizationId: ctx.organizationId }, 1000);
    const rows = lessons.filter((item) => item.lessonDate >= weekStart && item.lessonDate <= weekEnd && item.status !== 'cancelled');
    const [classes, coaches, courses] = await Promise.all([all(C.classes, baseQuery(ctx, event), 1000), all(C.coaches, baseQuery(ctx, event), 1000), all(C.courses, baseQuery(ctx, event), 1000)]);
    return { ok: true, weekStart, weekEnd, lessons: rows.map((item) => {
      const classInfo = classes.find((entry) => entry.classId === item.classId);
      return { ...item, className: classInfo && classInfo.name || '', courseName: courses.find((entry) => entry.courseId === (classInfo && classInfo.courseId))?.name || '', coachName: coaches.find((entry) => entry.platformUserId === item.coachPlatformUserId)?.name || '' };
    }) };
  }
  if (action === 'conflicts') return { ok: true, conflicts: await lessonConflicts(ctx, event.lesson || {}, clean(event.excludeLessonId, 100)) };
  if (action === 'bulkCreate') {
    const input = list(event.lessons, 100); if (!input.length) throw new Error('请提供批量排课数据');
    const conflicts = [];
    for (const source of input) { const found = await lessonConflicts(ctx, source); if (found.length) conflicts.push({ source, conflicts: found }); }
    if (conflicts.length) return { ok: false, conflict: true, message: '批量排课存在冲突，请先处理', conflicts };
    const created = [];
    for (const source of input) {
      const lessonId = clean(source.lessonId, 100) || uid('lesson');
      const data = { organizationId: ctx.organizationId, campusId: clean(source.campusId || event.campusId, 100), classId: clean(source.classId, 100), scheduleId: clean(source.scheduleId, 100), coachPlatformUserId: clean(source.coachPlatformUserId, 100), lessonDate: clean(source.lessonDate, 20), startTime: clean(source.startTime, 10), plannedMinutes: normalizeUnitMinutes(source.plannedMinutes), venue: clean(source.venue, 100), status: 'scheduled', version: 0, performanceRequired: source.performanceRequired !== false, syncStatus: 'pending' };
      created.push(await upsert(C.lessons, { organizationId: ctx.organizationId, lessonId }, data));
    }
    await audit(ctx, 'education.schedule.bulk.create', uid('bulk'), { campusId: clean(event.campusId, 100), count: created.length });
    return { ok: true, lessons: created };
  }
  if (action === 'updateLesson') {
    const lesson = await first(C.lessons, { organizationId: ctx.organizationId, lessonId: clean(event.lessonId, 100) });
    if (!lesson) throw new Error('课堂不存在');
    const source = { ...lesson, ...(event.lesson || {}) };
    const conflicts = await lessonConflicts(ctx, source, lesson.lessonId);
    if (conflicts.length) return { ok: false, conflict: true, message: '调整后存在冲突', conflicts };
    await update(C.lessons, lesson, { lessonDate: clean(source.lessonDate, 20), startTime: clean(source.startTime, 10), plannedMinutes: normalizeUnitMinutes(source.plannedMinutes), coachPlatformUserId: clean(source.coachPlatformUserId, 100), venue: clean(source.venue, 100), syncStatus: 'pending', changeReason: clean(event.reason, 300) });
    await audit(ctx, 'education.schedule.lesson.update', lesson.lessonId, { campusId: lesson.campusId, reason: clean(event.reason, 300) });
    return { ok: true };
  }
  if (action === 'cancelLesson') {
    const lesson = await first(C.lessons, { organizationId: ctx.organizationId, lessonId: clean(event.lessonId, 100) });
    if (!lesson) throw new Error('课堂不存在');
    const reason = clean(event.reason, 300); if (!reason) throw new Error('请填写停课原因');
    await update(C.lessons, lesson, { status: 'cancelled', cancelReason: reason, cancelledAt: now(), syncStatus: 'pending' });
    await audit(ctx, 'education.schedule.lesson.cancel', lesson.lessonId, { campusId: lesson.campusId, reason });
    return { ok: true, status: 'cancelled' };
  }
  throw new Error('不支持的排课操作');
}

async function packageDomain(action, ctx, event) {
  assertPcManager(ctx, event.campusId);
  if (action === 'list') {
    const templates = await listDomain(C.packageTemplates, ctx, event);
    const courses = await all(C.courses, baseQuery(ctx, event), 1000);
    return { ok: true, templates: templates.map((item) => ({ ...item, courseName: courses.find((course) => course.courseId === item.courseId)?.name || '' })) };
  }
  if (action === 'detail') {
    const template = await first(C.packageTemplates, { organizationId: ctx.organizationId, templateId: clean(event.templateId, 100) });
    if (!template) throw new Error('课包不存在');
    const course = await first(C.courses, { organizationId: ctx.organizationId, courseId: template.courseId });
    const assigned = await all(C.studentPackages, { organizationId: ctx.organizationId, templateId: template.templateId }, 500);
    return { ok: true, template, course, assignedCount: assigned.length };
  }
  if (action === 'upsert') {
    const source = event.packageTemplate || {};
    const templateId = clean(source.templateId, 100) || uid('pkg_tpl');
    const unitMinutes = normalizeUnitMinutes(source.unitMinutes);
    const existing = await first(C.packageTemplates, { organizationId: ctx.organizationId, templateId });
    const courseId = clean(source.courseId || (existing && existing.courseId), 100);
    const course = await first(C.courses, { organizationId: ctx.organizationId, courseId });
    if (!course) throw new Error('请先选择课包所属课程');
    if (existing && Number(existing.assignedCount || 0) > 0 && Number(existing.unitMinutes) !== unitMinutes) throw new Error('已分配的课包不能修改单位分钟，请创建新版本');
    const totalUnits = Number(source.totalUnits || 0), giftUnits = Number(source.giftUnits || 0);
    const data = {
      organizationId: ctx.organizationId, campusId: clean(source.campusId || event.campusId, 100), courseId, name: clean(source.name, 80),
      unitMinutes, totalMinutes: Math.max(0, Math.round(totalUnits * unitMinutes)), giftMinutes: Math.max(0, Math.round(giftUnits * unitMinutes)),
      priceCents: source.priceYuan === undefined
        ? Number(existing && existing.priceCents || 0)
        : Math.max(0, Math.round(Number(source.priceYuan || 0) * 100)),
      validDays: integer(source.validDays, 365, 1, 3650), assignedCount: Number(existing && existing.assignedCount || 0),
      status: ['active', 'inactive'].includes(source.status) ? source.status : 'active', version: integer(source.version, Number(existing && existing.version || 1), 1, 999)
    };
    if (!data.name || data.totalMinutes <= 0) throw new Error('请填写课包名称和总课时');
    const packageTemplate = await upsert(C.packageTemplates, { organizationId: ctx.organizationId, templateId }, data);
    await audit(ctx, 'education.package.template.upsert', templateId, { campusId: data.campusId, unitMinutes });
    return { ok: true, packageTemplate };
  }
  if (action === 'assign') {
    const source = event.studentPackage || {};
    const template = await first(C.packageTemplates, { templateId: clean(source.templateId, 100), organizationId: ctx.organizationId });
    if (!template) throw new Error('课包模板不存在');
    const studentId = clean(source.studentId, 100);
    if (!studentId) throw new Error('请选择学员');
    const studentPackageId = clean(source.studentPackageId, 100) || uid('student_pkg');
    const existingStudentPackage = await first(C.studentPackages, { studentPackageId, organizationId: ctx.organizationId });
    if (existingStudentPackage && existingStudentPackage.templateId !== template.templateId) {
      throw new Error('已分配课包不能直接更换模板，请新增课包');
    }
    const validFrom = clean(source.validFrom, 20) || new Date().toISOString().slice(0, 10);
    const validTo = clean(source.validTo, 20);
    const data = {
      organizationId: ctx.organizationId, campusId: clean(source.campusId || event.campusId || template.campusId, 100), studentId,
      classId: clean(source.classId, 100), courseId: template.courseId, templateId: template.templateId, templateVersion: Number(template.version || 1), name: template.name,
      unitMinutes: template.unitMinutes, totalMinutes: template.totalMinutes, giftMinutes: template.giftMinutes,
      saleAmountCents: Math.max(0, integer(source.saleAmountCents, Number(template.priceCents || 0), 0, 1000000000)),
      paidRemainingMinutes: template.totalMinutes, giftRemainingMinutes: template.giftMinutes,
      remainingMinutes: Number(template.totalMinutes || 0) + Number(template.giftMinutes || 0), validFrom, validTo,
      status: 'active', unitLocked: false, firstConsumedAt: 0
    };
    const studentPackage = await upsert(C.studentPackages, { organizationId: ctx.organizationId, studentPackageId }, data);
    if (!existingStudentPackage) {
      await update(C.packageTemplates, template, { assignedCount: Number(template.assignedCount || 0) + 1 });
    }
    await audit(ctx, 'education.package.assign', studentPackageId, { campusId: data.campusId, studentId, templateId: template.templateId });
    return { ok: true, studentPackage };
  }
  if (action === 'studentList') return { ok: true, packages: await all(C.studentPackages, baseQuery(ctx, event), 1000) };
  if (action === 'ledger') return { ok: true, entries: await all(C.ledger, baseQuery(ctx, event), 1000) };
  throw new Error('不支持的课包操作');
}

async function lessonDetail(ctx, lessonId) {
  const lesson = await first(C.lessons, { lessonId: clean(lessonId, 100), organizationId: ctx.organizationId });
  if (!lesson) throw new Error('课堂不存在');
  const classInfo = await first(C.classes, { classId: lesson.classId, organizationId: ctx.organizationId });
  const members = await all(C.classMembers, { organizationId: ctx.organizationId, classId: lesson.classId, status: 'active' }, 200);
  const students = [];
  for (const member of members) {
    const student = await first(C.students, { studentId: member.studentId, organizationId: ctx.organizationId });
    if (student) students.push({ ...student, defaultStudentPackageId: member.defaultStudentPackageId || '' });
  }
  const attendance = await all(C.attendance, { organizationId: ctx.organizationId, lessonId: lesson.lessonId }, 200);
  const performance = await all(C.performance, { organizationId: ctx.organizationId, lessonId: lesson.lessonId }, 200);
  const submission = await first(C.submissions, { organizationId: ctx.organizationId, lessonId: lesson.lessonId });
  return { lesson, classInfo, students, attendance, performance, submission };
}

async function consumeStudentPackage(ctx, lesson, student, attendance, version, rules) {
  const plannedMinutes = integer(lesson.plannedMinutes, 0, 0, 600);
  const consumeMinutes = defaultConsumptionMinutes(attendance.status, plannedMinutes, rules);
  if (!consumeMinutes) return { ok: true, consumeMinutes: 0, ledgerId: '' };
  let studentPackage = attendance.studentPackageId
    ? await first(C.studentPackages, { studentPackageId: clean(attendance.studentPackageId, 100), organizationId: ctx.organizationId })
    : null;
  if (!studentPackage && student.defaultStudentPackageId) studentPackage = await first(C.studentPackages, { studentPackageId: student.defaultStudentPackageId, organizationId: ctx.organizationId });
  if (!studentPackage) {
    const candidates = await all(C.studentPackages, { organizationId: ctx.organizationId, studentId: student.studentId, status: 'active' }, 50);
    studentPackage = candidates.find((item) => !item.classId || item.classId === lesson.classId) || candidates[0];
  }
  if (!studentPackage) return { ok: false, consumeMinutes, issue: '未绑定可用课包' };
  const businessKey = `${lesson.lessonId}:${student.studentId}:consume:v${version}`;
  const existingLedger = await first(C.ledger, { businessKey });
  if (existingLedger) return { ok: true, consumeMinutes, ledgerId: existingLedger.ledgerId, duplicate: true };
  const currentRemaining = Number(studentPackage.remainingMinutes || 0);
  const expiry = studentPackage.validTo ? new Date(`${studentPackage.validTo}T23:59:59+08:00`).getTime() : 0;
  if (expiry && expiry < new Date(`${lesson.lessonDate}T12:00:00+08:00`).getTime()) return { ok: false, consumeMinutes, issue: '课包已过期' };
  if (currentRemaining < consumeMinutes) return { ok: false, consumeMinutes, issue: '课包余额不足' };
  const giftBefore = Number(studentPackage.giftRemainingMinutes || 0);
  const giftUsed = Math.min(giftBefore, consumeMinutes);
  const paidUsed = consumeMinutes - giftUsed;
  const giftAfter = giftBefore - giftUsed;
  const paidAfter = Math.max(0, Number(studentPackage.paidRemainingMinutes || 0) - paidUsed);
  const balanceAfterMinutes = currentRemaining - consumeMinutes;
  const ledgerId = uid('consume');
  await update(C.studentPackages, studentPackage, {
    giftRemainingMinutes: giftAfter, paidRemainingMinutes: paidAfter, remainingMinutes: balanceAfterMinutes,
    unitLocked: true, firstConsumedAt: Number(studentPackage.firstConsumedAt || 0) || now(), lastConsumedAt: now()
  });
  await add(C.ledger, {
    ledgerId, businessKey, organizationId: ctx.organizationId, campusId: lesson.campusId, studentId: student.studentId,
    studentPackageId: studentPackage.studentPackageId, lessonId: lesson.lessonId, entryType: 'debit',
    deltaMinutes: -consumeMinutes, giftMinutesUsed: giftUsed, paidMinutesUsed: paidUsed,
    balanceAfterMinutes, unitMinutes: studentPackage.unitMinutes,
    displayUnits: unitsFromMinutes(consumeMinutes, studentPackage.unitMinutes), status: 'active', createdAt: now(), updatedAt: now()
  });
  return { ok: true, consumeMinutes, ledgerId, balanceAfterMinutes };
}

async function lessonDomain(action, ctx, event) {
  if (action === 'mine') {
    await assertMiniCoach(ctx);
    const rows = await all(C.lessons, { organizationId: ctx.organizationId, coachPlatformUserId: ctx.actor.platformUserId }, 500);
    const [classes, courses, members] = await Promise.all([all(C.classes, { organizationId: ctx.organizationId }, 1000), all(C.courses, { organizationId: ctx.organizationId }, 1000), all(C.classMembers, { organizationId: ctx.organizationId, status: 'active' }, 1000)]);
    return { ok: true, lessons: rows.filter((item) => ACTIVE_LESSON_STATUS.has(item.status)).map((item) => {
      const classInfo = classes.find((entry) => entry.classId === item.classId), course = courses.find((entry) => entry.courseId === (classInfo && classInfo.courseId));
      return { ...item, className: classInfo && classInfo.name || '', courseName: course && course.name || '', studentCount: members.filter((entry) => entry.classId === item.classId).length };
    }) };
  }
  if (action === 'detail') {
    const detail = await lessonDetail(ctx, event.lessonId);
    if (ctx.actor.surface === 'mini_program') await assertMiniCoach(ctx, detail.lesson);
    else assertPcManager(ctx, detail.lesson.campusId);
    return { ok: true, ...detail };
  }
  if (action === 'composeEvaluation') {
    await assertMiniCoach(ctx);
    return { ok: true, draft: composeEvaluation(event.studentName, event.ratings, event.keywords), requiresCoachConfirm: true, mode: 'keyword_assisted' };
  }
  if (action === 'saveDraft' || action === 'submit') {
    const detail = await lessonDetail(ctx, event.lessonId);
    await assertMiniCoach(ctx, detail.lesson);
    const requestId = clean(event.requestId, 100) || uid('request');
    const duplicate = await first(C.submissions, { organizationId: ctx.organizationId, requestId });
    if (duplicate) return { ok: true, submission: duplicate, duplicate: true };
    const currentVersion = Number(detail.submission && detail.submission.version || 0);
    const expectedVersion = integer(event.expectedVersion, currentVersion, 0, 999999);
    if (expectedVersion !== currentVersion) throw new Error('课堂数据已被更新，请刷新后重试');
    const nextVersion = currentVersion + 1;
    const attendanceInput = list(event.attendance, 200);
    if (!attendanceInput.length) throw new Error('请先完成课堂点名');
    const studentMap = Object.fromEntries(detail.students.map((student) => [student.studentId, student]));
    const performanceInput = Object.fromEntries(list(event.performance, 200).map((item) => [clean(item.studentId, 100), item]));
    const consumptionIssues = [];
    const consumption = [];
    for (const raw of attendanceInput) {
      const studentId = clean(raw.studentId, 100), student = studentMap[studentId];
      if (!student) throw new Error('点名学员不在本班级');
      const status = clean(raw.status, 30);
      if (!ATTENDANCE_STATUS.has(status)) throw new Error('点名状态无效');
      const performance = performanceInput[studentId];
      if (action === 'submit' && detail.lesson.performanceRequired !== false && ['present', 'makeup'].includes(status)) {
        if (!performance || performance.coachConfirmed !== true || !clean(performance.finalComment, 300)) throw new Error(`${student.name}的五维评分和教练评价尚未确认`);
        normalizeRatings(performance.ratings);
      }
      await upsert(C.attendance, { attendanceKey: `${detail.lesson.lessonId}:${studentId}` }, {
        organizationId: ctx.organizationId, campusId: detail.lesson.campusId, lessonId: detail.lesson.lessonId,
        classId: detail.lesson.classId, studentId, status, note: clean(raw.note, 200), version: nextVersion,
        coachPlatformUserId: ctx.actor.platformUserId, submittedAt: action === 'submit' ? now() : 0
      });
      if (performance) {
        await upsert(C.performance, { performanceKey: `${detail.lesson.lessonId}:${studentId}:v${nextVersion}` }, {
          organizationId: ctx.organizationId, campusId: detail.lesson.campusId, lessonId: detail.lesson.lessonId,
          classId: detail.lesson.classId, studentId, ratings: normalizeRatings(performance.ratings),
          keywords: list(performance.keywords, 12).map((item) => clean(item, 20)).filter(Boolean),
          aiDraft: clean(performance.aiDraft, 300), finalComment: clean(performance.finalComment, 300), coachConfirmed: performance.coachConfirmed === true,
          coachPlatformUserId: ctx.actor.platformUserId, version: nextVersion
        });
      }
      if (action === 'submit') {
        const result = await consumeStudentPackage(ctx, detail.lesson, student, raw, nextVersion, detail.classInfo && detail.classInfo.consumptionRules || {});
        consumption.push({ studentId, ...result });
        if (!result.ok) consumptionIssues.push({ studentId, studentName: student.name, issue: result.issue, consumeMinutes: result.consumeMinutes });
      }
    }
    const submissionData = {
      organizationId: ctx.organizationId, campusId: detail.lesson.campusId, lessonId: detail.lesson.lessonId,
      classId: detail.lesson.classId, coachPlatformUserId: ctx.actor.platformUserId,
      requestId, version: nextVersion, status: action === 'submit' ? 'pending_review' : 'draft',
      reviewStatus: action === 'submit' ? 'pending' : 'draft', attendanceCount: attendanceInput.length,
      performanceCount: Object.keys(performanceInput).length, consumptionIssues,
      submittedAt: action === 'submit' ? now() : 0
    };
    const submission = await upsert(C.submissions, { submissionKey: detail.lesson.lessonId }, submissionData);
    await update(C.lessons, detail.lesson, { version: nextVersion, status: action === 'submit' ? 'submitted' : 'draft' });
    await audit(ctx, `education.lesson.${action}`, detail.lesson.lessonId, { campusId: detail.lesson.campusId, version: nextVersion, issueCount: consumptionIssues.length });
    return { ok: true, submission, consumption, consumptionIssues };
  }
  if (action === 'reviewList') {
    assertPcManager(ctx, event.campusId);
    const submissions = await all(C.submissions, baseQuery(ctx, event), 1000);
    return { ok: true, submissions: submissions.filter((item) => ['pending_review', 'returned', 'approved'].includes(item.status)) };
  }
  if (action === 'approve' || action === 'return') {
    assertPcManager(ctx, event.campusId);
    const submission = await first(C.submissions, { organizationId: ctx.organizationId, lessonId: clean(event.lessonId, 100) });
    if (!submission) throw new Error('课堂提交不存在');
    const reason = clean(event.reason, 300);
    if (action === 'return' && !reason) throw new Error('退回时请填写修改要求');
    const reviewStatus = action === 'approve' ? 'approved' : 'returned';
    const reviewedAt = now();
    await update(C.submissions, submission, {
      status: reviewStatus, reviewStatus, reviewerPlatformUserId: ctx.actor.platformUserId,
      reviewReason: reason, reviewedAt, parentVisibleAt: action === 'approve' ? reviewedAt : 0
    });
    await upsert(C.reviews, { reviewKey: `${submission.lessonId}:v${submission.version}` }, {
      organizationId: ctx.organizationId, campusId: submission.campusId, lessonId: submission.lessonId,
      submissionVersion: submission.version, decision: reviewStatus, reason,
      reviewerPlatformUserId: ctx.actor.platformUserId, reviewedAt
    });
    const lesson = await first(C.lessons, { lessonId: submission.lessonId });
    if (lesson) await update(C.lessons, lesson, { status: reviewStatus });
    await audit(ctx, `education.lesson.${action}`, submission.lessonId, { campusId: submission.campusId, version: submission.version });
    return { ok: true, status: reviewStatus, parentVisibleAt: action === 'approve' ? reviewedAt : 0 };
  }
  throw new Error('不支持的课堂操作');
}

async function ledgerDomain(action, ctx, event) {
  assertPcManager(ctx, event.campusId);
  if (action === 'list') return { ok: true, entries: await all(C.ledger, baseQuery(ctx, event), 1000) };
  if (action === 'adjust') {
    const studentPackageId = clean(event.studentPackageId, 100), reason = clean(event.reason, 300);
    const deltaMinutes = integer(event.deltaMinutes, 0, -100000, 100000);
    if (!studentPackageId || !deltaMinutes || !reason) throw new Error('紧急调整需要课包、分钟数和原因');
    const studentPackage = await first(C.studentPackages, { studentPackageId, organizationId: ctx.organizationId });
    if (!studentPackage) throw new Error('学员课包不存在');
    const balanceAfterMinutes = Number(studentPackage.remainingMinutes || 0) + deltaMinutes;
    if (balanceAfterMinutes < 0) throw new Error('调整后课包余额不能为负数');
    const bucket = event.bucket === 'gift' ? 'gift' : 'paid';
    const giftBefore = Number(studentPackage.giftRemainingMinutes || 0);
    const paidBefore = Number(studentPackage.paidRemainingMinutes || 0);
    const giftAfter = bucket === 'gift' ? giftBefore + deltaMinutes : giftBefore;
    const paidAfter = bucket === 'paid' ? paidBefore + deltaMinutes : paidBefore;
    if (giftAfter < 0 || paidAfter < 0) throw new Error('调整后对应课包余额不能为负数');
    if (giftAfter + paidAfter !== balanceAfterMinutes) throw new Error('课包余额分账不一致，请刷新后重试');
    await update(C.studentPackages, studentPackage, {
      remainingMinutes: balanceAfterMinutes,
      paidRemainingMinutes: paidAfter,
      giftRemainingMinutes: giftAfter
    });
    const ledgerId = uid('consume_adjust');
    await add(C.ledger, {
      ledgerId, businessKey: `${ledgerId}:${now()}`, organizationId: ctx.organizationId, campusId: studentPackage.campusId,
      studentId: studentPackage.studentId, studentPackageId, lessonId: clean(event.lessonId, 100),
      entryType: deltaMinutes > 0 ? 'reversal' : 'adjustment', deltaMinutes, balanceAfterMinutes,
      unitMinutes: studentPackage.unitMinutes, displayUnits: unitsFromMinutes(Math.abs(deltaMinutes), studentPackage.unitMinutes),
      reason, balanceBucket: bucket, actorPlatformUserId: ctx.actor.platformUserId, status: 'active', createdAt: now(), updatedAt: now()
    });
    await audit(ctx, 'education.ledger.adjust', ledgerId, { campusId: studentPackage.campusId, studentPackageId, deltaMinutes, bucket, reason });
    return { ok: true, ledgerId, balanceAfterMinutes };
  }
  throw new Error('不支持的课消账本操作');
}

async function dashboard(ctx, event) {
  assertPcManager(ctx, event.campusId);
  const query = baseQuery(ctx, event);
  const [coaches, students, classes, lessons, submissions, packages, ledger, attendance] = await Promise.all([
    all(C.coaches, query), all(C.students, query), all(C.classes, query), all(C.lessons, query), all(C.submissions, query), all(C.studentPackages, query),
    all(C.ledger, query, 1000), all(C.attendance, query, 1000)
  ]);
  const today = chinaDate();
  const days = Array.from({ length: 7 }, (_, index) => dateOffset(today, index - 6));
  const lessonDateById = Object.fromEntries(lessons.map((item) => [item.lessonId, item.lessonDate]));
  const daily = days.map((date) => {
    const dailyLedger = ledger.filter((item) => item.status === 'active' && item.deltaMinutes < 0 && lessonDateById[item.lessonId] === date);
    return {
      date,
      lessonCount: lessons.filter((item) => item.lessonDate === date).length,
      consumptionMinutes: dailyLedger.reduce((sum, item) => sum + Math.abs(Number(item.deltaMinutes || 0)), 0),
      reviewCount: submissions.filter((item) => item.submittedAt && chinaDate(Number(item.submittedAt)) === date).length
    };
  });
  const attendanceDistribution = Object.fromEntries([...ATTENDANCE_STATUS].map((status) => [status, attendance.filter((item) => item.status === status).length]));
  const activePackages = packages.filter((item) => item.status === 'active');
  const totalPackageAmountCents = activePackages.reduce((sum, item) => sum + Number(item.saleAmountCents || 0), 0);
  const packageBalanceMinutes = activePackages.reduce((sum, item) => sum + Number(item.remainingMinutes || 0), 0);
  const packageTotalMinutes = activePackages.reduce((sum, item) => sum + Number(item.totalMinutes || 0) + Number(item.giftMinutes || 0), 0);
  const consumedPackageMinutes = Math.max(0, packageTotalMinutes - packageBalanceMinutes);
  const recognizedAmountCents = activePackages.reduce((sum, item) => {
    const total = Number(item.totalMinutes || 0) + Number(item.giftMinutes || 0);
    const consumed = Math.max(0, total - Number(item.remainingMinutes || 0));
    return sum + (total ? Math.round(Number(item.saleAmountCents || 0) * consumed / total) : 0);
  }, 0);
  return {
    ok: true,
    summary: {
      coachCount: coaches.filter((item) => item.status === 'active').length,
      studentCount: students.filter((item) => item.status === 'active').length,
      classCount: classes.filter((item) => item.status === 'active').length,
      pendingReviewCount: submissions.filter((item) => item.status === 'pending_review').length,
      todayLessonCount: lessons.filter((item) => item.lessonDate === today).length,
      todayConsumptionMinutes: daily.find((item) => item.date === today)?.consumptionMinutes || 0,
      packageWarningCount: activePackages.filter((item) => Number(item.remainingMinutes || 0) <= Number(item.unitMinutes || 60) * 4).length
    },
    analytics: {
      daily,
      attendanceDistribution,
      reviewStatus: {
        pending: submissions.filter((item) => item.status === 'pending_review').length,
        approved: submissions.filter((item) => item.status === 'approved').length,
        returned: submissions.filter((item) => item.status === 'returned').length
      },
      packages: { totalPackageAmountCents, recognizedAmountCents, packageBalanceMinutes, packageTotalMinutes, consumedPackageMinutes }
    }
  };
}

async function mobileSummary(ctx, event) {
  if (ctx.actor.surface !== 'mini_program') throw new Error('该入口仅限小程序');
  if (!MANAGER_ROLES.has(clean(ctx.membership.role, 40))) throw new Error('当前账号不是机构或校区负责人');
  const query = baseQuery(ctx, event);
  const [courses, classes, students, submissions] = await Promise.all([all(C.courses, query, 1000), all(C.classes, query, 1000), all(C.students, query, 1000), all(C.submissions, query, 1000)]);
  return { ok: true, summary: { courseCount: courses.filter((item) => item.status !== 'archived').length, classCount: classes.filter((item) => !['completed', 'archived'].includes(item.status)).length, studentCount: students.filter((item) => item.status === 'active' || item.status === 'waiting_class').length, pendingStudentCount: students.filter((item) => item.confirmationStatus === 'pending').length, pendingReviewCount: submissions.filter((item) => item.status === 'pending_review').length } };
}

exports.main = async (event = {}) => {
  try {
    await ensureEducationCollections();
    const currentActor = await actor(event);
    const domain = clean(event.domain, 40), action = clean(event.action, 40);
    if (domain === 'coach' && action === 'inviteAccept') return await acceptCoachInvite(currentActor, event);
    const ctx = await access(event, currentActor);
    if (domain === 'access' && action === 'get') {
      const coachProfile = await first(C.coaches, { organizationId: ctx.organizationId, platformUserId: currentActor.platformUserId, status: 'active' });
      return { ok: true, surface: currentActor.surface, platformUserId: currentActor.platformUserId, organizationId: ctx.organizationId, organizationName: ctx.organization.name || '', role: ctx.membership.role, campusIds: allowedCampusIds(ctx.membership), displayName: coachProfile && coachProfile.name || currentActor.user && currentActor.user.nickName || '' };
    }
    if (domain === 'course') return await courseDomain(action, ctx, event);
    if (domain === 'coach') return await coachDomain(action, ctx, event);
    if (domain === 'student') return await studentDomain(action, ctx, event);
    if (domain === 'class') return await classDomain(action, ctx, event);
    if (domain === 'schedule') return await scheduleDomain(action, ctx, event);
    if (domain === 'package') return await packageDomain(action, ctx, event);
    if (domain === 'lesson') return await lessonDomain(action, ctx, event);
    if (domain === 'ledger') return await ledgerDomain(action, ctx, event);
    if (domain === 'dashboard' && action === 'summary') return await dashboard(ctx, event);
    if (domain === 'mobile' && action === 'summary') return await mobileSummary(ctx, event);
    throw new Error('不支持的教务操作');
  } catch (error) {
    console.error('[sxEducationCore]', event.domain, event.action, error);
    return { ok: false, message: error.message || '教务服务暂不可用' };
  }
};

exports._test = { normalizeUnitMinutes, unitsFromMinutes, defaultConsumptionMinutes, normalizeRatings, composeEvaluation };
