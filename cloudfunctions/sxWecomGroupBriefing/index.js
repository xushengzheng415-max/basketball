'use strict';

const path = require('node:path');
const {
  StateStore,
  buildInstitutionReminder,
  contentFingerprint,
  createWecomClient,
  formatWecomMessage,
  generateBriefing,
  parseCsv,
  selectBalancedNews,
  shanghaiDate,
  shanghaiParts,
  validateBriefing,
  validateNewsAgainstHistory
} = require('./core');

function readBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).trim().toLowerCase() === 'true';
}

function readInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function loadConfig(environment = process.env) {
  const dataDir = String(environment.DATA_DIR || path.join(__dirname, 'data'));
  return {
    serviceEnabled: readBoolean(environment.SERVICE_ENABLED, false),
    schedulerEnabled: readBoolean(environment.SCHEDULER_ENABLED, false),
    autoCreateEnabled: readBoolean(environment.AUTO_CREATE_ENABLED, false),
    autoRemindEnabled: readBoolean(environment.AUTO_REMIND_ENABLED, false),
    port: readInteger(environment.PORT, 3400, 1, 65535),
    host: '127.0.0.1',
    adminToken: String(environment.ADMIN_TOKEN || ''),
    dataDir,
    stateFile: String(environment.STATE_FILE || path.join(dataDir, 'state.json')),
    openaiApiKey: String(environment.OPENAI_API_KEY || ''),
    openaiBaseUrl: String(environment.OPENAI_BASE_URL || 'https://api.openai.com/v1'),
    openaiModel: String(environment.OPENAI_MODEL || 'gpt-5.5'),
    openaiWebSearchTool: String(environment.OPENAI_WEB_SEARCH_TOOL || 'web_search'),
    openaiTimeoutMs: readInteger(environment.OPENAI_TIMEOUT_MS, 120000, 1000, 300000),
    sourceDomainAllowlist: parseCsv(environment.SOURCE_DOMAIN_ALLOWLIST),
    requireSearchProvenance: readBoolean(environment.REQUIRE_SEARCH_PROVENANCE, true),
    lookbackHours: readInteger(environment.BRIEF_LOOKBACK_HOURS, 72, 1, 168),
    newsDedupDays: readInteger(environment.NEWS_DEDUP_DAYS, 7, 1, 30),
    wecomCorpId: String(environment.WECOM_CORP_ID || ''),
    wecomContactSecret: String(environment.WECOM_CONTACT_SECRET || ''),
    wecomApiBase: String(environment.WECOM_API_BASE || 'https://qyapi.weixin.qq.com'),
    wecomTimeoutMs: readInteger(environment.WECOM_TIMEOUT_MS, 10000, 1000, 60000),
    wecomAgentId: String(environment.WECOM_AGENT_ID || ''),
    wecomSenderUserId: String(environment.WECOM_SENDER_USERID || ''),
    wecomChatIdList: parseCsv(environment.WECOM_CHAT_ID_LIST),
    scheduleHour: readInteger(environment.SCHEDULE_HOUR, 9, 0, 23),
    scheduleMinute: readInteger(environment.SCHEDULE_MINUTE, 0, 0, 59),
    reminderHour: readInteger(environment.REMINDER_HOUR, 10, 0, 23),
    reminderMinute: readInteger(environment.REMINDER_MINUTE, 0, 0, 59),
    reminderMinIntervalMinutes: readInteger(environment.REMINDER_MIN_INTERVAL_MINUTES, 60, 1, 1440),
    publicBaseUrl: String(environment.PUBLIC_BASE_URL || '')
  };
}

function errorCode(error) {
  const raw = String((error && error.code) || (error && error.message) || 'unknown_error');
  return raw.replace(/[^a-zA-Z0-9_:-]/g, '_').slice(0, 120) || 'unknown_error';
}

function recordKey(date, fingerprint) {
  return `${String(date)}:${String(fingerprint)}`;
}

function deliveryKey(date, sender, chatIdList) {
  const normalizedTargets = [...new Set(parseCsv(chatIdList))].sort();
  return contentFingerprint({ date: String(date), sender: String(sender), chat_id_list: normalizedTargets });
}

function summaryFromState(state) {
  const records = Object.values(state.records || {})
    .sort((left, right) => String(right.created_at || '').localeCompare(String(left.created_at || '')));
  return {
    updated_at: state.updated_at || '',
    scheduler: state.scheduler || {},
    records
  };
}

class BriefingService {
  constructor(config, dependencies = {}) {
    this.config = config;
    this.now = dependencies.now || (() => new Date());
    this.fetch = dependencies.fetch || globalThis.fetch;
    this.sleep = dependencies.sleep || ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
    this.generator = dependencies.generateBriefing || generateBriefing;
    this.store = dependencies.store || new StateStore(config.stateFile);
    this.wecom = dependencies.wecomClient || createWecomClient(config, { fetch: this.fetch });
    this.logger = dependencies.logger || console;
    this.lock = Promise.resolve();
  }

  async _exclusive(operation) {
    const previous = this.lock;
    let release;
    this.lock = new Promise((resolve) => { release = resolve; });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }

  _log(level, event, fields = {}) {
    const method = this.logger && typeof this.logger[level] === 'function' ? this.logger[level] : null;
    if (!method) return;
    const safeFields = {};
    const allowed = ['date', 'fingerprint', 'status', 'msgid', 'count', 'code', 'reused', 'source'];
    allowed.forEach((key) => {
      if (fields[key] !== undefined) {
        const value = String(fields[key]);
        safeFields[key] = key === 'msgid'
          ? contentFingerprint(value).slice(0, 12)
          : value.slice(0, 128);
      }
    });
    method.call(this.logger, `[sxWecomGroupBriefing] ${event}`, safeFields);
  }

  _ensureEnabled() {
    if (!this.config.serviceEnabled) {
      throw Object.assign(new Error('service_disabled'), { code: 'service_disabled', httpStatus: 503 });
    }
  }

  async _withDispatchRetry(operation) {
    const delays = [1000, 3000];
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        if (Number(error && error.errcode) !== 41063 || attempt >= delays.length) throw error;
        await this.sleep(delays[attempt]);
      }
    }
  }

  async _notifyOwnerOnce(key, content) {
    const notificationKey = String(key || '');
    if (!notificationKey || !this.config.wecomAgentId || !this.config.wecomSenderUserId) {
      return { skipped: true, reason: 'notification_not_configured' };
    }
    if (typeof this.wecom.sendApplicationText !== 'function') {
      return { skipped: true, reason: 'notification_not_supported' };
    }
    const state = this.store.load();
    if (state.scheduler.last_owner_notification_key === notificationKey) {
      return { skipped: true, reason: 'notification_already_sent' };
    }
    await this.wecom.sendApplicationText(
      this.config.wecomSenderUserId,
      this.config.wecomAgentId,
      content
    );
    this.store.update((draft) => {
      draft.scheduler.last_owner_notification_key = notificationKey;
      draft.scheduler.last_owner_notification_at = this.now().toISOString();
      return draft;
    });
    this._log('info', 'owner_notification_sent', { date: notificationKey.slice(0, 10), status: 'sent' });
    return { skipped: false };
  }

  async initialize() {
    return this._exclusive(async () => {
      const result = this.store.recoverInterruptedCreations(this.now());
      if (result.recovered) this._log('warn', 'creation_recovered_as_uncertain', { count: result.recovered });
      return result;
    });
  }

  getStatus() {
    const state = this.store.load();
    return {
      service_enabled: this.config.serviceEnabled,
      scheduler_enabled: this.config.schedulerEnabled,
      auto_create_enabled: this.config.autoCreateEnabled,
      auto_remind_enabled: this.config.autoRemindEnabled,
      schedule: {
        timezone: 'Asia/Shanghai',
        hour: this.config.scheduleHour,
        minute: this.config.scheduleMinute,
        reminder_hour: this.config.reminderHour,
        reminder_minute: this.config.reminderMinute,
        reminder_min_interval_minutes: this.config.reminderMinIntervalMinutes
      },
      target_defaults: {
        sender_configured: Boolean(this.config.wecomSenderUserId),
        chat_id_count: this.config.wecomChatIdList.length
      },
      state: summaryFromState(state)
    };
  }

  _recentContentHistory(now) {
    const currentTime = now instanceof Date ? now.getTime() : new Date(now).getTime();
    const cutoff = currentTime - Math.max(1, Number(this.config.newsDedupDays || 7)) * 24 * 60 * 60 * 1000;
    const currentDate = shanghaiDate(now);
    const publishedNews = [];
    const candidateNews = [];
    const observationTitles = [];
    Object.values(this.store.load().records || {}).forEach((record) => {
      if (!record || !record.briefing || !record.date) return;
      const recordTime = Date.parse(`${record.date}T00:00:00+08:00`);
      if (!Number.isFinite(recordTime) || recordTime < cutoff || recordTime > currentTime) return;
      const isPublishedOrSeen = ['task_created', 'task_created_partial', 'canceled'].includes(record.status);
      (record.briefing.news || []).forEach((item, index) => {
        if (!item || !item.title) return;
        const summary = {
          date: record.date,
          title: String(item.title),
          url: String(item.source && item.source.url || '')
        };
        if (isPublishedOrSeen) {
          publishedNews.push(summary);
          return;
        }
        if (record.date !== currentDate || record.status !== 'review_required') return;
        const hasNewsError = (record.validation_errors || []).some((error) => (
          String(error).startsWith(`news_${index + 1}:`)
        ));
        if (hasNewsError) return;
        if (validateNewsAgainstHistory([item], [...publishedNews, ...candidateNews]).length) return;
        candidateNews.push(Object.assign(summary, {
          item: JSON.parse(JSON.stringify(item)),
          search_source_urls: Array.isArray(record.search_source_urls) ? record.search_source_urls.slice() : []
        }));
      });
      const observationTitle = record.briefing.institution_observation && record.briefing.institution_observation.title;
      if (observationTitle && isPublishedOrSeen) observationTitles.push(String(observationTitle));
    });
    return {
      publishedNews,
      candidateNews,
      promptNews: [...publishedNews, ...candidateNews],
      observationTitles
    };
  }

  async generatePreview(options = {}) {
    this._ensureEnabled();
    return this._exclusive(async () => {
      const now = options.now ? new Date(options.now) : this.now();
      const history = this._recentContentHistory(now);
      const candidateItems = history.candidateNews.map((candidate) => candidate.item);
      const pooledNews = selectBalancedNews(candidateItems, history.publishedNews);
      const poolIsBalanced = pooledNews.some((item) => item.scope === 'domestic') &&
        pooledNews.some((item) => item.scope === 'international');
      let raw;
      if (poolIsBalanced) {
        raw = {
          date: shanghaiDate(now),
          title: `篮球晨报｜${shanghaiDate(now)}`,
          news: [],
          institution_observation: {},
          today_action: {},
          _search_source_urls: []
        };
      } else {
        raw = await this.generator(Object.assign({}, this.config, {
          recentNewsHistory: history.promptNews
        }), { fetch: this.fetch }, now);
      }
      raw.news = selectBalancedNews([
        ...candidateItems,
        ...(Array.isArray(raw.news) ? raw.news : [])
      ], history.publishedNews);
      raw._search_source_urls = [...new Set([
        ...(Array.isArray(raw._search_source_urls) ? raw._search_source_urls : []),
        ...history.candidateNews.flatMap((candidate) => candidate.search_source_urls || []),
        ...history.candidateNews.map((candidate) => candidate.url).filter(Boolean)
      ])];
      raw.institution_observation = buildInstitutionReminder(now, history.observationTitles);
      raw.today_action = {
        title: '后台编辑记录',
        action: '机构提醒由运营日历生成，群内不展示单独的行动任务。',
        rationale: '群内只展示三条新闻和一段贴近当前经营节点的机构提醒。'
      };
      const validation = validateBriefing(raw, this.config, now);
      validation.errors.push(...validateNewsAgainstHistory(validation.briefing.news, history.publishedNews));
      validation.errors = [...new Set(validation.errors)];
      validation.valid = validation.errors.length === 0;
      validation.status = validation.valid ? 'ready' : 'review_required';
      const fingerprint = contentFingerprint(validation.briefing);
      const date = validation.briefing.date || shanghaiDate(now);
      const key = recordKey(date, fingerprint);
      let record;
      this.store.update((state) => {
        const existing = state.records[key];
        const protectedStatus = existing && [
          'task_created',
          'task_created_partial',
          'creating_task',
          'creation_uncertain',
          'create_failed'
        ].includes(existing.status);
        record = Object.assign({}, existing || {}, {
          key,
          date,
          fingerprint,
          status: protectedStatus ? existing.status : validation.status,
          review_required: protectedStatus ? Boolean(existing.review_required) : !validation.valid,
          validation_errors: validation.errors,
          briefing: validation.briefing,
          search_source_urls: validation.searchSourceUrls,
          generated_at: now.toISOString(),
          created_at: (existing && existing.created_at) || now.toISOString()
        });
        state.records[key] = record;
        return state;
      });
      this._log(validation.valid ? 'info' : 'warn', 'preview_generated', {
        date,
        fingerprint,
        status: record.status
      });
      return record;
    });
  }

  async createTask(input = {}) {
    this._ensureEnabled();
    return this._exclusive(async () => {
      const date = String(input.date || '');
      const fingerprint = String(input.fingerprint || '');
      const sender = String(input.sender || '').trim();
      const chatIdList = [...new Set(parseCsv(input.chatIdList || input.chat_id_list))].sort();
      if (!date || !fingerprint) throw Object.assign(new Error('date_and_fingerprint_required'), { code: 'date_and_fingerprint_required' });
      if (!sender) throw Object.assign(new Error('explicit_sender_required'), { code: 'explicit_sender_required' });
      if (!chatIdList.length) throw Object.assign(new Error('explicit_chat_id_list_required'), { code: 'explicit_chat_id_list_required' });
      if (chatIdList.length > 2000) throw Object.assign(new Error('chat_id_list_too_large'), { code: 'chat_id_list_too_large' });
      const key = recordKey(date, fingerprint);
      const state = this.store.load();
      const record = state.records[key];
      if (!record) throw Object.assign(new Error('briefing_record_not_found'), { code: 'briefing_record_not_found', httpStatus: 404 });
      const targetDeliveryKey = deliveryKey(date, sender, chatIdList);
      if (['task_created', 'task_created_partial'].includes(record.status)) {
        if (record.delivery_key !== targetDeliveryKey) {
          throw Object.assign(new Error('content_already_created_for_different_targets'), {
            code: 'content_already_created_for_different_targets',
            httpStatus: 409
          });
        }
        return { created: false, reused: true, status: record.status, msgid: record.msgid, record };
      }
      if (['creating_task', 'creation_uncertain', 'create_failed'].includes(record.status)) {
        throw Object.assign(new Error('task_creation_requires_manual_reconciliation'), {
          code: 'task_creation_requires_manual_reconciliation',
          httpStatus: 409
        });
      }
      const duplicateDelivery = Object.values(state.records).find((item) => (
        item &&
        item.key !== key &&
        item.delivery_key === targetDeliveryKey &&
        ['creating_task', 'creation_uncertain', 'task_created', 'task_created_partial', 'create_failed'].includes(item.status)
      ));
      if (duplicateDelivery) {
        throw Object.assign(new Error('daily_target_delivery_already_exists'), {
          code: 'daily_target_delivery_already_exists',
          httpStatus: 409
        });
      }
      const validation = validateBriefing(Object.assign({}, record.briefing, {
        _search_source_urls: record.search_source_urls || []
      }), this.config, this.now());
      if (!validation.valid || record.status !== 'ready') {
        this.store.update((draft) => {
          draft.records[key].status = 'review_required';
          draft.records[key].review_required = true;
          draft.records[key].validation_errors = validation.errors;
          return draft;
        });
        throw Object.assign(new Error('briefing_review_required'), {
          code: 'briefing_review_required',
          httpStatus: 409
        });
      }
      const payload = formatWecomMessage(record.briefing, { sender, chatIdList });
      // Fetch/cache the access token before publishing the creating_task marker.
      // A token failure proves that the create endpoint was never reached and is safe to retry.
      if (typeof this.wecom.getAccessToken === 'function') await this.wecom.getAccessToken();
      const startedAt = this.now().toISOString();
      this.store.update((draft) => {
        const current = draft.records[key];
        current.status = 'creating_task';
        current.review_required = false;
        current.target = { sender, chat_id_list: chatIdList };
        current.delivery_key = targetDeliveryKey;
        current.creating_started_at = startedAt;
        current.last_error = '';
        return draft;
      });

      try {
        const result = await this.wecom.addGroupMessageTemplate(payload);
        if (!result || !result.msgid) {
          throw Object.assign(new Error('wecom_create_missing_msgid'), { code: 'wecom_create_missing_msgid' });
        }
        let saved;
        this.store.update((draft) => {
          saved = draft.records[key];
          const failedTargets = Array.isArray(result.fail_list) ? result.fail_list.map(String).slice(0, 2000) : [];
          saved.status = failedTargets.length ? 'task_created_partial' : 'task_created';
          saved.review_required = false;
          saved.msgid = String(result.msgid);
          saved.fail_list = failedTargets;
          saved.partial_failure = failedTargets.length > 0;
          saved.delivery_status = 'pending';
          saved.task_created_at = this.now().toISOString();
          saved.reminders = Array.isArray(saved.reminders) ? saved.reminders : [];
          return draft;
        });
        this._log('info', 'group_task_created', { date, fingerprint, msgid: saved.msgid });
        return { created: true, reused: false, status: saved.status, msgid: saved.msgid, record: saved };
      } catch (error) {
        const code = errorCode(error);
        const definitelyRejected = Number.isFinite(Number(error && error.errcode));
        this.store.update((draft) => {
          const current = draft.records[key];
          current.status = definitelyRejected ? 'create_failed' : 'creation_uncertain';
          current.review_required = true;
          current.last_error = code;
          if (definitelyRejected) current.create_failed_at = this.now().toISOString();
          else current.creation_uncertain_at = this.now().toISOString();
          return draft;
        });
        this._log('error', definitelyRejected ? 'group_task_creation_rejected' : 'group_task_creation_uncertain', { date, fingerprint, code });
        const publicCode = definitelyRejected ? 'task_creation_rejected' : 'task_creation_uncertain';
        throw Object.assign(new Error(publicCode), {
          code: publicCode,
          httpStatus: 502,
          causeCode: code
        });
      }
    });
  }

  async reconcileCreation(input = {}) {
    this._ensureEnabled();
    return this._exclusive(async () => {
      const key = recordKey(input.date, input.fingerprint);
      const msgid = String(input.msgid || '').trim();
      if (!msgid) throw Object.assign(new Error('msgid_required'), { code: 'msgid_required' });
      let record;
      this.store.update((state) => {
        record = state.records[key];
        if (!record) throw Object.assign(new Error('briefing_record_not_found'), { code: 'briefing_record_not_found', httpStatus: 404 });
        if (!['creation_uncertain', 'creating_task'].includes(record.status)) {
          throw Object.assign(new Error('record_not_reconcilable'), { code: 'record_not_reconcilable', httpStatus: 409 });
        }
        record.status = 'task_created';
        record.review_required = false;
        record.msgid = msgid;
        record.reconciled_at = this.now().toISOString();
        record.reminders = Array.isArray(record.reminders) ? record.reminders : [];
        return state;
      });
      this._log('info', 'creation_manually_reconciled', { fingerprint: input.fingerprint, msgid });
      return record;
    });
  }

  async resetRejectedTask(input = {}) {
    this._ensureEnabled();
    return this._exclusive(async () => {
      const key = recordKey(input.date, input.fingerprint);
      let record;
      this.store.update((state) => {
        record = state.records[key];
        if (!record) throw Object.assign(new Error('briefing_record_not_found'), { code: 'briefing_record_not_found', httpStatus: 404 });
        if (record.status !== 'create_failed') {
          throw Object.assign(new Error('only_rejected_task_can_be_reset'), { code: 'only_rejected_task_can_be_reset', httpStatus: 409 });
        }
        const validation = validateBriefing(Object.assign({}, record.briefing, {
          _search_source_urls: record.search_source_urls || []
        }), this.config, this.now());
        if (!validation.valid) {
          record.status = 'review_required';
          record.review_required = true;
          record.validation_errors = validation.errors;
          return state;
        }
        record.rejection_history = Array.isArray(record.rejection_history) ? record.rejection_history : [];
        record.rejection_history.push({
          code: record.last_error || 'wecom_rejected',
          rejected_at: record.create_failed_at || record.creating_started_at || '',
          reset_at: this.now().toISOString()
        });
        record.status = 'ready';
        record.review_required = false;
        record.validation_errors = [];
        record.last_error = '';
        delete record.delivery_key;
        delete record.target;
        delete record.creating_started_at;
        delete record.creation_uncertain_at;
        delete record.create_failed_at;
        return state;
      });
      if (record.status !== 'ready') {
        throw Object.assign(new Error('briefing_review_required'), { code: 'briefing_review_required', httpStatus: 409 });
      }
      this._log('warn', 'rejected_task_manually_reset', { date: record.date, fingerprint: record.fingerprint });
      return record;
    });
  }

  async revalidateRecord(input = {}) {
    this._ensureEnabled();
    return this._exclusive(async () => {
      const key = recordKey(input.date, input.fingerprint);
      let saved;
      this.store.update((state) => {
        const record = state.records[key];
        if (!record) throw Object.assign(new Error('briefing_record_not_found'), { code: 'briefing_record_not_found', httpStatus: 404 });
        if (['task_created', 'task_created_partial', 'creating_task', 'creation_uncertain'].includes(record.status)) {
          throw Object.assign(new Error('record_not_revalidatable'), { code: 'record_not_revalidatable', httpStatus: 409 });
        }
        const validation = validateBriefing(Object.assign({}, record.briefing, {
          _search_source_urls: record.search_source_urls || []
        }), this.config, this.now());
        record.status = validation.valid ? 'ready' : 'review_required';
        record.review_required = !validation.valid;
        record.validation_errors = validation.errors;
        record.briefing = validation.briefing;
        record.revalidated_at = this.now().toISOString();
        saved = record;
        return state;
      });
      this._log(saved.status === 'ready' ? 'info' : 'warn', 'record_revalidated', {
        date: saved.date,
        fingerprint: saved.fingerprint,
        status: saved.status
      });
      return saved;
    });
  }

  async cancelTask(input = {}) {
    this._ensureEnabled();
    return this._exclusive(async () => {
      const msgid = String(input.msgid || '').trim();
      if (!msgid) throw Object.assign(new Error('msgid_required'), { code: 'msgid_required' });
      const state = this.store.load();
      const record = Object.values(state.records).find((item) => (
        item && item.msgid === msgid && ['task_created', 'task_created_partial'].includes(item.status)
      ));
      if (!record) throw Object.assign(new Error('tracked_task_not_found'), { code: 'tracked_task_not_found', httpStatus: 404 });
      if (typeof this.wecom.cancelGroupMessageSend !== 'function') {
        throw Object.assign(new Error('cancel_not_supported'), { code: 'cancel_not_supported', httpStatus: 501 });
      }
      await this.wecom.cancelGroupMessageSend(msgid);
      let saved;
      this.store.update((draft) => {
        saved = draft.records[record.key];
        saved.status = 'canceled';
        saved.delivery_status = 'canceled';
        saved.canceled_at = this.now().toISOString();
        return draft;
      });
      this._log('info', 'group_task_canceled', { msgid });
      return { msgid, canceled: true, record: saved };
    });
  }

  async remindTask(input = {}) {
    this._ensureEnabled();
    return this._exclusive(async () => {
      const msgid = String(input.msgid || '').trim();
      if (!msgid) throw Object.assign(new Error('msgid_required'), { code: 'msgid_required' });
      const state = this.store.load();
      const record = Object.values(state.records).find((item) => (
        item && item.msgid === msgid && ['task_created', 'task_created_partial'].includes(item.status)
      ));
      if (!record) throw Object.assign(new Error('tracked_task_not_found'), { code: 'tracked_task_not_found', httpStatus: 404 });
      const reminders = Array.isArray(record.reminders) ? record.reminders : [];
      const sender = record.target && record.target.sender;
      if (!sender) throw Object.assign(new Error('tracked_task_sender_missing'), { code: 'tracked_task_sender_missing', httpStatus: 409 });
      const tasks = await this._withDispatchRetry(() => this.wecom.getGroupMessageTasks(msgid, '', 1000));
      const taskList = Array.isArray(tasks && tasks.task_list) ? tasks.task_list : [];
      const senderTask = taskList.find((task) => task && String(task.userid) === String(sender));
      if (!senderTask || Number(senderTask.status) !== 0) {
        const deliveryStatus = senderTask && Number(senderTask.status) === 2 ? 'sent' : 'not_pending';
        this.store.update((draft) => {
          const current = draft.records[record.key];
          current.delivery_status = deliveryStatus;
          if (senderTask && senderTask.send_time) current.send_time = senderTask.send_time;
          return draft;
        });
        if (deliveryStatus === 'sent') return { msgid, skipped: true, reason: 'already_sent' };
        throw Object.assign(new Error('group_message_not_pending'), { code: 'group_message_not_pending', httpStatus: 409 });
      }
      if (reminders.length >= 3) throw Object.assign(new Error('reminder_limit_reached'), { code: 'reminder_limit_reached', httpStatus: 409 });
      const lastReminderAt = reminders.length ? Date.parse(String(reminders[reminders.length - 1].reminded_at || '')) : NaN;
      const minimumIntervalMs = Math.max(1, Number(this.config.reminderMinIntervalMinutes || 60)) * 60 * 1000;
      if (Number.isFinite(lastReminderAt) && this.now().getTime() - lastReminderAt < minimumIntervalMs) {
        throw Object.assign(new Error('reminder_minimum_interval_not_reached'), {
          code: 'reminder_minimum_interval_not_reached',
          httpStatus: 429
        });
      }
      const remindedAt = this.now().toISOString();
      let result;
      try {
        result = await this.wecom.remindGroupMessageSend(msgid);
        this.store.update((draft) => {
          const current = draft.records[record.key];
          current.reminders = Array.isArray(current.reminders) ? current.reminders : [];
          current.reminders.push({
            reminded_at: remindedAt,
            success: true,
            api_result: { errcode: Number(result && result.errcode || 0) }
          });
          return draft;
        });
      } catch (error) {
        this.store.update((draft) => {
          const current = draft.records[record.key];
          current.reminders = Array.isArray(current.reminders) ? current.reminders : [];
          current.reminders.push({
            reminded_at: remindedAt,
            success: false,
            api_result: {
              errcode: Number.isFinite(Number(error && error.errcode)) ? Number(error.errcode) : null,
              code: errorCode(error)
            }
          });
          return draft;
        });
        throw error;
      }
      this._log('info', 'group_task_reminded', { msgid, count: reminders.length + 1 });
      return { msgid, reminded_at: remindedAt, result };
    });
  }

  async getTaskResult(input = {}) {
    this._ensureEnabled();
    const msgid = String(input.msgid || '').trim();
    const sender = String(input.sender || '').trim();
    if (!msgid) throw Object.assign(new Error('msgid_required'), { code: 'msgid_required' });
    if (!sender) throw Object.assign(new Error('sender_required'), { code: 'sender_required' });
    const tasks = await this._withDispatchRetry(() => (
      this.wecom.getGroupMessageTasks(msgid, input.cursor || '', input.limit || 1000)
    ));
    const sendResult = await this._withDispatchRetry(() => (
      this.wecom.getGroupMessageSendResult(msgid, sender, input.resultCursor || '', input.limit || 500)
    ));
    const taskList = Array.isArray(tasks && tasks.task_list) ? tasks.task_list : [];
    const senderTask = taskList.find((task) => task && String(task.userid) === sender);
    const deliveryStatus = senderTask && Number(senderTask.status) === 2
      ? 'sent'
      : senderTask && Number(senderTask.status) === 0 ? 'pending' : 'unknown';
    this.store.update((state) => {
      const record = Object.values(state.records).find((item) => item && item.msgid === msgid);
      if (record) {
        record.delivery_status = deliveryStatus;
        record.send_time = senderTask && senderTask.send_time ? senderTask.send_time : record.send_time || '';
        record.last_result_checked_at = this.now().toISOString();
        record.last_send_result = sendResult;
      }
      return state;
    });
    return { msgid, sender, delivery_status: deliveryStatus, tasks, send_result: sendResult };
  }

  async listRecentMessageRecords(input = {}) {
    this._ensureEnabled();
    if (typeof this.wecom.listGroupMessageRecords !== 'function') {
      throw Object.assign(new Error('record_list_not_supported'), { code: 'record_list_not_supported' });
    }
    return this.wecom.listGroupMessageRecords(input);
  }

  async listGroups(input = {}) {
    this._ensureEnabled();
    const params = Object.assign({}, input);
    if (!parseCsv(params.ownerUserIds || params.owner_userid_list).length) {
      if (!this.config.wecomSenderUserId) {
        throw Object.assign(new Error('owner_filter_required'), { code: 'owner_filter_required', httpStatus: 400 });
      }
      params.ownerUserIds = [this.config.wecomSenderUserId];
    }
    return this.wecom.listCustomerGroups(params);
  }

  async getGroup(chatId) {
    this._ensureEnabled();
    return this.wecom.getCustomerGroup(chatId, true);
  }

  async tick(nowInput = this.now()) {
    if (!this.config.serviceEnabled || !this.config.schedulerEnabled) return { skipped: true, reason: 'scheduler_disabled' };
    const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
    const date = shanghaiDate(now);
    const parts = shanghaiParts(now);
    const minutes = parts.hour * 60 + parts.minute;
    const previewMinutes = this.config.scheduleHour * 60 + this.config.scheduleMinute;
    const reminderMinutes = this.config.reminderHour * 60 + this.config.reminderMinute;
    const actions = [];

    if (minutes >= previewMinutes) {
      const state = this.store.load();
      const sameAttemptDate = state.scheduler.preview_attempt_date === date;
      const attemptCount = sameAttemptDate ? Number(state.scheduler.preview_attempt_count || 0) : 0;
      const nextAttemptAt = Date.parse(String(state.scheduler.next_preview_attempt_at || ''));
      const retryDue = !Number.isFinite(nextAttemptAt) || now.getTime() >= nextAttemptAt;
      if (state.scheduler.preview_success_date !== date && attemptCount < 3 && retryDue) {
        this.store.update((draft) => {
          draft.scheduler.preview_attempt_date = date;
          draft.scheduler.preview_attempt_count = attemptCount + 1;
          return draft;
        });
        try {
          const record = await this.generatePreview({ now });
          actions.push({ action: 'preview', status: record.status, fingerprint: record.fingerprint });
          if (record.status !== 'ready') {
            throw Object.assign(new Error('preview_review_required'), { code: 'preview_review_required' });
          }
          this.store.update((draft) => {
            draft.scheduler.preview_success_date = date;
            draft.scheduler.last_preview_error = '';
            draft.scheduler.next_preview_attempt_at = '';
            return draft;
          });
          if (this.config.autoCreateEnabled && record.status === 'ready') {
            try {
              if (!this.config.wecomSenderUserId || !this.config.wecomChatIdList.length) {
                throw Object.assign(new Error('auto_create_explicit_targets_missing'), { code: 'auto_create_explicit_targets_missing' });
              }
              const result = await this.createTask({
                date: record.date,
                fingerprint: record.fingerprint,
                sender: this.config.wecomSenderUserId,
                chatIdList: this.config.wecomChatIdList
              });
              actions.push({ action: 'create_task', status: result.status, msgid: result.msgid });
            } catch (error) {
              const code = errorCode(error);
              this._log('error', 'scheduler_create_failed', { date, code });
              actions.push({ action: 'create_task', status: 'failed', code });
              try {
                await this._notifyOwnerOnce(
                  `${date}:create_failed`,
                  `⚠️ ${date} 篮球晨报通过内容校验，但企微群发任务创建失败。请检查晨报服务。`
                );
              } catch (notificationError) {
                this._log('error', 'owner_notification_failed', { date, code: errorCode(notificationError) });
              }
            }
          }
        } catch (error) {
          const code = errorCode(error);
          const retryMinutes = [5, 15, 30][attemptCount] || 30;
          this.store.update((draft) => {
            draft.scheduler.last_preview_error = code;
            draft.scheduler.next_preview_attempt_at = new Date(now.getTime() + retryMinutes * 60 * 1000).toISOString();
            return draft;
          });
          this._log('error', 'scheduler_preview_failed', { date, code });
          actions.push({ action: 'preview', status: 'failed', code });
          if (attemptCount + 1 >= 3) {
            try {
              const alertText = code === 'preview_review_required'
                ? `⚠️ ${date} 篮球晨报连续3次未通过内容校验，今天没有创建客户群群发任务。请检查晨报后台。`
                : `⚠️ ${date} 篮球晨报连续3次生成失败，今天没有创建客户群群发任务。请检查 DeepSeek 或服务器日志。`;
              await this._notifyOwnerOnce(
                `${date}:${code === 'preview_review_required' ? 'review_required' : 'generation_failed'}`,
                alertText
              );
            } catch (notificationError) {
              this._log('error', 'owner_notification_failed', { date, code: errorCode(notificationError) });
            }
          }
        }
      }
    }

    if (this.config.autoRemindEnabled && minutes >= reminderMinutes) {
      const state = this.store.load();
      if (state.scheduler.reminder_attempt_date !== date) {
        const record = Object.values(state.records).find((item) => (
          item && item.date === date && ['task_created', 'task_created_partial'].includes(item.status)
        ));
        if (record && record.msgid) {
          try {
            await this.remindTask({ msgid: record.msgid });
            this.store.update((draft) => {
              draft.scheduler.reminder_attempt_date = date;
              return draft;
            });
            actions.push({ action: 'remind', status: 'ok', msgid: record.msgid });
          } catch (error) {
            const code = errorCode(error);
            this._log('error', 'scheduler_reminder_failed', { date, code });
            actions.push({ action: 'remind', status: 'failed', code });
            if (Number(error && error.errcode) !== 41063) {
              this.store.update((draft) => {
                draft.scheduler.reminder_attempt_date = date;
                return draft;
              });
            }
          }
        }
      }
    }

    return { skipped: false, date, actions };
  }
}

function createApplication(environment = process.env, dependencies = {}) {
  const config = dependencies.config || loadConfig(environment);
  const service = dependencies.service || new BriefingService(config, dependencies);
  return { config, service };
}

module.exports = {
  BriefingService,
  createApplication,
  deliveryKey,
  errorCode,
  loadConfig,
  readBoolean,
  readInteger,
  recordKey,
  summaryFromState
};
