(() => {
  'use strict';
  const DB_NAME = 'sxf_tournament_posters_v1';
  const STORE = 'posters';
  const W = 1080;
  const H = 1920;
  const assetRoot = './assets/tournaments/posters/';
  const templates = [
    { id:'red-blue', name:'红蓝赛事竞技', file:'poster-red-blue.webp', accent:'#ffd85a', text:'#ffffff' },
    { id:'black-orange', name:'黑橙职业篮球', file:'poster-black-orange.webp', accent:'#ff7a00', text:'#ffffff' },
    { id:'blue-white', name:'蓝白青少年', file:'poster-blue-white.webp', accent:'#094c91', text:'#ffffff' },
    { id:'purple-3v3', name:'紫色霓虹 3V3', file:'poster-purple-3v3.webp', accent:'#f04bff', text:'#ffffff' },
    { id:'red-gold', name:'红金冠军荣誉', file:'poster-red-gold.webp', accent:'#ffe07b', text:'#ffffff' }
  ];
  let dbPromise;
  let mounted = null;
  let canvas = null;
  let undoStack = [];
  let redoStack = [];
  let restoring = false;

  function db() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath:'key' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return dbPromise;
  }
  async function getRecord(key) {
    const database = await db();
    return new Promise((resolve, reject) => {
      const request = database.transaction(STORE).objectStore(STORE).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }
  async function putRecord(value) {
    const database = await db();
    return new Promise((resolve, reject) => {
      const request = database.transaction(STORE, 'readwrite').objectStore(STORE).put(value);
      request.onsuccess = () => resolve(value);
      request.onerror = () => reject(request.error);
    });
  }
  async function deleteRecord(key) {
    const database = await db();
    return new Promise((resolve, reject) => {
      const request = database.transaction(STORE, 'readwrite').objectStore(STORE).delete(key);
      request.onsuccess = resolve;
      request.onerror = () => reject(request.error);
    });
  }
  function key(eventId, posterId) { return `${eventId}:${posterId}`; }
  function uid() { return `poster-${Date.now()}-${Math.random().toString(36).slice(2,7)}`; }
  function dateText(event) { return `${event.startDate || '待定'} 至 ${event.endDate || '待定'}`.replaceAll('-', '.'); }
  function groupText(event) {
    const rows = Array.isArray(event.groupRows) ? event.groupRows : [];
    return rows.length ? rows.map(row => `${row.name}${row.birthCutoff ? `（${row.birthCutoff}后）` : ''}`).join(' / ') : '竞赛组别待公布';
  }
  function dataMap(event, settings) {
    return {
      eventName:event.name || '篮球赛事', subtitle:settings.subtitle || '热血开赛 · 即刻集结', prize:settings.prize || '荣誉奖杯与赛事奖励',
      date:`比赛时间  ${dateText(event)}`, groups:`参赛组别  ${groupText(event)}`,
      fee:`报名费用  ${settings.feeMode === '免费' ? '免费' : `${settings.feeAmount || '待定'} ${settings.feeUnit || '元/队'}`}`,
      benefits:settings.benefits || '专业场地、裁判、赛事保障与影像服务',
      contact:`报名咨询  ${settings.contactName || '赛事负责人'}  ${settings.contactPhone || ''}`,
      location:`比赛地点  ${settings.publicLocation || event.regionLabel || '待公布'}`
    };
  }
  function makeRecord(event, settings, templateId = 'red-blue') {
    const id = uid();
    return { key:key(event.id,id), id, eventId:event.id, name:'默认报名海报', templateId, isPrimary:true, updatedAt:Date.now(), dataVersion:event.registrationDataVersion || 1, canvasJson:null, thumbnail:'', customBackground:'' };
  }
  async function ensureDefault(event, settings) {
    if (Array.isArray(event.posterIds) && event.posterIds.length) return event.posterIds[0];
    const record = makeRecord(event, settings);
    await putRecord(record);
    return record.id;
  }
  async function listRecords(event) {
    const ids = Array.isArray(event.posterIds) ? event.posterIds : [];
    return (await Promise.all(ids.map(id => getRecord(key(event.id,id))))).filter(Boolean);
  }
  function textObject(text, options, boundKey, name) {
    const object = new fabric.Textbox(text, Object.assign({fontFamily:'Microsoft YaHei, PingFang SC',fill:'#fff',fontWeight:'700',textAlign:'center',originX:'center',width:900,editable:true,cornerColor:'#ff7200',borderColor:'#ff7200',transparentCorners:false}, options));
    object.boundKey = boundKey;
    object.layerName = name;
    object.toObject = (function(toObject){ return function(){ return Object.assign(toObject.call(this), {boundKey:this.boundKey,layerName:this.layerName,locked:this.locked}); }; })(object.toObject);
    return object;
  }
  function enableTextEditing() {
    if (!canvas) return;
    canvas.getObjects().forEach(object => {
      if (typeof object.text === 'string') object.set({ editable:true });
    });
  }
  async function imageObject(url, options, name, boundKey='') {
    const image = await fabric.FabricImage.fromURL(url, {crossOrigin:'anonymous'});
    image.set(Object.assign({originX:'center',originY:'center',cornerColor:'#ff7200',borderColor:'#ff7200',transparentCorners:false}, options));
    image.layerName = name; image.boundKey = boundKey;
    image.toObject = (function(toObject){ return function(){ return Object.assign(toObject.call(this), {boundKey:this.boundKey,layerName:this.layerName,locked:this.locked}); }; })(image.toObject);
    return image;
  }
  const qrAdapter = {
    async create({eventId, page='pages/tournament-register/index', envVersion='develop'}) {
      const target = `https://www.sxfbasketball.cn/tournament/register?eventId=${encodeURIComponent(eventId)}&page=${encodeURIComponent(page)}&env=${envVersion}`;
      const url = await QRCode.toDataURL(target, {width:320,margin:4,errorCorrectionLevel:'H',color:{dark:'#101010',light:'#ffffff'}});
      return {ok:true,mode:'mock',eventId,page,envVersion,scene:`e=${eventId}`,fileID:'',url};
    }
  };
  async function qrData(event) {
    try { return (await qrAdapter.create({eventId:event.id})).url; }
    catch { return ''; }
  }
  async function buildTemplate(record, event, settings) {
    const theme = templates.find(item => item.id === record.templateId) || templates[0];
    canvas.clear(); canvas.backgroundColor = '#0a0d10';
    const backgroundUrl = record.customBackground || `${assetRoot}${theme.file}`;
    const bg = await imageObject(backgroundUrl, {left:W/2,top:H/2,selectable:false,evented:false}, '背景');
    bg.scaleToWidth(W); if (bg.getScaledHeight() < H) bg.scaleToHeight(H); canvas.add(bg); canvas.sendObjectToBack(bg);
    const map = dataMap(event, settings);
    if (event.logo) {
      const logo = await imageObject(event.logo, {left:W/2,top:180}, '赛事 Logo','logo');
      const max = 230; const scale = Math.min(max/logo.width,max/logo.height); logo.scale(scale); canvas.add(logo);
    }
    const common = theme.id === 'blue-white' ? {fill:'#073d71'} : {fill:theme.text,stroke:'#00000055',strokeWidth:2};
    canvas.add(textObject(map.eventName,{left:W/2,top:320,fontSize:72,lineHeight:1.12,...common},'eventName','赛事名称'));
    canvas.add(textObject(map.subtitle,{left:W/2,top:500,fontSize:32,fill:theme.accent,fontWeight:'600'},'subtitle','宣传副标题'));
    canvas.add(textObject(map.prize,{left:W/2,top:670,fontSize:58,fill:theme.accent,stroke:'#0008',strokeWidth:2},'prize','奖项说明'));
    canvas.add(textObject(map.date,{left:W/2,top:880,fontSize:35,...common},'date','比赛日期'));
    canvas.add(textObject(map.groups,{left:W/2,top:1010,fontSize:30,lineHeight:1.3,...common},'groups','参赛组别'));
    canvas.add(textObject(map.fee,{left:W/2,top:1210,fontSize:48,fill:theme.accent,stroke:'#0008',strokeWidth:2},'fee','报名费用'));
    canvas.add(textObject(map.benefits,{left:W/2,top:1330,fontSize:25,lineHeight:1.35,...common},'benefits','报名权益'));
    canvas.add(textObject(map.contact,{left:W/2,top:1475,fontSize:27,...common},'contact','联系方式'));
    const qr = await qrData(event); if (qr) { const q = await imageObject(qr,{left:W/2,top:1650},'报名二维码','qr'); q.scaleToWidth(220); canvas.add(q); }
    canvas.add(textObject(map.location,{left:W/2,top:1810,fontSize:28,...common},'location','比赛地点'));
    canvas.requestRenderAll();
  }
  function snapshot() { return JSON.stringify(canvas.toJSON(['boundKey','layerName','locked'])); }
  function pushHistory() { if (restoring || !canvas) return; const state=snapshot(); if (undoStack.at(-1)!==state) undoStack.push(state); if(undoStack.length>35)undoStack.shift(); redoStack=[]; }
  async function restore(state) { restoring=true; await canvas.loadFromJSON(state); enableTextEditing(); canvas.getObjects().forEach(o=>{if(o.locked){o.selectable=false;o.evented=false;}}); canvas.requestRenderAll(); restoring=false; refreshInspector(); }
  async function undo(){if(undoStack.length<2)return;redoStack.push(undoStack.pop());await restore(undoStack.at(-1));}
  async function redo(){if(!redoStack.length)return;const state=redoStack.pop();undoStack.push(state);await restore(state);}
  function activeRecord(){return mounted.records.find(item=>item.id===mounted.activeId);}
  async function saveCurrent(showToast=true) {
    const record=activeRecord(); if(!record||!canvas)return;
    record.canvasJson=canvas.toJSON(['boundKey','layerName','locked']); record.updatedAt=Date.now(); record.dataVersion=mounted.event.registrationDataVersion||1;
    record.thumbnail=canvas.toDataURL({format:'png',multiplier:.18}); await putRecord(record); mounted.event.lastPosterId=record.id; mounted.onPostersChange(mounted.records);
    renderDrafts(); if(showToast) mounted.toast('海报草稿已保存');
  }
  function syncBoundData(){const map=dataMap(mounted.event,mounted.settings);canvas.getObjects().forEach(o=>{if(o.boundKey&&map[o.boundKey]&&'text'in o)o.set('text',map[o.boundKey]);});canvas.requestRenderAll();pushHistory();}
  function refreshInspector(){
    if(!mounted)return;const root=mounted.root;const object=canvas?.getActiveObject();const name=root.querySelector('[data-prop-name]');const color=root.querySelector('[data-prop-color]');const size=root.querySelector('[data-prop-size]');
    const textInput=root.querySelector('[data-prop-text]');if(name)name.value=object?.layerName||'';if(textInput){const isText=typeof object?.text==='string';textInput.value=isText?object.text:'';textInput.disabled=!isText;textInput.placeholder=isText?'输入当前图层文字':'该图层不是文字图层';}if(color)color.value=(typeof object?.fill==='string'&&/^#[0-9a-f]{6}$/i.test(object.fill))?object.fill:'#ffffff';if(size)size.value=object?.fontSize||32;
    root.querySelectorAll('.poster-layer').forEach(row=>row.classList.toggle('active',row.dataset.uid===String(object?.__uid)));
  }
  function assignIds(){canvas.getObjects().forEach((o,i)=>{o.__uid=o.__uid||`${Date.now()}-${i}-${Math.random()}`;});}
  function renderLayers(){assignIds();const list=mounted.root.querySelector('[data-layer-list]');if(!list)return;list.innerHTML=canvas.getObjects().slice().reverse().map(o=>`<div class="poster-layer" data-uid="${o.__uid}"><button type="button" data-layer-select="${o.__uid}">${o.layerName||o.type}</button><button class="poster-layer-action" data-layer-lock="${o.__uid}" title="锁定">${o.locked?'🔒':'🔓'}</button><button class="poster-layer-action" data-layer-hide="${o.__uid}" title="隐藏">${o.visible===false?'○':'●'}</button></div>`).join('');refreshInspector();}
  function renderDrafts(){const box=mounted.root.querySelector('[data-poster-drafts]');if(!box)return;box.innerHTML=mounted.records.map(r=>`<div class="poster-draft ${r.id===mounted.activeId?'active':''}"><button type="button" class="btn link" data-open-poster="${r.id}"><b>${r.name}</b><small>${new Date(r.updatedAt).toLocaleString()}</small></button>${r.isPrimary?'<em>主海报</em>':''}</div>`).join('');}
  async function openRecord(id){await saveCurrent(false);mounted.activeId=id;const record=activeRecord();if(record.canvasJson){await canvas.loadFromJSON(record.canvasJson);enableTextEditing();canvas.getObjects().forEach(o=>{if(o.locked){o.selectable=false;o.evented=false;}});}else await buildTemplate(record,mounted.event,mounted.settings);undoStack=[snapshot()];redoStack=[];renderDrafts();renderLayers();canvas.requestRenderAll();}
  async function applyTemplate(id){const record=activeRecord();record.templateId=id;record.customBackground='';await buildTemplate(record,mounted.event,mounted.settings);pushHistory();mounted.root.querySelectorAll('.poster-template').forEach(x=>x.classList.toggle('active',x.dataset.template===id));renderLayers();}
  function download(){const hasName=canvas.getObjects().some(o=>o.boundKey==='eventName');const hasQr=canvas.getObjects().some(o=>o.boundKey==='qr');if(!hasName||!hasQr){mounted.toast('导出前请保留赛事名称和报名二维码');return;}canvas.discardActiveObject();canvas.requestRenderAll();const link=document.createElement('a');link.download=`${mounted.event.name}-报名海报.png`;link.href=canvas.toDataURL({format:'png',multiplier:1});link.click();mounted.toast('已导出 1080×1920 PNG');}
  function selected(){return canvas.getActiveObject();}
  async function refreshQr(){
    const url=await qrData(mounted.event);if(!url){mounted.toast('报名码生成失败，海报草稿已保留，请稍后重试');return;}
    const old=canvas.getObjects().find(o=>o.boundKey==='qr');if(old)canvas.remove(old);const q=await imageObject(url,{left:old?.left||W/2,top:old?.top||1650},'报名二维码','qr');q.scaleToWidth(old?.getScaledWidth?.()||220);canvas.add(q);pushHistory();renderLayers();mounted.toast('演示报名码已重新生成');
  }
  async function duplicatePoster(){await saveCurrent(false);const source=activeRecord();const copy={...source,id:uid(),key:'',name:`${source.name} 副本`,isPrimary:false,updatedAt:Date.now()};copy.key=key(mounted.event.id,copy.id);await putRecord(copy);mounted.records.push(copy);mounted.activeId=copy.id;mounted.onPostersChange(mounted.records);renderDrafts();await openRecord(copy.id);}
  async function deletePoster(){if(mounted.records.length===1){mounted.toast('至少保留一张海报');return;}const record=activeRecord();await deleteRecord(record.key);mounted.records=mounted.records.filter(r=>r.id!==record.id);if(record.isPrimary)mounted.records[0].isPrimary=true;mounted.activeId=mounted.records[0].id;mounted.onPostersChange(mounted.records);await openRecord(mounted.activeId);}
  async function setPrimary(){mounted.records.forEach(r=>r.isPrimary=r.id===mounted.activeId);await Promise.all(mounted.records.map(putRecord));mounted.onPostersChange(mounted.records);renderDrafts();mounted.toast('已设为主海报');}
  async function cropBackground(file){
    if(!file||!file.type.startsWith('image/')){mounted.toast('请选择 JPG、PNG 或 WEBP 图片');return;}
    if(file.size>12*1024*1024){mounted.toast('背景图片不能超过 12MB');return;}
    const src=URL.createObjectURL(file);const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=src;});
    const overlay=document.createElement('div');overlay.className='poster-runtime-crop';overlay.innerHTML=`<section class="poster-runtime-crop-card"><header><h2>裁剪自定义海报背景</h2><button type="button" data-crop-close>×</button></header><div class="poster-runtime-crop-body"><div class="poster-runtime-crop-stage"><canvas width="540" height="960"></canvas></div><div class="poster-runtime-crop-controls"><div class="poster-qr-badge">固定 9:16 裁剪，保存时压缩为 1080×1920 WEBP。</div><label>缩放 <input type="range" min="100" max="260" value="100" data-crop-zoom></label><label>水平位置 <input type="range" min="-100" max="100" value="0" data-crop-x></label><label>垂直位置 <input type="range" min="-100" max="100" value="0" data-crop-y></label></div></div><footer><button class="btn outline" type="button" data-crop-close>取消</button><button class="btn primary" type="button" data-crop-apply>确认裁剪并压缩</button></footer></section>`;
    document.body.appendChild(overlay);const preview=overlay.querySelector('canvas');const zoom=overlay.querySelector('[data-crop-zoom]');const x=overlay.querySelector('[data-crop-x]');const y=overlay.querySelector('[data-crop-y]');
    const draw=(target,tw,th)=>{const ctx=target.getContext('2d');ctx.clearRect(0,0,tw,th);const base=Math.max(tw/image.width,th/image.height);const scale=base*(Number(zoom.value)/100);const dw=image.width*scale,dh=image.height*scale;const overflowX=Math.max(0,dw-tw),overflowY=Math.max(0,dh-th);const dx=(tw-dw)/2-(Number(x.value)/100)*(overflowX/2);const dy=(th-dh)/2-(Number(y.value)/100)*(overflowY/2);ctx.drawImage(image,dx,dy,dw,dh);};
    const refresh=()=>draw(preview,540,960);[zoom,x,y].forEach(input=>input.addEventListener('input',refresh));refresh();
    const close=()=>{URL.revokeObjectURL(src);overlay.remove();};overlay.querySelectorAll('[data-crop-close]').forEach(button=>button.addEventListener('click',close));
    overlay.querySelector('[data-crop-apply]').addEventListener('click',async()=>{const output=document.createElement('canvas');output.width=W;output.height=H;draw(output,W,H);const record=activeRecord();record.customBackground=output.toDataURL('image/webp',.86);await buildTemplate(record,mounted.event,mounted.settings);pushHistory();renderLayers();close();mounted.toast('自定义背景已按 9:16 裁剪并压缩');});
  }
  function bind(){
    const root=mounted.root;
    root.addEventListener('click',async e=>{const t=e.target.closest('button');if(!t)return;
      if(t.dataset.template)await applyTemplate(t.dataset.template);
      else if(t.dataset.openPoster)await openRecord(t.dataset.openPoster);
      else if(t.dataset.posterAction==='save')await saveCurrent();
      else if(t.dataset.posterAction==='download')download();
      else if(t.dataset.posterAction==='undo')await undo();
      else if(t.dataset.posterAction==='redo')await redo();
      else if(t.dataset.posterAction==='sync'){syncBoundData();mounted.toast('报名数据已同步，图层位置保持不变');}
      else if(t.dataset.posterAction==='refresh-qr')await refreshQr();
      else if(t.dataset.posterAction==='bold'){const o=selected();if(o&&'fontWeight'in o){o.set('fontWeight',String(o.fontWeight)==='700'?'400':'700');canvas.requestRenderAll();pushHistory();}}
      else if(t.dataset.posterAction==='add-text'){const o=textObject('双击编辑自定义文字',{left:W/2,top:H/2,fontSize:38},'', '自定义文字');o.editable=true;canvas.add(o);canvas.setActiveObject(o);pushHistory();renderLayers();}
      else if(t.dataset.posterAction==='duplicate-layer'){const o=selected();if(o){const copy=await o.clone(['boundKey','layerName','locked']);copy.set({left:o.left+25,top:o.top+25});copy.boundKey='';copy.layerName=`${o.layerName||'图层'}副本`;canvas.add(copy);canvas.setActiveObject(copy);pushHistory();renderLayers();}}
      else if(t.dataset.posterAction==='delete-layer'){const o=selected();if(o&&!['eventName','qr'].includes(o.boundKey)){canvas.remove(o);pushHistory();renderLayers();}else mounted.toast('赛事名称和二维码为导出必需图层');}
      else if(t.dataset.posterAction==='front'){const o=selected();if(o){canvas.bringObjectForward(o);pushHistory();renderLayers();}}
      else if(t.dataset.posterAction==='back'){const o=selected();if(o){canvas.sendObjectBackwards(o);pushHistory();renderLayers();}}
      else if(t.dataset.posterAction==='duplicate-poster')await duplicatePoster();
      else if(t.dataset.posterAction==='delete-poster')await deletePoster();
      else if(t.dataset.posterAction==='primary')await setPrimary();
      else if(t.dataset.posterAction==='rename'){const r=activeRecord();const name=prompt('海报名称',r.name);if(name){r.name=name.trim();await saveCurrent(false);renderDrafts();}}
      else if(t.dataset.layerSelect){const o=canvas.getObjects().find(x=>String(x.__uid)===t.dataset.layerSelect);if(o&&o.visible!==false){canvas.setActiveObject(o);canvas.requestRenderAll();refreshInspector();}}
      else if(t.dataset.layerLock){const o=canvas.getObjects().find(x=>String(x.__uid)===t.dataset.layerLock);if(o){o.locked=!o.locked;o.selectable=!o.locked;o.evented=!o.locked;canvas.discardActiveObject();pushHistory();renderLayers();}}
      else if(t.dataset.layerHide){const o=canvas.getObjects().find(x=>String(x.__uid)===t.dataset.layerHide);if(o){o.visible=o.visible===false;canvas.discardActiveObject();pushHistory();renderLayers();}}
    });
    root.querySelector('[data-background-upload]')?.addEventListener('change',e=>cropBackground(e.target.files[0]));
    root.querySelector('[data-prop-text]')?.addEventListener('input',e=>{const o=selected();if(o&&typeof o.text==='string'){o.set('text',e.target.value);o.setCoords();canvas.requestRenderAll();}});
    root.querySelector('[data-prop-text]')?.addEventListener('change',()=>pushHistory());
    root.querySelector('[data-prop-color]')?.addEventListener('input',e=>{const o=selected();if(o){o.set('fill',e.target.value);canvas.requestRenderAll();}});
    root.querySelector('[data-prop-size]')?.addEventListener('input',e=>{const o=selected();if(o&&'fontSize'in o){o.set('fontSize',Number(e.target.value));canvas.requestRenderAll();}});
    root.querySelector('[data-prop-align]')?.addEventListener('change',e=>{const o=selected();if(o&&'textAlign'in o){o.set('textAlign',e.target.value);canvas.requestRenderAll();}});
  }
  async function mount(root, options){
    if(canvas){canvas.dispose();canvas=null;}const records=await listRecords(options.event);const rememberedId=records.some(record=>record.id===options.event.lastPosterId)?options.event.lastPosterId:'';mounted={root,...options,records,activeId:rememberedId||options.event.primaryPosterId||options.event.posterIds?.[0]};
    if(!mounted.records.length){root.innerHTML='<div class="panel poster-empty"><h3>尚未生成报名海报</h3><p>请先保存报名设置，系统会自动生成第一张海报。</p><button class="btn primary" type="button" data-action="go-event-registration">前往报名设置</button></div>';return;}
    root.innerHTML=`<div class="poster-studio">
      <div class="poster-data-alert" ${mounted.records.some(r=>r.dataVersion!==(mounted.event.registrationDataVersion||1))?'':'hidden'}>报名信息有更新，可点击“同步报名数据”，现有排版位置不会改变。</div>
      <section class="poster-library">${templates.map(t=>`<button class="poster-template ${t.id===activeRecord()?.templateId?'active':''}" type="button" data-template="${t.id}"><img src="${assetRoot}${t.file}" alt=""><b>${t.name}</b><small>1080 × 1920</small><i>模板</i></button>`).join('')}</section>
      <div class="poster-drafts" data-poster-drafts></div>
      <section class="poster-editor-shell">
        <aside class="poster-tools"><h3>编辑工具</h3><div class="poster-tool-grid"><button data-poster-action="undo">撤销</button><button data-poster-action="redo">重做</button><button data-poster-action="add-text">添加文字</button><button data-poster-action="bold">文字加粗</button><label class="poster-upload"><button type="button">上传背景</button><input type="file" accept="image/jpeg,image/png,image/webp" data-background-upload></label><button data-poster-action="refresh-qr">刷新报名码</button><button data-poster-action="duplicate-layer">复制图层</button><button data-poster-action="delete-layer">删除图层</button><button data-poster-action="front">上移图层</button><button data-poster-action="back">下移图层</button></div><div class="poster-qr-badge" style="margin-top:14px">当前为演示报名码；正式环境由云函数生成小程序码。</div></aside>
        <div class="poster-canvas-panel"><div class="poster-canvas-wrap"><canvas id="posterFabricCanvas" width="1080" height="1920"></canvas><div class="poster-guides"><i class="poster-guide-x"></i><i class="poster-guide-y"></i></div></div></div>
        <aside class="poster-inspector"><h3>图层属性</h3><div class="poster-property"><label>图层名称</label><input data-prop-name readonly></div><div class="poster-property"><label>图层文字 <small>仅修改当前海报</small></label><textarea rows="3" data-prop-text placeholder="选择文字图层后修改"></textarea></div><div class="poster-property"><label>文字颜色</label><input type="color" data-prop-color value="#ffffff"></div><div class="poster-property"><label>字号</label><input type="range" min="18" max="120" value="32" data-prop-size></div><div class="poster-property"><label>对齐</label><select data-prop-align><option value="left">左对齐</option><option value="center">居中</option><option value="right">右对齐</option></select></div><h3>图层</h3><div class="poster-layer-list" data-layer-list></div><div class="poster-layer-actions"><button data-poster-action="rename">重命名</button><button data-poster-action="duplicate-poster">复制海报</button><button data-poster-action="primary">设为主海报</button><button data-poster-action="delete-poster">删除海报</button></div></aside>
      </section><footer class="poster-editor-footer"><div><button class="btn outline" data-poster-action="sync">同步报名数据</button><button class="btn outline" data-poster-action="save">保存草稿</button></div><div><button class="btn primary" data-poster-action="download">下载高清 PNG</button></div></footer></div>`;
    canvas=new fabric.Canvas('posterFabricCanvas',{width:W,height:H,preserveObjectStacking:true,selection:true});canvas.setZoom(1);
    const record=activeRecord();if(record.canvasJson)await canvas.loadFromJSON(record.canvasJson);else await buildTemplate(record,mounted.event,mounted.settings);enableTextEditing();
    canvas.on('selection:created',refreshInspector);canvas.on('selection:updated',refreshInspector);canvas.on('selection:cleared',refreshInspector);
    canvas.on('object:modified',()=>{pushHistory();renderLayers();});canvas.on('object:added',()=>{if(!restoring)renderLayers();});canvas.on('object:removed',()=>{if(!restoring)renderLayers();});
    canvas.on('object:moving',e=>{const o=e.target;const center=o.getCenterPoint();if(Math.abs(center.x-W/2)<8){o.set({left:W/2});mounted.root.querySelector('.poster-guide-y').style.display='block';}else mounted.root.querySelector('.poster-guide-y').style.display='none';if(Math.abs(center.y-H/2)<8){o.set({top:H/2});mounted.root.querySelector('.poster-guide-x').style.display='block';}else mounted.root.querySelector('.poster-guide-x').style.display='none';});
    canvas.on('mouse:up',()=>mounted.root.querySelectorAll('.poster-guide-x,.poster-guide-y').forEach(x=>x.style.display='none'));
    undoStack=[snapshot()];redoStack=[];bind();renderDrafts();renderLayers();
  }
  window.SXFTournamentQrCodeAdapter=qrAdapter;
  window.SXFPosterStudio={templates,ensureDefault,mount,listRecords};
})();
