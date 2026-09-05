const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const path = require('path');

const TOKEN_SAFETY_WINDOW_MS = 5 * 60 * 1000;
let tokenCache = { value: '', expiresAt: 0 };
let syncPromise = null;

function decodeXml(value) {
  return String(value || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function parseXmlFields(xml) {
  const result = {};
  const pattern = /<([A-Za-z][A-Za-z0-9_]*)>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))<\/\1>/g;
  let match;
  while ((match = pattern.exec(String(xml || '')))) {
    result[match[1]] = decodeXml(match[2] !== undefined ? match[2] : match[3]);
  }
  return result;
}

function createSignature(token, timestamp, nonce, encrypted) {
  return crypto
    .createHash('sha1')
    .update([token, timestamp, nonce, encrypted].map((item) => String(item || '')).sort().join(''))
    .digest('hex');
}

function verifySignature(token, timestamp, nonce, encrypted, signature) {
  const expected = Buffer.from(createSignature(token, timestamp, nonce, encrypted), 'utf8');
  const actual = Buffer.from(String(signature || ''), 'utf8');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function decryptWechatPayload(encrypted, encodingAesKey, expectedReceiverId) {
  const normalized = String(encodingAesKey || '').trim();
  if (!/^[A-Za-z0-9+/]{43}$/.test(normalized)) throw new Error('invalid_encoding_aes_key');
  const key = Buffer.from(`${normalized}=`, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, key.subarray(0, 16));
  decipher.setAutoPadding(false);
  const padded = Buffer.concat([
    decipher.update(Buffer.from(String(encrypted || ''), 'base64')),
    decipher.final()
  ]);
  const pad = padded[padded.length - 1];
  if (pad < 1 || pad > 32 || pad > padded.length) throw new Error('invalid_wecom_padding');
  const plain = padded.subarray(0, padded.length - pad);
  const messageLength = plain.readUInt32BE(16);
  const messageEnd = 20 + messageLength;
  const message = plain.subarray(20, messageEnd).toString('utf8');
  const receiverId = plain.subarray(messageEnd).toString('utf8');
  if (expectedReceiverId && receiverId !== expectedReceiverId) throw new Error('receiver_id_mismatch');
  return message;
}

function requestJson(method, requestPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : Buffer.from(JSON.stringify(body), 'utf8');
    const request = https.request({
      hostname: 'qyapi.weixin.qq.com',
      port: 443,
      path: requestPath,
      method,
      headers: payload ? {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': payload.length
      } : undefined,
      timeout: 10000
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        let data;
        try {
          data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch (error) {
          reject(new Error(`invalid_api_response_${response.statusCode || 0}`));
          return;
        }
        if ((response.statusCode || 500) >= 400 || data.errcode) {
          const apiError = new Error(`wecom_api_error_${data.errcode || response.statusCode || 500}`);
          apiError.errcode = data.errcode;
          apiError.errmsg = data.errmsg;
          reject(apiError);
          return;
        }
        resolve(data);
      });
    });
    request.on('timeout', () => request.destroy(new Error('wecom_api_timeout')));
    request.on('error', reject);
    if (payload) request.write(payload);
    request.end();
  });
}

async function getAccessToken(corpId, secret) {
  const now = Date.now();
  if (tokenCache.value && tokenCache.expiresAt - TOKEN_SAFETY_WINDOW_MS > now) return tokenCache.value;
  const response = await requestJson(
    'GET',
    `/cgi-bin/gettoken?corpid=${encodeURIComponent(corpId)}&corpsecret=${encodeURIComponent(secret)}`
  );
  tokenCache = {
    value: response.access_token,
    expiresAt: now + Number(response.expires_in || 7200) * 1000
  };
  return tokenCache.value;
}

function apiPost(accessToken, endpoint, body) {
  return requestJson('POST', `${endpoint}?access_token=${encodeURIComponent(accessToken)}`, body);
}

function loadState(stateFile) {
  if (!fs.existsSync(stateFile)) return { version: 1, processed: {}, leads: [] };
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  state.processed ||= {};
  state.leads ||= [];
  return state;
}

function saveState(stateFile, state) {
  fs.mkdirSync(path.dirname(stateFile), { recursive: true, mode: 0o700 });
  const temporary = `${stateFile}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(temporary, stateFile);
  fs.chmodSync(stateFile, 0o600);
}

function optionValues(question, reply) {
  const selected = new Set((reply.option_reply || []).map(Number));
  return (question.option_item || [])
    .filter((item) => selected.has(Number(item.key)))
    .map((item) => String(item.value || ''));
}

function answerValues(formInfo, answer) {
  const questions = new Map(
    (formInfo.form_question?.items || []).map((question) => [Number(question.question_id), question])
  );
  const values = {};
  for (const reply of answer.reply?.items || []) {
    const question = questions.get(Number(reply.question_id));
    if (!question) continue;
    const options = optionValues(question, reply);
    values[question.title] = options.length ? options : String(reply.text_reply || '');
  }
  return values;
}

function normalizePhone(value) {
  return String(value || '').replace(/[^0-9+]/g, '');
}

function leadSigningKey(secret) {
  const value = String(secret || '');
  if (value.length < 32) throw new Error('invalid_lead_signing_key');
  return crypto.createHash('sha256').update(value, 'utf8').digest();
}

function createLeadToken(leadId, secret, ttlSeconds = 7 * 24 * 60 * 60) {
  const payload = Buffer.from(JSON.stringify({
    lead_id: String(leadId),
    exp: Math.floor(Date.now() / 1000) + Number(ttlSeconds)
  }), 'utf8').toString('base64url');
  const signature = crypto.createHmac('sha256', leadSigningKey(secret)).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyLeadToken(token, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature) throw new Error('invalid_lead_token');
  const expected = crypto.createHmac('sha256', leadSigningKey(secret)).update(payload).digest('base64url');
  const actualBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new Error('invalid_lead_token');
  }
  let data;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch (error) {
    throw new Error('invalid_lead_token');
  }
  if (!data.lead_id || Number(data.exp) < nowSeconds) throw new Error('expired_lead_token');
  return data;
}

function leadFromAnswer(formId, repeatedId, formInfo, answer) {
  const values = answerValues(formInfo, answer);
  const answerId = Number(answer.answer_id);
  const sourceKey = `${repeatedId}:${answerId}`;
  return {
    lead_id: crypto.createHash('sha256').update(`${formId}:${sourceKey}`).digest('hex').slice(0, 20),
    source: 'wecom_collect_form',
    source_key: sourceKey,
    form_id: formId,
    repeated_id: repeatedId,
    answer_id: answerId,
    institution_name: String(values['机构/主办方名称'] || ''),
    city: String(values['所在城市'] || ''),
    contact_name: String(values['联系人'] || ''),
    contact_phone: normalizePhone(values['联系电话']),
    event_name: String(values['赛事名称'] || ''),
    event_period_unit: String(values['赛事周期单位'] || ''),
    event_period_count: String(values['赛事周期数量'] || ''),
    planned_start_date: String(values['计划开赛时间'] || ''),
    team_count: String(values['参赛队伍数量'] || ''),
    competition_format: String(values['赛制'] || ''),
    age_groups: Array.isArray(values['参赛组别（可多选）'])
      ? values['参赛组别（可多选）']
      : [values['参赛组别（可多选）']].filter(Boolean),
    submitter_userid: String(answer.userid || ''),
    temporary_external_userid: String(answer.tmp_external_userid || ''),
    customer_match_status: answer.userid ? 'internal_member' : 'unbound',
    status: '新需求',
    owner_userid: '',
    next_follow_up_at: '',
    submitted_at: Number(answer.ctime || answer.mtime || 0),
    received_at: new Date().toISOString(),
    notification_status: 'pending'
  };
}

function startOfLookbackWindow() {
  return Math.floor((Date.now() - 366 * 24 * 60 * 60 * 1000) / 1000);
}

function endOfWindow() {
  return Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000);
}

async function submittedAnswerIds(accessToken, repeatedId) {
  const answerIds = [];
  let cursor;
  do {
    const body = {
      repeated_id: repeatedId,
      req_type: 2,
      start_time: startOfLookbackWindow(),
      end_time: endOfWindow(),
      limit: 100
    };
    if (cursor) body.cursor = cursor;
    const response = await apiPost(accessToken, '/cgi-bin/wedoc/get_form_statistic', body);
    for (const item of response.submit_users || []) {
      if (item.answer_id !== undefined) answerIds.push(Number(item.answer_id));
    }
    cursor = response.has_more ? response.cursor : undefined;
  } while (cursor);
  return [...new Set(answerIds)];
}

async function readAnswers(accessToken, repeatedId, answerIds) {
  const answers = [];
  for (let index = 0; index < answerIds.length; index += 100) {
    const response = await apiPost(accessToken, '/cgi-bin/wedoc/get_form_answer', {
      repeated_id: repeatedId,
      answer_ids: answerIds.slice(index, index + 100)
    });
    answers.push(...(response.answer?.answer_list || []));
  }
  return answers;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function notificationDescription(lead) {
  const groups = lead.age_groups.join('、') || '未填写';
  return [
    `<div class="gray">${escapeHtml(lead.city || '城市未填写')} · 计划开赛 ${escapeHtml(lead.planned_start_date || '未填写')}</div>`,
    `<div class="normal">机构：${escapeHtml(lead.institution_name || '未填写')}</div>`,
    `<div class="normal">联系人：${escapeHtml(lead.contact_name || '未填写')} · ${escapeHtml(lead.contact_phone || '未填写')}</div>`,
    `<div class="normal">赛事：${escapeHtml(lead.event_name || '未填写')}</div>`,
    `<div class="normal">组别：${escapeHtml(groups)} · ${escapeHtml(lead.competition_format || '赛制未填写')}</div>`,
    '<div class="highlight">点击进入跟进，复制手机号并添加客户</div>'
  ].join('').slice(0, 2000);
}

async function notifyPending(accessToken, config, state) {
  let sent = 0;
  for (const lead of state.leads) {
    if (lead.notification_status !== 'pending') continue;
    try {
      await apiPost(accessToken, '/cgi-bin/message/send', {
        touser: config.adminUserId,
        msgtype: 'textcard',
        agentid: Number(config.agentId),
        textcard: {
          title: '新的赛事需求',
          description: notificationDescription(lead),
          url: `${config.publicBaseUrl}/wecom/doc-assistant?lead_token=${encodeURIComponent(createLeadToken(
            lead.lead_id,
            config.leadSigningKey,
            config.leadTokenTtlSeconds
          ))}`,
          btntxt: '立即跟进'
        },
        safe: 0
      });
      lead.notification_status = 'sent';
      lead.notified_at = new Date().toISOString();
      sent += 1;
    } catch (error) {
      lead.notification_status = 'pending';
      lead.last_notification_error = error.message;
    }
  }
  return sent;
}

async function performSync(config) {
  const accessToken = await getAccessToken(config.corpId, config.appSecret);
  const infoResponse = await apiPost(accessToken, '/cgi-bin/wedoc/get_form_info', { formid: config.formId });
  const formInfo = infoResponse.form_info;
  const state = loadState(config.stateFile);
  let created = 0;

  for (const repeatedId of formInfo.repeated_id || []) {
    const ids = await submittedAnswerIds(accessToken, repeatedId);
    const pendingIds = ids.filter((answerId) => !state.processed[`${repeatedId}:${answerId}`]);
    const answers = await readAnswers(accessToken, repeatedId, pendingIds);
    for (const answer of answers) {
      const lead = leadFromAnswer(config.formId, repeatedId, formInfo, answer);
      if (state.processed[lead.source_key]) continue;
      state.leads.push(lead);
      state.processed[lead.source_key] = lead.lead_id;
      created += 1;
    }
  }

  const notified = await notifyPending(accessToken, config, state);
  state.last_sync_at = new Date().toISOString();
  saveState(config.stateFile, state);
  return { created, notified, total: state.leads.length };
}

function syncLeadInbox(config) {
  if (syncPromise) return syncPromise;
  syncPromise = performSync(config).finally(() => { syncPromise = null; });
  return syncPromise;
}

module.exports = {
  answerValues,
  createLeadToken,
  createSignature,
  decryptWechatPayload,
  leadFromAnswer,
  loadState,
  parseXmlFields,
  saveState,
  syncLeadInbox,
  verifyLeadToken,
  verifySignature
};
