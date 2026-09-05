const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9300 + (process.pid % 500);
const profileDir = path.join(process.cwd(), 'tmp', `sxf-rules-e2e-${Date.now()}`);
const outputDir = path.resolve(__dirname, '..', 'outputs', '赛事规程验证');
const url = 'http://127.0.0.1:5174/tournament-center.html?demo=1#spaces';
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function pollJson(route, timeout = 10000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}${route}`);
      if (response.ok) return response.json();
    } catch (_) {}
    await delay(100);
  }
  throw new Error('等待浏览器调试端口超时');
}

async function run() {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = spawn(edgePath, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--window-size=1670,941', url
  ], { stdio: 'ignore' });
  let socket;
  const report = [];
  try {
    const targets = await pollJson('/json/list');
    const page = targets.find((target) => target.type === 'page' && target.url.includes('tournament-center.html')) || targets.find((target) => target.type === 'page');
    socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('连接浏览器调试页面超时')), 10000);
      socket.once('open', () => { clearTimeout(timer); resolve(); });
      socket.once('error', (error) => { clearTimeout(timer); reject(error); });
      socket.once('close', () => { clearTimeout(timer); reject(new Error('浏览器调试页面在连接前关闭')); });
    });
    let id = 0;
    const pending = new Map();
    socket.on('message', (buffer) => {
      const message = JSON.parse(buffer.toString());
      if (message.id && pending.has(message.id)) {
        const item = pending.get(message.id); pending.delete(message.id);
        message.error ? item.reject(new Error(message.error.message)) : item.resolve(message.result);
      }
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const callId = ++id; pending.set(callId, { resolve, reject });
      socket.send(JSON.stringify({ id: callId, method, params }));
    });
    const evaluate = async (expression) => {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    };
    const waitFor = async (selector, timeout = 5000) => {
      const startedAt = Date.now();
      while (Date.now() - startedAt < timeout) {
        if (await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`)) return;
        await delay(80);
      }
      throw new Error(`页面元素未出现：${selector}`);
    };
    const assert = async (label, expression) => {
      if (!await evaluate(expression)) throw new Error(`断言失败：${label}`);
      report.push(`通过：${label}`);
    };
    await send('Runtime.enable'); await send('Page.enable');
    await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: outputDir });
    await send('Page.navigate', { url: 'http://127.0.0.1:5174/tournament-center.html?demo=1#spaces' });
    await delay(500);
    if (!await evaluate(`location.origin === 'http://127.0.0.1:5174'`)) throw new Error(`赛事中心测试页面未成功打开：${await evaluate('location.href')}`);
    const eventSpace = {
      id: 'rules-test', name: '2026 浦东青少年篮球邀请赛', state: '报名中', stateClass: 'orange',
      startDate: '2026-08-10', endDate: '2026-08-24', regionLabel: '上海市 · 上海市 · 浦东新区',
      groups: 2, teams: 0, matches: 0, progress: 20, logo: './assets/tournaments/summer-league-2026.png',
      organizationUnits: { organizer:'浦东新区篮球协会', undertaker:'蜂动体育篮球俱乐部', coOrganizer:'浦东青少年体育馆' },
      ruleSettings: { template:'youth-public', templateSelected:true, templateSchemaVersion:'youth-public-v1' },
      ruleDraftHtml: '<section data-rule-section-target="1"><h2>旧公开组模板</h2></section>',
      groupRows: [
        { name: 'U10 成长组', format: '5V5', birthCutoff: '2016-01-01', roster: '8—16 人', duration: '4×8 分钟', competition: '小组循环 + 淘汰赛', target: '8', joined: '0', status: '报名中' },
        { name: 'U12 竞技组', format: '5V5', birthCutoff: '2014-01-01', roster: '8—16 人', duration: '4×10 分钟', competition: '双循环赛', target: '6', joined: '0', status: '报名中' }
      ],
      registrationSettings: { startAt: '2026-07-01T09:00', endAt: '2026-08-01T18:00', minRoster: '8', maxRoster: '16', feeMode: '按人收费', feeAmount: '268', feeUnit: '元/人', prize: '冠军奖杯、奖牌及证书', publicLocation: '浦东新区蜂动体育中心', contactName: '赵负责人' }
    };
    await evaluate(`localStorage.setItem('sxf_tournament_spaces_v2', ${JSON.stringify(JSON.stringify([eventSpace]))}); localStorage.setItem('sxf_tournament_selected_space_v2','rules-test')`);
    await send('Page.navigate', { url: 'http://127.0.0.1:5174/tournament-center.html?demo=1&rules-test=1#event/rules' });
    await delay(500);
    await waitFor('.formal-rule-document');
    await assert('首次进入直接生成统一小篮球规程', `Boolean(document.querySelector('.formal-rule-document.template-small-basketball')) && !document.querySelector('.rule-template-start')`);
    await assert('页面不再提供多模板选择与更换入口', `document.querySelectorAll('.rule-template-choice').length === 0 && !document.querySelector('[data-action="use-rule-template"]') && !document.body.innerText.includes('更换规程模板')`);
    const smallFirstPageCapture = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(outputDir, '小篮球模板-首屏版式.png'), Buffer.from(smallFirstPageCapture.data, 'base64'));
    await assert('小篮球线上报名模板生成 13 个正文章节', `document.querySelectorAll('.rule-outline button').length === 13 && document.querySelectorAll('[data-rule-section-target]').length === 13`);
    await assert('小篮球章节名称遵循原规程并删除纸质附件', `(() => { const text=document.querySelector('.formal-rule-document').innerText; return text.includes('一、比赛名称') && text.includes('二、组织机构') && text.includes('七、比赛规则及场地器材') && !text.includes('参赛资格信息表') && !text.includes('赛风赛纪主体责任书'); })()`);
    await assert('竞赛规程只读展示赛事资料中的主承协单位', `Boolean(document.querySelector('.formal-rule-unit-source')) && !document.querySelector('[data-rule-meta] [name="organizer"]')`);
    await assert('赛事资料主承协单位同步到规程正文', `(() => { const text=document.querySelector('.formal-rule-document').innerText; return text.includes('浦东新区篮球协会') && text.includes('蜂动体育篮球俱乐部') && text.includes('浦东青少年体育馆'); })()`);
    await waitFor('[data-rule-registration-qr][src^="data:image"]');
    await assert('报名办法直接展示线上报名二维码', `Boolean(document.querySelector('[data-rule-registration-qr][src^="data:image"]'))`);
    await assert('自动带入组别参数表', `document.querySelector('.formal-rule-document').innerText.includes('U10') && document.querySelector('.formal-rule-document').innerText.includes('4×8 分钟')`);
    await assert('自动带入日期与举办地区', `document.querySelector('.formal-rule-document').innerText.includes('2026年8月10日') && document.querySelector('.formal-rule-document').innerText.includes('浦东新区')`);
    await assert('小篮球模板生成分组比赛规则与器材规定', `document.querySelector('.formal-rule-document').innerText.includes('篮圈高度') && document.querySelector('.formal-rule-document').innerText.includes('比赛用球') && document.querySelector('.formal-rule-document').innerText.includes('特殊规定')`);
    await assert('新增证件原件与替代材料核验', `(() => { const text=document.querySelector('.formal-rule-document').innerText; return text.includes('身份证件原件') && text.includes('户口簿原件与学籍证明'); })()`);
    await assert('新增计时休息暂停与阵容轮换细则', `(() => { const text=document.querySelector('.formal-rule-document').innerText; return text.includes('前 3 节采用毛时') && text.includes('中场休息 3 分钟') && text.includes('赛前提交两套阵容'); })()`);
    await assert('新增中场全员罚球与资格造假处理', `(() => { const text=document.querySelector('.formal-rule-document').innerText; return text.includes('中场休息期间进行全员罚球赛') && text.includes('参赛资格造假') && text.includes('积分记 0 分'); })()`);
    await assert('新增保证金与退赛退费边界', `(() => { const text=document.querySelector('.formal-rule-document').innerText; return text.includes('赛事结束后 1—3 个工作日内原路退回') && text.includes('实际物料制作费'); })()`);
    await assert('补充分组规则依据', `document.querySelector('.formal-rule-document').innerText.includes('《篮球规则》及本赛事特别规定')`);
    await assert('补充跨赛季资格复核与后续阶段边界', `(() => { const text=document.querySelector('.formal-rule-document').innerText; return text.includes('跨赛季、跨年度') && text.includes('后续阶段不代表自动满足') && text.includes('后续阶段可另行发布竞赛规程'); })()`);
    await assert('补充保险责任与明确退款时限', `(() => { const text=document.querySelector('.formal-rule-document').innerText; return text.includes('保险安排：必须购买赛事意外保险') && text.includes('1—3 个工作日') && text.includes('7—10 个工作日'); })()`);
    await assert('小篮球规程正文不含等级评定', `!document.querySelector('.formal-rule-document').innerText.includes('等级评定') && !document.querySelector('.formal-rule-document').innerText.includes('星级评定')`);
    await evaluate(`document.querySelector('[data-rule-section="7"]').click()`); await delay(220);
    const smallTemplateCapture = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(outputDir, '小篮球模板-原规程结构.png'), Buffer.from(smallTemplateCapture.data, 'base64'));
    await assert('规则基准固定为小篮球特别规定', `document.querySelector('[name="ruleBase"]').disabled && document.querySelector('[name="ruleBase"]').value.includes('小篮球规则')`);
    await evaluate(`location.hash='event/profile'`); await delay(160);
    await assert('主承协单位统一在赛事资料维护', `Boolean(document.querySelector('[data-event-profile-form] [name="organizer"]') && document.querySelector('[data-event-profile-form] [name="undertaker"]') && document.querySelector('[data-event-profile-form] [name="coOrganizer"]'))`);
    await evaluate(`document.querySelector('[data-event-profile-form] [name="coOrganizer"]').value='上海市篮球协会'; document.querySelector('[data-action="save-page"]').click()`); await delay(140);
    await evaluate(`location.hash='event/rules'`); await delay(180);
    await assert('赛事资料修改后自动同步已有规程', `document.querySelector('.formal-rule-document').innerText.includes('上海市篮球协会')`);
    await assert('页面不再出现容易误解的重新生成入口', `!document.body.innerText.includes('重新生成标准规程') && !document.querySelector('[data-action="regenerate-rules"]')`);
    await evaluate(`document.querySelector('[data-action="save-page"]').click()`); await delay(120);
    await assert('规程草稿写入赛事空间', `JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].ruleDraftHtml.includes('十三、未尽事宜')`);
    await assert('赛事组织单位保持在赛事资料数据中', `(() => { const units=JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].organizationUnits; return units.organizer==='浦东新区篮球协会' && units.undertaker==='蜂动体育篮球俱乐部' && units.coOrganizer==='上海市篮球协会'; })()`);
    await evaluate(`document.querySelector('[data-action="publish-rules"]').click()`); await delay(140);
    await assert('发布后生成正式版本', `(() => { const rules=JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].ruleSettings; return rules.published===true && rules.version===2; })()`);
    await assert('提供 PDF 与 Word 导出入口', `Boolean(document.querySelector('[data-action="export-rules-pdf"]') && document.querySelector('[data-action="export-rules-word"]'))`);
    for (const file of fs.readdirSync(outputDir).filter((name) => name.endsWith('.doc'))) fs.unlinkSync(path.join(outputDir, file));
    await evaluate(`document.querySelector('[data-action="export-rules-word"]').click()`);
    const downloadStartedAt = Date.now();
    while (!fs.readdirSync(outputDir).some((name) => name.endsWith('.doc')) && Date.now() - downloadStartedAt < 4000) await delay(100);
    if (!fs.readdirSync(outputDir).some((name) => name.endsWith('.doc'))) throw new Error('Word 文件未下载');
    report.push('通过：Word 规程文件可实际下载');
    const capture = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(outputDir, '赛事规程-1670x941.png'), Buffer.from(capture.data, 'base64'));
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await delay(120);
    const compactCapture = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(outputDir, '赛事规程-1440x900.png'), Buffer.from(compactCapture.data, 'base64'));
    fs.writeFileSync(path.join(outputDir, '验证结果.txt'), `${report.join('\n')}\n`, 'utf8');
    process.stdout.write(`${report.join('\n')}\n截图：${path.join(outputDir, '赛事规程-1670x941.png')}\n`);
  } finally {
    if (socket?.readyState === WebSocket.OPEN) socket.close();
    browser.kill();
  }
}

run().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
