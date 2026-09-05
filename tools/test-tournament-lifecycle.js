const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9334;
const profileDir = path.join(process.env.TEMP || process.cwd(), `sxf-tournament-e2e-${Date.now()}`);
const outputDir = path.resolve(__dirname, '..', 'outputs', '赛事中心验证');
const logoPath = path.resolve(__dirname, '..', 'admin', 'assets', 'tournaments', 'summer-league-2026.png');
const url = 'http://127.0.0.1:5174/tournament-center.html?demo=1#spaces';

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function pollJson(route, timeout = 10000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}${route}`);
      if (response.ok) return response.json();
    } catch (error) {
      // Browser is still starting.
    }
    await delay(100);
  }
  throw new Error(`等待浏览器调试端口超时：${route}`);
}

async function run() {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = spawn(edgePath, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1670,941',
    url
  ], { stdio: 'ignore' });

  let socket;
  const report = [];
  const consoleErrors = [];

  try {
    const targets = await pollJson('/json/list');
    const page = targets.find((target) => target.type === 'page' && target.url.includes('tournament-center.html'))
      || targets.find((target) => target.type === 'page');
    if (!page) throw new Error('未找到赛事中心测试页面');
    socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.once('open', resolve);
      socket.once('error', reject);
    });

    let sequence = 0;
    const pending = new Map();
    const listeners = new Map();
    socket.on('message', (buffer) => {
      const message = JSON.parse(buffer.toString());
      if (message.id && pending.has(message.id)) {
        const { resolve, reject } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
        return;
      }
      if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
        consoleErrors.push(message.params.args.map((item) => item.value || item.description || '').join(' '));
      }
      const queue = listeners.get(message.method);
      if (queue?.length) queue.shift()(message.params);
    });

    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
    const once = (method, timeout = 5000) => new Promise((resolve, reject) => {
      const queue = listeners.get(method) || [];
      const timer = setTimeout(() => reject(new Error(`等待事件超时：${method}`)), timeout);
      queue.push((params) => {
        clearTimeout(timer);
        resolve(params);
      });
      listeners.set(method, queue);
    });
    const evaluate = async (expression) => {
      const result = await send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true
      });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || '页面脚本执行失败');
      return result.result.value;
    };
    const waitFor = async (selector, timeout = 5000) => {
      const startedAt = Date.now();
      while (Date.now() - startedAt < timeout) {
        if (await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`)) return;
        await delay(80);
      }
      throw new Error(`页面元素未出现：${selector}`);
    };
    const click = async (selector) => {
      await waitFor(selector);
      const clicked = await evaluate(`(() => {
        const element = document.querySelector(${JSON.stringify(selector)});
        if (!element) return false;
        element.click();
        return true;
      })()`);
      if (!clicked) throw new Error(`无法点击：${selector}`);
      await delay(120);
    };
    const fill = async (selector, value) => {
      await waitFor(selector);
      await evaluate(`(() => {
        const element = document.querySelector(${JSON.stringify(selector)});
        element.value = ${JSON.stringify(value)};
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      })()`);
    };
    const route = async (hash) => {
      await evaluate(`location.hash = ${JSON.stringify(hash)}`);
      await delay(160);
    };
    const assert = async (label, expression) => {
      const passed = await evaluate(expression);
      if (!passed) throw new Error(`断言失败：${label}`);
      report.push(`通过：${label}`);
    };

    await send('Runtime.enable');
    await send('Page.enable');
    await send('Page.navigate', { url });
    await delay(900);
    await evaluate(`localStorage.removeItem('sxf_tournament_spaces_v2'); localStorage.removeItem('sxf_tournament_selected_space_v2'); location.reload()`);
    await delay(400);
    await waitFor('[data-action="create-event"]');
    await assert('空账号进入赛事空间列表', `location.hash === '#spaces' && document.querySelectorAll('.event-space-card').length === 0`);

    await click('[data-action="create-event"]');
    await assert('创建赛事弹窗不再创建组别', `!document.querySelector('[data-create-event-form] [name="firstGroup"]')`);
    await fill('[data-create-event-form] [name="name"]', '全流程测试篮球邀请赛');
    await fill('[data-create-event-form] [name="startDate"]', '2026-08-19');
    await fill('[data-create-event-form] [name="endDate"]', '2026-08-25');
    await click('[data-create-event-form] [data-action="choose-logo-background"][data-logo-background="white"]');
    await assert('创建赛事可选择白色 Logo 展示底色', `document.querySelector('[data-logo-background-preview]').dataset.logoBackgroundPreview === 'white'`);

    await click('[data-upload-kind="createLogo"]');
    const documentNode = await send('DOM.getDocument');
    const fileInput = await send('DOM.querySelector', {
      nodeId: documentNode.root.nodeId,
      selector: '[data-event-image-picker="createLogo"]'
    });
    if (!fileInput.nodeId) throw new Error('未找到赛事 Logo 文件选择器');
    await send('DOM.setFileInputFiles', { files: [logoPath], nodeId: fileInput.nodeId });
    await waitFor('[data-action="apply-image-edit"]');
    await delay(300);
    await click('[data-action="apply-image-edit"]');
    await waitFor('[data-action="confirm-create-event"]');
    const presetPreview = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    fs.writeFileSync(path.join(outputDir, '创建赛事-Logo预设底色-v1.png'), Buffer.from(presetPreview.data, 'base64'));
    await click('[data-action="confirm-create-event"]');
    await assert('创建后留在空间列表并新增零数据赛事卡片', `location.hash === '#spaces' && [...document.querySelectorAll('.event-space-card h3')].some((node) => node.textContent.includes('全流程测试篮球邀请赛'))`);
    await assert('所选 Logo 底色保存到赛事卡片', `document.querySelector('.event-space-card:last-of-type .event-card-cover').dataset.logoBackground === 'white' && JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].logoBackground === 'white'`);
    await click('.event-space-card:last-of-type [data-action="edit-event"]');
    await assert('赛事卡片编辑按钮进入对应赛事资料', `location.hash === '#event/profile' && document.querySelector('#eventSelector').value === JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].id`);
    await route('spaces');

    await click('.event-space-card:last-of-type [data-action="event-more"]');
    await click('[data-action="finish-event"]');
    await assert('未完成赛程和赛果时禁止结束赛事', `document.querySelector('#modalTitle').textContent.includes('暂不能结束')`);
    await click('#closeModal');

    await click('.event-space-card:last-of-type [data-action="enter-event"]');
    await assert('进入赛事空间后首先到竞赛组别页', `location.hash === '#event/groups' && Boolean(document.querySelector('[data-action="add-group"]'))`);
    const groupEntryPreview = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    fs.writeFileSync(path.join(outputDir, '赛事空间-竞赛组别入口-v1.png'), Buffer.from(groupEntryPreview.data, 'base64'));
    await route('event/profile');
    await assert('赛事资料提供两种参赛资料模式', `document.querySelectorAll('[name="participationMode"]').length === 2 && document.querySelector('[name="participationMode"][value="team-player"]')?.checked`);
    await click('[name="participationMode"][value="team-only"]');
    await assert('参赛资料模式点击后只高亮当前选项', `document.querySelectorAll('.participation-mode-card:has(input:checked)').length === 1 && document.querySelector('[name="participationMode"][value="team-only"]')?.checked && !document.querySelector('[name="participationMode"][value="team-player"]')?.checked`);
    await click('[data-action="save-page"]');
    await assert('仅球队模式保存并自动跳过球员资格审核', `(() => { const event = JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0]; return event.participationMode === 'team-only' && event.playerQualificationRequired === false && event.workflow.qualificationCompleted === true && document.querySelector('.player-service-row .switch')?.disabled; })()`);
    const teamOnlyPreview = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    fs.writeFileSync(path.join(outputDir, '赛事资料-仅球队数据模式-v1.png'), Buffer.from(teamOnlyPreview.data, 'base64'));
    await route('registration/progress');
    await assert('仅球队模式隐藏球员资格与正式名单入口', `!document.querySelector('[data-route="registration/qualification"]') && !document.querySelector('[data-route="registration/rosters"]')`);
    await route('event/profile');
    await click('[name="participationMode"][value="team-player"]');
    await click('[data-action="save-page"]');
    await route('registration/progress');
    await assert('切回球队加球员模式后恢复球员相关入口', `document.querySelector('[data-route="registration/qualification"]') && document.querySelector('[data-route="registration/rosters"]') && JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].participationMode === 'team-player'`);
    await route('event/profile');
    await assert('赛事资料页已移除赛事主背景', `!document.querySelector('[data-upload-kind="cover"]') && !document.body.textContent.includes('赛事主背景')`);
    await assert('赛事标识按创建底色展示 Logo 和名称', `document.querySelector('.event-brand-logo[data-logo-background] img') && document.querySelector('.event-brand-summary > strong')?.textContent === '全流程测试篮球邀请赛' && document.querySelector('[data-action="edit-event-brand"]')`);
    const brandPreview = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    fs.writeFileSync(path.join(outputDir, '赛事资料-标识摘要-v1.png'), Buffer.from(brandPreview.data, 'base64'));
    await click('[data-action="save-page"]');

    await route('event/groups');
    await click('[data-action="add-group"]');
    await assert('标准组别使用规范下拉并支持自定义名称', `document.querySelector('[data-group-form] select[name="baseGroup"]') && document.querySelector('[data-group-form] input[name="name"]')`);
    await fill('[data-group-form] [name="baseGroup"]', 'U12 竞技组');
    await assert('选择 U12 后自动生成出生日期限制', `document.querySelector('[data-group-form] [name="birthCutoff"]')?.value === '2014-01-01' && document.querySelector('[data-eligibility-hint]')?.textContent.includes('2014年1月1日前')`);
    await fill('[data-group-form] [name="birthCutoff"]', '2014-03-01');
    await assert('自动日期允许主办方手动调整', `document.querySelector('[data-eligibility-hint]')?.textContent.includes('2014年3月1日前')`);
    await fill('[data-group-form] [name="groupCount"]', '1');
    await fill('[data-group-form] [name="teamsPerGroup"]', '4');
    await fill('[data-group-form] [name="advancePerGroup"]', '2');
    await assert('新建组别默认采用全员分层排位结构', `document.querySelector('[data-group-form] [name="target"]')?.value === '4' && document.querySelector('[data-group-form] [name="competition"]')?.value === '小组循环 + 全员分层排位' && document.querySelector('[data-group-structure-summary]')?.textContent.includes('同名次球队进入对应排位层') && !document.querySelector('[data-group-form] [name="advancement"]')`);
    const groupModalPreview = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    fs.writeFileSync(path.join(outputDir, '新增竞赛组别-自动出生日期限制-v1.png'), Buffer.from(groupModalPreview.data, 'base64'));
    await click('[data-action="save-group"]');
    await assert('组别创建成功并直接生成全员排位赛制结构', `(() => { const group = JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].groupRows[0]; return document.body.textContent.includes('U12 竞技组') && group.birthCutoff === '2014-03-01' && group.target === '4' && group.competition === '小组循环 + 全员分层排位' && group.competitionConfig?.configured && group.competitionConfig?.stages?.length === 2; })()`);

    await route('event/registration');
    await click('[data-action="save-page"]');
    await route('event/profile');
    await click('[name="participationMode"][value="team-only"]');
    await click('[data-action="save-page"]');
    await route('registration/progress');
    await assert('仅球队入驻页明确不审核球员资格', `document.body.textContent.includes('仅球队') && document.body.textContent.includes('不审核球员资格') && document.body.textContent.includes('不进行球员资格审查')`);
    await route('registration/qualification');
    await assert('直接访问资格页也明确无需球员审核', `document.body.textContent.includes('本赛事不录入球员') && document.body.textContent.includes('不进行球员资格审查')`);
    await route('event/profile');
    await click('[name="participationMode"][value="team-player"]');
    await click('[data-action="save-page"]');
    await route('event/registration');
    await click('[data-action="show-qr"]');
    await click('#closeModal');

    await route('registration/progress');
    await evaluate(`(() => {
      const events = JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2') || '[]');
      const event = events[0];
      const names = ['启航队', '飞跃队', '雷霆队', '星火队'];
      event.registrationTeams = names.map((name, index) => ({
        id: 'FLOW-' + (index + 1), name, group: event.groupRows[0].name,
        owner: ['王领队','李领队','陈领队','赵领队'][index], phone: '1380013800' + index,
        source: '全流程测试回传', claimStatus: '已认领', players: [], updatedAt: '2026/8/1 19:00:00'
      }));
      event.registrationTeams.forEach((team) => { team.teamQualificationStatus = '\u5df2\u901a\u8fc7'; });
      event.teams = 4;
      event.groupRows[0].joined = '4';
      event.groupRows[0].status = '已确认';
      event.workflow.teamsImported = true;
      event.workflow.qualificationCompleted = true;
      localStorage.setItem('sxf_tournament_spaces_v2', JSON.stringify(events));
      location.reload();
    })()`);
    await delay(350);
    await assert('模拟正式上线后回传四支合格球队', `document.body.textContent.includes('启航队') && document.body.textContent.includes('共 4 条')`);

    await assert('球队达到设定规模后出现抽签下一步', `document.querySelector('[data-action="go-draw-next"]')?.textContent.includes('进入抽签与分组') && document.querySelector('.registration-next-step')?.textContent.includes('4 / 4 支球队')`);
    await click('[data-action="go-draw-next"]');
    await assert('抽签页自动带入当前组别和真实球队', `location.hash === '#draw/groups' && document.querySelector('.draw-context-bar')?.textContent.includes('4 支') && document.querySelector('#teamPool')?.textContent.includes('启航队') && document.querySelector('#teamPool')?.textContent.includes('星火队')`);
    await click('[data-action="auto-draw"]');
    await click('[data-action="save-groups"]');
    await assert('抽签分组已保存', `JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].workflow.drawSaved === true`);

    await route('schedule/settings');
    await click('[data-action="save-page"]');
    await route('schedule/auto');
    await click('[data-action="generate-schedule"]');
    await assert('全员分层排位自动生成八场比赛', `JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].matches === 8`);
    await evaluate('location.reload()');
    await delay(350);
    await assert('刷新页面后赛事阶段与赛程数据仍保留', `JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].workflow.scheduleGenerated === true && JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].matches === 8`);
    await route('workbench');
    await assert('工作台使用当前赛事真实数量而非旧演示数据', `document.body.textContent.includes('已生成 8 场赛程') && document.body.textContent.includes('4 / 4') && !document.body.textContent.includes('共 18 场')`);

    await route('onsite/people');
    await click('[data-action="save-assignment"]');
    await click('[data-action="test-return-results"]');
    await assert('小程序比赛结果回传后进入赛果复核', `location.hash === '#results/review'`);
    await click('[data-action="test-approve-all-results"]');
    await assert('全部赛果复核通过', `JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].workflow.resultsApproved === true`);

    await route('spaces');
    await click('.event-space-card:last-of-type [data-action="event-more"]');
    await click('[data-action="finish-event"]');
    await click('[data-action="confirm-finish-event"]');
    await assert('赛事结束并显示100%进度', `document.querySelector('.event-space-card .event-state').textContent.trim() === '已结束' && document.querySelector('.event-space-card .event-progress b').textContent.trim() === '100%'`);
    await click('.event-space-card:last-of-type [data-action="enter-event"]');
    await assert('结束后的赛事空间显示只读状态', `document.querySelector('#pageActions').textContent.includes('只读')`);
    await route('spaces');

    const lifecycle = await evaluate(`JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0]`);
    const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    const screenshotPath = path.join(outputDir, '赛事全生命周期-结束状态-v1.png');
    fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));

    const result = {
      passed: true,
      assertions: report,
      event: {
        name: lifecycle.name,
        state: lifecycle.state,
        groups: lifecycle.groups,
        teams: lifecycle.teams,
        matches: lifecycle.matches,
        progress: lifecycle.progress,
        workflow: lifecycle.workflow
      },
      consoleErrors,
      screenshot: screenshotPath
    };
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    if (socket?.readyState === WebSocket.OPEN) socket.close();
    browser.kill();
  }
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
