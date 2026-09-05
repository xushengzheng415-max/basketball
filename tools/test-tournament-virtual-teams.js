const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const debugPort = 9361;
const profileDir = path.join(process.env.TEMP || process.cwd(), `sxf-virtual-teams-e2e-${Date.now()}`);
const outputDir = path.resolve(__dirname, '..', 'outputs', '虚拟球队验证');
const url = 'http://127.0.0.1:5174/tournament-center.html?demo=1#registration/claims';
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function pollTargets(timeout = 10000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      if (response.ok) return response.json();
    } catch (_) {}
    await wait(100);
  }
  throw new Error('等待浏览器调试端口超时');
}

async function run() {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = spawn(edgePath, [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--window-size=1672,941', url
  ], { stdio: 'ignore' });
  let socket;
  const results = [];
  const consoleErrors = [];
  try {
    const targets = await pollTargets();
    const page = targets.find((target) => target.type === 'page' && target.url.includes('tournament-center.html')) || targets.find((target) => target.type === 'page');
    if (!page) throw new Error('未找到赛事中心页面');
    socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
    let sequence = 0;
    const pending = new Map();
    socket.on('message', (buffer) => {
      const message = JSON.parse(buffer.toString());
      if (message.id && pending.has(message.id)) {
        const task = pending.get(message.id); pending.delete(message.id);
        message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
      }
      if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') consoleErrors.push(message.params.args.map((item) => item.value || item.description || '').join(' '));
      if (message.method === 'Runtime.exceptionThrown') consoleErrors.push(message.params.exceptionDetails?.exception?.description || message.params.exceptionDetails?.text || '页面脚本异常');
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression) => {
      const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text || '页面执行失败');
      return response.result.value;
    };
    const waitFor = async (selector, timeout = 7000) => {
      const startedAt = Date.now();
      while (Date.now() - startedAt < timeout) {
        if (await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`)) return;
        await wait(80);
      }
      throw new Error(`元素未出现：${selector}`);
    };
    const click = async (selector) => { await waitFor(selector); await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); await wait(250); };
    const check = async (label, expression) => {
      let passed = false; let detail = '';
      try { passed = Boolean(await evaluate(expression)); } catch (error) { detail = error.message; }
      results.push({ label, passed, detail });
      process.stdout.write(`${passed ? '通过' : '失败'}：${label}\n`);
    };
    const screenshot = async (name) => {
      const capture = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(path.join(outputDir, name), Buffer.from(capture.data, 'base64'));
    };

    await send('Runtime.enable'); await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1672, height: 941, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url }); await wait(350);
    await evaluate(`(() => {
      const event = { id:'virtual-team-e2e', name:'虚拟球队功能测试赛', state:'报名中', stateClass:'orange', participationMode:'team-player', startDate:'2026-08-14', endDate:'2026-08-20', firstGroup:'U8 A组', groups:4, teams:1, matches:0,
        groupRows:[{id:'g1',name:'U8 A组',target:4},{id:'g2',name:'U10 B组',target:4},{id:'g3',name:'U12 C组',target:4},{id:'g4',name:'U14 D组',target:4}],
        registrationTeams:[{id:'REAL-1',name:'用户原有球队',group:'U8 A组',owner:'王领队',phone:'13800138000',claimStatus:'待邀请',teamQualificationStatus:'待审核',players:[]}],
        workflow:{profileSaved:true,groupsConfigured:true,registrationConfigured:true} };
      localStorage.setItem('sxf_tournament_spaces_v2', JSON.stringify([event]));
      localStorage.setItem('sxf_tournament_selected_space_v2', event.id);
      location.hash='#registration/claims'; location.reload();
    })()`);
    await wait(550); await waitFor('.registration-claims-page');
    await check('球队认领顶部显示“添加虚拟球队”', `Boolean(document.querySelector('#pageActions [data-action="add-virtual-teams"]'))`);
    await evaluate(`location.hash='#registration/progress'`); await wait(250); await waitFor('.registration-progress-page');
    await check('入驻进度顶部同样显示“添加虚拟球队”', `Boolean(document.querySelector('#pageActions [data-action="add-virtual-teams"]'))`);
    await evaluate(`location.hash='#registration/claims'`); await wait(250); await waitFor('.registration-claims-page');
    await click('#pageActions [data-action="add-virtual-teams"]');
    await check('导入弹窗说明32队和384名球员', `document.getElementById('modalBody').textContent.includes('32') && document.getElementById('modalBody').textContent.includes('384') && document.getElementById('modalBody').textContent.includes('固定球服版型')`);
    await check('每个年龄组均有8支球队', `(() => { const counts=window.SXFYouthDemoData.teams.reduce((map,team)=>{ const key=team.ageGroup.split('（')[0]; map[key]=(map[key]||0)+1; return map; },{}); return ['U8','U10','U12','U14'].every(key=>counts[key]===8); })()`);
    await check('默认不选择任何球队且提交按钮禁用', `document.querySelectorAll('.virtual-team-choice').length===32 && document.querySelectorAll('.virtual-team-choice.selected').length===0 && document.querySelector('[data-action="confirm-add-virtual-teams"]').disabled`);
    await click('[data-action="filter-virtual-team-age"][data-age-group="U8"]');
    await check('可按年龄组查看8支球队', `document.querySelectorAll('.virtual-team-choice:not([hidden])').length===8 && [...document.querySelectorAll('.virtual-team-choice:not([hidden])')].every(card=>card.dataset.ageGroup==='U8')`);
    await click('.virtual-team-choice:not(:disabled)');
    await check('选择1支后按钮显示按需添加', `document.querySelectorAll('.virtual-team-choice.selected').length===1 && document.querySelector('[data-virtual-team-selection-count]').textContent==='1' && document.querySelector('[data-action="confirm-add-virtual-teams"]').textContent.includes('1 支球队')`);
    await screenshot('虚拟球队-选择添加.png');
    await click('[data-action="confirm-add-virtual-teams"]');
    await check('只写入所选1支球队并保留原球队', `(() => { const rows=JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].registrationTeams; return rows.length===2 && rows.some(t=>t.id==='REAL-1') && rows.filter(t=>t.virtualDatasetId==='sxf-youth-32-v2').length===1; })()`);
    await check('所选球队带入12名审核通过球员', `(() => { const team=JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].registrationTeams.find(t=>t.isVirtual); return team.players.length===12 && team.players.every(p=>p.reviewResult==='通过' && p.avatar && p.number); })()`);
    await check('页面只显示1支虚拟球队且保留真实球队', `document.querySelectorAll('.virtual-registration-row').length===1 && document.body.textContent.includes('用户原有球队')`);
    await check('所选球队队徽成功加载', `[...document.querySelectorAll('.virtual-registration-row .team-logo img')].length===1 && [...document.querySelectorAll('.virtual-registration-row .team-logo img')].every(img=>img.complete && img.naturalWidth>0)`);
    await click('.virtual-registration-row [data-action="view-virtual-team"]');
    await check('球队资料弹窗显示12名球员', `document.querySelectorAll('.virtual-roster-grid article').length===12`);
    await check('12张头像全部成功加载', `[...document.querySelectorAll('.virtual-roster-grid img')].every(img=>img.complete && img.naturalWidth===320 && img.naturalHeight===320)`);
    await screenshot('虚拟球队-12人资料.png');
    await click('#closeModal');
    await click('#pageActions [data-action="add-virtual-teams"]');
    await check('已经添加的球队锁定为“已加入”', `document.querySelectorAll('.virtual-team-choice.added:disabled').length===1 && document.querySelector('.virtual-team-choice.added').textContent.includes('已加入')`);
    await evaluate(`(() => { const cards=[...document.querySelectorAll('.virtual-team-choice:not(:disabled)')]; cards.slice(0,5).forEach(card=>card.click()); })()`); await wait(250);
    await check('单次最多选择4支球队', `document.querySelectorAll('.virtual-team-choice.selected').length===4 && document.querySelector('[data-virtual-team-selection-count]').textContent==='4' && document.getElementById('toast').textContent.includes('最多添加 4 支')`);
    await click('[data-action="clear-virtual-team-selection"]');
    await evaluate(`(() => { const cards=[...document.querySelectorAll('.virtual-team-choice:not(:disabled)')]; cards.slice(0,2).forEach(card=>card.click()); })()`); await wait(200);
    await click('[data-action="confirm-add-virtual-teams"]');
    await check('可继续按需添加2支且不会重复', `(() => { const rows=JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].registrationTeams; const virtual=rows.filter(t=>t.isVirtual); return rows.length===4 && virtual.length===3 && new Set(virtual.map(t=>t.virtualSourceTeamId)).size===3 && virtual.flatMap(t=>t.players||[]).length===36; })()`);
    await evaluate('location.reload()'); await wait(550); await waitFor('.registration-claims-page');
    await check('刷新后3支虚拟球队仍保留', `document.querySelectorAll('.virtual-registration-row').length===3`);
    await click('#pageActions [data-action="add-virtual-teams"]');
    await check('再次打开可管理并整批移除', `document.getElementById('modalTitle').textContent.includes('管理虚拟球队') && Boolean(document.querySelector('[data-action="remove-virtual-teams"]'))`);
    await click('[data-action="remove-virtual-teams"]');
    await check('整批移除只保留用户原有球队', `(() => { const rows=JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].registrationTeams; return rows.length===1 && rows[0].id==='REAL-1' && document.body.textContent.includes('用户原有球队'); })()`);
    results.push({ label:'浏览器控制台无脚本错误', passed:consoleErrors.length===0, detail:consoleErrors.join(' | ') });
    const report = { testedAt:new Date().toISOString(), passed:results.filter((item)=>item.passed).length, failed:results.filter((item)=>!item.passed).length, results, consoleErrors };
    fs.writeFileSync(path.join(outputDir, '虚拟球队实际测试报告.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    process.stdout.write(`汇总：通过 ${report.passed} 项，失败 ${report.failed} 项。\n`);
    if (report.failed) process.exitCode = 1;
  } finally {
    if (socket?.readyState === WebSocket.OPEN) socket.close();
    browser.kill();
  }
}

run().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
