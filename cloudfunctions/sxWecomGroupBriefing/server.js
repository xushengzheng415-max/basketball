'use strict';

const http = require('node:http');
const { createApplication, errorCode } = require('./index');
const { safeEqual } = require('./core');

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer'
};

function sendJson(response, statusCode, value) {
  response.writeHead(statusCode, JSON_HEADERS);
  response.end(JSON.stringify(value));
}

function isAuthorized(request, adminToken) {
  if (!adminToken) return false;
  const header = String(request.headers.authorization || '');
  if (!header.startsWith('Basic ')) return false;
  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    if (separator < 0) return false;
    const password = decoded.slice(separator + 1);
    return safeEqual(password, adminToken);
  } catch {
    return false;
  }
}

function parseJsonBody(request, maxBytes = 65536) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let received = 0;
    request.on('data', (chunk) => {
      received += chunk.length;
      if (received > maxBytes) {
        reject(Object.assign(new Error('request_body_too_large'), { code: 'request_body_too_large', httpStatus: 413 }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        resolve(parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {});
      } catch {
        reject(Object.assign(new Error('invalid_json_body'), { code: 'invalid_json_body', httpStatus: 400 }));
      }
    });
    request.on('error', () => reject(Object.assign(new Error('request_read_error'), { code: 'request_read_error', httpStatus: 400 })));
  });
}

function adminHtml() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>赛小蜂篮球晨报</title>
  <style>
    :root{color-scheme:light;font-family:system-ui,-apple-system,"Microsoft YaHei",sans-serif;background:#f4f6f8;color:#20242a}
    body{margin:0}.wrap{max-width:1040px;margin:0 auto;padding:24px}.hero{background:#17212f;color:#fff;border-radius:18px;padding:24px;margin-bottom:18px}
    h1,h2{margin-top:0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}.card{background:#fff;border:1px solid #e2e6ea;border-radius:14px;padding:18px;box-shadow:0 5px 20px #1520330b}
    label{display:block;font-size:13px;color:#58616d;margin:10px 0 4px}input,textarea{box-sizing:border-box;width:100%;padding:10px;border:1px solid #ccd2d9;border-radius:8px;font:inherit}textarea{min-height:90px}
    button{border:0;border-radius:9px;background:#ef6c24;color:#fff;padding:10px 15px;margin:8px 8px 0 0;cursor:pointer}button.alt{background:#34465c}button:disabled{opacity:.55;cursor:not-allowed}
    pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f7f8fa;border-radius:9px;padding:12px;max-height:500px;overflow:auto}.warning{color:#a24212}.muted{color:#6a737d;font-size:13px}
  </style>
</head>
<body><main class="wrap">
  <section class="hero"><h1>赛小蜂篮球 · 企微客户群晨报</h1><p>先生成并核验预览，再明确选择群主与客户群。审核未通过时系统不会创建群发任务。</p></section>
  <section class="grid">
    <div class="card"><h2>1. 内容预览</h2><button id="preview">生成今天预览</button><button class="alt" id="refresh">刷新状态</button><p id="previewNote" class="muted"></p><pre id="status">正在读取…</pre></div>
    <div class="card"><h2>2. 明确发送范围</h2><label>群主企业微信 UserID</label><input id="sender" autocomplete="off" placeholder="例如 zhangsan"><label>客户群 chat_id（每行或逗号分隔）</label><textarea id="chatIds" placeholder="wrxxxxxxxx"></textarea><button class="alt" id="groups">读取该群主的客户群</button><button id="create">创建一键确认任务</button><p class="warning">不会默认选择全企业客户群；创建后仍由群主在企微确认发送。</p><pre id="groupsOut"></pre></div>
    <div class="card"><h2>3. 提醒与结果</h2><label>群发任务 msgid</label><input id="msgid" autocomplete="off"><button id="remind">提醒群主</button><button class="alt" id="result">查询发送结果</button><pre id="taskOut"></pre></div>
  </section>
</main>
<script>
const el=id=>document.getElementById(id);let latest=null;
async function api(url,options={}){const response=await fetch(url,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});const data=await response.json().catch(()=>({error:'invalid_response'}));if(!response.ok)throw new Error(data.error||('HTTP '+response.status));return data}
function targets(){return el('chatIds').value.split(/[\\s,]+/).filter(Boolean)}
async function refresh(){try{const data=await api('/admin/api/status');const records=data.state&&data.state.records||[];latest=records.find(x=>x.status==='ready')||records[0]||null;el('status').textContent=JSON.stringify(data,null,2);if(latest){el('previewNote').textContent='当前记录：'+latest.date+' / '+latest.status+' / '+latest.fingerprint;el('msgid').value=latest.msgid||el('msgid').value}}catch(error){el('status').textContent=error.message}}
el('refresh').onclick=refresh;
el('preview').onclick=async()=>{el('preview').disabled=true;try{await api('/admin/api/preview',{method:'POST',body:'{}'});await refresh()}catch(error){el('previewNote').textContent=error.message}finally{el('preview').disabled=false}};
el('groups').onclick=async()=>{try{const sender=el('sender').value.trim();const data=await api('/admin/api/groups?owner='+encodeURIComponent(sender));el('groupsOut').textContent=JSON.stringify(data,null,2)}catch(error){el('groupsOut').textContent=error.message}};
el('create').onclick=async()=>{if(!latest)return alert('请先生成预览');if(latest.status!=='ready')return alert('当前内容需要人工审核，不能创建群发');if(!confirm('确认使用当前群主和明确列出的客户群创建群发任务？'))return;try{const data=await api('/admin/api/tasks/create',{method:'POST',body:JSON.stringify({date:latest.date,fingerprint:latest.fingerprint,sender:el('sender').value.trim(),chat_id_list:targets()})});el('taskOut').textContent=JSON.stringify(data,null,2);el('msgid').value=data.msgid||'';await refresh()}catch(error){el('taskOut').textContent=error.message}};
el('remind').onclick=async()=>{try{const data=await api('/admin/api/tasks/remind',{method:'POST',body:JSON.stringify({msgid:el('msgid').value.trim()})});el('taskOut').textContent=JSON.stringify(data,null,2)}catch(error){el('taskOut').textContent=error.message}};
el('result').onclick=async()=>{try{const q=new URLSearchParams({msgid:el('msgid').value.trim(),sender:el('sender').value.trim()});const data=await api('/admin/api/tasks/result?'+q);el('taskOut').textContent=JSON.stringify(data,null,2);await refresh()}catch(error){el('taskOut').textContent=error.message}};
refresh();
</script></body></html>`;
}

function writeAdminHtml(response) {
  response.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'"
  });
  response.end(adminHtml());
}

function publicError(error) {
  return {
    status: Math.min(599, Math.max(400, Number(error && error.httpStatus) || 500)),
    code: errorCode(error)
  };
}

function createHttpServer(application, dependencies = {}) {
  const { config, service } = application;
  const logger = dependencies.logger || console;
  return http.createServer(async (request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    try {
      if (request.method === 'GET' && url.pathname === '/health') {
        return sendJson(response, 200, {
          ok: true,
          service_enabled: config.serviceEnabled,
          scheduler_enabled: config.schedulerEnabled,
          time: new Date().toISOString()
        });
      }

      if (!url.pathname.startsWith('/admin')) return sendJson(response, 404, { error: 'not_found' });
      if (!config.adminToken) return sendJson(response, 503, { error: 'admin_token_not_configured' });
      if (!isAuthorized(request, config.adminToken)) {
        response.setHeader('WWW-Authenticate', 'Basic realm="SXF Basketball Briefing", charset="UTF-8"');
        return sendJson(response, 401, { error: 'unauthorized' });
      }

      if (request.method === 'GET' && url.pathname === '/admin') return writeAdminHtml(response);
      if (request.method === 'GET' && url.pathname === '/admin/api/status') {
        return sendJson(response, 200, service.getStatus());
      }
      if (request.method === 'POST' && url.pathname === '/admin/api/preview') {
        const body = await parseJsonBody(request);
        return sendJson(response, 200, await service.generatePreview(body));
      }
      if (request.method === 'POST' && url.pathname === '/admin/api/tasks/create') {
        return sendJson(response, 200, await service.createTask(await parseJsonBody(request)));
      }
      if (request.method === 'POST' && url.pathname === '/admin/api/tasks/remind') {
        return sendJson(response, 200, await service.remindTask(await parseJsonBody(request)));
      }
      if (request.method === 'POST' && url.pathname === '/admin/api/tasks/cancel') {
        return sendJson(response, 200, await service.cancelTask(await parseJsonBody(request)));
      }
      if (request.method === 'POST' && url.pathname === '/admin/api/tasks/reconcile') {
        return sendJson(response, 200, await service.reconcileCreation(await parseJsonBody(request)));
      }
      if (request.method === 'POST' && url.pathname === '/admin/api/tasks/reset-rejected') {
        return sendJson(response, 200, await service.resetRejectedTask(await parseJsonBody(request)));
      }
      if (request.method === 'POST' && url.pathname === '/admin/api/tasks/revalidate') {
        return sendJson(response, 200, await service.revalidateRecord(await parseJsonBody(request)));
      }
      if (request.method === 'GET' && url.pathname === '/admin/api/tasks/result') {
        return sendJson(response, 200, await service.getTaskResult({
          msgid: url.searchParams.get('msgid'),
          sender: url.searchParams.get('sender'),
          cursor: url.searchParams.get('cursor'),
          resultCursor: url.searchParams.get('result_cursor'),
          limit: url.searchParams.get('limit')
        }));
      }
      if (request.method === 'GET' && url.pathname === '/admin/api/tasks/recent') {
        return sendJson(response, 200, await service.listRecentMessageRecords({
          sender: url.searchParams.get('sender'),
          startTime: url.searchParams.get('start_time'),
          endTime: url.searchParams.get('end_time'),
          cursor: url.searchParams.get('cursor'),
          limit: url.searchParams.get('limit')
        }));
      }
      if (url.pathname === '/admin/api/groups' && ['GET', 'POST'].includes(request.method)) {
        const body = request.method === 'POST' ? await parseJsonBody(request) : {};
        const owner = url.searchParams.get('owner');
        if (owner) body.ownerUserIds = [owner];
        if (url.searchParams.get('cursor')) body.cursor = url.searchParams.get('cursor');
        if (url.searchParams.get('limit')) body.limit = url.searchParams.get('limit');
        return sendJson(response, 200, await service.listGroups(body));
      }
      if (request.method === 'GET' && url.pathname.startsWith('/admin/api/groups/')) {
        const chatId = decodeURIComponent(url.pathname.slice('/admin/api/groups/'.length));
        return sendJson(response, 200, await service.getGroup(chatId));
      }
      return sendJson(response, 404, { error: 'not_found' });
    } catch (error) {
      const info = publicError(error);
      if (logger && typeof logger.error === 'function') {
        logger.error('[sxWecomGroupBriefing] request_failed', {
          route: `${request.method} ${url.pathname}`.slice(0, 160),
          code: info.code,
          status: info.status
        });
      }
      if (!response.headersSent) return sendJson(response, info.status, { error: info.code });
      response.end();
    }
  });
}

async function startServer(environment = process.env, dependencies = {}) {
  const application = dependencies.application || createApplication(environment, dependencies);
  await application.service.initialize();
  const server = createHttpServer(application, dependencies);
  const intervalMs = 30 * 1000;
  let schedulerRunning = false;
  let scheduler = null;
  if (application.config.schedulerEnabled) {
    const runTick = async () => {
      if (schedulerRunning) return;
      schedulerRunning = true;
      try {
        await application.service.tick();
      } catch (error) {
        const logger = dependencies.logger || console;
        if (logger && typeof logger.error === 'function') {
          logger.error('[sxWecomGroupBriefing] scheduler_tick_failed', { code: errorCode(error) });
        }
      } finally {
        schedulerRunning = false;
      }
    };
    scheduler = setInterval(runTick, intervalMs);
    scheduler.unref();
    setImmediate(runTick);
  }
  server.on('close', () => {
    if (scheduler) clearInterval(scheduler);
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(application.config.port, '127.0.0.1', resolve);
  });
  const logger = dependencies.logger || console;
  if (logger && typeof logger.info === 'function') {
    logger.info('[sxWecomGroupBriefing] listening', {
      host: '127.0.0.1',
      port: application.config.port,
      scheduler_enabled: application.config.schedulerEnabled
    });
  }
  return { application, server };
}

if (require.main === module) {
  startServer().then(({ server }) => {
    const stop = () => server.close(() => process.exit(0));
    process.once('SIGTERM', stop);
    process.once('SIGINT', stop);
  }).catch((error) => {
    console.error('[sxWecomGroupBriefing] startup_failed', { code: errorCode(error) });
    process.exitCode = 1;
  });
}

module.exports = {
  adminHtml,
  createHttpServer,
  isAuthorized,
  parseJsonBody,
  publicError,
  sendJson,
  startServer
};
