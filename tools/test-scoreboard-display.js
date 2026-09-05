'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const WebSocket = require('ws');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const flow = read('cloudfunctions/sxMatchFlow/index.js');
const display = read('cloudfunctions/sxScoreboardDisplay/index.js');
const quickDisplay = read('cloudfunctions/sxQuickScoreboard/index.js');
const scorer = read('native-dist/pages/scorer-board/index.js');
const scorerWxml = read('native-dist/pages/scorer-board/index.wxml');
const page = read('scoreboard.html');
const client = read('website-assets/scoreboard.js');
const config = JSON.parse(read('cloudbaserc.json'));

assert(flow.includes('createDisplayCode'), '比赛启动必须生成大屏码');
assert(flow.includes("displayCode,homeScore:0"), '现场状态必须保存大屏码');
assert(display.includes("displayCode: code"), '公开大屏接口必须按大屏码读取');
assert(display.includes("sx_quick_scoreboard_sessions") && display.includes("stage: '快速比赛'"), '公开大屏接口必须支持快捷比赛');
assert(quickDisplay.includes("action === 'create'") && quickDisplay.includes("action === 'update'") && quickDisplay.includes("action === 'finish'"), '快捷比赛大屏会话生命周期不完整');
assert(display.includes('publicState(state)'), '大屏接口必须输出裁剪后的只读状态');
assert(scorer.includes('scoreboardDisplayCode') && scorer.includes('scoreboardDisplayUrl'), '裁判端必须保存大屏码与完整链接');
assert(scorer.includes('openScoreboardPanel') && scorer.includes('copyScoreboardValue'), '裁判端缺少电视大屏入口操作');
assert(scorer.includes('initQuickScoreboardSession') && scorer.includes("callCloud('sxQuickScoreboard'"), '快捷比赛没有创建大屏会话');
assert(scorerWxml.includes('scoreboardButtonVisible') && scorerWxml.includes('复制完整链接'), '裁判端缺少电视大屏按钮或复制面板');
for (const field of ['homeFouls','awayFouls','possession','shotClock','shotClockRunning']) {
  assert(scorer.includes(`${field}: this.data.${field}`), `裁判端缺少同步字段 ${field}`);
}
assert(page.includes('连接现场计分台') && page.includes('offlineMask'), '大屏页面缺少绑定或断线状态');
assert(client.includes("setInterval(request, 1000)"), '大屏页面缺少定时校时');
assert(config.functions.some((item) => item.name === 'sxScoreboardDisplay'), '大屏云函数未加入部署配置');
assert(config.functions.some((item) => item.name === 'sxQuickScoreboard'), '快捷比赛大屏云函数未加入部署配置');

const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
if (!fs.existsSync(edge)) {
  process.stdout.write('大屏数据与静态契约检查通过；未找到 Edge，跳过截图。\n');
  process.exit(0);
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const port = 9580 + Math.floor(Math.random() * 200);
const debugPort = port + 500;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sxf-scoreboard-'));
const outputDir = path.join(root, 'outputs', '电视大屏验收');
fs.mkdirSync(outputDir, { recursive: true });
const server = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
const browser = spawn(edge, [`--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, '--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars', '--window-size=1920,1080', `http://127.0.0.1:${port}/scoreboard.html?demo=1`], { stdio: 'ignore' });

(async () => {
  let socket;
  try {
    let targets = [];
    for (let index = 0; index < 100; index += 1) {
      try { targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json(); if (targets.length) break; } catch (_) {}
      await wait(100);
    }
    const target = targets.find((item) => item.type === 'page' && item.url.includes('scoreboard.html'));
    assert(target, '未找到电视大屏测试页面');
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
    let id = 0; const pending = new Map();
    socket.on('message', (raw) => { const message = JSON.parse(raw); if (message.id && pending.has(message.id)) { const task = pending.get(message.id); pending.delete(message.id); message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result); } });
    const send = (method, params = {}) => new Promise((resolve, reject) => { const requestId = ++id; pending.set(requestId, { resolve, reject }); socket.send(JSON.stringify({ id: requestId, method, params })); });
    await send('Page.enable'); await send('Runtime.enable'); await wait(900);
    const state = await send('Runtime.evaluate', { expression: `({boardHidden:document.getElementById('board').hidden,score:document.getElementById('homeScore').getAttribute('aria-label'),digits:document.querySelectorAll('#homeScore .digital-digit').length,leftPossession:document.getElementById('possessionLeft').classList.contains('is-active'),clock:document.getElementById('clock').getAttribute('aria-label'),clockDigits:document.querySelectorAll('#clock .digital-digit').length,status:document.getElementById('connection').textContent.trim(),overflow:document.documentElement.scrollHeight>innerHeight})`, returnByValue: true });
    assert.strictEqual(state.result.value.boardHidden, false, '演示大屏没有进入比赛画面');
    assert(state.result.value.score.includes('46') && state.result.value.digits === 2, '演示比分没有以两位数码管显示');
    assert(state.result.value.clock.includes('比赛时间') && state.result.value.clockDigits === 4, '比赛时间没有以四位数码管显示');
    assert.strictEqual(state.result.value.leftPossession, true, '主队球权时左箭头必须高亮');
    assert.strictEqual(state.result.value.overflow, false, '1920×1080 出现页面纵向溢出');
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(outputDir, '电视大屏-1920x1080.png'), Buffer.from(shot.data, 'base64'));
    process.stdout.write(`电视大屏契约与视觉检查通过：${outputDir}\n`);
  } finally {
    if (socket) socket.close();
    browser.kill(); server.kill();
  }
})().catch((error) => { browser.kill(); server.kill(); console.error(error); process.exitCode = 1; });
