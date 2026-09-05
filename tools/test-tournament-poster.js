const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9335;
const profileDir = path.join(process.env.TEMP || process.cwd(), `sxf-poster-e2e-${Date.now()}`);
const outputDir = path.resolve(__dirname, '..', 'outputs', '赛事中心验证');
const url = 'http://127.0.0.1:5174/tournament-center.html?demo=1#spaces';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function poll(route) {
  for (let i = 0; i < 100; i += 1) {
    try { const response = await fetch(`http://127.0.0.1:${port}${route}`); if (response.ok) return response.json(); } catch (error) {}
    await delay(100);
  }
  throw new Error('浏览器启动超时');
}

async function run() {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = spawn(edgePath, [`--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`, '--headless=new', '--disable-gpu', '--no-first-run', '--window-size=1670,941', url], { stdio:'ignore' });
  let socket;
  try {
    const page = (await poll('/json/list')).find(item => item.type === 'page');
    socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
    let id = 0; const pending = new Map(); const consoleErrors = [];
    socket.on('message', data => { const message=JSON.parse(data); if(message.id&&pending.has(message.id)){const p=pending.get(message.id);pending.delete(message.id);message.error?p.reject(new Error(message.error.message)):p.resolve(message.result);} if(message.method==='Runtime.consoleAPICalled'&&message.params.type==='error')consoleErrors.push(message.params.args.map(x=>x.value||x.description||'').join(' ')); });
    const send=(method,params={})=>new Promise((resolve,reject)=>{const call=++id;pending.set(call,{resolve,reject});socket.send(JSON.stringify({id:call,method,params}));});
    const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
    const waitFor=async expression=>{for(let i=0;i<100;i+=1){if(await evaluate(expression))return;await delay(100);}throw new Error(`等待条件超时：${expression}`);};
    const screenshot=async(name,width,height)=>{await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await delay(400);const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});const file=path.join(outputDir,name);fs.writeFileSync(file,Buffer.from(shot.data,'base64'));return file;};
    await send('Runtime.enable'); await send('Page.enable');
    await waitFor('Boolean(window.SXFPosterStudio && window.fabric && window.QRCode)');
    await evaluate(`(() => { const event={id:'poster-test-2026',name:'蜂动暑期篮球邀请赛',state:'筹备中',stateClass:'blue',groups:1,teams:0,matches:0,startDate:'2026-08-10',endDate:'2026-08-24',progress:0,logo:'http://127.0.0.1:5174/assets/tournaments/summer-league-2026.png',logoBackground:'dark',regionLabel:'上海市 · 浦东新区',groupRows:[{name:'U12 竞技组',birthCutoff:'2014-01-01',format:'5V5',competition:'小组循环 + 淘汰赛',target:8,joined:0,status:'筹备中'}],isBlank:true,workflow:{profileSaved:true,groupsConfigured:true,registrationConfigured:false,teamsImported:false,qualificationCompleted:false,drawCompleted:false,drawSaved:false,venuesConfigured:false,scheduleGenerated:false,onsiteAssigned:false,executionReturned:false,resultsApproved:false,finished:false},testTeams:[]}; localStorage.setItem('sxf_tournament_spaces_v2',JSON.stringify([event]));localStorage.setItem('sxf_tournament_selected_space_v2',event.id);location.hash='event/registration';location.reload();return true;})()`);
    await waitFor(`Boolean(document.querySelector('[data-registration-form]'))`);
    await evaluate(`document.querySelector('[data-registration-form] [name="feeAmount"]').value='388';document.querySelector('[data-action="save-page"]').click()`);
    await waitFor(`JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].posterIds?.length===1`);
    await evaluate(`location.hash='event/posters'`);
    await waitFor(`Boolean(document.querySelector('.poster-editor-shell') && document.querySelector('.canvas-container'))`);
    await delay(1200);
    const textEdit = await evaluate(`(() => { const button=[...document.querySelectorAll('[data-layer-select]')].find(x=>x.textContent.includes('奖项说明'));button.click();const editor=document.querySelector('[data-prop-text]');const enabled=!editor.disabled;editor.value='冠军组奖金 1888 元';editor.dispatchEvent(new Event('input',{bubbles:true}));editor.dispatchEvent(new Event('change',{bubbles:true}));return {enabled,value:editor.value};})()`);
    const assertions = await evaluate(`(() => ({templates:document.querySelectorAll('.poster-template').length,canvasWidth:document.querySelector('#posterFabricCanvas').width,canvasHeight:document.querySelector('#posterFabricCanvas').height,drafts:document.querySelectorAll('.poster-draft').length,layers:document.querySelectorAll('.poster-layer').length,hasQr:[...document.querySelectorAll('.poster-layer')].some(x=>x.textContent.includes('报名二维码')),hasTextEditor:Boolean(document.querySelector('[data-prop-text]')),posterIds:JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].posterIds.length}))()`);
    await evaluate(`document.querySelector('[data-template="black-orange"]').click()`); await delay(800);
    await evaluate(`document.querySelector('[data-poster-action="add-text"]').click()`); await delay(200);
    await evaluate(`(() => { const editor=document.querySelector('[data-prop-text]');editor.value='SAVE-RESTORE-2026';editor.dispatchEvent(new Event('input',{bubbles:true}));editor.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('[data-poster-action="save"]').click();return true;})()`); await delay(700);
    const savedPosterState = await evaluate(`(() => { const event=JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0];return {lastPosterId:event.lastPosterId,posterId:event.posterIds[0]};})()`);
    await evaluate(`location.hash='event/profile'`);
    await waitFor(`Boolean(document.querySelector('[data-event-profile-form]'))`);
    await evaluate(`location.hash='event/posters'`);
    await waitFor(`Boolean(document.querySelector('.poster-editor-shell') && document.querySelector('.canvas-container'))`);
    await delay(900);
    const restoredPosterState = await evaluate(`(() => { const layer=[...document.querySelectorAll('[data-layer-select]')].find(x=>x.textContent.includes('\u81ea\u5b9a\u4e49\u6587\u5b57'));if(layer)layer.click();return {text:document.querySelector('[data-prop-text]')?.value||'',activeDraft:Boolean(document.querySelector('.poster-draft.active')),lastPosterId:JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].lastPosterId};})()`);
    const shot1670=await screenshot('报名海报编辑器-1670x941-v1.png',1670,941);
    const shot1440=await screenshot('报名海报编辑器-1440x900-v1.png',1440,900);
    const passed=assertions.templates===5&&assertions.canvasWidth===1080&&assertions.canvasHeight===1920&&assertions.drafts===1&&assertions.layers>=9&&assertions.hasQr&&assertions.hasTextEditor&&textEdit.enabled&&textEdit.value==='冠军组奖金 1888 元'&&assertions.posterIds===1&&savedPosterState.lastPosterId===savedPosterState.posterId&&restoredPosterState.activeDraft&&restoredPosterState.lastPosterId===savedPosterState.posterId&&restoredPosterState.text==='SAVE-RESTORE-2026'&&!consoleErrors.length;
    console.log(JSON.stringify({passed,assertions,textEdit,savedPosterState,restoredPosterState,consoleErrors,screenshots:[shot1670,shot1440]},null,2));
    if(!passed)process.exitCode=1;
  } finally { if(socket)socket.close();browser.kill(); }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
