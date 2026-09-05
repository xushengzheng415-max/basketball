'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const SHANGHAI_TIME_ZONE = 'Asia/Shanghai';
const MAX_WECOM_TEXT_BYTES = 3800;
const MAX_WECOM_LINKS = 3;

function parseCsv(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeDomain(value) {
  let domain = String(value || '').trim().toLowerCase();
  if (!domain) return '';
  if (domain.includes('://')) {
    try {
      domain = new URL(domain).hostname.toLowerCase();
    } catch {
      return '';
    }
  }
  return domain.replace(/^\.+/, '').replace(/\.$/, '');
}

function domainMatches(hostname, rule) {
  const host = normalizeDomain(hostname);
  const rawRule = String(rule || '').trim().toLowerCase();
  if (!host || !rawRule) return false;
  if (rawRule.startsWith('*.')) {
    const suffix = normalizeDomain(rawRule.slice(2));
    return Boolean(suffix) && host !== suffix && host.endsWith(`.${suffix}`);
  }
  const domain = normalizeDomain(rawRule);
  return Boolean(domain) && (host === domain || host.endsWith(`.${domain}`));
}

function isAllowedSourceUrl(value, allowlist) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'https:' || url.username || url.password) return false;
    if (url.port && url.port !== '443') return false;
    const host = normalizeDomain(url.hostname);
    if (!host || !host.includes('.') || /^\d+(?:\.\d+){3}$/.test(host)) return false;
    return parseCsv(allowlist).some((rule) => domainMatches(host, rule));
  } catch {
    return false;
  }
}

function utf8Length(value) {
  return Buffer.byteLength(String(value || ''), 'utf8');
}

function truncateUtf8(value, maxBytes, suffix = '…') {
  const text = String(value || '');
  const limit = Math.max(0, Number(maxBytes) || 0);
  if (utf8Length(text) <= limit) return text;
  if (!limit) return '';
  const suffixText = utf8Length(suffix) <= limit ? suffix : '';
  const contentLimit = limit - utf8Length(suffixText);
  let used = 0;
  let result = '';
  for (const character of text) {
    const bytes = utf8Length(character);
    if (used + bytes > contentLimit) break;
    result += character;
    used += bytes;
  }
  return result + suffixText;
}

function shanghaiParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SHANGHAI_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date)
      .filter((item) => item.type !== 'literal')
      .map((item) => [item.type, item.value])
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second)
  };
}

function shanghaiDate(date = new Date()) {
  const parts = shanghaiParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function computeNextShanghaiRun(now = new Date(), hour = 7, minute = 50) {
  const current = shanghaiParts(now);
  let scheduledUtc = Date.UTC(
    current.year,
    current.month - 1,
    current.day,
    Number(hour) - 8,
    Number(minute),
    0,
    0
  );
  if (scheduledUtc <= now.getTime()) scheduledUtc += 24 * 60 * 60 * 1000;
  return new Date(scheduledUtc);
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = stableValue(value[key]);
      return result;
    }, {});
  }
  return value;
}

function contentFingerprint(value) {
  return crypto.createHash('sha256')
    .update(JSON.stringify(stableValue(value)), 'utf8')
    .digest('hex');
}

function safeEqual(left, right) {
  const leftHash = crypto.createHash('sha256').update(String(left || ''), 'utf8').digest();
  const rightHash = crypto.createHash('sha256').update(String(right || ''), 'utf8').digest();
  return crypto.timingSafeEqual(leftHash, rightHash);
}

function cleanText(value, maxLength = 2000) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return Number(maxLength) > 0 ? text.slice(0, Number(maxLength)) : text;
}

function normalizeSource(source) {
  let sourceUrl = cleanText(source && source.url, 0);
  try {
    const parsed = new URL(sourceUrl);
    if (parsed.protocol === 'http:') {
      parsed.protocol = 'https:';
      parsed.port = '';
      sourceUrl = parsed.toString();
    }
  } catch {
    // The validator reports malformed URLs.
  }
  return {
    name: cleanText(source && source.name, 0),
    url: sourceUrl,
    published_at: cleanText(source && source.published_at, 0)
  };
}

function normalizeBriefing(input) {
  const briefing = input && typeof input === 'object' ? input : {};
  const news = Array.isArray(briefing.news) ? briefing.news : [];
  const observation = briefing.institution_observation && typeof briefing.institution_observation === 'object'
    ? briefing.institution_observation
    : {};
  const action = briefing.today_action && typeof briefing.today_action === 'object'
    ? briefing.today_action
    : {};
  return {
    date: cleanText(briefing.date, 0),
    title: cleanText(briefing.title, 0),
    news: news.slice(0, 10).map((item) => ({
      scope: cleanText(item && item.scope, 20),
      category: cleanText(item && item.category, 40),
      title: cleanText(item && item.title, 0),
      summary: cleanText(item && item.summary, 0),
      evidence_boundary: cleanText(item && item.evidence_boundary, 0),
      source: normalizeSource(item && item.source)
    })),
    institution_observation: {
      title: cleanText(observation.title, 0),
      analysis: cleanText(observation.analysis, 0),
      evidence_boundary: cleanText(observation.evidence_boundary, 0),
      sources: (Array.isArray(observation.sources) ? observation.sources : [])
        .slice(0, 10)
        .map(normalizeSource)
    },
    today_action: {
      title: cleanText(action.title, 0),
      action: cleanText(action.action, 0),
      rationale: cleanText(action.rationale, 0)
    }
  };
}

function canonicalUrl(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol === 'http:') {
      url.protocol = 'https:';
      url.port = '';
    }
    url.hash = '';
    if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString();
  } catch {
    return '';
  }
}

function normalizeNewsEventTitle(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/中国男篮|中国女篮|男篮|女篮|篮球|世界杯|亚洲杯|预选赛|世预赛|赛事|比赛|新闻|今日|最新|大胜|击败|战胜|客场|主场|迎战|前瞻|回顾|开赛|落幕|收官/g, '')
    .replace(/[0-9０-９]+/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

function newsTitleSimilarity(left, right) {
  const a = normalizeNewsEventTitle(left);
  const b = normalizeNewsEventTitle(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (Math.min(a.length, b.length) >= 4 && (a.includes(b) || b.includes(a))) return 0.9;
  const grams = (text) => {
    if (text.length < 2) return new Set([text]);
    const result = new Set();
    for (let index = 0; index < text.length - 1; index += 1) result.add(text.slice(index, index + 2));
    return result;
  };
  const leftGrams = grams(a);
  const rightGrams = grams(b);
  let shared = 0;
  leftGrams.forEach((gram) => { if (rightGrams.has(gram)) shared += 1; });
  return (2 * shared) / (leftGrams.size + rightGrams.size);
}

function validateNewsAgainstHistory(news, history = []) {
  const errors = [];
  const previous = Array.isArray(history) ? history : [];
  (Array.isArray(news) ? news : []).forEach((item, index) => {
    const currentUrl = canonicalUrl(item && item.source && item.source.url);
    const duplicate = previous.find((old) => {
      const oldUrl = canonicalUrl(old && old.url);
      if (currentUrl && oldUrl && currentUrl === oldUrl) return true;
      return newsTitleSimilarity(item && item.title, old && old.title) >= 0.55;
    });
    if (duplicate) errors.push(`news_${index + 1}:duplicate_recent_event`);
  });
  return errors;
}

const NEWS_CATEGORIES = new Set([
  'domestic_pro',
  'national_team',
  'domestic_youth',
  'domestic_amateur',
  'nba_wnba',
  'international_pro',
  'fiba_international'
]);

function newsScopeMatchesCategory(item) {
  const scope = String(item && item.scope || '');
  const category = String(item && item.category || '');
  if (!NEWS_CATEGORIES.has(category)) return false;
  if (scope === 'domestic') {
    return ['domestic_pro', 'national_team', 'domestic_youth', 'domestic_amateur'].includes(category);
  }
  if (scope === 'international') {
    return ['nba_wnba', 'international_pro', 'fiba_international'].includes(category);
  }
  return false;
}

function selectBalancedNews(news, history = []) {
  const accepted = [];
  const dedupHistory = Array.isArray(history) ? history.slice() : [];
  (Array.isArray(news) ? news : []).forEach((item) => {
    if (!newsScopeMatchesCategory(item)) return;
    if (validateNewsAgainstHistory([item], dedupHistory).length) return;
    accepted.push(item);
    dedupHistory.push({ title: item.title, url: item.source && item.source.url });
  });
  const domesticPriority = { domestic_pro: 0, national_team: 1, domestic_youth: 2, domestic_amateur: 3 };
  const internationalPriority = { nba_wnba: 0, international_pro: 1, fiba_international: 2 };
  const domestic = accepted
    .filter((item) => item.scope === 'domestic')
    .sort((left, right) => domesticPriority[left.category] - domesticPriority[right.category])
    .slice(0, 2);
  const international = accepted
    .filter((item) => item.scope === 'international')
    .sort((left, right) => internationalPriority[left.category] - internationalPriority[right.category])
    .slice(0, 2);
  return [...domestic, ...international];
}

function institutionReminderTemplates(date = new Date()) {
  const { month, day } = shanghaiParts(date);
  const schoolOpening = (month === 8 && day >= 25) || (month === 9 && day <= 15) ||
    (month === 2 && day >= 10) || (month === 3 && day <= 10);
  if (schoolOpening) {
    return [
      ['开学前后，先把课表确认清楚', '暑期班转常规班时，最容易反复的是上课时间。可以把未确认课表、待续费和请假补课分开列，家长问起来更清楚。'],
      ['暑期班结束，续费别只看缴费名单', '有些孩子愿意继续练，但开学后的时间还没定。续费沟通可以先确认上课时段，再谈课包，少一次来回解释。'],
      ['新学期分班，先看出勤再看年龄', '同年龄孩子的训练基础可能差很多。开学重新排班时，把暑期出勤和课堂表现一起看，班级更容易稳定。'],
      ['教练排班变了，家长需要提前知道', '开学后教练的学校、带队和比赛安排容易变化。涉及固定班级的调整，提前说清代课人和课程衔接，比临时通知省事。'],
      ['请假补课会在开学后集中出现', '学校活动和新课表刚稳定时，请假补课往往一起冒出来。先把补课口径和可选时段说清，教务不会每天重复解释。'],
      ['暑期训练结束，家长更想知道孩子学会了什么', '比起一段笼统评价，家长更容易看懂具体变化：运球是否稳定、对抗是否敢做、比赛里能不能找到位置。'],
      ['开学后的训练强度要重新适应', '孩子从暑期高频训练回到每周常规课，状态会有波动。前两周把训练节奏稳住，比急着追强度更符合实际。'],
      ['赛事和常规课容易撞时间', '九月赛事、校队活动和机构常规课经常重叠。名单、课表和请假信息如果分开维护，临场调整会很被动。']
    ];
  }
  return [
    ['续费沟通先说清下一阶段怎么练', '家长关心的不只是剩余课时，还包括下阶段练什么、班级是否变化。把课程安排说具体，沟通会轻松很多。'],
    ['连续请假的孩子，先确认时间还是兴趣问题', '同样是缺课，原因可能完全不同。先分清学校冲突、身体状态和兴趣变化，再决定补课或调整班级。'],
    ['教练课后反馈不必写得很长', '一句具体动作比一段套话更有用：今天哪项做得更稳、哪项还需要重复、下一节课会接着练什么。'],
    ['比赛回来后，别把输赢当成唯一复盘', '机构内部复盘可以看看名单、分工、家长沟通和现场记录哪里最容易乱，下一场会更省力。'],
    ['班级稳定后，插班安排要留意训练基础', '新生年龄合适不等于能直接跟上。先看基本动作和对抗经验，再决定班级，老学员的课堂节奏也更稳定。'],
    ['家长群消息少一点，重点会更清楚', '课程提醒、请假规则和活动通知混在一起时，家长容易漏看。一次只说一件事，反而更容易得到回复。']
  ];
}

function buildInstitutionReminder(date = new Date(), recentTitles = []) {
  const used = new Set((Array.isArray(recentTitles) ? recentTitles : []).map((title) => cleanText(title, 0)));
  const templates = institutionReminderTemplates(date);
  const selected = templates.find(([title]) => !used.has(title)) || templates[shanghaiParts(date).day % templates.length];
  return {
    title: selected[0],
    analysis: selected[1],
    evidence_boundary: '基于篮球培训机构常见运营节点的通用提醒，需结合本机构实际情况。',
    sources: []
  };
}

function buildWecomText(input) {
  const briefing = normalizeBriefing(input);
  const numberEmoji = ['1️⃣', '2️⃣', '3️⃣'];
  const sectionLines = (items) => items.map((item, index) => (
    `${numberEmoji[index] || `${index + 1}、`} ${item.title}\n${item.summary}`
  ));
  const domesticNews = briefing.news.filter((item) => item.scope === 'domestic');
  const internationalNews = briefing.news.filter((item) => item.scope === 'international');
  return [
    `🏀 赛小蜂篮球晨报｜${briefing.date}`,
    '',
    '🇨🇳 国内篮球短讯',
    ...sectionLines(domesticNews),
    '',
    '🌍 国外篮球短讯',
    ...sectionLines(internationalNews),
    '',
    '📣 机构提醒',
    `${briefing.institution_observation.title}\n${briefing.institution_observation.analysis}`
  ].join('\n');
}

function registrableDomain(hostname) {
  const labels = normalizeDomain(hostname).split('.').filter(Boolean);
  if (labels.length <= 2) return labels.join('.');
  const suffix2 = labels.slice(-2).join('.');
  const multiLevelSuffixes = new Set(['com.cn', 'net.cn', 'org.cn', 'gov.cn', 'edu.cn', 'co.uk', 'org.uk', 'com.au', 'co.jp']);
  return multiLevelSuffixes.has(suffix2) ? labels.slice(-3).join('.') : suffix2;
}

function validateContentSafety(briefing) {
  const errors = [];
  const prose = [
    briefing.title,
    ...briefing.news.flatMap((item) => [item.title, item.summary, item.evidence_boundary]),
    briefing.institution_observation.title,
    briefing.institution_observation.analysis,
    briefing.institution_observation.evidence_boundary,
    briefing.today_action.title,
    briefing.today_action.action,
    briefing.today_action.rationale
  ].join('\n');
  const rules = [
    ['privacy_phone', /(?:^|\D)1[3-9]\d{9}(?:\D|$)/],
    ['privacy_id_card', /(?:^|\D)\d{17}[\dXx](?:\D|$)/],
    ['privacy_email', /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i],
    ['promotion_or_contact_bait', /扫码|加微信|添加微信|私聊|联系我们|招生热线|立即报名|限时优惠|早鸟价|免费领取|点击购买|立即购买|购买(?:本|该|我们的)?产品|产品优惠|会员套餐|开通会员|下单|仅剩\d+名|赛小蜂.{0,8}(?:产品|系统|平台|购买|套餐)/],
    ['exaggerated_claim', /百分之百|100%|绝对有效|保证续费|保证招生|必然增长|必然会|一定能|彻底解决|唯一选择|稳赚|全网第一|行业第一/],
    ['prompt_injection', /忽略.{0,12}(?:指令|规则)|system\s*prompt|泄露.{0,8}提示词/i]
  ];
  rules.forEach(([code, pattern]) => {
    if (pattern.test(prose)) errors.push(`content_safety:${code}`);
  });
  const basketballSignals = (prose.match(/篮球|NBA|CBA|WCBA|FIBA|联赛|赛事|球员|球队|比赛/g) || []).length;
  if (basketballSignals < 2) errors.push('content_semantics:not_basketball_focused');
  if (!/培训|机构|教练|课程|招生|续费|学员|家长|赛事运营/.test(
    `${briefing.institution_observation.title}${briefing.institution_observation.analysis}`
  )) {
    errors.push('content_semantics:observation_not_for_training_organization');
  }
  if (/应该|必须|建议|立即|今天(?:去|要|可)|抓住|引流|布置|打卡|作业/.test(briefing.institution_observation.analysis)) {
    errors.push('content_style:observation_is_instructional');
  }
  if (/带动.{0,12}(?:招生|续费|报名|增长)|转(?:化为|成).{0,12}(?:需求|招生|续费|报名)|促进.{0,12}(?:招生|续费|报名|增长)/.test(
    briefing.institution_observation.analysis
  )) {
    errors.push('content_claim:observation_has_unsupported_business_causality');
  }
  return errors;
}

function validatePublishedAt(value, now, lookbackHours) {
  const timestamp = Date.parse(String(value || ''));
  if (!Number.isFinite(timestamp)) return 'invalid_published_at';
  const futureToleranceMs = 15 * 60 * 1000;
  if (timestamp > now.getTime() + futureToleranceMs) return 'source_date_in_future';
  if (timestamp < now.getTime() - Number(lookbackHours) * 60 * 60 * 1000) return 'source_outside_lookback';
  return '';
}

function validateSource(source, context, config, now, errors, seenUrls) {
  if (!source.name) errors.push(`${context}:missing_source_name`);
  if (source.name.length > 80) errors.push(`${context}:source_name_too_long`);
  if (source.url.length > 2048) errors.push(`${context}:source_url_too_long`);
  if (!isAllowedSourceUrl(source.url, config.sourceDomainAllowlist)) {
    errors.push(`${context}:source_url_not_allowed`);
  } else if (seenUrls.has(source.url)) {
    errors.push(`${context}:duplicate_source_url`);
  } else {
    seenUrls.add(source.url);
  }
  const dateError = validatePublishedAt(source.published_at, now, config.lookbackHours);
  if (dateError) errors.push(`${context}:${dateError}`);
}

function validateBriefing(input, config = {}, nowInput = new Date()) {
  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
  const briefing = normalizeBriefing(input);
  const errors = [];
  const seenUrls = new Set();
  const observationUrls = new Set();
  const searchSourceUrls = new Set(
    (Array.isArray(input && input._search_source_urls) ? input._search_source_urls : [])
      .map(canonicalUrl)
      .filter(Boolean)
  );
  const settings = {
    sourceDomainAllowlist: parseCsv(config.sourceDomainAllowlist),
    lookbackHours: Math.max(1, Number(config.lookbackHours || 72)),
    requireSearchProvenance: config.requireSearchProvenance !== false
  };

  if (!Number.isFinite(now.getTime())) errors.push('invalid_validation_time');
  if (briefing.date !== shanghaiDate(now)) errors.push('briefing_date_mismatch');
  if (!briefing.title) errors.push('missing_title');
  if (briefing.title.length > 80) errors.push('title_too_long');
  if (briefing.news.length < 2 || briefing.news.length > 4) errors.push('news_count_must_be_2_to_4');
  if (!settings.sourceDomainAllowlist.length) errors.push('empty_source_domain_allowlist');

  briefing.news.forEach((item, index) => {
    const context = `news_${index + 1}`;
    if (!item.title) errors.push(`${context}:missing_title`);
    if (!newsScopeMatchesCategory(item)) errors.push(`${context}:invalid_scope_or_category`);
    if (item.title.length > 100) errors.push(`${context}:title_too_long`);
    if (item.summary.length < 20) errors.push(`${context}:summary_too_short`);
    if (item.summary.length > 500) errors.push(`${context}:summary_too_long`);
    if (item.evidence_boundary.length < 8) errors.push(`${context}:missing_evidence_boundary`);
    if (item.evidence_boundary.length > 300) errors.push(`${context}:evidence_boundary_too_long`);
    validateSource(item.source, context, settings, now, errors, seenUrls);
    if (settings.requireSearchProvenance && !searchSourceUrls.has(canonicalUrl(item.source.url))) {
      errors.push(`${context}:source_not_returned_by_web_search`);
    }
  });
  const domesticNews = briefing.news.filter((item) => item.scope === 'domestic');
  const internationalNews = briefing.news.filter((item) => item.scope === 'international');
  if (domesticNews.length < 1 || domesticNews.length > 2) errors.push('domestic_news_count_must_be_1_or_2');
  if (internationalNews.length < 1 || internationalNews.length > 2) errors.push('international_news_count_must_be_1_or_2');
  if (!domesticNews.some((item) => ['domestic_pro', 'national_team'].includes(item.category))) {
    errors.push('domestic_news_requires_pro_or_national_team');
  }
  if (domesticNews.filter((item) => item.category === 'domestic_amateur').length > 1) {
    errors.push('domestic_amateur_news_must_be_at_most_1');
  }

  const observation = briefing.institution_observation;
  if (!observation.title) errors.push('observation:missing_title');
  if (observation.title.length > 100) errors.push('observation:title_too_long');
  if (observation.analysis.length < 40) errors.push('observation:analysis_too_short');
  if (observation.analysis.length > 800) errors.push('observation:analysis_too_long');
  if (observation.evidence_boundary.length < 12) errors.push('observation:missing_evidence_boundary');
  if (observation.evidence_boundary.length > 400) errors.push('observation:evidence_boundary_too_long');
  if (observation.sources.length === 1) errors.push('observation:requires_0_or_2_sources');
  observation.sources.forEach((source, index) => {
    validateSource(source, `observation_source_${index + 1}`, settings, now, errors, observationUrls);
    if (settings.requireSearchProvenance && !searchSourceUrls.has(canonicalUrl(source.url))) {
      errors.push(`observation_source_${index + 1}:source_not_returned_by_web_search`);
    }
  });
  const observationDomains = new Set();
  observation.sources.forEach((source) => {
    try {
      observationDomains.add(registrableDomain(new URL(source.url).hostname));
    } catch {
      // Invalid URLs are reported by validateSource.
    }
  });
  if (observation.sources.length >= 2 && observationDomains.size < 2) errors.push('observation:requires_2_distinct_source_domains');

  if (!briefing.today_action.title) errors.push('today_action:missing_title');
  if (briefing.today_action.title.length > 100) errors.push('today_action:title_too_long');
  if (briefing.today_action.action.length < 12) errors.push('today_action:action_too_short');
  if (briefing.today_action.action.length > 500) errors.push('today_action:action_too_long');
  if (briefing.today_action.rationale.length < 8) errors.push('today_action:rationale_too_short');
  if (briefing.today_action.rationale.length > 400) errors.push('today_action:rationale_too_long');
  errors.push(...validateContentSafety(briefing));
  if (utf8Length(buildWecomText(briefing)) > MAX_WECOM_TEXT_BYTES) errors.push('wecom_text_exceeds_3800_bytes');

  return {
    valid: errors.length === 0,
    status: errors.length === 0 ? 'ready' : 'review_required',
    errors,
    briefing,
    searchSourceUrls: [...searchSourceUrls]
  };
}

function sourceSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'url', 'published_at'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 80 },
      url: { type: 'string', minLength: 10, maxLength: 2048 },
      published_at: { type: 'string', description: 'ISO 8601 date-time with timezone' }
    }
  };
}

function buildBriefingSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['date', 'title', 'news', 'institution_observation', 'today_action'],
    properties: {
      date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      title: { type: 'string', minLength: 1, maxLength: 80 },
      news: {
        type: 'array',
        minItems: 2,
        maxItems: 4,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['scope', 'category', 'title', 'summary', 'evidence_boundary', 'source'],
          properties: {
            scope: { type: 'string', enum: ['domestic', 'international'] },
            category: {
              type: 'string',
              enum: ['domestic_pro', 'national_team', 'domestic_youth', 'domestic_amateur', 'nba_wnba', 'international_pro', 'fiba_international']
            },
            title: { type: 'string', minLength: 1, maxLength: 100 },
            summary: { type: 'string', minLength: 20, maxLength: 500 },
            evidence_boundary: { type: 'string', minLength: 8, maxLength: 300 },
            source: sourceSchema()
          }
        }
      },
      institution_observation: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'analysis', 'evidence_boundary', 'sources'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 100 },
          analysis: { type: 'string', minLength: 40, maxLength: 800 },
          evidence_boundary: { type: 'string', minLength: 12, maxLength: 400 },
          sources: { type: 'array', minItems: 0, maxItems: 0, items: sourceSchema() }
        }
      },
      today_action: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'action', 'rationale'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 100 },
          action: { type: 'string', minLength: 12, maxLength: 500 },
          rationale: { type: 'string', minLength: 8, maxLength: 400 }
        }
      }
    }
  };
}

function buildResponsesRequest(config, now = new Date()) {
  const allowedDomains = parseCsv(config.sourceDomainAllowlist)
    .map((item) => item.replace(/^\*\./, ''))
    .filter(Boolean);
  const date = shanghaiDate(now);
  const lookbackHours = Math.max(1, Number(config.lookbackHours || 72));
  const recentNewsHistory = (Array.isArray(config.recentNewsHistory) ? config.recentNewsHistory : [])
    .slice(0, 30)
    .map((item) => `${item.date || ''}｜${item.title || ''}`)
    .filter(Boolean);
  const isDeepSeek = /(^|\.)deepseek\.com$/i.test((() => {
    try { return new URL(String(config.openaiBaseUrl || '')).hostname; } catch { return ''; }
  })());
  const webSearchTool = { type: config.openaiWebSearchTool || 'web_search' };
  // DeepSeek supports the Responses web_search tool but does not document
  // OpenAI's allowed_domains tool filter. The prompt and post-validation still
  // enforce the same domain allowlist, so omit that provider-specific field.
  if (!isDeepSeek) webSearchTool.filters = { allowed_domains: allowedDomains };
  const request = {
    model: config.openaiModel,
    store: false,
    tools: [webSearchTool],
    tool_choice: 'required',
    instructions: [
      '你是赛小蜂篮球的事实核验编辑，面向篮球培训机构经营者写中文晨报。',
      '只能引用通过网页搜索实际找到且可访问的来源，不得凭记忆补充比分、日期、人物或机构数据。',
      '赛讯与行业观察必须区分事实、推断和建议；evidence_boundary 要明确哪些是公开事实、哪些是推断、哪些尚未确认。',
      'institution_observation 将由系统按培训机构运营日历替换；你只需提供符合结构的占位内容，sources 必须为空数组。',
      '群内晨报固定分为国内篮球短讯、国外篮球短讯、机构提醒三个板块。国内和国外新闻各1至2条，总数2至4条，每条摘要不超过80个汉字。',
      '国内新闻优先级：CBA/WCBA/NBL等职业联赛、中国男女篮及国家队 > 中国篮协青少年官方赛事 > 群众业余赛事。国内必须至少有1条职业联赛或国家队新闻；群众业余赛事最多1条，只能作为补充。',
      '国外新闻优先级：NBA/WNBA > 欧洲等海外职业联赛 > 重要FIBA国际赛事。',
      '每条新闻必须正确填写 scope 和 category；国内为 domestic，国外为 international。',
      '机构观察只描述新闻之间呈现出的现象，不说教，不使用“应该、必须、建议机构、今天去做”等命令式表达，也不把赛事热度写成招生、续费或报名增长的原因。',
      '来源链接和证据边界由后台保存，不要把长链接或编辑说明写进摘要、分析和行动字段。',
      '不要宣传赛小蜂产品，不要使用夸张或确定性营销措辞。',
      '所有 published_at 必须使用带时区的 ISO 8601 格式。'
    ].join('\n'),
    input: [
      `当前北京时间日期：${date}。`,
      `只使用最近 ${lookbackHours} 小时内发布或更新的材料，优先最近24小时；不足3条时才补充更早内容。`,
      `允许引用的来源域名仅限：${allowedDomains.join('、')}。`,
      recentNewsHistory.length
        ? `近7天已经出现过以下新闻，禁止重复同一比赛、同一结果或同一事件，即使更换标题或来源也不行：\n${recentNewsHistory.join('\n')}`
        : '近7天暂无已用新闻记录。',
      '生成国内篮球短讯1至2条、国外篮球短讯1至2条。institution_observation.sources 必须为 []；today_action仅供后台编辑记录，不会展示到群内。',
      '如证据不足，不要凑数；仍须按结构输出，并在 evidence_boundary 中如实说明，系统会转人工审核。'
    ].join('\n'),
    text: {
      format: {
        type: 'json_schema',
        name: 'sxf_basketball_group_briefing',
        strict: true,
        schema: buildBriefingSchema()
      }
    }
  };
  // DeepSeek currently ignores `include`; OpenAI uses it to return the full
  // search-source collection that the provenance validator consumes.
  if (!isDeepSeek) request.include = ['web_search_call.action.sources'];
  return request;
}

function extractResponseJson(response) {
  if (response && response.output_parsed && typeof response.output_parsed === 'object') {
    return response.output_parsed;
  }
  let text = response && typeof response.output_text === 'string' ? response.output_text : '';
  if (!text && response && Array.isArray(response.output)) {
    for (const item of response.output) {
      // Providers such as DeepSeek return a separate `reasoning` item whose
      // reasoning_text must never be concatenated with the final JSON message.
      if (!item || item.type !== 'message') continue;
      for (const content of Array.isArray(item && item.content) ? item.content : []) {
        if (content && content.parsed && typeof content.parsed === 'object') return content.parsed;
        if (content && content.type === 'output_text' && typeof content.text === 'string') text += content.text;
      }
    }
  }
  if (!text) throw Object.assign(new Error('openai_response_missing_output'), { code: 'openai_response_missing_output' });
  const candidates = [String(text).trim()];
  const withoutFence = candidates[0]
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  if (withoutFence !== candidates[0]) candidates.push(withoutFence);
  const objectStart = withoutFence.indexOf('{');
  const objectEnd = withoutFence.lastIndexOf('}');
  if (objectStart >= 0 && objectEnd > objectStart) {
    candidates.push(withoutFence.slice(objectStart, objectEnd + 1));
  }
  for (const candidate of [...new Set(candidates)]) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {
      // Try the next safe extraction candidate.
    }
  }
  throw Object.assign(new Error('openai_response_invalid_json'), { code: 'openai_response_invalid_json' });
}

function extractWebSearchSourceUrls(response) {
  const urls = new Set();
  const visit = (value, insideSearchCall = false) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, insideSearchCall));
      return;
    }
    const isSearchCall = insideSearchCall || value.type === 'web_search_call';
    if (isSearchCall && typeof value.url === 'string') {
      const canonical = canonicalUrl(value.url);
      if (canonical) urls.add(canonical);
    }
    Object.entries(value).forEach(([key, child]) => {
      if (key !== 'text' && key !== 'output_text') visit(child, isSearchCall);
    });
  };
  visit(response, false);
  return [...urls];
}

async function generateBriefing(config, dependencies = {}, now = new Date()) {
  if (!config.openaiApiKey) throw Object.assign(new Error('missing_openai_api_key'), { code: 'missing_openai_api_key' });
  if (!config.openaiModel) throw Object.assign(new Error('missing_openai_model'), { code: 'missing_openai_model' });
  if (!parseCsv(config.sourceDomainAllowlist).length) {
    throw Object.assign(new Error('empty_source_domain_allowlist'), { code: 'empty_source_domain_allowlist' });
  }
  const fetchImpl = dependencies.fetch || globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('fetch_unavailable');
  const baseUrl = String(config.openaiBaseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(1000, Number(config.openaiTimeoutMs || 120000)));
  let response;
  try {
    response = await fetchImpl(`${baseUrl}/responses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(buildResponsesRequest(config, now)),
      signal: controller.signal
    });
  } catch (error) {
    const code = error && error.name === 'AbortError' ? 'openai_timeout' : 'openai_network_error';
    throw Object.assign(new Error(code), { code });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    throw Object.assign(new Error('openai_http_error'), {
      code: 'openai_http_error',
      httpStatus: response.status
    });
  }
  const data = await response.json();
  const briefing = extractResponseJson(data);
  briefing._search_source_urls = extractWebSearchSourceUrls(data);
  return briefing;
}

function uniqueNewsLinks(briefing) {
  const seen = new Set();
  const links = [];
  const candidates = [
    ...briefing.news.slice(0, 2).map((item) => ({
      title: item.title,
      description: `${item.summary}｜来源：${item.source.name}`,
      source: item.source
    })),
    ...briefing.institution_observation.sources.map((source) => ({
      title: `机构观察来源｜${source.name}`,
      description: briefing.institution_observation.evidence_boundary,
      source
    })),
    ...briefing.news.slice(2).map((item) => ({
      title: item.title,
      description: `${item.summary}｜来源：${item.source.name}`,
      source: item.source
    }))
  ];
  for (const item of candidates) {
    const source = item.source;
    if (!source.url || seen.has(source.url)) continue;
    seen.add(source.url);
    links.push({
      msgtype: 'link',
      link: {
        title: truncateUtf8(cleanText(item.title, 0), 128),
        desc: truncateUtf8(cleanText(item.description, 0), 512),
        url: source.url
      }
    });
    if (links.length === MAX_WECOM_LINKS) break;
  }
  return links;
}

function formatWecomMessage(input, targets = {}) {
  const briefing = normalizeBriefing(input);
  const sender = cleanText(targets.sender, 0);
  const chatIds = [...new Set(parseCsv(targets.chatIdList || targets.chat_id_list))];
  if (!sender) throw Object.assign(new Error('explicit_sender_required'), { code: 'explicit_sender_required' });
  if (!chatIds.length) throw Object.assign(new Error('explicit_chat_id_list_required'), { code: 'explicit_chat_id_list_required' });
  if (sender.length > 128 || chatIds.length > 2000 || chatIds.some((chatId) => chatId.length > 256)) {
    throw Object.assign(new Error('invalid_explicit_group_targets'), { code: 'invalid_explicit_group_targets' });
  }

  const content = buildWecomText(briefing);
  if (!content || utf8Length(content) > MAX_WECOM_TEXT_BYTES) {
    throw Object.assign(new Error('wecom_text_too_long'), { code: 'wecom_text_too_long' });
  }
  return {
    chat_type: 'group',
    sender,
    chat_id_list: chatIds,
    allow_select: false,
    text: { content }
  };
}

function makeApiError(prefix, data, httpStatus) {
  const errcode = Number(data && data.errcode);
  const code = `${prefix}_${Number.isFinite(errcode) ? errcode : 'unknown'}`;
  return Object.assign(new Error(code), { code, errcode, httpStatus });
}

function createWecomClient(config, dependencies = {}) {
  const fetchImpl = dependencies.fetch || globalThis.fetch;
  const now = dependencies.now || (() => Date.now());
  const baseUrl = String(config.wecomApiBase || 'https://qyapi.weixin.qq.com').replace(/\/+$/, '');
  let tokenCache = { value: '', expiresAt: 0 };

  async function rawJson(method, endpoint, body) {
    if (typeof dependencies.requestJson === 'function') {
      return dependencies.requestJson(method, endpoint, body);
    }
    if (typeof fetchImpl !== 'function') throw Object.assign(new Error('fetch_unavailable'), { code: 'fetch_unavailable' });
    const controller = new AbortController();
    const timeoutMs = Math.max(1000, Number(dependencies.timeoutMs || config.wecomTimeoutMs || 10000));
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetchImpl(`${baseUrl}${endpoint}`, {
        method,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal
      });
    } catch (error) {
      const code = error && error.name === 'AbortError' ? 'wecom_timeout' : 'wecom_network_error';
      throw Object.assign(new Error(code), { code });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) throw Object.assign(new Error('wecom_http_error'), { code: 'wecom_http_error', httpStatus: response.status });
    try {
      return await response.json();
    } catch {
      throw Object.assign(new Error('wecom_invalid_json'), { code: 'wecom_invalid_json' });
    }
  }

  async function getToken(force = false) {
    const time = Number(now());
    if (!force && tokenCache.value && tokenCache.expiresAt - 300000 > time) return tokenCache.value;
    if (!config.wecomCorpId || !config.wecomContactSecret) {
      throw Object.assign(new Error('missing_wecom_credentials'), { code: 'missing_wecom_credentials' });
    }
    const endpoint = `/cgi-bin/gettoken?corpid=${encodeURIComponent(config.wecomCorpId)}&corpsecret=${encodeURIComponent(config.wecomContactSecret)}`;
    const data = await rawJson('GET', endpoint);
    if (Number(data.errcode || 0) !== 0 || !data.access_token) throw makeApiError('wecom_gettoken', data);
    tokenCache = {
      value: data.access_token,
      expiresAt: time + Math.max(300, Number(data.expires_in || 7200)) * 1000
    };
    return tokenCache.value;
  }

  async function call(endpoint, body, retried = false) {
    const token = await getToken(retried);
    const joiner = endpoint.includes('?') ? '&' : '?';
    const data = await rawJson('POST', `${endpoint}${joiner}access_token=${encodeURIComponent(token)}`, body);
    if ([40014, 42001].includes(Number(data.errcode)) && !retried) {
      tokenCache = { value: '', expiresAt: 0 };
      return call(endpoint, body, true);
    }
    if (Number(data.errcode || 0) !== 0) throw makeApiError('wecom_api', data);
    return data;
  }

  return {
    getAccessToken: getToken,
    listCustomerGroups(params = {}) {
      const body = {
        status_filter: Number.isFinite(Number(params.statusFilter)) ? Number(params.statusFilter) : 0,
        limit: Math.min(1000, Math.max(1, Number(params.limit || 100)))
      };
      const ownerIds = parseCsv(params.ownerUserIds || params.owner_userid_list);
      if (ownerIds.length > 100) throw Object.assign(new Error('owner_filter_too_large'), { code: 'owner_filter_too_large' });
      if (ownerIds.length) body.owner_filter = { userid_list: ownerIds };
      if (params.cursor) body.cursor = String(params.cursor);
      return call('/cgi-bin/externalcontact/groupchat/list', body);
    },
    getCustomerGroup(chatId, needName = true) {
      if (!chatId) throw Object.assign(new Error('chat_id_required'), { code: 'chat_id_required' });
      return call('/cgi-bin/externalcontact/groupchat/get', {
        chat_id: String(chatId),
        need_name: needName ? 1 : 0
      });
    },
    addGroupMessageTemplate(payload) {
      if (!payload || payload.chat_type !== 'group' || !payload.sender || !Array.isArray(payload.chat_id_list) || !payload.chat_id_list.length) {
        throw Object.assign(new Error('invalid_explicit_group_targets'), { code: 'invalid_explicit_group_targets' });
      }
      if (payload.chat_id_list.length > 2000 || payload.allow_select !== false) {
        throw Object.assign(new Error('unsafe_group_target_configuration'), { code: 'unsafe_group_target_configuration' });
      }
      return call('/cgi-bin/externalcontact/add_msg_template', payload);
    },
    remindGroupMessageSend(msgid) {
      if (!msgid) throw Object.assign(new Error('msgid_required'), { code: 'msgid_required' });
      return call('/cgi-bin/externalcontact/remind_groupmsg_send', { msgid: String(msgid) });
    },
    cancelGroupMessageSend(msgid) {
      if (!msgid) throw Object.assign(new Error('msgid_required'), { code: 'msgid_required' });
      return call('/cgi-bin/externalcontact/cancel_groupmsg_send', { msgid: String(msgid) });
    },
    sendApplicationText(userId, agentId, content) {
      const normalizedUserId = String(userId || '').trim();
      const normalizedAgentId = Number(agentId);
      if (!normalizedUserId) throw Object.assign(new Error('user_id_required'), { code: 'user_id_required' });
      if (!Number.isInteger(normalizedAgentId) || normalizedAgentId <= 0) {
        throw Object.assign(new Error('valid_agent_id_required'), { code: 'valid_agent_id_required' });
      }
      return call('/cgi-bin/message/send', {
        touser: normalizedUserId,
        msgtype: 'text',
        agentid: normalizedAgentId,
        text: { content: truncateUtf8(String(content || ''), 1800, '') },
        safe: 0,
        enable_duplicate_check: 1,
        duplicate_check_interval: 1800
      });
    },
    getGroupMessageTasks(msgid, cursor = '', limit = 1000) {
      const body = { msgid: String(msgid), limit: Math.min(1000, Math.max(1, Number(limit || 1000))) };
      if (!body.msgid) throw Object.assign(new Error('msgid_required'), { code: 'msgid_required' });
      if (cursor) body.cursor = String(cursor);
      return call('/cgi-bin/externalcontact/get_groupmsg_task', body);
    },
    getGroupMessageSendResult(msgid, sender, cursor = '', limit = 500) {
      const body = {
        msgid: String(msgid),
        userid: String(sender),
        limit: Math.min(500, Math.max(1, Number(limit || 500)))
      };
      if (!body.msgid) throw Object.assign(new Error('msgid_required'), { code: 'msgid_required' });
      if (!body.userid) throw Object.assign(new Error('sender_required'), { code: 'sender_required' });
      if (cursor) body.cursor = String(cursor);
      return call('/cgi-bin/externalcontact/get_groupmsg_send_result', body);
    },
    listGroupMessageRecords(params = {}) {
      const toSeconds = (value, fallback) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
        return Math.floor(numeric > 1e12 ? numeric / 1000 : numeric);
      };
      const endTime = toSeconds(params.endTime, Math.floor(Date.now() / 1000));
      const startTime = toSeconds(params.startTime, endTime - 3 * 24 * 60 * 60);
      const body = {
        chat_type: 'group',
        start_time: startTime,
        end_time: endTime,
        limit: Math.min(100, Math.max(1, Number(params.limit || 100)))
      };
      body.filter_type = params.filterType !== undefined ? Number(params.filterType) : 2;
      if (params.cursor) body.cursor = String(params.cursor);
      return call('/cgi-bin/externalcontact/get_groupmsg_list_v2', body);
    }
  };
}

function initialState() {
  return {
    version: 1,
    records: {},
    scheduler: {
      preview_attempt_date: '',
      preview_attempt_count: 0,
      preview_success_date: '',
      next_preview_attempt_at: '',
      reminder_attempt_date: ''
    },
    updated_at: ''
  };
}

class StateStore {
  constructor(filePath, dependencies = {}) {
    this.filePath = path.resolve(String(filePath));
    this.fs = dependencies.fs || fs;
  }

  load() {
    try {
      const data = JSON.parse(this.fs.readFileSync(this.filePath, 'utf8'));
      return Object.assign(initialState(), data, {
        records: data && data.records && typeof data.records === 'object' ? data.records : {},
        scheduler: Object.assign(initialState().scheduler, data && data.scheduler)
      });
    } catch (error) {
      if (error && error.code === 'ENOENT') return initialState();
      throw Object.assign(new Error('state_file_invalid'), { code: 'state_file_invalid' });
    }
  }

  save(state) {
    const directory = path.dirname(this.filePath);
    this.fs.mkdirSync(directory, { recursive: true });
    const next = Object.assign({}, state, { updated_at: new Date().toISOString() });
    const temporary = `${this.filePath}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
    try {
      this.fs.writeFileSync(temporary, `${JSON.stringify(next, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
      this.fs.renameSync(temporary, this.filePath);
    } finally {
      try {
        if (this.fs.existsSync(temporary)) this.fs.unlinkSync(temporary);
      } catch {
        // Best-effort cleanup of a never-published temporary state file.
      }
    }
    return next;
  }

  update(mutator) {
    const state = this.load();
    const result = mutator(state) || state;
    return this.save(result);
  }

  recoverInterruptedCreations(now = new Date()) {
    let recovered = 0;
    const state = this.update((draft) => {
      Object.values(draft.records).forEach((record) => {
        if (record && record.status === 'creating_task') {
          record.status = 'creation_uncertain';
          record.review_required = true;
          record.last_error = 'restart_detected_after_create_started';
          record.recovered_at = now.toISOString();
          recovered += 1;
        }
      });
      return draft;
    });
    return { recovered, state };
  }
}

module.exports = {
  MAX_WECOM_LINKS,
  MAX_WECOM_TEXT_BYTES,
  SHANGHAI_TIME_ZONE,
  StateStore,
  buildBriefingSchema,
  buildWecomText,
  buildResponsesRequest,
  computeNextShanghaiRun,
  contentFingerprint,
  createWecomClient,
  domainMatches,
  canonicalUrl,
  extractResponseJson,
  extractWebSearchSourceUrls,
  formatWecomMessage,
  generateBriefing,
  buildInstitutionReminder,
  isAllowedSourceUrl,
  newsScopeMatchesCategory,
  newsTitleSimilarity,
  normalizeBriefing,
  normalizeNewsEventTitle,
  normalizeDomain,
  parseCsv,
  safeEqual,
  registrableDomain,
  selectBalancedNews,
  shanghaiDate,
  shanghaiParts,
  truncateUtf8,
  utf8Length,
  validateContentSafety,
  validateBriefing,
  validateNewsAgainstHistory
};
