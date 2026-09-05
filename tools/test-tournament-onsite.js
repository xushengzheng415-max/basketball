const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const debugPort = 9362;
const profileDir = path.join(process.env.TEMP || process.cwd(), `sxf-onsite-${Date.now()}`);
const outputDir = path.resolve(__dirname, '..', 'outputs', '赛事中心验证');
const url = 'http://127.0.0.1:5174/tournament-center.html?demo=1&v=20260814#onsite/people';
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function run() {
  const browser = spawn(edgePath, [`--remote-debugging-port=${debugPort}`, `--user-data-dir=${profileDir}`, '--headless=new', '--disable-gpu', '--no-first-run', '--window-size=1672,941', url], { stdio: 'ignore' });
  let socket;
  try {
    let targets;
    for (let index = 0; index < 80; index += 1) {
      try { targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json(); break; } catch (_) { await wait(100); }
    }
    const page = targets?.find((target) => target.type === 'page' && target.url.includes('tournament-center.html'));
    if (!page) throw new Error('未找到现场执行页面');
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
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const taskId = ++id;
      pending.set(taskId, { resolve, reject });
      socket.send(JSON.stringify({ id: taskId, method, params }));
    });
    const evaluate = async (expression) => {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || '页面执行失败');
      return result.result.value;
    };
    const assert = async (label, expression) => {
      if (!await evaluate(expression)) throw new Error(`断言失败：${label}`);
      process.stdout.write(`通过：${label}\n`);
    };
    const click = async (selector) => { await evaluate(`document.querySelector(${JSON.stringify(selector)})?.click()`); await wait(260); };
    await send('Runtime.enable');
    await wait(300);
    await evaluate(`(() => {
      const rows = [
        {id:'M001',time:'2026-08-14 09:00',phase:'小组赛',round:'第 1 轮',group:'U8 启蒙组 · A组',subgroup:'A组',home:'洛杉矶公牛',away:'测试43',venue:'浦东体育中心 · 球场 1',state:'待开始',scheduleVersion:6},
        {id:'M002',time:'2026-08-14 09:00',phase:'小组赛',round:'第 1 轮',group:'U8 启蒙组 · B组',subgroup:'B组',home:'测试1',away:'测试85',venue:'浦东体育中心 · 球场 2',state:'待开始',scheduleVersion:6},
        {id:'M003',time:'2026-08-14 14:00',phase:'小组赛',round:'第 2 轮',group:'U8 启蒙组 · A组',subgroup:'A组',home:'洛杉矶公牛',away:'frank',venue:'浦东体育中心 · 球场 1',state:'待开始',scheduleVersion:6},
        {id:'M004',time:'2026-08-15 09:00',phase:'淘汰赛',round:'半决赛',group:'U8 启蒙组',home:'A组第一',away:'B组第二',venue:'浦东体育中心 · 球场 1',state:'待开始',scheduleVersion:6}
      ];
      const event = {id:'onsite-e2e',name:'现场执行验证',state:'进行中',startDate:'2026-08-14',endDate:'2026-08-15',firstGroup:'U8 启蒙组',teams:8,matches:rows.length,scheduleRows:rows,groupRows:[{id:'u8',name:'U8 启蒙组',target:8,joined:8,status:'已确认',competitionConfig:{preset:'group-knockout'}}],registrationTeams:[],workflow:{teamsImported:true,qualificationCompleted:true,drawSaved:true,scheduleGenerated:true,venuesConfigured:true,onsiteAssigned:false,executionReturned:false},onsitePeople:[{id:'person-scorer',name:'张伟',source:'内部教练',roles:['scorer']},{id:'person-recorder',name:'李娜',source:'外请人员',roles:['recorder']},{id:'person-mc',name:'陈晨',source:'内部教练',roles:['mc']}],venueSettings:{availability:{startDate:'2026-08-14',endDate:'2026-08-15'},venues:[]}};
      localStorage.setItem('sxf_tournament_spaces_v2', JSON.stringify([event]));
      localStorage.setItem('sxf_tournament_selected_space_v2', event.id);
      location.hash='#onsite/people'; location.reload();
    })()`);
    await wait(1200);
    fs.mkdirSync(outputDir, { recursive: true });
    const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(outputDir, '现场执行-按赛程任务-1672x941.png'), Buffer.from(screenshot.data, 'base64'));
    await assert('现场执行按已保存赛程载入全部场次', `document.querySelector('.onsite-schedule-note')?.textContent.includes('4') && document.querySelectorAll('.onsite-task-list tbody tr[data-match]').length === 3`);
    await assert('现场执行默认按第一比赛日筛选', `document.querySelector('[data-onsite-filter="date"]')?.value === '2026-08-14' && document.querySelector('.onsite-task-list header span')?.textContent.includes('3')`);
    await assert('现场执行展示阶段轮次与场地', `document.querySelectorAll('.onsite-task-list tbody tr[data-match] td:nth-child(2) small').length === 3 && document.querySelector('.onsite-task-list tbody')?.textContent.includes('球场 2')`);
    await assert('现场执行组别筛选不拆分 A/B 子组', `(() => { const options=[...document.querySelectorAll('[data-onsite-filter="group"] option')].map((item)=>item.textContent); return options.includes('U8 启蒙组') && !options.some((item)=>/A组|B组/.test(item)); })()`);
    await evaluate(`(() => { const select=document.querySelector('[data-onsite-filter="group"]'); select.value='U8 启蒙组'; select.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await wait(300);
    await assert('现场执行组别筛选实时生效', `document.querySelectorAll('.onsite-task-list tbody tr[data-match]').length === 3 && document.querySelector('.onsite-task-list tbody')?.textContent.includes('M002')`);
    await evaluate(`(() => { const row=document.querySelector('.onsite-task-list tbody tr[data-match="M002"]'); row?.click(); })()`);
    await wait(250);
    await evaluate(`(() => { const select=document.querySelector('[data-onsite-operator-count]'); select.value='1'; select.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await wait(300);
    await assert('现场执行支持单人操作模式', `document.querySelectorAll('.onsite-assignment .onsite-seat-card').length === 1 && JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].onsiteAssignments.M002.operatorCount === 1`);
    await evaluate(`(() => { const select=document.querySelector('[data-onsite-operator-count]'); select.value='3'; select.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await wait(300);
    await assert('现场执行支持三人协作模式', `document.querySelectorAll('.onsite-assignment .onsite-seat-card').length === 3 && document.querySelector('.onsite-seat-mode-hint')?.textContent.includes('3 人')`);
    await evaluate(`document.querySelector('[data-action="assign-match"]')?.click()`);
    await wait(250);
    await assert('现场执行分配人员打开真实场次弹窗', `document.querySelector('[data-onsite-assignment-form]')?.dataset.matchId === 'M002'`);
    await assert('更换岗位提供岗位下拉菜单', `document.querySelectorAll('[data-onsite-role-select] option').length === 3 && [...document.querySelectorAll('[data-onsite-role-select] option')].map((item)=>item.textContent).join('、').includes('MC')`);
    await evaluate(`(() => { const source=document.querySelector('[data-onsite-assignment-form] [name="source"]'); const person=document.querySelector('[data-onsite-assignment-form] [name="person"]'); source.value='内部教练'; source.dispatchEvent(new Event('change',{bubbles:true})); person.value='张伟'; person.dispatchEvent(new Event('change',{bubbles:true})); document.querySelector('[data-action="confirm-assign"]')?.click(); })()`);
    await wait(350);
    await assert('现场执行保存岗位绑定到对应场次', `JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].onsiteAssignments.M002.scorer === '张伟'`);
    await evaluate(`(() => { const select=document.querySelector('[data-onsite-filter="group"]'); select.value=''; select.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await wait(250);
    await click('[data-action="save-assignment"]');
    await assert('现场执行保存后未完成任务仍提示待补齐', `document.getElementById('toast')?.textContent.includes('待补齐') && JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].workflow.onsiteAssigned === false`);
    await evaluate(`location.hash='#onsite/referees'`);
    await wait(350);
    await evaluate(`(() => { const toast=document.getElementById('toast'); if (toast) toast.hidden=true; })()`);
    const refereeScreenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(outputDir, '现场执行-裁判名单-1672x941.png'), Buffer.from(refereeScreenshot.data, 'base64'));
    await assert('现场执行提供本届赛事裁判名单', `document.querySelector('.referee-page') && document.querySelectorAll('.referee-list-panel tbody tr[data-referee-id]').length >= 3`);
    await click('[data-action="add-referee"]');
    await assert('新增人员支持多岗位能力选择', `document.querySelectorAll('[data-referee-form] input[name="roles"]').length === 3`);
    await evaluate(`(() => { const form=document.querySelector('[data-referee-form]'); form.querySelector('[name="name"]').value='多能现场员'; form.querySelector('[name="phone"]').value='137****8899'; form.querySelector('[name="source"]').value='内部人员'; form.querySelector('[name="roles"][value="scorer"]').checked=true; form.querySelector('[name="roles"][value="mc"]').checked=true; document.querySelector('[data-action="confirm-add-referee"]')?.click(); })()`);
    await wait(350);
    await assert('多岗位人员同步进入现场人员名单', `(() => { const event=JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0]; const ref=event.referees.find((item)=>item.name==='多能现场员'); const person=event.onsitePeople.find((item)=>item.name==='多能现场员'); return ref && ref.roles.includes('scorer') && ref.roles.includes('mc') && person && person.roles.length===2; })()`);
    await assert('点击人员可查看当前可安排任务', `document.querySelector('.referee-available-task-panel')?.textContent.includes('当前可安排的工作任务')`);
    await evaluate(`(() => { const row=[...document.querySelectorAll('.referee-list-panel tbody tr[data-referee-id]')].find((item)=>item.textContent.includes('多能现场员')); row?.querySelector('[data-action="edit-referee"]')?.click(); })()`);
    await wait(200);
    await evaluate(`(() => { const form=document.querySelector('[data-referee-editor]'); form.querySelector('[name="name"]').value='多能现场员-已编辑'; document.querySelector('[data-action="confirm-edit-referee"]')?.click(); })()`);
    await wait(300);
    await assert('人员编辑同步更新岗位名单', `JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].referees.some((item)=>item.name==='多能现场员-已编辑') && JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].onsitePeople.some((item)=>item.name==='多能现场员-已编辑')`);
    await evaluate(`(() => { const row=[...document.querySelectorAll('.referee-list-panel tbody tr[data-referee-id]')].find((item)=>item.textContent.includes('多能现场员-已编辑')); row?.querySelector('[data-action="delete-referee"]')?.click(); })()`);
    await wait(200);
    await click('[data-action="confirm-delete-referee"]');
    await assert('人员删除同步清理名单', `(() => { const event=JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0]; return !event.referees.some((item)=>item.name==='多能现场员-已编辑') && !event.onsitePeople.some((item)=>item.name==='多能现场员-已编辑'); })()`);
    await click('[data-action="bind-referee"]');
    await assert('裁判绑定支持 1 至 3 人裁判组', `document.querySelectorAll('[data-referee-binding-form] input[name="refereeIds"]').length >= 3`);
    await evaluate(`(() => { const boxes=[...document.querySelectorAll('[data-referee-binding-form] input[name="refereeIds"]')]; boxes.forEach((box,index)=>{ box.checked=index===0 || index===2; }); document.querySelector('[data-action="confirm-bind-referee"]')?.click(); })()`);
    await wait(350);
    await assert('裁判组绑定后直接发送比赛任务', `(() => { const assignment=JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].refereeAssignments?.M001; return assignment && assignment.refereeIds.length===2 && assignment.taskStatus==='任务已发送'; })()`);
    await evaluate(`location.hash='#onsite/bindings'`);
    await wait(350);
    await assert('技术台人员绑定入口已合并到人员与任务', `location.hash === '#onsite/people' && !document.querySelector('.subnav')?.textContent.includes('技术台人员绑定') && document.querySelector('.onsite-people-page')`);
    await evaluate(`location.hash='#onsite/consoles'`);
    await wait(350);
    await assert('控制台状态读取当前真实赛程', `document.querySelector('.console-live-summary')?.textContent.includes('4 场') && document.querySelector('.console-grid')?.textContent.includes('M001') && !document.querySelector('.console-grid')?.textContent.includes('G1001')`);
    await click('[data-action="view-console"]');
    await assert('控制台查看可打开连接详情', `document.querySelector('.modal-layer')?.textContent.includes('连接延迟') && document.querySelector('.modal-layer')?.textContent.includes('仅查看连接')`);
    await click('[data-action="close-modal"]');
    await evaluate(`location.hash='#results/review'`);
    await wait(400);
    await assert('赛果复核读取真实赛程场次', `document.querySelector('.results-review-page')?.textContent.includes('M001') && document.querySelectorAll('.results-list tbody tr.result-row').length === 4`);
    await assert('赛果复核提供全部场次下拉', `document.querySelectorAll('[data-result-match-picker] option').length === 4 && document.querySelector('[data-result-match-picker]')?.textContent.includes('M004')`);
    await assert('赛果复核不重复展示淘汰赛晋级图', `!document.querySelector('.knockout-bracket-panel')`);
    await assert('未录入比分场次不显示已复核', `[...document.querySelectorAll('.result-row')].every((row) => row.textContent.includes('录入比分') && !row.textContent.includes('已复核') && !row.textContent.includes('已生效'))`);
    await assert('赛果列表优先展示且支持独立滚动', `(() => { const list=document.querySelector('.results-list'); const metrics=document.querySelector('.review-metrics'); return getComputedStyle(list).overflowY==='auto' && Boolean(list.compareDocumentPosition(metrics) & Node.DOCUMENT_POSITION_FOLLOWING); })()`);
    await evaluate(`(() => { const select=document.querySelector('[data-result-match-picker]'); select.value='M004'; select.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await wait(250);
    await assert('场次下拉可切换淘汰赛场次', `document.querySelector('.result-detail')?.textContent.includes('M004')`);
    await click('[data-action="test-return-results"]');
    await wait(250);
    await assert('模拟现场回传生成逐场比分', `(() => { const event=JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0]; return event.resultRecords?.M001?.scoreReady === true && event.resultRecords?.M001?.source === '现场计分台'; })()`);
    await assert('现场比分只保留明确复核按钮', `document.querySelectorAll('[data-action="approve-result"]').length > 0 && document.querySelector('[data-action="approve-result"]')?.textContent.trim()==='复核' && ![...document.querySelectorAll('th')].some((item)=>item.textContent.trim()==='复核状态')`);
    await evaluate(`(() => { document.head.insertAdjacentHTML('beforeend','<style id="result-scroll-test">.results-list{height:190px!important}</style>'); const list=document.querySelector('.results-list'); list.scrollTop=120; window.__resultListScrollTop=list.scrollTop; })()`);
    await click('[data-action="edit-result"]');
    await evaluate(`(() => { const form=document.querySelector('[data-result-editor]'); form.querySelector('[name="homeScore"]').value='88'; form.querySelector('[name="awayScore"]').value='76'; form.querySelector('[name="note"]').value='后台依据裁判签字单修正'; document.querySelector('[data-action="save-result-record"]')?.click(); })()`);
    await wait(350);
    await assert('后台手动修正比分并免复核生效', `(() => { const event=JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0]; return event.resultRecords.M001.homeScore===88 && event.resultRecords.M001.awayScore===76 && event.scheduleRows.find((item)=>item.id==='M001').state==='已结束' && event.resultRecords.M001.reviewStatus==='approved' && event.resultRecords.M001.history.length>=2 && document.querySelector('.result-row.selected')?.textContent.includes('已生效'); })()`);
    await assert('录入比分后停留原场次与列表位置', `(() => { const list=document.querySelector('.results-list'); return document.querySelector('.result-row.selected')?.dataset.match==='M001' && Math.abs(list.scrollTop-window.__resultListScrollTop)<3; })()`);
    await click('[data-action="approve-result"][data-match="M002"]');
    await assert('现场回传比分点击复核后更新状态', `JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].resultRecords.M002.reviewStatus === 'approved'`);
    await evaluate(`(() => { const spaces=JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2')); spaces[0].groupRows[0].competitionConfig = Object.assign({}, spaces[0].groupRows[0].competitionConfig, { points: { win: 3, draw: 1, loss: 0 } }); localStorage.setItem('sxf_tournament_spaces_v2', JSON.stringify(spaces)); location.hash='#results/standings'; location.reload(); })()`);
    await wait(850);
    await assert('积分榜按赛制拆分 A/B 小组', `document.querySelectorAll('.standings-table').length === 2 && document.querySelector('.standings-table')?.closest('.panel')?.textContent.includes('A组积分榜') && document.querySelectorAll('.standings-matrix-panel').length === 2`);
    await assert('积分与球队内展示淘汰赛对阵图', `document.querySelector('.knockout-bracket-panel')?.textContent.includes('淘汰赛对阵图') && document.querySelectorAll('.bracket-pair').length === 1`);
    await assert('积分榜球队行不显示确认文字', `![...document.querySelectorAll('.standings-table .team-row')].some((item) => item.textContent.includes('已确认') || item.textContent.includes('等待赛果'))`);
    await assert('现场比分即时进入积分试算', `document.querySelector('.standings-provisional-tag') && document.querySelector('.filter-summary')?.textContent.includes('场试算') && document.querySelector('.matrix-score.is-provisional')`);
    await assert('赛果矩阵突出显示胜方得分', `(() => { const lines=[...document.querySelectorAll('.matrix-scoreline')]; return lines.length>0 && lines.every((line)=>line.querySelectorAll('.is-winner').length===1) && getComputedStyle(lines[0].querySelector('.is-winner')).color!==getComputedStyle(lines[0].querySelector('span:not(.is-winner)')).color; })()`);
    await assert('积分与矩阵展示当前组别积分规则', `[...document.querySelectorAll('.matrix-legend')].every((item) => /胜|平|负/.test(item.textContent)) && [...document.querySelectorAll('.info-banner')].some((item) => item.textContent.includes('积分规则'))`);
    await assert('积分矩阵使用左上至右下连续对角线', `(() => { const cells=[...document.querySelectorAll('.standings-matrix td.matrix-diagonal')]; return cells.length > 0 && getComputedStyle(cells[0], '::before').backgroundImage.includes('right bottom'); })()`);
    await assert('积分页提供赛果复核入口', `document.querySelector('[data-action="go-results-review"]')?.textContent.includes('前往赛果复核')`);
    await assert('淘汰赛不进入小组积分矩阵', `![...document.querySelectorAll('.standings-matrix-panel h3')].some((item) => item.textContent.includes('半决赛') || item.textContent.includes('决赛'))`);
    await evaluate(`location.hash='#results/review'`);
    await wait(350);
    await click('[data-action="set-result-view"][data-view="poster"]');
    await assert('赛果复核内置图片战报视图', `document.querySelector('.result-poster') && document.querySelector('.result-poster-match')`);
    await evaluate(`location.hash='#results/reports'`);
    await wait(350);
    await click('[data-action="open-report-layout"]');
    await evaluate(`(() => { const form=document.querySelector('[data-report-layout]'); form.querySelector('[name="title"]').value='8月14日赛事战报'; form.querySelector('[name="qrUrl"]').value='https://example.com/official-qr.png'; document.querySelector('[data-action="save-report-layout"]')?.click(); })()`);
    await wait(350);
    await assert('赛事战报版面保存二维码与标题', `(() => { const settings=JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].resultReportSettings; return settings.title==='8月14日赛事战报' && settings.qrUrl.includes('official-qr.png'); })()`);
    await evaluate(`(() => { const spaces=JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2')); spaces.forEach((event) => { event.participationMode='team-only'; }); localStorage.setItem('sxf_tournament_spaces_v2',JSON.stringify(spaces)); location.hash='#onsite/consoles'; location.reload(); })()`);
    await wait(1000);
    await assert('仅球队模式隐藏球员数据任务', `!document.querySelector('.subnav')?.textContent.includes('球员数据任务')`);
    process.stdout.write('现场执行回归验证完成。\n');
  } finally {
    if (socket?.readyState === WebSocket.OPEN) socket.close();
    browser.kill();
  }
}

run().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
