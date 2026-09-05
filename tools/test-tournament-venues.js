const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const debugPort = 9346;
const profileDir = path.join(process.env.TEMP || process.cwd(), `sxf-venues-e2e-${Date.now()}`);
const outputDir = path.resolve(__dirname, '..', 'outputs', '赛事中心验证');
const url = 'http://127.0.0.1:5174/tournament-center.html?demo=1#schedule/settings';
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
  try {
    const targets = await pollTargets();
    const page = targets.find((target) => target.type === 'page' && target.url.includes('tournament-center.html'))
      || targets.find((target) => target.type === 'page');
    if (!page) throw new Error('未找到赛事中心页面');
    socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.once('open', resolve);
      socket.once('error', reject);
    });
    let sequence = 0;
    const pending = new Map();
    const consoleErrors = [];
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
        consoleErrors.push(message.params.exceptionDetails?.exception?.description || message.params.exceptionDetails?.text || '页面脚本异常');
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
      throw new Error(`元素未出现：${selector}`);
    };
    const assert = async (label, expression) => {
      if (!await evaluate(expression)) throw new Error(`断言失败：${label}`);
      process.stdout.write(`通过：${label}\n`);
    };
    const click = async (selector) => {
      await waitFor(selector);
      await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
      await wait(140);
    };
    const change = async (selector, value) => {
      await waitFor(selector);
      await evaluate(`(() => { const node = document.querySelector(${JSON.stringify(selector)}); node.value = ${JSON.stringify(value)}; node.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      await wait(140);
    };
    const fill = async (selector, value) => {
      await waitFor(selector);
      await evaluate(`(() => { const node = document.querySelector(${JSON.stringify(selector)}); node.value = ${JSON.stringify(value)}; node.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    };
    const screenshot = async (name) => {
      const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(path.join(outputDir, name), Buffer.from(result.data, 'base64'));
    };

    await send('Runtime.enable');
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1672, height: 941, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url });
    await wait(300);
    await evaluate(`(() => {
      const event = {
        id: 'venues-e2e', name: '2026 蜂动青少年篮球联赛', state: '进行中', stateClass: 'green',
        startDate: '2026-07-18', endDate: '2026-08-26', firstGroup: 'U12男子组',
        groupRows: [{ name: 'U12男子组', target: 24, joined: 24, status: '已确认' }],
        groups: 1, teams: 24, matches: 0, workflow: { groupsConfigured: true }
      };
      localStorage.setItem('sxf_tournament_spaces_v2', JSON.stringify([event]));
      localStorage.setItem('sxf_tournament_selected_space_v2', event.id);
      location.hash = '#schedule/settings';
      location.reload();
    })()`);
    await wait(500);
    try {
      await waitFor('.venue-settings-page');
    } catch (error) {
      const debugState = await evaluate(`({ url: location.href, hash: location.hash, title: document.title, body: document.body.innerText.slice(0, 1200) })`);
      throw new Error(`${error.message}\n页面状态：${JSON.stringify(debugState)}\n脚本错误：${consoleErrors.join(' | ') || '无'}`);
    }
    await assert('正式路由还原三栏场馆工作台', `document.querySelectorAll('.venue-workspace-grid > .panel').length === 3`);
    await assert('场馆列表展示三座已绑定场馆', `document.querySelectorAll('.venue-list-card').length === 3`);
    await assert('默认场馆展示四片球场', `document.querySelectorAll('.venue-court-row').length === 4`);
    await assert('全场与半场使用对应球场示意图', `document.querySelectorAll('.venue-court-diagram.half svg').length === 2 && document.querySelectorAll('.venue-court-diagram.half .court-line').length >= 10 && document.querySelectorAll('.venue-court-diagram:not(.half)').length === 2`);
    await assert('不再提供按日期维护的例外时段', `!document.querySelector('.venue-exceptions')`);
    await assert('资源摘要展示场馆、球场、比赛日与可排场次', `document.querySelectorAll('.venue-summary-metrics article').length === 4 && [...document.querySelectorAll('.venue-summary-metrics article')].every(node => /\\d/.test(node.textContent))`);
    await assert('首次刷新摘要与日期输入框保持一致', `(() => { const start = document.querySelector('[data-venue-field="startDate"]')?.value; const end = document.querySelector('[data-venue-field="endDate"]')?.value; const expected = Math.floor((new Date(end + 'T00:00:00') - new Date(start + 'T00:00:00')) / 86400000) + 1; return document.querySelector('[data-summary-key="days"] b')?.textContent.trim() === expected + '天'; })()`);
    await change('[data-venue-field="endDate"]', '2026-08-16');
    await assert('调整比赛日期后资源摘要实时更新实际自然日', `document.querySelector('[data-summary-key="days"] b')?.textContent.trim() === '4天'`);
    await assert('预计可排场次随比赛日和时间段实时联动', `(() => { const number = (key) => Number(document.querySelector('[data-summary-key="' + key + '"] b')?.childNodes[0]?.textContent || 0); return number('capacity') === number('courts') * number('days') * document.querySelectorAll('.venue-auto-slot').length; })()`);
    await assert('资源摘要提供保存赛程设置操作', `Boolean(document.querySelector('.venue-resource-summary [data-action="save-page"]'))`);
    await assert('不再提供重复的手动时间段配置', `!document.querySelector('.venue-custom-segments')`);
    await assert('系统推算的开赛时间逐条可调整', `document.querySelectorAll('.venue-auto-slot[data-action="edit-schedule-time-slot"]').length >= 3`);
    const firstScheduleTime = await evaluate(`document.querySelector('.venue-auto-slot')?.dataset.scheduleTime || ''`);
    await click('.venue-auto-slot');
    await fill('[data-schedule-time-input]', '09:10');
    await click('[data-action="save-schedule-time-slot"]');
    await assert('调整后的开赛时间会写入排赛资源', `(() => { const event = JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2') || '[]')[0]; return event?.venueSettings?.availability?.scheduleTimeSlots?.includes('09:10'); })()`);
    await click('[data-action="reset-schedule-time-slots"]');
    await assert('可按基础时段重新推算开赛时间', `(() => { const event = JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2') || '[]')[0]; return !event?.venueSettings?.availability?.scheduleTimeSlots?.length && document.querySelector('.venue-auto-slot')?.dataset.scheduleTime === ${JSON.stringify(firstScheduleTime)}; })()`);
    await click('[data-action="add-schedule-time-slot"]');
    await fill('[data-schedule-time-input]', '17:45');
    await click('[data-action="save-schedule-time-slot"]');
    await assert('每日开赛时间可手动添加', `(() => { const event = JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2') || '[]')[0]; return event?.venueSettings?.availability?.scheduleTimeSlots?.includes('17:45') && document.querySelector('.venue-auto-slot[data-schedule-time="17:45"]'); })()`);
    await assert('没有把原型或参考裁剪作为正式背景', `![...document.querySelectorAll('*')].some((node) => /场馆设置-v1|_assets|reference-crops/.test(getComputedStyle(node).backgroundImage))`);
    await assert('场馆缩略图复用项目正规素材', `getComputedStyle(document.querySelector('.venue-photo')).backgroundImage.includes('growth-platform-background-v2.png')`);
    await assert('1672宽度没有横向溢出', `document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1`);
    await assert('源原型视口尺寸准确', `innerWidth === 1672 && innerHeight === 941`);
    await screenshot('场馆设置-1672x941-v1.png');
    await assert('每个场馆卡片提供删除操作', `document.querySelectorAll('[data-action="request-delete-event-venue"]').length === 3`);
    await assert('场馆删除入口使用醒目的红色', `[...document.querySelectorAll('.venue-delete')].every(node => node.textContent.trim() === '删除' && getComputedStyle(node).color === 'rgb(255, 98, 93)')`);
    await click('[data-action="request-delete-event-venue"][data-venue-id="youth-center"]');
    await assert('删除场馆前要求二次确认并说明球场影响', `document.getElementById('modalTitle')?.textContent === '确认删除场馆' && document.getElementById('modalBody')?.textContent.includes('1 片球场') && document.querySelector('[data-action="confirm-delete-event-venue"]')`);
    await screenshot('场馆删除确认-1672x941.png');
    await click('[data-action="confirm-delete-event-venue"]');
    await assert('删除场馆后同步更新列表与资源摘要', `document.querySelectorAll('.venue-list-card').length === 2 && document.querySelectorAll('.venue-summary-metrics article').length === 4`);
    await assert('每片球场提供独立删除操作', `document.querySelectorAll('[data-action="request-delete-event-court"]').length === 4`);
    await assert('球场删除按钮使用醒目的红色文字', `[...document.querySelectorAll('.venue-court-delete')].every(node => node.textContent.trim() === '删除' && getComputedStyle(node).color === 'rgb(255, 98, 93)')`);
    await click('[data-action="request-delete-event-court"][data-court-id="court-4"]');
    await assert('删除球场前要求二次确认', `document.getElementById('modalTitle')?.textContent === '确认删除球场' && document.getElementById('modalBody')?.textContent.includes('浦东体育中心 · 球场 4') && document.querySelector('[data-action="confirm-delete-event-court"]')`);
    await screenshot('球场删除确认-1672x941.png');
    await click('[data-action="confirm-delete-event-court"]');
    await assert('删除球场后同步更新球场列表与容量', `document.querySelectorAll('.venue-court-row').length === 3 && document.querySelectorAll('.venue-summary-metrics article').length === 4`);

    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await wait(180);
    await assert('1440宽度没有横向溢出', `document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1`);
    await screenshot('场馆设置-1440x900-v1.png');
    await send('Emulation.setDeviceMetricsOverride', { width: 1672, height: 941, deviceScaleFactor: 1, mobile: false });
    await wait(180);

    await click('[data-action="select-event-venue"][data-venue-id="fengdong-gym"]');
    await assert('切换场馆会加载对应球场', `document.querySelector('.venue-court-panel h3')?.textContent.includes('蜂动篮球馆') && document.querySelectorAll('.venue-court-row').length === 3`);
    await assert('场地资源明确适用于赛事全部组别', `document.querySelector('.venue-scope-toolbar .status-dot.ok')?.textContent.includes('全部组别')`);
    await click('[data-action="select-event-venue"][data-venue-id="pudong-sports-center"]');
    await change('[data-venue-court-type][data-court-id="court-1"]', '半场');
    await assert('切换为半场后示意图立即更新', `document.querySelector('.venue-court-row[data-court-id="court-1"] .venue-court-diagram')?.classList.contains('half') && document.querySelector('.venue-court-row[data-court-id="court-1"] .venue-court-diagram')?.getAttribute('aria-label') === '半场示意图'`);
    await change('[data-venue-field="morningEndTime"]', '08:00');
    await evaluate(`document.querySelector('[data-venue-field="morningEndTime"]').value = '12:00'`);
    await click('.venue-resource-summary [data-action="save-page"]');
    await assert('保存时读取时间输入框当前显示值而非旧状态', `!document.querySelector('.toast')?.textContent.includes('请检查上午、下午设置')`);
    await assert('保存后写入场馆配置和生命周期', `(() => { const event = JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2') || '[]')[0]; return event?.workflow?.venuesConfigured && event?.venueSettings?.scope === 'all' && !event?.venueSettings?.availability?.exceptions && event?.venueSettings?.availability?.morningEndTime === '12:00' && !event?.venueSettings?.availability?.scheduleTimeSlots?.length && event?.venueSettings?.venues?.length === 2 && event?.venueSettings?.venues?.[0]?.courts?.length === 3 && event?.venueSettings?.venues?.[0]?.courts?.[0]?.type === '半场'; })()`);
    if (consoleErrors.length) throw new Error(`控制台错误：${consoleErrors.join(' | ')}`);
    process.stdout.write('场馆设置交互验证完成。\n');
  } finally {
    if (socket?.readyState === WebSocket.OPEN) socket.close();
    browser.kill();
  }
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
