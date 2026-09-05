const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const debugPort = 9351;
const profileDir = path.join(process.env.TEMP || process.cwd(), `sxf-competition-schedule-${Date.now()}`);
const outputDir = path.resolve(__dirname, '..', 'outputs', '赛事中心验证');
const url = 'http://127.0.0.1:5174/tournament-center.html?demo=1#schedule/matches';
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function run() {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = spawn(edgePath, [`--remote-debugging-port=${debugPort}`, `--user-data-dir=${profileDir}`, '--headless=new', '--disable-gpu', '--no-first-run', '--window-size=1440,900', url], { stdio: 'ignore' });
  let socket;
  try {
    let targets;
    for (let index = 0; index < 80; index += 1) {
      try { targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json(); break; } catch (_) { await wait(100); }
    }
    const page = targets?.find((target) => target.type === 'page' && target.url.includes('tournament-center.html'));
    if (!page) throw new Error('未找到竞赛日程页面');
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
    const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.value;
    const assert = async (label, expression) => { if (!await evaluate(expression)) throw new Error(`断言失败：${label}`); process.stdout.write(`通过：${label}\n`); };
    await send('Runtime.enable');
    await wait(300);
    await evaluate(`(() => {
      const names = ['洛杉矶公牛','测试2','frank','测试43','测试1','测试4','测试5','测试85'];
      const matches = Array.from({ length: 12 }, (_, index) => ({
        id: 'M' + String([1,3,2,4,5,7,6,8,9,11,10,12][index]).padStart(3,'0'),
        time: '2026-08-13 ' + (index < 4 ? '09:00' : index < 8 ? '10:15' : '14:00'),
        phase: '小组赛', round: '第 ' + (Math.floor(index / 4) + 1) + ' 轮',
        group: 'U8 启蒙组 · ' + (index % 2 ? 'B组' : 'A组'), subgroup: index % 2 ? 'B组' : 'A组',
        home: names[index % 8], away: names[(index + 3) % 8], venue: '浦东体育中心 · 球场 ' + (index % 2 + 1), state: '待开始', scheduleVersion: 4
      }));
      matches.push(
        { id:'M013',time:'2026-08-13 15:15',phase:'淘汰赛',round:'半决赛',group:'U8 启蒙组',home:'半决赛待定 1',away:'半决赛待定 2',venue:'浦东体育中心 · 球场 1',state:'待开始',scheduleVersion:4 },
        { id:'M014',time:'2026-08-13 15:15',phase:'淘汰赛',round:'半决赛',group:'U8 启蒙组',home:'半决赛待定 3',away:'半决赛待定 4',venue:'浦东体育中心 · 球场 2',state:'待开始',scheduleVersion:4 },
        { id:'M015',time:'2026-08-13 16:30',phase:'淘汰赛',round:'三、四名决赛',group:'U8 启蒙组',home:'待定1',away:'待定2',venue:'浦东体育中心 · 球场 1',state:'待开始',scheduleVersion:4 },
        { id:'M016',time:'2026-08-13 16:30',phase:'淘汰赛',round:'决赛',group:'U8 启蒙组',home:'待定1',away:'待定2',venue:'浦东体育中心 · 球场 2',state:'待开始',scheduleVersion:4 }
      );
      const u9Names = ['青禾小鹿','云朵白兔','彩虹松鼠','橙光小熊','蓝湾海豚','晨曦猎豹','星河企鹅','星芽火箭'];
      const u9LegacyRows = Array.from({ length: 12 }, (_, index) => ({
        id:'M'+String(17+index).padStart(3,'0'), time:'2026-08-'+(index < 4 ? '20' : index < 8 ? '21' : '22')+' '+['09:00','09:50','10:40','14:00'][index%4],
        phase:index < 4 ? '淘汰赛' : '排位赛', round:index < 4 ? '8强赛' : index < 8 ? '1—4名、5—8名排位赛' : '各名次决赛',
        group:'U9 男子组', competitionGroup:'U9 男子组',
        home:index < 4 ? u9Names[index*2] : index < 8 ? '首轮胜者线 1 待定 1' : '第 1 名待定',
        away:index < 4 ? u9Names[index*2+1] : index < 8 ? '首轮胜者线 2 待定 2' : '第 2 名待定',
        venue:'浦东体育中心 · 球场 2', state:'待开始', scheduleVersion:4, competitionSerial:index+1
      }));
      matches.push(...u9LegacyRows);
      matches.push({ id:'M029',time:'2026-08-14 10:00',phase:'循环赛',round:'第 1 轮',group:'U12 女子组',competitionGroup:'U12 女子组',home:'全部球队单循环待定 1',away:'全部球队单循环待定 2',venue:'浦东体育中心 · 球场 3',state:'待开始',scheduleVersion:4,competitionSerial:1 });
      const registrationTeams = names.map((name, index) => ({ id:'TEAM-'+index,name,group:'U8 启蒙组',claimStatus:'已认领',teamQualificationStatus:'已通过',players:[] }));
      const event = { id:'competition-sheet-e2e',name:'测试',state:'进行中',startDate:'2026-08-13',endDate:'2026-08-22',firstGroup:'U8 启蒙组',groupRows:[{name:'U8 启蒙组',target:8,joined:8,status:'已确认'},{id:'u9-men',name:'U9 男子组',target:8,joined:8,status:'已确认',competition:'单败淘汰',competitionConfig:{preset:'knockout',formatType:'knockout',stages:[]}},{id:'u12-women',name:'U12 女子组',target:8,joined:8,status:'已确认',competition:'全部球队单循环',competitionConfig:{preset:'round-robin',formatType:'single-round',stages:[{id:'single-round',name:'全部球队单循环',type:'single-round'}]}}],drawStates:{'u12-women':{order:['山岳野牛','曜石黑豹','松林灰狼','深海章鱼','烈火战马','银河闪电','凌云先锋','金穗雄狮'],saved:true}},registrationTeams,teams:24,matches:29,scheduleRows:matches,workflow:{teamsImported:true,qualificationCompleted:true,drawSaved:true,scheduleGenerated:true,venuesConfigured:true} };
      localStorage.setItem('sxf_tournament_spaces_v2', JSON.stringify([event]));
      localStorage.setItem('sxf_tournament_selected_space_v2', event.id);
      location.hash='#schedule/matches'; location.reload();
    })()`);
    await wait(1600);
    await assert('导航与页面统一命名为竞赛日程', `document.body.textContent.includes('竞赛日程') && [...document.querySelectorAll('[data-route="schedule/matches"]')].some(node => node.textContent.includes('竞赛日程'))`);
    await assert('静态规程不再提供组别和排序下拉框', `!document.querySelector('[data-match-sheet-filter="group"]') && !document.querySelector('[data-match-sheet-sort]')`);
    await assert('每个竞赛组别使用独立切换标签', `[...document.querySelectorAll('.schedule-group-tabs button')].map(node => node.dataset.group).join('|') === 'U8 启蒙组|U9 男子组|U12 女子组'`);
    await evaluate(`document.querySelector('.schedule-group-tabs [data-group="U9 男子组"]').click()`);
    await wait(100);
    await assert('切换后静态规程只显示当前组别', `document.querySelector('.competition-sheet-heading h2')?.textContent.includes('U9 男子组') && document.querySelectorAll('.competition-schedule-sheet tbody tr').length === 12 && !document.querySelector('.competition-schedule-sheet tbody')?.textContent.includes('洛杉矶公牛')`);
    await assert('旧版淘汰排位待定文案转换为场序胜负引用', `(() => { const text=document.querySelector('.competition-schedule-sheet tbody')?.textContent||''; return text.includes('场序1胜者') && text.includes('场序2胜者') && text.includes('场序3胜者') && text.includes('场序4胜者') && text.includes('场序1负者') && text.includes('场序2负者') && text.includes('场序5胜者') && text.includes('场序8负者') && !text.includes('首轮胜者线') && !text.includes('名待定'); })()`);
    await assert('淘汰全员排位逐场标明竞赛目的', `(() => { const text=[...document.querySelectorAll('.schedule-round-cell')].map(node=>node.textContent.trim()).join('|'); return text.includes('1/4决赛') && text.includes('半决赛') && text.includes('5-8名排位赛') && text.includes('决赛') && text.includes('3、4名决赛') && text.includes('5-6名排位赛') && text.includes('7-8名排位赛'); })()`);
    const placementShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    fs.writeFileSync(path.join(outputDir, 'U9全员排位-轮次目的拆分.png'), Buffer.from(placementShot.data, 'base64'));
    await evaluate(`document.querySelector('.schedule-group-tabs [data-group="U12 女子组"]').click()`);
    await wait(100);
    await assert('已保存循环排序时不再展示占位队名并给出重新排赛入口', `document.querySelector('.competition-sheet-heading h2')?.textContent.includes('U12 女子组') && !document.body.textContent.includes('全部球队单循环待定') && document.body.textContent.includes('已保存 8 支球队的循环排序') && document.body.textContent.includes('按循环排序重新排赛')`);
    await evaluate(`document.querySelector('.schedule-group-tabs [data-group="U8 启蒙组"]').click()`);
    await wait(100);
    await assert('两组全员排位使用交叉赛和名次赛', `(() => {
      const names = ['甲1','甲2','甲3','甲4','乙1','乙2','乙3','乙4'];
      const event = {
        id:'full-placement-e2e', name:'全员排位测试',
        groupRows:[{ id:'u8-men', name:'U8 男子组', target:8, competition:'小组循环 + 淘汰赛', groupCount:2, teamsPerGroup:4, advancePerGroup:2, competitionConfig:{ preset:'group-full-placement', formatType:'combined', groupCount:2, teamsPerGroup:4, advancePerGroup:2, stages:[] } }],
        registrationTeams:names.map((name,index)=>({ id:'P'+index,name,group:'U8 男子组',claimStatus:'已认领',teamQualificationStatus:'已通过' })),
        drawStates:{ 'u8-men':{ assignments:{ A:names.slice(0,4), B:names.slice(4) }, saved:true } }
      };
      const rows = window.__sxfScheduleDebug.scheduleBlueprint(event);
      const placement = rows.slice(12);
      return rows.length === 20
        && placement.length === 8
        && placement[0].home === 'A组第1' && placement[0].away === 'B组第2'
        && placement[1].home === 'B组第1' && placement[1].away === 'A组第2'
        && placement[2].home === 'A组第3' && placement[2].away === 'B组第4'
        && placement[3].home === 'B组第3' && placement[3].away === 'A组第4'
        && placement[6].round === '5、6名决赛' && placement[7].round === '7、8名决赛'
        && rows.find(row => row.round === '决赛')?.home === '场序13胜者'
        && rows.find(row => row.round === '决赛')?.away === '场序14胜者'
        && rows.find(row => row.round === '三、四名决赛')?.home === '场序13负者'
        && rows.find(row => row.round === '三、四名决赛')?.away === '场序14负者';
    })()`);
    await assert('16队和32队全员排位递归覆盖全部名次', `(() => {
      const verify=(teamCount)=>{
        const names=Array.from({length:teamCount},(_,index)=>'队伍'+String(index+1));
        const id='ko-'+teamCount;
        const event={id,groupRows:[{id,name:teamCount+'队组',target:teamCount,competition:'单败淘汰',competitionConfig:{preset:'knockout-full-placement',formatType:'knockout',stages:[]}}],registrationTeams:[],drawStates:{[id]:{seedOrder:names,saved:true}}};
        const rows=window.__sxfScheduleDebug.scheduleBlueprint(event);
        const expected=teamCount/2*Math.log2(teamCount);
        const slots=[...new Set(rows.map(row=>row.slot))];
        const referencesValid=rows.slice(teamCount/2).every(row=>/^场序\\d+(胜者|负者)$/.test(row.home)&&/^场序\\d+(胜者|负者)$/.test(row.away));
        return rows.length===expected && slots.length===Math.log2(teamCount)
          && slots.every(slot=>rows.filter(row=>row.slot===slot).length===teamCount/2)
          && referencesValid && rows.at(-1).round===(teamCount-1)+'-'+teamCount+'名排位赛';
      };
      return verify(16)&&verify(32);
    })()`);
    await assert('16队胜者线与负者线使用明确名次区间', `(() => {
      const names=Array.from({length:16},(_,index)=>'队伍'+(index+1)); const id='ko-label-16';
      const event={id,groupRows:[{id,name:'16队组',target:16,competition:'单败淘汰',competitionConfig:{preset:'knockout-full-placement',formatType:'knockout',stages:[]}}],registrationTeams:[],drawStates:{[id]:{seedOrder:names,saved:true}}};
      const labels=new Set(window.__sxfScheduleDebug.scheduleBlueprint(event).map(row=>row.round));
      return ['1/8决赛','1/4决赛','9-16名排位赛','半决赛','5-8名排位赛','9-12名排位赛','13-16名排位赛','决赛','3、4名决赛','5-6名排位赛','7-8名排位赛','9-10名排位赛','11-12名排位赛','13-14名排位赛','15-16名排位赛'].every(label=>labels.has(label));
    })()`);
    await assert('8队单循环前两轮符合确认顺序且28场不重复', `(() => {
      const order=['1','2','3','4','5','6','7','8'];
      const event={id:'round-robin-e2e',groupRows:[{id:'u12',name:'U12 女子组',target:8,competition:'全部球队单循环',competitionConfig:{preset:'round-robin',formatType:'single-round',stages:[{id:'single-round',name:'全部球队单循环',type:'single-round'}]}}],registrationTeams:[],drawStates:{u12:{order,saved:true}}};
      const rows=window.__sxfScheduleDebug.scheduleBlueprint(event);
      const round=(number)=>rows.filter(row=>row.round==='第 '+number+' 轮').map(row=>[row.home,row.away].sort().join('-')).sort().join('|');
      const pairs=new Set(rows.map(row=>[row.home,row.away].sort().join('-')));
      return rows.length===28 && pairs.size===28
        && round(1)==='1-2|3-4|5-6|7-8'
        && round(2)==='1-8|2-3|4-5|6-7';
    })()`);
    await assert('竞赛日程使用八列标准字段', `[...document.querySelectorAll('.competition-schedule-sheet thead th')].map(node => node.textContent.trim()).join('|') === '日期|时间|轮次|组别|分组|比赛队|场地|场序'`);
    await assert('场序按页面顺序连续编号', `[...document.querySelectorAll('.competition-schedule-sheet tbody tr')].map(row => row.lastElementChild.textContent.trim()).join(',') === Array.from({length:16},(_,index)=>index+1).join(',')`);
    await assert('半决赛使用小组名次表达', `document.querySelector('.competition-schedule-sheet tbody')?.textContent.includes('A组第一') && document.querySelector('.competition-schedule-sheet tbody')?.textContent.includes('B组第二')`);
    await assert('三四名与决赛引用半决赛场序', `document.querySelector('.competition-schedule-sheet tbody')?.textContent.includes('场序13负者') && document.querySelector('.competition-schedule-sheet tbody')?.textContent.includes('场序14负者') && document.querySelector('.competition-schedule-sheet tbody')?.textContent.includes('场序13胜者') && document.querySelector('.competition-schedule-sheet tbody')?.textContent.includes('场序14胜者')`);
    await assert('日期和轮次使用合并单元格', `document.querySelector('.schedule-date-cell')?.rowSpan === 16 && [...document.querySelectorAll('.schedule-round-cell')].some(node => node.rowSpan > 1)`);
    await assert('默认使用A4竖版预览', `document.querySelector('.competition-schedule-sheet')?.classList.contains('portrait') && document.querySelector('[data-orientation="portrait"]')?.classList.contains('active')`);
    await assert('竖版预览保持真实A4比例并保留整页高度', `(() => { const box = document.querySelector('.competition-schedule-sheet')?.getBoundingClientRect(); return box && Math.abs((box.width / box.height) - (210 / 297)) < 0.01 && box.height >= 1120; })()`);
    await assert('左上角场馆名已去除球场信息', `document.querySelector('.competition-sheet-venue b')?.textContent.trim() === '浦东体育中心'`);
    await assert('场地列只显示场地编号', `[...document.querySelectorAll('.schedule-court-cell')].every(node => ['1','2'].includes(node.textContent.trim()))`);
    await assert('场序列居中并缩窄', `(() => { const cell = document.querySelector('.schedule-serial-cell'); const teams = document.querySelector('.schedule-teams-cell'); return getComputedStyle(cell).textAlign === 'center' && cell.getBoundingClientRect().width < teams.getBoundingClientRect().width / 4; })()`);
    await evaluate(`(() => { const nativeCreate = URL.createObjectURL.bind(URL); window.__scheduleExportBlob = null; window.__scheduleExportName = ''; URL.createObjectURL = (blob) => { window.__scheduleExportBlob = blob; return nativeCreate(blob); }; HTMLAnchorElement.prototype.click = function () { window.__scheduleExportName = this.download; }; document.querySelector('[data-action="export-schedule-sheet"]').click(); })()`);
    await wait(800);
    await assert('导出表格使用当前A4竖版Excel样式', `(async () => { const bytes = new Uint8Array(await window.__scheduleExportBlob.arrayBuffer()); const book = new ExcelJS.Workbook(); await book.xlsx.load(bytes); const sheet = book.getWorksheet('竞赛日程'); return window.__scheduleExportName.endsWith('A4竖版.xlsx') && window.__scheduleExportBlob.type.includes('spreadsheetml') && bytes[0] === 80 && bytes[1] === 75 && sheet.pageSetup.orientation === 'portrait' && sheet.getCell('A2').value.includes('竞赛日程') && sheet.getCell('F18').value.includes('A组第一') && sheet.getCell('F20').value.includes('场序13负者'); })()`);
    const exportedWorkbook = await evaluate(`(async () => { const bytes = new Uint8Array(await window.__scheduleExportBlob.arrayBuffer()); let binary = ''; for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192)); return { name: window.__scheduleExportName, base64: btoa(binary) }; })()`);
    fs.writeFileSync(path.join(outputDir, exportedWorkbook.name), Buffer.from(exportedWorkbook.base64, 'base64'));
    const portraitShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(outputDir, '竞赛日程-A4竖版-1440x900.png'), Buffer.from(portraitShot.data, 'base64'));
    await evaluate(`document.querySelector('[data-orientation="landscape"]').click()`);
    await wait(100);
    await assert('可切换A4横版预览与打印方向', `document.querySelector('.competition-schedule-sheet')?.classList.contains('landscape') && document.getElementById('schedulePrintOrientation')?.textContent.includes('landscape')`);
    await assert('横版预览保持真实A4比例', `(() => { const box = document.querySelector('.competition-schedule-sheet')?.getBoundingClientRect(); return box && Math.abs((box.width / box.height) - (297 / 210)) < 0.01 && box.height >= 793; })()`);
    await evaluate(`document.querySelector('[data-action="export-schedule-sheet"]').click()`);
    await wait(800);
    await assert('横版导出同步切换Excel页面方向', `(async () => { const book = new ExcelJS.Workbook(); await book.xlsx.load(await window.__scheduleExportBlob.arrayBuffer()); return window.__scheduleExportName.endsWith('A4横版.xlsx') && book.getWorksheet('竞赛日程').pageSetup.orientation === 'landscape'; })()`);
    await assert('页面没有横向溢出', `document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1`);
    const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(outputDir, '竞赛日程-A4横版-1440x900.png'), Buffer.from(screenshot.data, 'base64'));
    process.stdout.write('竞赛日程验证完成。\n');
  } finally {
    if (socket?.readyState === WebSocket.OPEN) socket.close();
    browser.kill();
  }
}

run().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
