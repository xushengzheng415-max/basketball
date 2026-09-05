const { spawn } = require('child_process');
const WebSocket = require('ws');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const debugPort = 9365;
const url = process.env.SXF_ENTRY_URL || 'http://127.0.0.1:5174/organization-entry.html';
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function run() {
  const browser = spawn(edgePath, [`--remote-debugging-port=${debugPort}`, '--headless=new', '--disable-gpu', '--no-first-run', '--window-size=1440,900', url], { stdio: 'ignore' });
  let socket;
  try {
    let targets;
    for (let index = 0; index < 80; index += 1) { try { targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json(); break; } catch (_) { await wait(100); } }
    await wait(1200);
    targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
    const page = targets?.find((target) => target.type === 'page' && target.url.includes('organization-entry.html'));
    if (!page) throw new Error('未找到组织入口页面');
    socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
    let id = 0; const pending = new Map();
    socket.on('message', (buffer) => { const message = JSON.parse(buffer.toString()); if (!message.id || !pending.has(message.id)) return; const task = pending.get(message.id); pending.delete(message.id); message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result); });
    const send = (method, params = {}) => new Promise((resolve, reject) => { const taskId = ++id; pending.set(taskId, { resolve, reject }); socket.send(JSON.stringify({ id: taskId, method, params })); });
    const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.value;
    await send('Runtime.enable'); await wait(12000);
    const checks = [
      ['入口脚本为最新版本', `window.__sxfOrganizationEntryVersion === '20260821-5'`],
      ['新入口显示扫码身份确认', `document.querySelector('#stepTitle')?.textContent.includes('扫码确认身份')`],
      ['三类身份登记可选', `document.querySelectorAll('.identity-card').length === 3`],
      ['二维码状态有明确结果', `String(document.querySelector('#loginQr')?.src || '').startsWith('data:image') || document.querySelector('#flowStatus')?.textContent.includes('AppSecret')`]
    ];
    for (const [label, expression] of checks) {
      if (!await evaluate(expression)) throw new Error(`断言失败：${label}；状态：${await evaluate('document.querySelector("#flowStatus")?.textContent || document.querySelector("#qrState")?.textContent')}；调试：${await evaluate('window.__sxfOrganizationEntryDebug || ""')}`);
      process.stdout.write(`通过：${label}\n`);
    }
  } finally { if (socket?.readyState === WebSocket.OPEN) socket.close(); browser.kill(); }
}
run().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
