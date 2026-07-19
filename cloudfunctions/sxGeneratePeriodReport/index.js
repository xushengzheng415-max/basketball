const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV, timeout: 60000 });
const db = cloud.database();

const DAILY_COLLECTION = 'sx_daily_reports';
const PERIOD_COLLECTION = 'sx_period_reports';
const JOB_COLLECTION = 'sx_period_report_jobs';
const MODEL = process.env.SXF_PERIOD_REPORT_MODEL || 'hy3';
const PROVIDER = process.env.SXF_PERIOD_REPORT_PROVIDER || 'hunyuan-v3';

const DIMENSIONS = [
  { key: 'discipline', label: '课堂纪律' },
  { key: 'equipment', label: '训练装备' },
  { key: 'athletic', label: '运动能力' },
  { key: 'technique', label: '技术完成' },
  { key: 'focus', label: '专注投入' },
  { key: 'teamwork', label: '团队协作' }
];

function text(value, max = 800) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toTime(value) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' || typeof value === 'number') return new Date(value).getTime();
  if (value.$date) return new Date(value.$date).getTime();
  return 0;
}

async function hasEducationAccess(openid) {
  try {
    const result = await db.collection('sx_entitlements').where({ openid, status: 'active' }).limit(100).get();
    return (result.data || []).some((item) => {
      const features = Array.isArray(item.features) ? item.features : [];
      const expiresAt = toTime(item.expiresAt);
      return features.indexOf('education_system') >= 0 && (!expiresAt || expiresAt > Date.now());
    });
  } catch (error) {
    console.warn('[sxGeneratePeriodReport] education entitlement unavailable', error);
    return false;
  }
}

function dateText(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return date.getFullYear() + '-' + month + '-' + day;
}

function normalizeRatings(value) {
  const ratings = Array.isArray(value) ? value : [];
  return DIMENSIONS.map((dimension) => {
    const found = ratings.find((item) => item && item.key === dimension.key) || {};
    return {
      key: dimension.key,
      label: dimension.label,
      rating: Math.max(0, Math.min(5, number(found.rating))) ,
      weight: number(found.weight)
    };
  });
}

function normalizeDaily(item, index) {
  const ratings = normalizeRatings(item.ratings);
  const overallScore = number(item.overallScore, ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length);
  return {
    _id: item._id || 'provided-' + index,
    reportDate: dateText(item.reportDate || item.date),
    courseId: text(item.courseId, 80),
    courseTitle: text(item.courseTitle || item.lessonTitle, 120),
    attendanceStatus: text(item.attendanceStatus || 'present', 24),
    durationMinutes: number(item.durationMinutes, 0),
    modulesCompleted: number(item.modulesCompleted, 0),
    planCompletion: number(item.planCompletion, 0),
    overallScore: Math.max(0, Math.min(5, overallScore)),
    overallGrade: text(item.overallGrade, 24),
    ratings,
    tags: Array.isArray(item.tags) ? item.tags.map((tag) => text(tag, 40)).filter(Boolean).slice(0, 20) : [],
    coachComment: text(item.coachComment || item.draft, 600),
    reportSummary: text(item.reportSummary || item.summary, 500)
  };
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function aggregate(records) {
  const sorted = records.slice().sort((a, b) => a.reportDate.localeCompare(b.reportDate));
  const attended = sorted.filter((item) => item.attendanceStatus !== 'absent');
  const ratingAverages = DIMENSIONS.map((dimension) => ({
    key: dimension.key,
    label: dimension.label,
    value: Number(average(attended.map((item) => {
      const rating = item.ratings.find((entry) => entry.key === dimension.key);
      return rating ? rating.rating : 0;
    })).toFixed(1))
  }));
  const tagCounts = {};
  attended.forEach((item) => item.tags.forEach((tag) => { tagCounts[tag] = (tagCounts[tag] || 0) + 1; }));
  const topTags = Object.keys(tagCounts)
    .map((label) => ({ label, count: tagCounts[label] }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 6);
  const firstScore = attended.length ? attended[0].overallScore : 0;
  const lastScore = attended.length ? attended[attended.length - 1].overallScore : 0;
  return {
    reportCount: sorted.length,
    attendedCount: attended.length,
    attendanceRate: sorted.length ? Math.round(attended.length / sorted.length * 100) : 0,
    totalMinutes: attended.reduce((sum, item) => sum + item.durationMinutes, 0),
    modulesCompleted: attended.reduce((sum, item) => sum + item.modulesCompleted, 0),
    averageScore: Number(average(attended.map((item) => item.overallScore)).toFixed(1)),
    scoreChange: Number((lastScore - firstScore).toFixed(1)),
    ratingAverages,
    topTags,
    courseTitles: Array.from(new Set(attended.map((item) => item.courseTitle).filter(Boolean))),
    evidence: attended.map((item) => ({
      date: item.reportDate,
      course: item.courseTitle,
      score: item.overallScore,
      tags: item.tags.slice(0, 6),
      coachComment: item.coachComment.slice(0, 240)
    }))
  };
}

function deterministicSections(studentName, reportType, stats) {
  const periodLabel = reportType === 'monthly' ? '本月' : '本周';
  const strongest = stats.ratingAverages.slice().sort((a, b) => b.value - a.value)[0];
  const focus = stats.ratingAverages.slice().sort((a, b) => a.value - b.value)[0];
  return {
    summary: studentName + periodLabel + '完成' + stats.attendedCount + '节训练，累计' + stats.totalMinutes + '分钟，出勤率' + stats.attendanceRate + '%，综合评分' + stats.averageScore.toFixed(1) + '分。',
    highlights: strongest ? [strongest.label + '平均' + strongest.value.toFixed(1) + '星'] : [],
    suggestions: focus ? ['下一阶段持续关注' + focus.label + '，结合课堂计划进行针对性训练。'] : [],
    objectiveFacts: [
      periodLabel + '日报' + stats.reportCount + '份',
      '完成训练模块' + stats.modulesCompleted + '个',
      '综合评分变化' + (stats.scoreChange >= 0 ? '+' : '') + stats.scoreChange.toFixed(1) + '分'
    ]
  };
}

function parseSections(rawText, fallback) {
  const raw = text(rawText, 6000).replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  try {
    const parsed = JSON.parse(raw);
    return {
      summary: text(parsed.summary, 800) || fallback.summary,
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights.map((item) => text(item, 180)).filter(Boolean).slice(0, 4) : fallback.highlights,
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map((item) => text(item, 180)).filter(Boolean).slice(0, 4) : fallback.suggestions,
      objectiveFacts: Array.isArray(parsed.objectiveFacts) ? parsed.objectiveFacts.map((item) => text(item, 180)).filter(Boolean).slice(0, 8) : fallback.objectiveFacts
    };
  } catch (error) {
    return Object.assign({}, fallback, { summary: raw || fallback.summary });
  }
}

function reportContent(sections) {
  const lines = [sections.summary];
  if (sections.highlights.length) lines.push('成长亮点：' + sections.highlights.join('；'));
  if (sections.suggestions.length) lines.push('训练建议：' + sections.suggestions.join('；'));
  return lines.filter(Boolean).join('\n\n');
}

async function ensureCollection(name) {
  try {
    await db.collection(name).limit(1).get();
  } catch (error) {
    if (typeof db.createCollection !== 'function') throw error;
    try { await db.createCollection(name); } catch (createError) {
      const message = String(createError && createError.message || createError);
      if (!/exist|already/i.test(message)) throw createError;
    }
  }
}

async function upsert(collectionName, query, data) {
  await ensureCollection(collectionName);
  const existing = await db.collection(collectionName).where(query).limit(1).get();
  if (existing.data && existing.data[0]) {
    await db.collection(collectionName).doc(existing.data[0]._id).update({ data });
    return existing.data[0]._id;
  }
  const created = await db.collection(collectionName).add({ data: Object.assign({}, query, data, { createdAt: db.serverDate() }) });
  return created._id;
}

async function saveDaily(event, openid) {
  if (!event.studentId) throw new Error('studentId is required');
  const daily = normalizeDaily(event, 0);
  if (!daily.reportDate) throw new Error('reportDate is required');
  const now = db.serverDate();
  const id = await upsert(DAILY_COLLECTION, {
    openid,
    studentId: text(event.studentId, 80),
    courseId: daily.courseId || 'daily-' + daily.reportDate,
    reportDate: daily.reportDate
  }, {
    studentName: text(event.studentName, 80),
    studentNumber: text(event.studentNumber, 24),
    courseTitle: daily.courseTitle,
    attendanceStatus: daily.attendanceStatus,
    durationMinutes: daily.durationMinutes,
    modulesCompleted: daily.modulesCompleted,
    planCompletion: daily.planCompletion,
    ratings: daily.ratings,
    overallScore: daily.overallScore,
    overallGrade: daily.overallGrade,
    tags: daily.tags,
    coachComment: daily.coachComment,
    reportSummary: daily.reportSummary,
    status: 'published',
    updatedAt: now
  });
  return { ok: true, action: 'saveDaily', id, reportDate: daily.reportDate };
}

async function loadDailyReports(event, openid) {
  if (Array.isArray(event.dailyReports) && event.dailyReports.length) {
    return event.dailyReports.map(normalizeDaily).filter((item) => item.reportDate);
  }
  await ensureCollection(DAILY_COLLECTION);
  const result = await db.collection(DAILY_COLLECTION).where({
    openid,
    studentId: text(event.studentId, 80)
  }).limit(100).get();
  const start = dateText(event.rangeStart);
  const end = dateText(event.rangeEnd);
  return (result.data || [])
    .map(normalizeDaily)
    .filter((item) => (!start || item.reportDate >= start) && (!end || item.reportDate <= end));
}

function aiPrompt(event, stats) {
  const typeLabel = event.reportType === 'monthly' ? '月报' : '周报';
  return [
    '你是青少年篮球教务系统的报告助手。请根据已计算的客观统计和课堂日报证据，生成一份简洁、专业、克制的球员' + typeLabel + '。',
    '必须遵守：',
    '1. 数字只能引用输入数据，不得编造训练结果、比赛表现或身体情况。',
    '2. 区分事实与建议，不使用夸张、诊断性或带有歧视性的语言。',
    '3. 如果证据不足，明确写“本周期记录有限”，不要推断。',
    '4. 只输出JSON，不要Markdown。格式：{"summary":"综合表现","highlights":["亮点"],"suggestions":["建议"],"objectiveFacts":["客观事实"]}',
    '球员：' + text(event.studentName || '学员', 80),
    '周期：' + text(event.rangeStart, 20) + ' 至 ' + text(event.rangeEnd, 20),
    '客观统计与证据：' + JSON.stringify(stats)
  ].join('\n');
}

async function generate(event, openid) {
  const reportType = event.reportType === 'monthly' ? 'monthly' : 'weekly';
  if (!event.studentId) throw new Error('studentId is required');
  const records = await loadDailyReports(event, openid);
  if (!records.length) {
    return { ok: false, code: 'NO_DAILY_REPORTS', message: '当前周期没有可用于生成报告的课堂日报' };
  }
  const stats = aggregate(records);
  const fallback = deterministicSections(text(event.studentName || '学员', 80), reportType, stats);
  const ai = cloud.ai();
  const model = ai.createModel(PROVIDER);
  const aiResult = await model.generateText({
    model: MODEL,
    messages: [{ role: 'user', content: aiPrompt(Object.assign({}, event, { reportType }), stats) }]
  });
  if (aiResult.error) throw new Error(text(aiResult.error.message || aiResult.error, 500));
  const sections = parseSections(aiResult.text, fallback);
  const content = reportContent(sections);
  const periodKey = text(event.periodKey || reportType + '-' + dateText(event.rangeEnd), 80);
  const now = db.serverDate();
  const report = {
    reportType,
    periodKey,
    rangeStart: dateText(event.rangeStart),
    rangeEnd: dateText(event.rangeEnd),
    studentId: text(event.studentId, 80),
    studentName: text(event.studentName, 80),
    studentNumber: text(event.studentNumber, 24),
    title: text(event.title || (event.studentName || '学员') + (reportType === 'monthly' ? '月报' : '周报'), 120),
    status: 'draft',
    model: MODEL,
    provider: PROVIDER,
    sourceMode: Array.isArray(event.dailyReports) && event.dailyReports.length ? 'provided-validation' : 'database-scan',
    evidenceCount: records.length,
    stats,
    sections,
    content,
    usage: aiResult.usage || null,
    updatedAt: now
  };
  const id = await upsert(PERIOD_COLLECTION, { openid, studentId: report.studentId, reportType, periodKey }, report);
  return { ok: true, action: 'generate', id, report: Object.assign({ _id: id }, report) };
}

async function publish(event, openid) {
  if (!event.reportId) throw new Error('reportId is required');
  await ensureCollection(PERIOD_COLLECTION);
  const existing = await db.collection(PERIOD_COLLECTION).doc(event.reportId).get();
  if (!existing.data || existing.data.openid !== openid) throw new Error('report not found');
  const content = text(event.content || existing.data.content, 5000);
  if (!content) throw new Error('report content is required');
  await db.collection(PERIOD_COLLECTION).doc(event.reportId).update({
    data: { content, status: 'published', publishedAt: db.serverDate(), updatedAt: db.serverDate() }
  });
  return { ok: true, action: 'publish', id: event.reportId, status: 'published' };
}

async function listReports(event, openid) {
  await ensureCollection(PERIOD_COLLECTION);
  const reportType = event.reportType === 'monthly' ? 'monthly' : 'weekly';
  const periodKey = text(event.periodKey, 80);
  const result = await db.collection(PERIOD_COLLECTION).where({ openid, reportType, periodKey }).limit(100).get();
  const reports = (result.data || []).map((item) => ({
    _id: item._id,
    studentId: item.studentId,
    studentName: item.studentName,
    studentNumber: item.studentNumber,
    status: item.status,
    content: item.content,
    evidenceCount: item.evidenceCount,
    provider: item.provider,
    model: item.model,
    stats: item.stats
  }));
  return { ok: true, action: 'list', reports };
}

async function queueReports(event, openid) {
  const students = Array.isArray(event.students) ? event.students.slice(0, 60) : [];
  if (!students.length) throw new Error('students is required');
  const reportType = event.reportType === 'monthly' ? 'monthly' : 'weekly';
  const periodKey = text(event.periodKey || reportType + '-' + dateText(event.rangeEnd), 80);
  const queuedIds = [];
  for (const student of students) {
    if (!student || !student.studentId) continue;
    const id = await upsert(JOB_COLLECTION, {
      openid,
      studentId: text(student.studentId, 80),
      reportType,
      periodKey
    }, {
      studentName: text(student.studentName, 80),
      studentNumber: text(student.studentNumber, 24),
      rangeStart: dateText(event.rangeStart),
      rangeEnd: dateText(event.rangeEnd),
      title: text(student.title || student.studentName + (reportType === 'monthly' ? '月报' : '周报'), 120),
      status: 'pending',
      retryCount: 0,
      lastError: '',
      updatedAt: db.serverDate()
    });
    queuedIds.push(id);
  }
  return { ok: true, action: 'queue', queued: queuedIds.length, ids: queuedIds };
}

async function processNextJob() {
  await ensureCollection(JOB_COLLECTION);
  const result = await db.collection(JOB_COLLECTION).where({ status: 'pending' }).limit(1).get();
  const job = result.data && result.data[0];
  if (!job) return { ok: true, action: 'processNextJob', processed: 0, message: 'no pending jobs' };
  await db.collection(JOB_COLLECTION).doc(job._id).update({
    data: { status: 'processing', startedAt: db.serverDate(), updatedAt: db.serverDate() }
  });
  try {
    const generated = await generate({
      reportType: job.reportType,
      periodKey: job.periodKey,
      rangeStart: job.rangeStart,
      rangeEnd: job.rangeEnd,
      studentId: job.studentId,
      studentName: job.studentName,
      studentNumber: job.studentNumber,
      title: job.title
    }, job.openid);
    if (!generated.ok) throw new Error(generated.message || 'report generation failed');
    await db.collection(JOB_COLLECTION).doc(job._id).update({
      data: { status: 'completed', reportId: generated.id, completedAt: db.serverDate(), updatedAt: db.serverDate() }
    });
    return { ok: true, action: 'processNextJob', processed: 1, jobId: job._id, reportId: generated.id };
  } catch (error) {
    await db.collection(JOB_COLLECTION).doc(job._id).update({
      data: {
        status: 'failed',
        retryCount: number(job.retryCount) + 1,
        lastError: text(error.message || error, 500),
        failedAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    });
    return { ok: false, action: 'processNextJob', processed: 1, jobId: job._id, message: text(error.message || error, 500) };
  }
}

exports.main = async (event = {}) => {
  if (event.Type === 'Timer' || event.TriggerName || event.action === 'processNextJob') {
    return await processNextJob();
  }
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID || text(event.validationOwner || '', 80);
  if (!openid) return { ok: false, code: 'UNAUTHENTICATED', message: '无法识别当前微信用户' };
  try {
    if (!(await hasEducationAccess(openid))) {
      return {
        ok: false,
        code: 'EDUCATION_ACCOUNT_REQUIRED',
        message: '当前为教务演示模式，请由 PC 端下发账户并完成开户后再使用真实业务功能'
      };
    }
    if (event.action === 'saveDaily') return await saveDaily(event, openid);
    if (event.action === 'publish') return await publish(event, openid);
    if (event.action === 'generate') return await generate(event, openid);
    if (event.action === 'list') return await listReports(event, openid);
    if (event.action === 'queue') return await queueReports(event, openid);
    return { ok: false, code: 'INVALID_ACTION', message: '不支持的操作' };
  } catch (error) {
    console.error('[sxGeneratePeriodReport]', event.action, error);
    return { ok: false, code: text(error.code || 'PERIOD_REPORT_ERROR', 80), message: text(error.message || error, 500) };
  }
};
