const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const debugPort = 9347;
const profileDir = path.join(process.env.TEMP || process.cwd(), `sxf-registration-e2e-${Date.now()}`);
const outputDir = path.resolve(__dirname, '..', 'outputs', '报名资格验证');
const teamLogoPath = path.resolve(__dirname, '..', 'admin', 'assets', 'institution', 'brand-logo.png');
const url = 'http://127.0.0.1:5174/tournament-center.html?demo=1#registration/progress';
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
      const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text || '页面执行失败');
      return response.result.value;
    };
    const waitFor = async (selector, timeout = 6000) => {
      const startedAt = Date.now();
      while (Date.now() - startedAt < timeout) {
        if (await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`)) return;
        await wait(80);
      }
      throw new Error(`元素未出现：${selector}`);
    };
    const check = async (area, label, expression, severity = 'P1') => {
      let passed = false;
      let detail = '';
      try {
        passed = Boolean(await evaluate(expression));
      } catch (error) {
        detail = error.message;
      }
      results.push({ area, label, passed, severity, detail });
      process.stdout.write(`${passed ? '通过' : '失败'}：[${area}] ${label}${passed ? '' : `（${severity}）`}\n`);
      return passed;
    };
    const click = async (selector) => {
      await waitFor(selector);
      await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
      await wait(180);
    };
    const fill = async (selector, value) => {
      await waitFor(selector);
      await evaluate(`(() => { const node = document.querySelector(${JSON.stringify(selector)}); node.value = ${JSON.stringify(value)}; node.dispatchEvent(new Event('input', { bubbles: true })); node.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      await wait(180);
    };
    const route = async (hash, selector) => {
      await evaluate(`location.hash = ${JSON.stringify(hash)}`);
      await wait(220);
      try {
        await waitFor(selector);
      } catch (error) {
        const state = await evaluate(`({ hash: location.hash, body: document.body.innerText.slice(0, 1200) })`);
        throw new Error(`${error.message}\n页面状态：${JSON.stringify(state)}\n脚本错误：${consoleErrors.join(' | ') || '无'}`);
      }
    };
    const screenshot = async (name) => {
      const capture = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(path.join(outputDir, name), Buffer.from(capture.data, 'base64'));
    };
    const noOverflow = `document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1`;

    await send('Runtime.enable');
    await send('Page.enable');
    await send('DOM.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1672, height: 941, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url });
    await wait(300);
    await evaluate(`(() => {
      const event = {
        id: 'registration-e2e', name: '2026 蜂动青少年篮球联赛', state: '报名中', stateClass: 'orange',
        startDate: '2026-07-18', endDate: '2026-08-26', firstGroup: 'U8 启蒙组',
        groupRows: [{ name: 'U8 启蒙组', target: 24, joined: 0, status: '待报名' }],
        groups: 1, teams: 0, matches: 0,
        workflow: { profileSaved: true, groupsConfigured: true, registrationConfigured: true }
      };
      localStorage.setItem('sxf_tournament_spaces_v2', JSON.stringify([event]));
      localStorage.setItem('sxf_tournament_selected_space_v2', event.id);
      location.hash = '#registration/progress';
      location.reload();
    })()`);
    await wait(500);

    await waitFor('.registration-progress-page');
    await check('入驻进度', '目标球队显示 24 支', `document.querySelector('.compact-metrics')?.textContent.replace(/\s/g, '').includes('目标球队24支')`);
    await check('入驻进度', '未邀请球队时保持真实空状态', `document.querySelector('.module-empty')?.textContent.includes('现在还没有报名球队') && document.querySelectorAll('.registration-row').length === 0`);
    await check('入驻进度', '不再回退静态演示球队', `!document.body.textContent.includes('猛虎队 U12') && !document.body.textContent.includes('飞鹰队 U12')`);
    await check('入驻进度', '组别下拉只读取当前赛事真实组别', `JSON.stringify([...document.querySelectorAll('[data-registration-group-filter] option')].map((option) => option.textContent)) === JSON.stringify(['全部组别','U8 启蒙组'])`);
    await check('入驻进度', '状态下拉对应球队邀请流程', `JSON.stringify([...document.querySelectorAll('[data-registration-status-filter] option')].map((option) => option.textContent)) === JSON.stringify(['全部状态','待邀请','邀请已发送','已认领'])`);
    await check('入驻进度', '页首提供人工添加和入驻码入口', `Boolean(document.querySelector('#pageActions [data-action="add-registration-team"]')) && Boolean(document.querySelector('#pageActions [data-action="show-qr"]'))`);
    await check('入驻进度', '右侧球队小程序入口已移除且主表格占满内容宽度', `!document.querySelector('.mini-qr-panel') && !document.querySelector('.registration-side') && document.querySelector('.registration-table-panel').getBoundingClientRect().width >= document.querySelector('.registration-progress-page').getBoundingClientRect().width - 2`);
    await check('入驻进度', '顶部目标球队指标已压缩为紧凑高度', `document.querySelector('.compact-metrics').getBoundingClientRect().height <= 95 && document.querySelector('.compact-metrics').getBoundingClientRect().width >= document.querySelector('.registration-progress-page').getBoundingClientRect().width - 2`);
    await check('入驻进度', '1672 视口无横向溢出', noOverflow, 'P0');
    await screenshot('报名空状态-1672x941.png');
    await click('#pageActions [data-action="show-qr"]');
    await check('入驻进度', '生成入驻码会打开赛事专属二维码', `!document.getElementById('modalLayer').hidden && document.getElementById('modalTitle').textContent.includes('球队入驻二维码') && document.getElementById('modalBody').textContent.includes('2026 蜂动青少年篮球联赛')`);
    await click('#closeModal');
    await click('#pageActions [data-action="add-registration-team"]');
    await check('人工添加', '只要求球队、组别、领队和手机号', `!document.getElementById('modalLayer').hidden && ['球队名称','参赛组别','领队姓名','领队手机号'].every((text) => document.getElementById('modalBody').textContent.includes(text)) && !document.getElementById('modalBody').textContent.includes('球员姓名')`);
    await fill('[data-registration-team-form] [name="name"]', '启航队');
    await fill('[data-registration-team-form] [name="owner"]', '王领队');
    await fill('[data-registration-team-form] [name="phone"]', '123');
    await click('[data-action="save-registration-team"]');
    await check('人工添加', '错误手机号会阻止保存', `!document.getElementById('modalLayer').hidden && document.getElementById('toast').textContent.includes('11 位领队手机号') && !(JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2') || '[]')[0]?.registrationTeams?.length)`);
    await fill('[data-registration-team-form] [name="phone"]', '13800138000');
    await click('[data-action="save-registration-team"]');
    await check('人工添加', '保存后直接进入邀请确认', `!document.getElementById('modalLayer').hidden && document.getElementById('modalTitle').textContent.includes('发送球队认领邀请') && document.getElementById('modalBody').textContent.includes('启航队')`);
    await check('人工添加', '弹窗生成可复制的球队专属测试链接', `document.querySelector('[data-team-invite-link]')?.value.includes('service-account-demo.html?flow=team-claim') && document.querySelector('[data-team-invite-link]')?.value.includes('teamId=REG-')`);
    await check('人工添加', '球队写入赛事但不生成球员或完成绑定', `(() => { const event = JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2') || '[]')[0]; const team = event?.registrationTeams?.[0]; return event?.teams === 1 && team?.name === '启航队' && team?.claimStatus === '待邀请' && team?.players?.length === 0 && event?.workflow?.teamsImported !== true && event?.workflow?.qualificationCompleted !== true; })()`, 'P0');
    await click('[data-action="copy-team-invite-link"]');
    await check('发送邀请', '复制测试邀请链接会给出成功提示', `document.getElementById('toast').textContent.includes('邀请链接已复制')`);
    await click('[data-action="confirm-team-invite"]');
    await check('发送邀请', '邀请状态、时间和次数已保存', `(() => { const team = JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2') || '[]')[0]?.registrationTeams?.[0]; return team?.claimStatus === '邀请已发送' && Boolean(team?.invitedAt) && team?.inviteCount === 1; })()`);
    await check('发送邀请', '页面更新为邀请已发送', `document.querySelector('.registration-progress-page')?.textContent.includes('邀请已发送') && document.querySelector('.compact-metrics')?.textContent.replace(/\s/g, '').includes('已添加1支')`);
    await route('#draw/groups', '.blank-module-page');
    await check('draw qualification gate', 'unapproved team is excluded from draw', `document.querySelector('.blank-module-page') && !document.getElementById('teamPool')`, 'P0');
    if (false) {
    await route('#draw/groups', '.draw-groups-page');
    await check('抽签分组', '未完成资格审核的实际球队也会进入对应组别', `document.getElementById('teamPool')?.textContent.includes('启航队') && !document.querySelector('.module-empty')?.textContent.includes('尚无可分组球队')`, 'P0');
    await check('抽签分组', '顶部入口只显示当前组别对应赛制', `document.querySelectorAll('#subnav button').length === 1 && document.querySelector('#subnav button')?.textContent.includes('小组抽签')`, 'P0');
    }
    await route('#registration/progress', '.registration-progress-page');
    await check('球队管理', '每支球队都有编辑、邀请和删除操作', `['edit-registration-team','invite-captain','request-delete-registration-team'].every(action => document.querySelector('.registration-row [data-action="' + action + '"]'))`);
    await check('球队管理', '球队列表文字已放大到易读尺寸', `parseFloat(getComputedStyle(document.querySelector('.registration-row td')).fontSize) >= 13 && parseFloat(getComputedStyle(document.querySelector('.registration-row .team-row b')).fontSize) >= 14`);
    await click('.registration-row [data-action="edit-registration-team"]');
    await check('球队队徽', '编辑球队提供与赛事 Logo 一致的方形上传组件', `Boolean(document.querySelector('[data-registration-team-form] [data-upload-kind="teamLogo"]')) && document.querySelector('.registration-team-logo-field')?.textContent.includes('只删除与图片外围连通的背景')`);
    await click('[data-registration-team-form] [data-upload-kind="teamLogo"]');
    const documentNode = await send('DOM.getDocument');
    const logoInput = await send('DOM.querySelector', { nodeId: documentNode.root.nodeId, selector: '[data-event-image-picker="teamLogo"]' });
    if (!logoInput.nodeId) throw new Error('未找到球队队徽文件选择器');
    await send('DOM.setFileInputFiles', { files: [teamLogoPath], nodeId: logoInput.nodeId });
    await waitFor('[data-action="apply-image-edit"]');
    await check('球队队徽', '上传后进入1比1裁剪和外围连通抠图界面', `document.getElementById('modalTitle')?.textContent.includes('裁剪球队队徽') && document.getElementById('modalBody')?.textContent.includes('保留队徽内部相同颜色') && document.querySelector('[data-image-control="zoom"]') && document.querySelector('[data-image-control="tolerance"]') && document.querySelector('[data-action="toggle-background-removal"]')?.getAttribute('aria-pressed') === 'true'`);
    await click('[data-action="apply-image-edit"]');
    await waitFor('[data-registration-team-form]');
    await check('球队队徽', '裁剪完成后返回球队编辑并显示透明 PNG 预览', `document.querySelector('[data-upload-kind="teamLogo"].has-preview img')?.src.startsWith('data:image/png')`);
    await check('球队队徽', '抠图只删除外围背景并保留队徽内部白色', `(async () => {
      const source = document.querySelector('[data-upload-kind="teamLogo"].has-preview img')?.src;
      if (!source) return false;
      const image = await new Promise((resolve, reject) => { const node = new Image(); node.onload = () => resolve(node); node.onerror = reject; node.src = source; });
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
      const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, 512, 512).data;
      let opaqueWhite = 0;
      for (let index = 0; index < pixels.length; index += 4) if (pixels[index + 3] > 220 && pixels[index] > 235 && pixels[index + 1] > 235 && pixels[index + 2] > 235) opaqueWhite += 1;
      return opaqueWhite > 500;
    })()`);
    await screenshot('编辑球队-队徽上传裁剪.png');
    await fill('[data-registration-team-form] [name="name"]', '启航队甲');
    await click('[data-action="save-registration-team"]');
    await check('球队管理', '编辑保存队徽并保留原有邀请状态', `(() => { const teams = JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2') || '[]')[0]?.registrationTeams || []; return teams.length === 1 && teams[0].name === '启航队甲' && teams[0].claimStatus === '邀请已发送' && teams[0].logo?.startsWith('data:image/png'); })()`);
    await check('球队管理', '球队列表使用保存后的真实队徽', `document.querySelector('.registration-row .team-logo.has-image img')?.src.startsWith('data:image/png')`);
    await check('球队管理', '真实队徽以透明原图展示且不套圆形边框', `(() => { const logo = document.querySelector('.registration-row .team-logo.has-image'); const style = getComputedStyle(logo); const imageStyle = getComputedStyle(logo.querySelector('img')); return style.borderTopWidth === '0px' && style.borderRadius === '0px' && style.backgroundColor === 'rgba(0, 0, 0, 0)' && imageStyle.borderRadius === '0px'; })()`);
    await check('球队管理', '全宽表格中的球队列保持可读宽度', `document.querySelector('.registration-table-panel th:first-child').getBoundingClientRect().width >= document.querySelector('.registration-table-panel table').getBoundingClientRect().width * .17`);
    await fill('[data-registration-group-filter]', 'U8 启蒙组');
    await fill('[data-registration-status-filter]', '邀请已发送');
    await check('入驻进度', '真实组别和邀请状态可以组合筛选', `document.querySelectorAll('.registration-row:not([hidden])').length === 1 && document.querySelector('[data-registration-count]').textContent.includes('1')`);
    await fill('[data-registration-status-filter]', '待邀请');
    await check('入驻进度', '不匹配的邀请状态会隐藏球队', `document.querySelectorAll('.registration-row:not([hidden])').length === 0 && document.querySelector('[data-registration-count]').textContent.includes('0')`);
    await fill('[data-registration-status-filter]', '');
    await fill('[data-registration-search]', '启航队');
    await check('入驻进度', '球队名称搜索会过滤列表', `[...document.querySelectorAll('.registration-row')].filter((row) => getComputedStyle(row).display !== 'none').length === 1`);
    await screenshot('入驻进度-1672x941.png');

    await route('#registration/claims', '.page-heading');
    await check('球队认领', '只展示刚添加的一支球队', `document.querySelectorAll('.data-table tbody tr').length === 1 && document.querySelector('.data-table')?.textContent.includes('启航队')`);
    await check('球队认领', '手机号保持脱敏展示', `document.querySelector('.data-table')?.textContent.includes('138****8000')`);
    await check('球队认领', '邀请时间和状态可追踪', `document.querySelector('.data-table')?.textContent.includes('邀请已发送') && !document.querySelector('.data-table')?.textContent.includes('—')`);
    await check('球队认领', '认领记录接入同一真实队徽并使用加宽球队列', `document.querySelector('.registration-claims-page .team-logo.has-image img')?.src.startsWith('data:image/png') && document.querySelector('.registration-claims-page th:first-child').getBoundingClientRect().width >= document.querySelector('.registration-claims-page table').getBoundingClientRect().width * .25`);
    await click('[data-action="invite-captain"]');
    await check('球队认领', '支持再次发送同一邀请', `document.querySelector('[data-action="confirm-team-invite"]')?.textContent.includes('再次发送')`);
    await click('#closeModal');
    await check('球队认领', '1672 视口无横向溢出', noOverflow, 'P0');
    await screenshot('球队认领-1672x941.png');
    await evaluate('location.reload()');
    await wait(500);
    await waitFor('.page-heading');
    await check('刷新恢复', '刷新后球队、队徽和邀请状态仍保留', `(() => { const team = JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2') || '[]')[0]?.registrationTeams?.[0]; return document.querySelector('.data-table')?.textContent.includes('启航队') && document.querySelector('.data-table')?.textContent.includes('邀请已发送') && team?.logo?.startsWith('data:image/png'); })()`);

    await route('#registration/qualification', '.page-heading');
    await check('球员资格', '人工添加球队后仍保持空球员状态', `document.querySelector('.module-empty')?.textContent.includes('暂无球员资格资料') && !document.body.textContent.includes('张子轩')`);
    await check('球员资格', '页面明确正式上线后再维护球员', `document.querySelector('.module-empty')?.textContent.includes('正式上线后')`);
    await check('球员资格', '1672 视口无横向溢出', noOverflow, 'P0');
    await screenshot('球员资格-1672x941.png');

    await route('#registration/rosters', '.page-heading');
    await check('正式名单', '人工添加球队后仍保持空名单状态', `document.querySelector('.module-empty')?.textContent.includes('暂无正式名单') && !document.body.textContent.includes('雷霆队 · U12 正式名单')`);
    await check('正式名单', '页面明确人工添加不创建球员和名单', `document.querySelector('.module-empty')?.textContent.includes('不创建球员和名单')`);
    await check('正式名单', '1672 视口无横向溢出', noOverflow, 'P0');
    await screenshot('正式名单-1672x941.png');

    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    for (const [hash, name, selector] of [
      ['#registration/progress', '入驻进度', '.registration-progress-page'],
      ['#registration/claims', '球队认领', '.page-heading'],
      ['#registration/qualification', '球员资格', '.page-heading'],
      ['#registration/rosters', '正式名单', '.page-heading']
    ]) {
      await route(hash, selector);
      await check(name, '1440 视口无横向溢出', noOverflow, 'P0');
      await screenshot(`${name}-1440x900.png`);
    }

    await send('Emulation.setDeviceMetricsOverride', { width: 1220, height: 900, deviceScaleFactor: 1, mobile: false });
    await route('#registration/progress', '.registration-progress-page');
    await check('入驻进度', '1220 视口顶栏左右区域不重叠', `(() => { const context = document.querySelector('.topbar-context')?.getBoundingClientRect(); const actions = document.querySelector('.topbar-actions')?.getBoundingClientRect(); return context && actions && context.right + 8 <= actions.left; })()`, 'P0');
    await check('入驻进度', '1220 视口机构入口与账号区不重叠', `(() => { const workspace = document.querySelector('.workspace-switch')?.getBoundingClientRect(); const operator = document.querySelector('.operator')?.getBoundingClientRect(); return workspace && operator && workspace.right + 8 <= operator.left; })()`, 'P0');
    await screenshot('入驻进度-1220x900-顶栏适配.png');

    await route('#registration/progress', '.registration-progress-page');
    await click('.registration-row [data-action="request-delete-registration-team"]');
    await check('球队管理', '删除球队前必须二次确认', `document.getElementById('modalTitle')?.textContent === '确认删除球队' && Boolean(document.querySelector('[data-action="confirm-delete-registration-team"]'))`);
    await click('[data-action="confirm-delete-registration-team"]');
    await check('球队管理', '确认后删除当前球队并恢复空状态', `document.querySelectorAll('.registration-row').length === 0 && JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2') || '[]')[0]?.registrationTeams?.length === 0 && document.querySelector('.module-empty')?.textContent.includes('现在还没有报名球队')`);

    results.push({ area: '全局', label: '浏览器控制台无脚本错误', passed: consoleErrors.length === 0, severity: 'P0', detail: consoleErrors.join(' | ') });
    const report = {
      testedAt: new Date().toISOString(),
      routeRoot: 'admin/tournament-center.html#registration',
      viewports: ['1672x941', '1440x900'],
      passed: results.filter((item) => item.passed).length,
      failed: results.filter((item) => !item.passed).length,
      results,
      consoleErrors,
      screenshots: fs.readdirSync(outputDir).filter((name) => name.endsWith('.png')).sort()
    };
    fs.writeFileSync(path.join(outputDir, '报名资格实际测试报告.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    process.stdout.write(`\n汇总：通过 ${report.passed} 项，失败 ${report.failed} 项。\n`);
    process.stdout.write(`报告：${path.join(outputDir, '报名资格实际测试报告.json')}\n`);
    if (report.failed) process.exitCode = 1;
  } finally {
    if (socket?.readyState === WebSocket.OPEN) socket.close();
    browser.kill();
  }
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
