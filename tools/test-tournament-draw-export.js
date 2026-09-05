const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const debugPort = 9350;
const profileDir = path.join(process.env.TEMP || process.cwd(), `sxf-draw-export-e2e-${Date.now()}`);
const outputDir = path.resolve(__dirname, '..', 'outputs', '抽签分组导出验证');
const downloadDir = path.join(outputDir, '下载文件');
const url = 'http://127.0.0.1:5174/tournament-center.html?demo=1#draw/groups';
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

async function waitForFile(extension, count = 1, timeout = 8000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    const files = fs.readdirSync(downloadDir).filter((name) => name.endsWith(extension) && !name.endsWith('.crdownload'));
    if (files.length >= count) return files.map((name) => path.join(downloadDir, name));
    await wait(100);
  }
  throw new Error(`等待 ${extension} 下载超时`);
}

function pngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.toString('ascii', 1, 4) !== 'PNG') throw new Error(`${filePath} 不是 PNG`);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

async function run() {
  fs.mkdirSync(downloadDir, { recursive: true });
  for (const name of fs.readdirSync(downloadDir)) fs.rmSync(path.join(downloadDir, name), { force: true });
  const browser = spawn(edgePath, [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--window-size=1672,941', url
  ], { stdio: 'ignore' });
  let socket;
  const assertions = [];
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
        const task = pending.get(message.id);
        pending.delete(message.id);
        message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
      }
      if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
        consoleErrors.push(message.params.args.map((item) => item.value || item.description || '').join(' '));
      }
      if (message.method === 'Runtime.exceptionThrown') {
        consoleErrors.push(message.params.exceptionDetails?.exception?.description || message.params.exceptionDetails?.text || '页面异常');
      }
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression) => {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || '页面执行失败');
      return result.result.value;
    };
    const waitFor = async (selector, timeout = 6000) => {
      const startedAt = Date.now();
      while (Date.now() - startedAt < timeout) {
        if (await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`)) return;
        await wait(80);
      }
      throw new Error(`页面元素未出现：${selector}`);
    };
    const click = async (selector) => {
      await waitFor(selector);
      await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
      await wait(180);
    };
    const assert = async (label, expression) => {
      const passed = typeof expression === 'string' ? await evaluate(expression) : Boolean(expression);
      if (!passed) throw new Error(`断言失败：${label}`);
      assertions.push(label);
      process.stdout.write(`通过：${label}\n`);
    };

    await send('Runtime.enable');
    await send('Page.enable');
    await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadDir, eventsEnabled: true });
    await send('Page.navigate', { url });
    await wait(350);
    await evaluate(`(() => {
      const teams = ['洛杉矶公牛','测试43','测试5','测试85','测试4','测试1','frank','测试2'];
      const event = {
        id: 'draw-export-e2e', name: '2026 蜂动青少年篮球邀请赛', state: '报名中', stateClass: 'orange',
        logo: './assets/institution/brand-logo.png', logoBackground: 'white',
        startDate: '2026-08-10', endDate: '2026-08-24', firstGroup: 'U8 启蒙组', firstGroupId: 'u8-draw',
        groupRows: [{ id: 'u8-draw', name: 'U8 启蒙组', competition: '小组循环 + 单败淘汰', target: 8, competitionConfig: { preset: 'group-knockout', groupCount: 2, teamsPerGroup: 4, advancePerGroup: 2, configured: true } }],
        registrationTeams: teams.map((name, index) => ({ id: 'T' + index, name, group: 'U8 启蒙组', claimStatus: '已认领', teamQualificationStatus: '已通过', logo: index === 0 ? './assets/institution/brand-logo.png' : '' })),
        drawStates: { 'u8-draw': { assignments: { A: teams.slice(0,4), B: teams.slice(4) }, unassignedTeams: [], saved: true, updatedAt: new Date().toISOString() } },
        workflow: { profileSaved: true, groupsConfigured: true, registrationConfigured: true, teamsImported: true, qualificationCompleted: true, drawCompleted: true, drawSaved: true }
      };
      localStorage.setItem('sxf_tournament_spaces_v2', JSON.stringify([event]));
      localStorage.setItem('sxf_tournament_selected_space_v2', event.id);
      location.hash = '#draw/groups';
      location.reload();
    })()`);
    await wait(550);
    await waitFor('.draw-groups-page');
    await assert('抽签分组从报名球队记录读取并展示真实队徽', `document.querySelector('.group-slot .team-logo.has-image img[alt="洛杉矶公牛队徽"]')?.src.includes('/assets/institution/brand-logo.png')`);
    const drawLogoScreenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(outputDir, '抽签分组-队徽联通.png'), Buffer.from(drawLogoScreenshot.data, 'base64'));

    await evaluate(`location.hash = '#event/profile'`);
    await waitFor('[data-event-profile-form]');
    await evaluate(`(() => {
      const name = document.querySelector('[name="eventName"]');
      const shortName = document.querySelector('[name="eventShortName"]');
      name.value = '浦东少年冠军篮球赛';
      shortName.value = '浦东冠军赛';
      name.dispatchEvent(new Event('input', { bubbles: true }));
      shortName.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await click('[data-action="save-page"]');
    await assert('赛事资料页保存后的赛事名称写回当前赛事', `JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].name === '浦东少年冠军篮球赛'`);
    await evaluate(`location.hash = '#draw/groups'`);
    await waitFor('.draw-groups-page');

    await assert('分组结果区域提供表格和海报两个导出入口', `Boolean(document.querySelector('[data-action="export-draw-table"]')) && Boolean(document.querySelector('[data-action="open-draw-poster"]'))`);
    await click('[data-action="export-draw-table"]');
    const [xlsPath] = await waitForFile('.xls');
    const xlsText = fs.readFileSync(xlsPath, 'utf8');
    await assert('Excel 表格包含分组明细和分组总览两个工作表', xlsText.includes('ss:Name="分组明细"') && xlsText.includes('ss:Name="分组总览"'));
    await assert('Excel 表格写入当前赛事、组别和全部八支球队', ['浦东少年冠军篮球赛','U8 启蒙组','洛杉矶公牛','测试43','测试5','测试85','测试4','测试1','frank','测试2'].every((text) => xlsText.includes(text)));

    await click('[data-action="open-draw-poster"]');
    await waitFor('[data-draw-poster-canvas]');
    await assert('海报弹窗提供横版与竖版两种比例', `document.querySelectorAll('[data-action="set-draw-poster-ratio"]').length === 2`);
    await assert('海报弹窗提供三套可选视觉样式', `document.querySelectorAll('[data-action="set-draw-poster-style"]').length === 3`);
    await assert('海报弹窗提供队徽与队名大小调节，并默认使用智能适配', `document.querySelectorAll('[data-action="set-draw-poster-team-size"]').length === 4 && document.querySelector('[data-action="set-draw-poster-team-size"][data-team-scale="100"]')?.classList.contains('active') && document.querySelector('[data-draw-poster-team-size-hint]')?.textContent.includes('2 个小组')`);
    const autoTeamSizePreview = await evaluate(`document.querySelector('[data-draw-poster-canvas]').toDataURL('image/png')`);
    await click('[data-action="set-draw-poster-team-size"][data-team-scale="75"]');
    await assert('切换队徽与队名紧凑模式会实时刷新海报预览', `(document.querySelector('[data-action="set-draw-poster-team-size"][data-team-scale="75"]')?.classList.contains('active')) && document.querySelector('[data-draw-poster-canvas]').toDataURL('image/png') !== ${JSON.stringify(autoTeamSizePreview)}`);
    await click('[data-action="set-draw-poster-team-size"][data-team-scale="100"]');
    await assert('海报预览读取已保存的赛事名称与赛事 Logo', `(() => { const event = JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0]; return event.name === '浦东少年冠军篮球赛' && Boolean(event.logo); })()`);
    await assert('当前争冠淘汰赛制自动匹配对应海报底版', `document.querySelector('.draw-format-base')?.textContent.includes('小组循环 + 争冠单败淘汰')`);
    const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(outputDir, '分组海报导出弹窗-横版.png'), Buffer.from(screenshot.data, 'base64'));

    await click('[data-action="set-draw-poster-ratio"][data-ratio="9:16"]');
    await click('[data-action="set-draw-poster-style"][data-style="blue"]');
    await assert('竖版与深蓝样式切换后预览立即更新', `(() => { const canvas = document.querySelector('[data-draw-poster-canvas]'); return canvas.width === 900 && canvas.height === 1600 && document.querySelector('[data-style="blue"]')?.classList.contains('active'); })()`);
    await click('[data-action="download-draw-poster"]');
    const portraitFiles = await waitForFile('.png', 1);
    const portraitSize = pngDimensions(portraitFiles[0]);
    await assert('竖版海报实际导出尺寸为 900×1600', portraitSize.width === 900 && portraitSize.height === 1600);

    await click('[data-action="set-draw-poster-ratio"][data-ratio="16:9"]');
    await click('[data-action="set-draw-poster-style"][data-style="orange"]');
    await click('[data-action="download-draw-poster"]');
    const landscapeFiles = await waitForFile('.png', 2);
    const sizes = landscapeFiles.map(pngDimensions);
    await assert('横版海报实际导出尺寸为 1600×900', sizes.some((size) => size.width === 1600 && size.height === 900));

    await click('[data-action="set-draw-poster-style"][data-style="blue"]');
    await click('[data-action="download-draw-poster"]');
    await waitForFile('.png', 3);
    await click('[data-action="set-draw-poster-style"][data-style="light"]');
    await click('[data-action="download-draw-poster"]');
    await waitForFile('.png', 4);
    await assert('三款横版海报均可独立生成并下载', fs.readdirSync(downloadDir).filter((name) => name.endsWith('.png') && name.includes('横版16比9')).length === 3);

    await assert('热血赛场、霓虹战术、冠军公报三款背景输出不同', `(async () => {
      const styles = ['orange','blue','light'];
      const outputs = [];
      for (const style of styles) { const canvas = document.createElement('canvas'); await window.SXFDrawExport.drawPoster(canvas, { eventName:'测试赛事', logo:'./assets/institution/brand-logo.png', logoBackground:'white', groupName:'U8组', competition:'小组循环', formatPreset:'group-only', assignments:{A:['甲队','乙队'],B:['丙队','丁队']}, exportedAt:'2026/8/2 12:00:00' }, { ratio:'16:9', style }); outputs.push(canvas.toDataURL('image/png')); }
      return new Set(outputs).size === styles.length;
    })()`);

    await assert('赛事 Logo 会真实进入海报画面', `(async () => {
      const base = { eventName:'测试赛事', logoBackground:'white', groupName:'U8组', competition:'小组循环', formatPreset:'group-only', assignments:{A:['甲队','乙队'],B:['丙队','丁队']}, exportedAt:'2026/8/2 12:00:00' };
      const withLogo = document.createElement('canvas'); const withoutLogo = document.createElement('canvas');
      await window.SXFDrawExport.drawPoster(withLogo, {...base, logo:'./assets/institution/brand-logo.png'}, { ratio:'16:9', style:'orange' });
      await window.SXFDrawExport.drawPoster(withoutLogo, {...base, logo:''}, { ratio:'16:9', style:'orange' });
      return withLogo.toDataURL('image/png') !== withoutLogo.toDataURL('image/png');
    })()`);

    await assert('球队队徽会同步进入分组海报画面', `(async () => {
      const base = { eventName:'测试赛事', logoBackground:'white', groupName:'U8组', competition:'小组循环', formatPreset:'group-only', assignments:{A:['甲队','乙队'],B:['丙队','丁队']}, exportedAt:'2026/8/2 12:00:00' };
      const withTeamLogo = document.createElement('canvas'); const withoutTeamLogo = document.createElement('canvas');
      await window.SXFDrawExport.drawPoster(withTeamLogo, {...base, teamLogos:{'甲队':'./assets/institution/brand-logo.png'}}, { ratio:'16:9', style:'orange' });
      await window.SXFDrawExport.drawPoster(withoutTeamLogo, base, { ratio:'16:9', style:'orange' });
      return withTeamLogo.toDataURL('image/png') !== withoutTeamLogo.toDataURL('image/png');
    })()`);

    await assert('小组、循环、单败、双败四类赛制底版输出不同', `(async () => {
      const presets = ['group-only','round-robin','knockout','double-knockout'];
      const outputs = [];
      for (const preset of presets) { const canvas = document.createElement('canvas'); await window.SXFDrawExport.drawPoster(canvas, { eventName:'测试赛事', groupName:'U8组', competition:preset, formatPreset:preset, assignments:{A:['甲队','乙队'],B:['丙队','丁队']}, exportedAt:'2026/8/2 12:00:00' }, { ratio:'16:9', style:'orange' }); outputs.push(canvas.toDataURL('image/png')); }
      return new Set(outputs).size === presets.length;
    })()`);

    if (consoleErrors.length) throw new Error(`控制台错误：${consoleErrors.join(' | ')}`);
    process.stdout.write(`汇总：通过 ${assertions.length} 项，失败 0 项。\n`);
  } finally {
    if (socket?.readyState === WebSocket.OPEN) socket.close();
    browser.kill();
  }
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
