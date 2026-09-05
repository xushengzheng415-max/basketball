const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const debugPort = 9354;
const profileDir = path.join(process.env.TEMP || process.cwd(), `sxf-stage-dependency-${Date.now()}`);
const outputDir = path.resolve(__dirname, '..', 'outputs', '赛事中心验证');
const url = 'http://127.0.0.1:5174/tournament-center.html?demo=1&v=20260814#schedule/calendar';
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function run() {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = spawn(edgePath, [`--remote-debugging-port=${debugPort}`, `--user-data-dir=${profileDir}`, '--headless=new', '--disable-gpu', '--no-first-run', '--window-size=1672,941', url], { stdio: 'ignore' });
  let socket;
  try {
    let targets;
    for (let index = 0; index < 80; index += 1) {
      try { targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json(); break; } catch (_) { await wait(100); }
    }
    const page = targets?.find((target) => target.type === 'page' && target.url.includes('tournament-center.html'));
    if (!page) throw new Error('未找到赛事中心页面');
    socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
    let id = 0;
    const pending = new Map();
    socket.on('message', (buffer) => {
      const message = JSON.parse(buffer.toString());
      if (!message.id || !pending.has(message.id)) return;
      const task = pending.get(message.id); pending.delete(message.id);
      message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => { const taskId = ++id; pending.set(taskId, { resolve, reject }); socket.send(JSON.stringify({ id: taskId, method, params })); });
    const evaluate = async (expression) => {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || '页面执行失败');
      return result.result.value;
    };
    const assert = async (label, expression) => { if (!await evaluate(expression)) throw new Error(`断言失败：${label}`); process.stdout.write(`通过：${label}\n`); };
    const click = async (selector) => { await evaluate(`document.querySelector(${JSON.stringify(selector)})?.click()`); await wait(220); };
    await send('Runtime.enable');
    await wait(300);
    await evaluate(`(() => {
      const names = ['洛杉矶公牛','测试2','frank','测试43','测试1','测试4','测试5','测试85'];
      const registrationTeams = names.map((name, index) => ({ id:'TEAM-'+index,name,group:'U8 启蒙组',claimStatus:'已认领',teamQualificationStatus:'已通过',qualificationStatus:'已通过',players:[] }));
      const config = { preset:'group-knockout',formatType:'combined',groupCount:2,teamsPerGroup:4,advancePerGroup:2,thirdPlaceMatch:true,groupKnockoutSchemaVersion:3,groupKnockoutAdvanceTeams:4,configured:true,dirty:false,points:{win:2,draw:1,loss:0,forfeitWin:2,forfeitLoss:0},stages:[
        {id:'group-stage',name:'小组单循环',type:'group'},
        {id:'semifinal',name:'半决赛',type:'knockout',entrants:4,bracketSize:4,matchCount:2,source:'group-advance'},
        {id:'third-place',name:'三、四名决赛',type:'third-place',entrants:2,matchCount:1,source:'group-advance'},
        {id:'final',name:'决赛',type:'final',entrants:2,bracketSize:2,matchCount:1,source:'group-advance'}
      ]};
      const event = { id:'stage-dependency-e2e',name:'测试',state:'进行中',startDate:'2026-08-19',endDate:'2026-08-20',firstGroup:'U8 启蒙组',groupRows:[{id:'u8',name:'U8 启蒙组',target:8,joined:8,status:'已确认',competition:'小组循环 + 单败淘汰',groupCount:2,teamsPerGroup:4,advancePerGroup:2,thirdPlaceMatch:true,competitionConfig:config}],registrationTeams,teams:8,matches:0,scheduleRows:[],workflow:{teamsImported:true,qualificationCompleted:true,drawSaved:true,scheduleGenerated:false,venuesConfigured:true},venueSettings:{scope:'all',selectedVenueId:'v1',venues:[{id:'v1',name:'浦东体育中心',enabled:true,courts:[{id:'c1',name:'球场 1',type:'标准全场',enabled:true},{id:'c2',name:'球场 2',type:'标准全场',enabled:true}]}],availability:{startDate:'2026-08-19',endDate:'2026-08-20',morningStartTime:'09:00',morningEndTime:'12:00',afternoonStartTime:'14:00',afternoonEndTime:'18:00',eveningEnabled:false,eveningStartTime:'19:00',eveningEndTime:'21:30',scheduleTimeSlots:[],matchMinutes:60,bufferMinutes:15}} };
      localStorage.setItem('sxf_tournament_spaces_v2', JSON.stringify([event]));
      localStorage.setItem('sxf_tournament_selected_space_v2', event.id);
      location.hash='#schedule/calendar'; location.reload();
    })()`);
    await wait(1200);
    await assert('两天白天赛程显示阶段容量提醒', `document.querySelector('.schedule-feasibility-alert')?.textContent.includes('至少需要 5 个连续比赛时段') && document.querySelector('.schedule-feasibility-alert')?.textContent.includes('增加至 3 天')`);
    await click('[data-action="generate-schedule"]');
    await assert('两天白天不生成提前半决赛的错误赛程', `JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].scheduleRows.length === 0 && !document.getElementById('modalLayer').hidden && document.getElementById('modalLayer').textContent.includes('淘汰赛在上一阶段全部结束后才开始')`);
    await click('[data-action="resolve-schedule-evening"]');
    await click('[data-action="confirm-resolve-schedule-evening"]');
    await assert('开启晚间后生成完整16场', `(() => { const e=JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0]; return e.venueSettings.availability.eveningEnabled && e.scheduleRows.length===16; })()`);
    await assert('两天方案按小组三轮、半决赛、晚间决赛排序', `(() => { const r=JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].scheduleRows; const max=(a)=>a.sort().at(-1); const min=(a)=>a.sort()[0]; const rounds=[1,2,3].map(n=>r.filter(x=>x.round==='第 '+n+' 轮').map(x=>x.time)); const semi=r.filter(x=>x.round==='半决赛').map(x=>x.time); const finals=r.filter(x=>/三、四名决赛|^决赛$/.test(x.round)).map(x=>x.time); return max(rounds[0])<min(rounds[1]) && max(rounds[1])<min(rounds[2]) && max(rounds[2])<min(semi) && max(semi)<min(finals) && finals.every(x=>x.startsWith('2026-08-20 19:') || x.startsWith('2026-08-20 20:')); })()`);
    await assert('关键场次默认使用主场地逐场进行', `(() => { const r=JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].scheduleRows.filter(x=>x.keyMatch); return r.length===4 && r.every(x=>x.venue.endsWith('球场 1')) && new Set(r.map(x=>x.time)).size===4; })()`);
    await assert('两块场地时日历整体收紧到红框宽度并左对齐', `(() => { const grid=document.querySelector('.unified-calendar-grid'); const panel=document.querySelector('.schedule-day-panel'); const cell=document.querySelector('.calendar-grid-cell'); const card=cell?.querySelector('.calendar-grid-match'); return grid && panel && cell && card && Math.abs(card.getBoundingClientRect().width - cell.getBoundingClientRect().width) < 2 && grid.getBoundingClientRect().width <= 808 && Math.abs(grid.getBoundingClientRect().left - panel.getBoundingClientRect().left) < 2; })()`);
    await evaluate(`(() => { const e=JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0]; e.venueSettings.venues[0].courts.push({id:'c3',name:'球场 3',type:'标准全场',enabled:true},{id:'c4',name:'球场 4',type:'标准全场',enabled:true}); localStorage.setItem('sxf_tournament_spaces_v2',JSON.stringify([e])); location.reload(); })()`);
    await wait(900);
    await assert('增加到四块场地时日历列宽自适应且不横向溢出', `(() => { const grid=document.querySelector('.unified-calendar-grid'); return grid && grid.scrollWidth <= grid.clientWidth + 1 && getComputedStyle(grid).gridTemplateColumns.split(' ').length === 5; })()`);
    await evaluate(`(() => { const e=JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0]; e.endDate='2026-08-20'; e.scheduleRows=[]; e.matches=0; e.workflow.scheduleGenerated=false; Object.assign(e.venueSettings.availability,{endDate:'2026-08-20',eveningEnabled:false,scheduleTimeSlots:[]}); localStorage.setItem('sxf_tournament_spaces_v2',JSON.stringify([e])); location.reload(); })()`);
    await wait(1000);
    await click('[data-action="resolve-schedule-extra-day"]');
    await click('[data-action="confirm-resolve-schedule-extra-day"]');
    await assert('增加比赛日后截止日期延长到21日并生成16场', `(() => { const e=JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0]; return e.endDate==='2026-08-21' && e.venueSettings.availability.endDate==='2026-08-21' && e.scheduleRows.length===16; })()`);
    await assert('三天白天方案将决赛放到第三天上午', `(() => { const r=JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].scheduleRows; const semi=r.filter(x=>x.round==='半决赛'); const finals=r.filter(x=>/三、四名决赛|^决赛$/.test(x.round)); return semi.every(x=>x.time.startsWith('2026-08-20')) && new Set(semi.map(x=>x.time)).size===2 && finals.every(x=>x.time.startsWith('2026-08-21')) && new Set(finals.map(x=>x.time)).size===2; })()`);
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(outputDir, '赛程阶段依赖-三天方案-1672x941.png'), Buffer.from(shot.data, 'base64'));
    await evaluate(`(() => { const e=JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0]; const semi=e.scheduleRows.find(x=>x.round==='半决赛'); semi.time='2026-08-19 09:00'; localStorage.setItem('sxf_tournament_spaces_v2',JSON.stringify([e])); location.reload(); })()`);
    await wait(900);
    await assert('已有阶段倒置赛程会显示强提醒', `document.querySelector('.schedule-feasibility-alert')?.textContent.includes('阶段倒置')`);
    await click('[data-action="save-calendar-schedule"]');
    await assert('阶段倒置赛程禁止保存', `document.getElementById('toast')?.textContent.includes('小组赛尚未全部结束')`);
    process.stdout.write('赛程阶段依赖验证完成。\n');
  } finally {
    if (socket?.readyState === WebSocket.OPEN) socket.close();
    browser.kill();
  }
}

run().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
