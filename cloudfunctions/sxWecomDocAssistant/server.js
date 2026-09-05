const http = require('http');
const { URL } = require('url');
const {
  decryptWechatPayload,
  loadState,
  parseXmlFields,
  syncLeadInbox,
  verifyLeadToken,
  verifySignature
} = require('./core');

const port = Number(process.env.PORT || 3200);

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

function config() {
  return {
    enabled: String(process.env.WECOM_DOC_ASSISTANT_ENABLED || '').toLowerCase() === 'true',
    corpId: required('WECOM_CORP_ID'),
    appSecret: required('WECOM_APP_SECRET'),
    agentId: required('WECOM_AGENT_ID'),
    adminUserId: required('WECOM_ADMIN_USER_ID'),
    callbackToken: required('WECOM_CALLBACK_TOKEN'),
    encodingAesKey: required('WECOM_ENCODING_AES_KEY'),
    formId: required('WECOM_FORM_ID'),
    stateFile: String(process.env.WECOM_LEAD_STATE_FILE || '/data/leads.json'),
    publicBaseUrl: String(process.env.WECOM_PUBLIC_BASE_URL || 'https://api.saixiaofeng.com').replace(/\/$/, ''),
    leadSigningKey: required('WECOM_LEAD_SIGNING_KEY'),
    leadTokenTtlSeconds: Number(process.env.WECOM_LEAD_TOKEN_TTL_SECONDS || 604800)
  };
}

function collectBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > 1024 * 1024) {
        reject(new Error('request_body_too_large'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

function text(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(body);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderLeadPage(lead) {
  const groups = (lead.age_groups || []).join('、') || '未填写';
  const rows = [
    ['机构/主办方', lead.institution_name],
    ['所在城市', lead.city],
    ['联系人', lead.contact_name],
    ['联系电话', lead.contact_phone],
    ['赛事名称', lead.event_name],
    ['赛事周期', `${lead.event_period_count || ''}${lead.event_period_unit || ''}`],
    ['计划开赛', lead.planned_start_date],
    ['队伍数量', lead.team_count],
    ['参赛组别', groups],
    ['赛制', lead.competition_format],
    ['当前状态', lead.status]
  ].map(([label, value]) => `<div class="row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || '未填写')}</strong></div>`).join('');
  const phone = escapeHtml(lead.contact_phone || '');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><title>赛事需求跟进</title><style>
  *{box-sizing:border-box}body{margin:0;background:#f5f6f8;color:#1f2329;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}.page{min-height:100vh;padding:24px 16px 40px}.card{max-width:560px;margin:0 auto;background:#fff;border-radius:18px;padding:24px 20px;box-shadow:0 10px 30px rgba(31,35,41,.08)}.brand{font-size:13px;color:#f56600;font-weight:800;letter-spacing:.08em}.title{margin:10px 0 18px;font-size:25px}.row{display:flex;gap:18px;justify-content:space-between;padding:12px 0;border-bottom:1px solid #eff0f1}.row span{color:#8f959e;flex:0 0 88px}.row strong{text-align:right;line-height:1.5}.actions{display:grid;gap:12px;margin-top:22px}.btn{border:0;border-radius:12px;padding:14px 16px;font-size:16px;font-weight:700;background:#f56600;color:#fff}.btn.secondary{background:#f2f3f5;color:#1f2329}.steps{margin:20px 0 0;padding:16px;border-radius:12px;background:#fff7e8;color:#646a73;line-height:1.7}.steps strong{color:#1f2329}.status{margin:14px 0 0;text-align:center;color:#00a870;min-height:22px}</style></head><body><main class="page"><section class="card"><div class="brand">赛小蜂篮球</div><h1 class="title">赛事需求跟进</h1>${rows}<div class="actions"><button class="btn" id="copyPhone" data-value="${phone}">复制客户手机号</button><button class="btn secondary" id="copyInvite" data-value="https://api.saixiaofeng.com/wecom/event-consultant">复制客户添加入口</button></div><div class="steps"><strong>未添加客户：</strong>复制手机号，在企业微信“通讯录 → 添加客户 → 手机号搜索”中粘贴并发送申请。<br><strong>已经是好友：</strong>直接回到与该客户的原聊天窗口沟通。</div><div class="status" id="status"></div></section></main><script>
  const status=document.getElementById('status');async function copy(button,label){const value=button.dataset.value;if(!value){status.textContent='没有可复制的内容';return}try{await navigator.clipboard.writeText(value)}catch(e){const input=document.createElement('textarea');input.value=value;document.body.appendChild(input);input.select();document.execCommand('copy');input.remove()}status.textContent=label}document.getElementById('copyPhone').onclick=function(){copy(this,'手机号已复制')};document.getElementById('copyInvite').onclick=function(){copy(this,'客户添加入口已复制')};
  </script></body></html>`;
}

function html(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY'
  });
  response.end(body);
}

function decryptIncoming(url, encrypted, runtime) {
  if (!verifySignature(
    runtime.callbackToken,
    url.searchParams.get('timestamp'),
    url.searchParams.get('nonce'),
    encrypted,
    url.searchParams.get('msg_signature')
  )) throw new Error('invalid_signature');
  return decryptWechatPayload(encrypted, runtime.encodingAesKey, runtime.corpId);
}

function scheduleSync(runtime, reason) {
  if (!runtime.enabled) return;
  syncLeadInbox(runtime)
    .then((result) => console.info('[sxWecomDocAssistant] synced', { reason, ...result }))
    .catch((error) => console.error('[sxWecomDocAssistant] sync failed', {
      reason,
      code: error.message,
      errcode: error.errcode || 0
    }));
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    if (url.pathname === '/health') {
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify({ ok: true, service: 'sx-wecom-doc-assistant' }));
      return;
    }
    if (url.pathname !== '/wecom/doc-assistant') {
      text(response, 404, 'not found');
      return;
    }

    const runtime = config();
    if (request.method === 'GET' && url.searchParams.get('lead_token')) {
      const payload = verifyLeadToken(url.searchParams.get('lead_token'), runtime.leadSigningKey);
      const lead = loadState(runtime.stateFile).leads.find((item) => item.lead_id === payload.lead_id);
      if (!lead) {
        text(response, 404, 'lead not found');
        return;
      }
      html(response, 200, renderLeadPage(lead));
      return;
    }
    if (request.method === 'GET') {
      const echo = url.searchParams.get('echostr');
      if (!echo) {
        text(response, 400, 'missing echostr');
        return;
      }
      text(response, 200, decryptIncoming(url, echo, runtime));
      return;
    }

    if (request.method !== 'POST') {
      text(response, 405, 'method not allowed');
      return;
    }
    const envelope = parseXmlFields(await collectBody(request));
    if (!envelope.Encrypt) {
      text(response, 400, 'missing Encrypt');
      return;
    }
    const event = parseXmlFields(decryptIncoming(url, envelope.Encrypt, runtime));
    text(response, 200, 'success');
    if (event.Event === 'doc_change' && event.ChangeType === 'collection_doc_complete') {
      scheduleSync(runtime, 'callback');
    }
  } catch (error) {
    console.error('[sxWecomDocAssistant] request failed', { code: error.message || 'unknown_error' });
    text(response, /signature|receiver/.test(error.message || '') ? 403 : 500, 'invalid request');
  }
});

server.listen(port, '0.0.0.0', () => {
  const runtime = config();
  console.info(`[sxWecomDocAssistant] listening on ${port}`);
  scheduleSync(runtime, 'startup');
  const intervalSeconds = Math.max(60, Number(process.env.WECOM_SYNC_INTERVAL_SECONDS || 300));
  setInterval(() => scheduleSync(runtime, 'timer'), intervalSeconds * 1000).unref();
});
