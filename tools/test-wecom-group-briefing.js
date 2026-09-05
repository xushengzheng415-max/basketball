'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  MAX_WECOM_TEXT_BYTES,
  StateStore,
  buildInstitutionReminder,
  buildResponsesRequest,
  contentFingerprint,
  createWecomClient,
  extractResponseJson,
  formatWecomMessage,
  isAllowedSourceUrl,
  newsTitleSimilarity,
  safeEqual,
  selectBalancedNews,
  truncateUtf8,
  utf8Length,
  validateBriefing,
  validateNewsAgainstHistory
} = require('../cloudfunctions/sxWecomGroupBriefing/core');
const { BriefingService, loadConfig } = require('../cloudfunctions/sxWecomGroupBriefing');
const { isAuthorized } = require('../cloudfunctions/sxWecomGroupBriefing/server');

const validationNow = new Date('2026-08-25T00:30:00.000Z');
const sourceDomainAllowlist = [
  'nba.com',
  'cba.net.cn',
  'fiba.basketball',
  'sport.gov.cn',
  'xinhuanet.com'
];

function source(name, url, hour = '2026-08-24T22:00:00+08:00') {
  return { name, url, published_at: hour };
}

function validBriefing() {
  const briefing = {
    date: '2026-08-25',
    title: '篮球机构晨报',
    news: [
      {
        scope: 'domestic',
        category: 'national_team',
        title: '中国篮球公开赛事公布最新赛程',
        summary: '赛事主办方公布了新一阶段赛程和开赛时间，参赛队可据此核对出行与训练安排。',
        evidence_boundary: '公开信息只说明赛程安排，不代表参赛规模或市场需求发生变化。',
        source: source('中国篮协', 'https://www.cba.net.cn/news/schedule-1')
      },
      {
        scope: 'international',
        category: 'fiba_international',
        title: '国际篮联更新青年赛事信息',
        summary: '国际篮联更新了青年组赛事页面，列出了比赛日期、举办地和公开参赛信息。',
        evidence_boundary: '页面更新不能证明所有地区的青少年赛事数量都在增加。',
        source: source('国际篮联', 'https://www.fiba.basketball/youth/event-2')
      },
      {
        scope: 'international',
        category: 'nba_wnba',
        title: '职业篮球联赛公布新一轮比赛安排',
        summary: '联盟公布了下一阶段比赛时间和对阵，相关球队进入赛前准备。',
        evidence_boundary: '赛程信息只说明比赛安排，不代表球队实力或商业热度变化。',
        source: source('NBA', 'https://www.nba.com/news/schedule-3')
      }
    ],
    institution_observation: {
      title: '赛历与校内安排需要提前对表',
      analysis: '公开赛历和教育部门的时间安排显示，部分赛事日期可能与学校教学节点重叠。这是一项排期风险，不等于所有学员都会冲突。教务可以先核对参赛名单，再联系相关家长确认。',
      evidence_boundary: '两个来源只能支持特定日期存在重叠可能，不能据此推断全国机构都需要调整课程。',
      sources: [
        source('国家体育总局', 'https://www.sport.gov.cn/events/calendar-3'),
        source('新华社', 'https://www.xinhuanet.com/education/calendar-4')
      ]
    },
    today_action: {
      title: '核对未来四周排期',
      action: '由教务负责人导出未来四周参赛学员名单，标记校内考试和机构比赛的日期冲突。',
      rationale: '先找到具体冲突对象，才能决定调课、替补或家长确认顺序。'
    }
  };
  briefing._search_source_urls = [
    ...briefing.news.map((item) => item.source.url),
    ...briefing.institution_observation.sources.map((item) => item.url)
  ];
  return briefing;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function testSourceAllowlist() {
  assert.equal(isAllowedSourceUrl('https://nba.com/news/1', ['nba.com']), true);
  assert.equal(isAllowedSourceUrl('https://www.nba.com/news/1', ['*.nba.com']), true);
  assert.equal(isAllowedSourceUrl('https://nba.com/news/1', ['*.nba.com']), false);
  assert.equal(isAllowedSourceUrl('https://nba.com.evil.example/news/1', ['nba.com']), false);
  assert.equal(isAllowedSourceUrl('http://nba.com/news/1', ['nba.com']), false);
  assert.equal(isAllowedSourceUrl('https://user:pass@nba.com/news/1', ['nba.com']), false);
  assert.equal(isAllowedSourceUrl('https://nba.com:8443/news/1', ['nba.com']), false);
  assert.equal(isAllowedSourceUrl('https://127.0.0.1/news/1', ['127.0.0.1']), false);
  assert.equal(isAllowedSourceUrl('not-a-url', ['nba.com']), false);
}

function testHttpSearchProvenanceNormalizesToHttps() {
  const briefing = validBriefing();
  briefing._search_source_urls[0] = briefing._search_source_urls[0].replace(/^https:/, 'http:');
  const result = validateBriefing(briefing, {
    sourceDomainAllowlist,
    lookbackHours: 24,
    requireSearchProvenance: true
  }, validationNow);
  assert.equal(result.errors.includes('news_1:source_not_returned_by_web_search'), false);
}

function testUtf8Length() {
  assert.equal(utf8Length('篮A'), 4);
  assert.equal(truncateUtf8('篮球ABCDEF', 9), '篮球…');
  assert.equal(utf8Length(truncateUtf8('篮球快讯'.repeat(1000), MAX_WECOM_TEXT_BYTES)) <= MAX_WECOM_TEXT_BYTES, true);
  assert.equal(truncateUtf8('完整', 20), '完整');
}

function testContentValidation() {
  const result = validateBriefing(validBriefing(), {
    sourceDomainAllowlist,
    lookbackHours: 36,
    requireSearchProvenance: true
  }, validationNow);
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(result.status, 'ready');

  const tooFewNews = clone(validBriefing());
  tooFewNews.news.length = 1;
  assert.ok(validateBriefing(tooFewNews, { sourceDomainAllowlist }, validationNow)
    .errors.includes('news_count_must_be_2_to_4'));

  const oneObservationSource = clone(validBriefing());
  oneObservationSource.institution_observation.sources.length = 1;
  const sourceErrors = validateBriefing(oneObservationSource, { sourceDomainAllowlist }, validationNow).errors;
  assert.ok(sourceErrors.includes('observation:requires_0_or_2_sources'));

  const samePublisherSubdomains = clone(validBriefing());
  samePublisherSubdomains.institution_observation.sources = [
    source('体育总局主站', 'https://www.sport.gov.cn/events/source-a'),
    source('体育总局新闻页', 'https://news.sport.gov.cn/events/source-b')
  ];
  samePublisherSubdomains._search_source_urls = [
    ...samePublisherSubdomains.news.map((item) => item.source.url),
    ...samePublisherSubdomains.institution_observation.sources.map((item) => item.url)
  ];
  assert.ok(validateBriefing(samePublisherSubdomains, { sourceDomainAllowlist }, validationNow)
    .errors.includes('observation:requires_2_distinct_source_domains'));

  const duplicatedSource = clone(validBriefing());
  duplicatedSource.institution_observation.sources[1].url = duplicatedSource.institution_observation.sources[0].url;
  assert.ok(validateBriefing(duplicatedSource, { sourceDomainAllowlist }, validationNow)
    .errors.includes('observation_source_2:duplicate_source_url'));

  const oldSource = clone(validBriefing());
  oldSource.news[0].source.published_at = '2026-08-20T08:00:00+08:00';
  assert.ok(validateBriefing(oldSource, { sourceDomainAllowlist, lookbackHours: 36 }, validationNow)
    .errors.includes('news_1:source_outside_lookback'));

  const untrustedSource = clone(validBriefing());
  untrustedSource.news[0].source.url = 'https://news.example.net/copied-story';
  assert.ok(validateBriefing(untrustedSource, { sourceDomainAllowlist }, validationNow)
    .errors.includes('news_1:source_url_not_allowed'));

  const wrongDate = clone(validBriefing());
  wrongDate.date = '2026-08-24';
  assert.ok(validateBriefing(wrongDate, { sourceDomainAllowlist }, validationNow)
    .errors.includes('briefing_date_mismatch'));

  const missingSearchProvenance = clone(validBriefing());
  missingSearchProvenance._search_source_urls = [];
  assert.ok(validateBriefing(missingSearchProvenance, {
    sourceDomainAllowlist,
    requireSearchProvenance: true
  }, validationNow).errors.includes('news_1:source_not_returned_by_web_search'));

  const overlong = clone(validBriefing());
  overlong.news.forEach((item) => { item.summary = '训练安排'.repeat(125); });
  overlong.institution_observation.analysis = '机构排期风险需要逐项核对'.repeat(80);
  overlong.today_action.action = '教务负责人核对名单与日期冲突'.repeat(40);
  assert.ok(validateBriefing(overlong, { sourceDomainAllowlist }, validationNow)
    .errors.includes('wecom_text_exceeds_3800_bytes'));

  const privatePhone = clone(validBriefing());
  privatePhone.today_action.action += '，联系号码为13800138000';
  assert.ok(validateBriefing(privatePhone, { sourceDomainAllowlist }, validationNow)
    .errors.includes('content_safety:privacy_phone'));

  const promotion = clone(validBriefing());
  promotion.today_action.action += '，立即报名可领取限时优惠';
  assert.ok(validateBriefing(promotion, { sourceDomainAllowlist }, validationNow)
    .errors.includes('content_safety:promotion_or_contact_bait'));
}

function testFingerprintAndFormatting() {
  const left = { date: '2026-08-25', targets: ['chat-b', 'chat-a'] };
  const right = { targets: ['chat-b', 'chat-a'], date: '2026-08-25' };
  assert.equal(contentFingerprint(left), contentFingerprint(right));

  assert.throws(
    () => formatWecomMessage(validBriefing(), { chatIdList: ['chat-1'] }),
    /explicit_sender_required/
  );
  assert.throws(
    () => formatWecomMessage(validBriefing(), { sender: 'owner-1', chatIdList: [] }),
    /explicit_chat_id_list_required/
  );

  const payload = formatWecomMessage(validBriefing(), {
    sender: 'owner-1',
    chatIdList: ['chat-2', 'chat-1', 'chat-1']
  });
  assert.equal(payload.chat_type, 'group');
  assert.equal(payload.sender, 'owner-1');
  assert.deepEqual(payload.chat_id_list, ['chat-2', 'chat-1']);
  assert.equal(payload.allow_select, false);
  assert.equal(payload.attachments, undefined);
  assert.equal(payload.text.content.includes('https://'), false);
  assert.equal(payload.text.content.includes('证据边界'), false);
  assert.ok(payload.text.content.includes('🇨🇳 国内篮球短讯'));
  assert.ok(payload.text.content.includes('🌍 国外篮球短讯'));
  assert.ok(payload.text.content.includes('📣 机构提醒'));
  assert.equal(payload.text.content.includes('✅ 今天可做'), false);
  assert.equal(payload.text.content.includes('信息来源'), false);
  assert.ok(utf8Length(payload.text.content) <= MAX_WECOM_TEXT_BYTES);
}

function testDeepSeekResponsesCompatibility() {
  const request = buildResponsesRequest({
    openaiBaseUrl: 'https://api.deepseek.com',
    openaiModel: 'deepseek-v4-flash',
    openaiWebSearchTool: 'web_search',
    sourceDomainAllowlist,
    lookbackHours: 24
  }, validationNow);
  assert.equal(request.model, 'deepseek-v4-flash');
  assert.deepEqual(request.tools, [{ type: 'web_search' }]);
  assert.equal(request.tool_choice, 'required');
  assert.equal(request.include, undefined);
  assert.equal(request.text.format.type, 'json_schema');

  const parsed = extractResponseJson({
    output: [
      { type: 'reasoning', content: [{ type: 'reasoning_text', text: 'internal reasoning' }] },
      { type: 'message', content: [{ type: 'output_text', text: '{"ok":true}' }] }
    ]
  });
  assert.deepEqual(parsed, { ok: true });
  assert.deepEqual(extractResponseJson({
    output: [{
      type: 'message',
      content: [{ type: 'output_text', text: '```json\n{"ok":true}\n```' }]
    }]
  }), { ok: true });
}

function testStateRecovery() {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'sxf-wecom-briefing-test-'));
  const stateFile = path.join(temporaryDirectory, 'state.json');
  try {
    const store = new StateStore(stateFile);
    store.save({
      version: 1,
      records: {
        current: {
          status: 'creating_task',
          idempotency_key: '2026-08-25:owner-1:chat-1'
        }
      },
      scheduler: {}
    });
    const recovery = store.recoverInterruptedCreations(new Date('2026-08-25T01:00:00.000Z'));
    assert.equal(recovery.recovered, 1);
    assert.equal(recovery.state.records.current.status, 'creation_uncertain');
    assert.equal(recovery.state.records.current.review_required, true);
    assert.equal(recovery.state.records.current.last_error, 'restart_detected_after_create_started');
  } finally {
    const resolved = path.resolve(temporaryDirectory);
    if (resolved.startsWith(path.resolve(os.tmpdir()) + path.sep)) {
      fs.rmSync(resolved, { recursive: true, force: true });
    }
  }
}

async function testWecomTaskApiAndNoBlindRetry() {
  const calls = [];
  const client = createWecomClient({
    wecomCorpId: 'ww-test',
    wecomContactSecret: 'secret-test'
  }, {
    requestJson: async (method, endpoint, body) => {
      calls.push({ method, endpoint, body });
      if (endpoint.startsWith('/cgi-bin/gettoken')) {
        return { errcode: 0, access_token: 'token-test', expires_in: 7200 };
      }
      if (endpoint.startsWith('/cgi-bin/externalcontact/add_msg_template')) {
        return { errcode: 0, msgid: 'msg-1', fail_list: [] };
      }
      if (endpoint.startsWith('/cgi-bin/externalcontact/remind_groupmsg_send')) {
        return { errcode: 0 };
      }
      throw new Error(`unexpected_endpoint:${endpoint}`);
    }
  });

  const payload = formatWecomMessage(validBriefing(), {
    sender: 'owner-1',
    chatIdList: ['chat-1']
  });
  const created = await client.addGroupMessageTemplate(payload);
  assert.equal(created.msgid, 'msg-1');
  await client.remindGroupMessageSend(created.msgid);
  const createCall = calls.find((item) => item.endpoint.startsWith('/cgi-bin/externalcontact/add_msg_template'));
  const reminderCall = calls.find((item) => item.endpoint.startsWith('/cgi-bin/externalcontact/remind_groupmsg_send'));
  assert.equal(createCall.body.sender, 'owner-1');
  assert.deepEqual(createCall.body.chat_id_list, ['chat-1']);
  assert.equal(createCall.body.allow_select, false);
  assert.deepEqual(reminderCall.body, { msgid: 'msg-1' });

  let failedCreateCalls = 0;
  const failingClient = createWecomClient({
    wecomCorpId: 'ww-test',
    wecomContactSecret: 'secret-test'
  }, {
    requestJson: async (method, endpoint) => {
      if (endpoint.startsWith('/cgi-bin/gettoken')) {
        return { errcode: 0, access_token: 'token-test', expires_in: 7200 };
      }
      if (endpoint.startsWith('/cgi-bin/externalcontact/add_msg_template')) {
        failedCreateCalls += 1;
        throw Object.assign(new Error('simulated_network_timeout'), { code: 'simulated_network_timeout' });
      }
      throw new Error(`unexpected_endpoint:${endpoint}`);
    }
  });
  await assert.rejects(() => failingClient.addGroupMessageTemplate(payload), /simulated_network_timeout/);
  assert.equal(failedCreateCalls, 1, '创建请求结果未知时不得由 API 客户端盲目重放');
}

function serviceConfig(stateFile) {
  return {
    serviceEnabled: true,
    schedulerEnabled: false,
    autoCreateEnabled: false,
    autoRemindEnabled: false,
    stateFile,
    sourceDomainAllowlist,
    requireSearchProvenance: true,
    lookbackHours: 36,
    wecomSenderUserId: 'owner-1',
    wecomChatIdList: ['chat-1'],
    scheduleHour: 7,
    scheduleMinute: 50,
    reminderHour: 9,
    reminderMinute: 0,
    reminderMinIntervalMinutes: 60
  };
}

function silentLogger() {
  return { info() {}, warn() {}, error() {} };
}

async function withTemporaryState(callback) {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'sxf-wecom-service-test-'));
  const resolved = path.resolve(temporaryDirectory);
  try {
    return await callback(path.join(temporaryDirectory, 'state.json'));
  } finally {
    if (resolved.startsWith(path.resolve(os.tmpdir()) + path.sep)) {
      fs.rmSync(resolved, { recursive: true, force: true });
    }
  }
}

async function testServiceTaskLifecycleAndIdempotency() {
  await withTemporaryState(async (stateFile) => {
    let currentNow = validationNow;
    let createCalls = 0;
    let remindCalls = 0;
    let taskQueryCalls = 0;
    let resultQueryCalls = 0;
    let createPayload;
    let taskStatus = 0;
    const wecomClient = {
      async addGroupMessageTemplate(payload) {
        createCalls += 1;
        createPayload = payload;
        return { errcode: 0, msgid: 'msg-service-1', fail_list: ['chat-unavailable'] };
      },
      async remindGroupMessageSend(msgid) {
        remindCalls += 1;
        assert.equal(msgid, 'msg-service-1');
        return { errcode: 0 };
      },
      async getGroupMessageTasks(msgid) {
        taskQueryCalls += 1;
        return {
          errcode: 0,
          task_list: [{
            userid: 'owner-1',
            status: taskStatus,
            ...(taskStatus === 2 ? { send_time: 1787589000 } : {})
          }]
        };
      },
      async getGroupMessageSendResult(msgid, sender) {
        resultQueryCalls += 1;
        assert.equal(sender, 'owner-1');
        return { errcode: 0, send_list: [] };
      }
    };
    const service = new BriefingService(serviceConfig(stateFile), {
      store: new StateStore(stateFile),
      now: () => currentNow,
      generateBriefing: async () => validBriefing(),
      wecomClient,
      logger: silentLogger()
    });

    const preview = await service.generatePreview();
    assert.equal(preview.status, 'ready', preview.validation_errors.join('\n'));
    const request = {
      date: preview.date,
      fingerprint: preview.fingerprint,
      sender: 'owner-1',
      chatIdList: ['chat-2', 'chat-1']
    };
    const created = await service.createTask(request);
    assert.equal(created.created, true);
    assert.equal(created.msgid, 'msg-service-1');
    assert.deepEqual(created.record.fail_list, ['chat-unavailable']);
    assert.equal(typeof created.record.delivery_key, 'string');
    assert.ok(created.record.delivery_key.length > 20);
    assert.equal(createPayload.chat_type, 'group');
    assert.equal(createPayload.allow_select, false);
    assert.equal(createPayload.sender, 'owner-1');
    assert.deepEqual(createPayload.chat_id_list, ['chat-1', 'chat-2']);

    const repeated = await service.createTask(request);
    assert.equal(repeated.created, false);
    assert.equal(repeated.reused, true);
    assert.equal(repeated.msgid, 'msg-service-1');
    assert.equal(createCalls, 1, '同一晨报和目标群重复触发只能创建一次企微任务');

    await assert.rejects(
      () => service.createTask({
        date: preview.date,
        fingerprint: preview.fingerprint,
        sender: 'owner-1',
        chatIdList: ['chat-3']
      }),
      (error) => error && error.code === 'content_already_created_for_different_targets'
    );
    assert.equal(createCalls, 1, '同一内容改用其他目标群时不得静默复用旧任务');

    await service.remindTask({ msgid: created.msgid });
    assert.equal(remindCalls, 1);
    const saved = new StateStore(stateFile).load().records[preview.key];
    assert.equal(saved.reminders.length, 1);
    assert.deepEqual(saved.reminders[0].api_result, { errcode: 0 });

    await assert.rejects(
      () => service.remindTask({ msgid: created.msgid }),
      (error) => error && error.code === 'reminder_minimum_interval_not_reached'
    );
    assert.equal(remindCalls, 1, '最小提醒间隔内不得重复调用企微提醒接口');

    const result = await service.getTaskResult({ msgid: created.msgid, sender: 'owner-1' });
    assert.equal(result.delivery_status, 'pending');
    assert.equal(result.tasks.task_list[0].status, 0);
    assert.deepEqual(result.send_result.send_list, []);
    assert.equal(taskQueryCalls, 3, '每次提醒尝试和结果回读都必须查询群主任务状态');
    assert.equal(resultQueryCalls, 1);

    taskStatus = 2;
    const skippedReminder = await service.remindTask({ msgid: created.msgid });
    assert.equal(skippedReminder.skipped, true);
    assert.equal(skippedReminder.reason, 'already_sent');
    assert.equal(remindCalls, 1, '群主已经发送后不得再次调用提醒接口');
    assert.equal(taskQueryCalls, 4, '即使仍在最小间隔内，也应先识别群主已经发送');

    const variant = validBriefing();
    variant.title = '篮球机构晨报修订版';
    const secondService = new BriefingService(serviceConfig(stateFile), {
      store: new StateStore(stateFile),
      now: () => currentNow,
      generateBriefing: async () => variant,
      wecomClient,
      logger: silentLogger()
    });
    const secondPreview = await secondService.generatePreview();
    assert.notEqual(secondPreview.fingerprint, preview.fingerprint);
    await assert.rejects(
      () => secondService.createTask({
        date: secondPreview.date,
        fingerprint: secondPreview.fingerprint,
        sender: 'owner-1',
        chatIdList: ['chat-1', 'chat-2']
      }),
      (error) => error && error.code === 'daily_target_delivery_already_exists'
    );
    assert.equal(createCalls, 1, '同一天同一群主与目标群集合不能因改稿重复创建');
  });
}

async function testServiceCreationFailureNeverDuplicates() {
  await withTemporaryState(async (stateFile) => {
    let createCalls = 0;
    const service = new BriefingService(serviceConfig(stateFile), {
      store: new StateStore(stateFile),
      now: () => validationNow,
      generateBriefing: async () => validBriefing(),
      wecomClient: {
        async addGroupMessageTemplate() {
          createCalls += 1;
          throw Object.assign(new Error('simulated_timeout_after_request'), {
            code: 'simulated_timeout_after_request'
          });
        }
      },
      logger: silentLogger()
    });

    const preview = await service.generatePreview();
    const request = {
      date: preview.date,
      fingerprint: preview.fingerprint,
      sender: 'owner-1',
      chatIdList: ['chat-1']
    };
    await assert.rejects(
      () => service.createTask(request),
      (error) => error && error.code === 'task_creation_uncertain'
    );
    assert.equal(createCalls, 1);
    const uncertain = new StateStore(stateFile).load().records[preview.key];
    assert.equal(uncertain.status, 'creation_uncertain');
    assert.equal(uncertain.review_required, true);

    await assert.rejects(
      () => service.createTask(request),
      (error) => error && error.code === 'task_creation_requires_manual_reconciliation'
    );
    assert.equal(createCalls, 1, '结果未知的创建请求不得自动重放');
  });
}

async function testServiceDefiniteApiRejectionNeverDuplicates() {
  await withTemporaryState(async (stateFile) => {
    let createCalls = 0;
    const service = new BriefingService(serviceConfig(stateFile), {
      store: new StateStore(stateFile),
      now: () => validationNow,
      generateBriefing: async () => validBriefing(),
      wecomClient: {
        async addGroupMessageTemplate() {
          createCalls += 1;
          throw Object.assign(new Error('wecom_api_48002'), {
            code: 'wecom_api_48002',
            errcode: 48002
          });
        }
      },
      logger: silentLogger()
    });

    const preview = await service.generatePreview();
    const request = {
      date: preview.date,
      fingerprint: preview.fingerprint,
      sender: 'owner-1',
      chatIdList: ['chat-1']
    };
    await assert.rejects(
      () => service.createTask(request),
      (error) => error && error.code === 'task_creation_rejected'
    );
    assert.equal(createCalls, 1);
    const rejected = new StateStore(stateFile).load().records[preview.key];
    assert.equal(rejected.status, 'create_failed');
    assert.equal(rejected.review_required, true);

    await assert.rejects(
      () => service.createTask(request),
      (error) => error && error.code === 'task_creation_requires_manual_reconciliation'
    );
    assert.equal(createCalls, 1, '企微明确拒绝后也不得由定时任务反复创建');
  });
}

async function testTokenFailureDoesNotPoisonIdempotencyState() {
  await withTemporaryState(async (stateFile) => {
    let createCalls = 0;
    const service = new BriefingService(serviceConfig(stateFile), {
      store: new StateStore(stateFile),
      now: () => validationNow,
      generateBriefing: async () => validBriefing(),
      wecomClient: {
        async getAccessToken() {
          throw Object.assign(new Error('wecom_gettoken_timeout'), { code: 'wecom_gettoken_timeout' });
        },
        async addGroupMessageTemplate() {
          createCalls += 1;
          return { msgid: 'must-not-be-created' };
        }
      },
      logger: silentLogger()
    });
    const preview = await service.generatePreview();
    await assert.rejects(
      () => service.createTask({
        date: preview.date,
        fingerprint: preview.fingerprint,
        sender: 'owner-1',
        chatIdList: ['chat-1']
      }),
      (error) => error && error.code === 'wecom_gettoken_timeout'
    );
    assert.equal(createCalls, 0, '令牌失败时不得调用创建接口');
    const saved = new StateStore(stateFile).load().records[preview.key];
    assert.equal(saved.status, 'ready');
    assert.equal(saved.delivery_key, undefined);
  });
}

async function testDailySchedulerBoundaryAndIdempotency() {
  await withTemporaryState(async (stateFile) => {
    let generated = 0;
    const config = Object.assign(serviceConfig(stateFile), {
      schedulerEnabled: true,
      autoCreateEnabled: false,
      autoRemindEnabled: false
    });
    const service = new BriefingService(config, {
      store: new StateStore(stateFile),
      generateBriefing: async (unusedConfig, unusedDependencies, now) => {
        generated += 1;
        const briefing = validBriefing();
        if (now.getTime() >= Date.parse('2026-08-25T16:00:00.000Z')) {
          briefing.date = '2026-08-26';
          const nextTitles = ['北方青少年联赛公布赛程', '南方三人篮球赛完成分组', '国际篮球训练营发布名单'];
          briefing.news.forEach((item, index) => {
            item.title = nextTitles[index];
            item.source.url = item.source.url.replace(/\d+$/, `next-${index + 1}`);
            item.source.published_at = '2026-08-25T22:00:00+08:00';
          });
          briefing.institution_observation.sources.forEach((item) => {
            item.published_at = '2026-08-25T22:00:00+08:00';
          });
          briefing._search_source_urls = [
            ...briefing.news.map((item) => item.source.url),
            ...briefing.institution_observation.sources.map((item) => item.url)
          ];
        }
        return briefing;
      },
      wecomClient: {},
      logger: silentLogger()
    });

    const before = await service.tick(new Date('2026-08-24T23:49:00.000Z'));
    assert.deepEqual(before.actions, []);
    assert.equal(generated, 0);

    const due = await service.tick(new Date('2026-08-24T23:50:00.000Z'));
    assert.equal(due.actions[0].action, 'preview');
    assert.equal(due.actions[0].status, 'ready');
    assert.equal(generated, 1);

    const repeated = await service.tick(new Date('2026-08-25T00:10:00.000Z'));
    assert.deepEqual(repeated.actions, []);
    assert.equal(generated, 1, '同一天重复调度不能再次生成晨报');

    const nextDay = await service.tick(new Date('2026-08-25T23:50:00.000Z'));
    assert.equal(nextDay.date, '2026-08-26');
    assert.equal(nextDay.actions[0].status, 'ready');
    assert.equal(generated, 2, '跨日到达调度时间后应生成新晨报');
  });
}

async function testDailySchedulerStopsAfterThreeBackoffAttempts() {
  await withTemporaryState(async (stateFile) => {
    let attempts = 0;
    const config = Object.assign(serviceConfig(stateFile), {
      schedulerEnabled: true,
      autoCreateEnabled: false,
      autoRemindEnabled: false
    });
    const service = new BriefingService(config, {
      store: new StateStore(stateFile),
      generateBriefing: async () => {
        attempts += 1;
        throw Object.assign(new Error('source_temporarily_unavailable'), {
          code: 'source_temporarily_unavailable'
        });
      },
      wecomClient: {},
      logger: silentLogger()
    });

    await service.tick(new Date('2026-08-24T23:50:00.000Z'));
    await service.tick(new Date('2026-08-24T23:54:00.000Z'));
    assert.equal(attempts, 1);
    await service.tick(new Date('2026-08-24T23:55:00.000Z'));
    await service.tick(new Date('2026-08-25T00:09:00.000Z'));
    assert.equal(attempts, 2);
    await service.tick(new Date('2026-08-25T00:10:00.000Z'));
    await service.tick(new Date('2026-08-25T00:40:00.000Z'));
    assert.equal(attempts, 3, '当天自动预览失败最多尝试三次');
    const state = new StateStore(stateFile).load();
    assert.equal(state.scheduler.preview_attempt_count, 3);
    assert.equal(state.scheduler.preview_success_date, '');
  });
}

async function testCandidatePoolBuildsBriefingWithoutAnotherModelCall() {
  await withTemporaryState(async (stateFile) => {
    const store = new StateStore(stateFile);
    const base = validBriefing();
    const records = {};
    base.news.forEach((item, index) => {
      records[`candidate-${index + 1}`] = {
        key: `candidate-${index + 1}`,
        date: '2026-08-25',
        status: 'review_required',
        validation_errors: [],
        briefing: {
          date: '2026-08-25',
          title: '候选晨报',
          news: [item],
          institution_observation: base.institution_observation,
          today_action: base.today_action
        },
        search_source_urls: [item.source.url],
        created_at: new Date(validationNow.getTime() + index * 1000).toISOString()
      };
    });
    store.save({ version: 1, records, scheduler: {} });
    const service = new BriefingService(serviceConfig(stateFile), {
      store,
      now: () => validationNow,
      generateBriefing: async () => { throw new Error('model_must_not_run_when_pool_is_full'); },
      wecomClient: {},
      logger: silentLogger()
    });
    const preview = await service.generatePreview();
    assert.equal(preview.status, 'ready', preview.validation_errors.join('\n'));
    assert.equal(preview.briefing.news.length, 3);
    assert.ok(/开学|暑期班|课表|续费/.test(
      `${preview.briefing.institution_observation.title}${preview.briefing.institution_observation.analysis}`
    ));
  });
}

function testAdminAuthentication() {
  assert.equal(safeEqual('admin-token', 'admin-token'), true);
  assert.equal(safeEqual('admin-token', 'wrong-token'), false);
  assert.equal(safeEqual('', ''), true);
  const basic = (value) => `Basic ${Buffer.from(value, 'utf8').toString('base64')}`;
  assert.equal(isAuthorized({ headers: {} }, 'admin-token'), false);
  assert.equal(isAuthorized({ headers: { authorization: 'Bearer admin-token' } }, 'admin-token'), false);
  assert.equal(isAuthorized({ headers: { authorization: basic('operator:wrong-token') } }, 'admin-token'), false);
  assert.equal(isAuthorized({ headers: { authorization: basic('operator:admin-token') } }, 'admin-token'), true);
  assert.equal(isAuthorized({ headers: { authorization: basic('operator:admin-token') } }, ''), false);
}

function testProductionDefaults() {
  const config = loadConfig({});
  assert.equal(config.lookbackHours, 72);
  assert.equal(config.newsDedupDays, 7);
  assert.equal(config.reminderMinIntervalMinutes, 60);
  assert.equal(config.autoCreateEnabled, false);
  assert.equal(config.autoRemindEnabled, false);
}

function testCrossDayNewsDeduplication() {
  const history = [{
    date: '2026-08-29',
    title: '男篮世预赛中国客场83:57大胜卡塔尔',
    url: 'https://www.news.cn/game/china-qatar'
  }];
  const duplicateByTitle = [{
    title: '世界杯预选赛中国男篮大胜卡塔尔',
    source: { url: 'https://another.example.com/china-qatar' }
  }];
  assert.ok(newsTitleSimilarity(history[0].title, duplicateByTitle[0].title) >= 0.55);
  assert.deepEqual(validateNewsAgainstHistory(duplicateByTitle, history), ['news_1:duplicate_recent_event']);
  const different = [{ title: '中国女篮公布新一期集训名单', source: { url: 'https://example.com/new-roster' } }];
  assert.deepEqual(validateNewsAgainstHistory(different, history), []);
}

function testInstitutionReminderUsesOperatingCalendar() {
  const reminder = buildInstitutionReminder(new Date('2026-08-31T01:00:00.000Z'), []);
  assert.ok(/开学|暑期班|课表|续费/.test(`${reminder.title}${reminder.analysis}`));
  assert.deepEqual(reminder.sources, []);
  assert.equal(/卡塔尔|浙BA|村BA/.test(`${reminder.title}${reminder.analysis}`), false);
}

function testDomesticInternationalSectionRules() {
  const briefing = validBriefing();
  const valid = validateBriefing(briefing, { sourceDomainAllowlist }, validationNow);
  assert.equal(valid.errors.includes('domestic_news_count_must_be_1_or_2'), false);
  assert.equal(valid.errors.includes('international_news_count_must_be_1_or_2'), false);
  const onlyDomestic = clone(briefing);
  onlyDomestic.news.forEach((item) => {
    item.scope = 'domestic';
    item.category = 'domestic_youth';
  });
  const errors = validateBriefing(onlyDomestic, { sourceDomainAllowlist }, validationNow).errors;
  assert.ok(errors.includes('international_news_count_must_be_1_or_2'));
  assert.ok(errors.includes('domestic_news_requires_pro_or_national_team'));

  const mixed = clone(briefing).news.concat([{
    scope: 'domestic',
    category: 'domestic_amateur',
    title: '群众篮球活动消息',
    summary: '地方群众篮球活动完成赛程安排，并公布了参与队伍和比赛场地信息。',
    evidence_boundary: '公开信息仅说明活动安排。',
    source: source('地方媒体', 'https://www.news.cn/local/amateur-event')
  }]);
  const selected = selectBalancedNews(mixed, []);
  assert.equal(selected.filter((item) => item.scope === 'domestic').length, 2);
  assert.equal(selected.filter((item) => item.scope === 'international').length, 2);
  assert.ok(['national_team', 'domestic_pro'].includes(selected[0].category));
}

async function run() {
  testSourceAllowlist();
  testHttpSearchProvenanceNormalizesToHttps();
  testUtf8Length();
  testContentValidation();
  testFingerprintAndFormatting();
  testDeepSeekResponsesCompatibility();
  testStateRecovery();
  await testWecomTaskApiAndNoBlindRetry();
  await testServiceTaskLifecycleAndIdempotency();
  await testServiceCreationFailureNeverDuplicates();
  await testServiceDefiniteApiRejectionNeverDuplicates();
  await testTokenFailureDoesNotPoisonIdempotencyState();
  await testDailySchedulerBoundaryAndIdempotency();
  await testDailySchedulerStopsAfterThreeBackoffAttempts();
  await testCandidatePoolBuildsBriefingWithoutAnotherModelCall();
  testAdminAuthentication();
  testProductionDefaults();
  testCrossDayNewsDeduplication();
  testInstitutionReminderUsesOperatingCalendar();
  testDomesticInternationalSectionRules();
  console.log('sxWecomGroupBriefing tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
