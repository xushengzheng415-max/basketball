const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const debugPort = 9342;
const profileDir = path.join(process.env.TEMP || process.cwd(), `sxf-groups-e2e-${Date.now()}`);
const outputDir = path.resolve(__dirname, '..', 'outputs', '赛事中心验证');
const url = 'http://127.0.0.1:5174/tournament-center.html?demo=1#event/groups';
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
    const page = targets.find((target) => target.type === 'page');
    if (!page) throw new Error('未找到赛事中心页面');
    socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.once('open', resolve);
      socket.once('error', reject);
    });
    let sequence = 0;
    const pending = new Map();
    const consoleErrors = [];
    const pageErrors = [];
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
        pageErrors.push(message.params.exceptionDetails?.exception?.description || message.params.exceptionDetails?.text || '页面脚本异常');
      }
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression) => {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || '页面执行失败');
      return result.result.value;
    };
    const waitFor = async (selector, timeout = 6000) => {
      const startedAt = Date.now();
      while (Date.now() - startedAt < timeout) {
        if (await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`)) return;
        await wait(80);
      }
      throw new Error(`元素未出现：${selector}${pageErrors.length ? `；页面异常：${pageErrors.join(' | ')}` : ''}`);
    };
    const assert = async (label, expression) => {
      if (!await evaluate(expression)) throw new Error(`断言失败：${label}`);
      process.stdout.write(`通过：${label}\n`);
    };
    const click = async (selector) => {
      await waitFor(selector);
      await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
      await wait(120);
    };
    const change = async (selector, value) => {
      await waitFor(selector);
      await evaluate(`(() => { const node = document.querySelector(${JSON.stringify(selector)}); node.value = ${JSON.stringify(value)}; node.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      await wait(120);
    };
    const screenshot = async (name) => {
      const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(path.join(outputDir, name), Buffer.from(result.data, 'base64'));
    };
    const verifyCompetitionPreview = async (competition, stageCount, totalMatches) => {
      await click('[data-action="edit-group"]');
      await waitFor('[data-group-form]');
      await change('[data-group-form] [name="competition"]', competition);
      await click('[data-action="save-group"]');
      await waitFor('.format-page');
      await assert(`${competition}自动生成${stageCount}个阶段和${totalMatches}场`, `document.querySelectorAll('.format-stage-card').length === ${stageCount} && document.querySelector('.format-generated-summary')?.textContent.includes(${JSON.stringify(`${totalMatches} 场`)})`);
    };

    await send('Runtime.enable');
    await send('Page.enable');
    await send('Page.navigate', { url });
    await wait(300);
    await evaluate(`(() => {
      const event = {
        id: 'format-e2e', name: '2026 赛小蜂青少年篮球联赛', state: '筹备中', stateClass: 'blue',
        startDate: '2026-07-18', endDate: '2026-08-26', firstGroup: 'U12男子组',
        groupRows: [
          { name: 'U12男子组', format: '5V5', competition: '小组循环 + 淘汰赛', target: 32, joined: 32, status: '已确认' },
          { name: 'U10成长组', format: '5V5', competition: '单场淘汰赛', target: 8, joined: 0, status: '报名中', competitionConfig: {
            formatType: 'knockout', configured: true, stages: [
              { id: 'knockout-stage', name: '单场淘汰赛', type: 'knockout' },
              { id: 'final', name: '决赛', type: 'final' }
            ]
          } }
        ],
        workflow: {}
      };
      localStorage.setItem('sxf_tournament_spaces_v2', JSON.stringify([event]));
      localStorage.setItem('sxf_tournament_selected_space_v2', event.id);
      location.reload();
    })()`);
    await wait(500);
    await evaluate(`location.hash = 'event/groups'`);
    await wait(250);
    await waitFor('.group-management-list');
    await assert('组别设置页只列组别不混排赛制编辑器', `document.querySelectorAll('.group-management-row').length === 2 && !document.querySelector('.format-config-grid')`);
    await assert('组别列表直接展示分组与晋级摘要', `document.querySelector('.group-management-row .group-structure-cell')?.textContent.includes('4组 × 8队 · 前2名')`);
    await assert('组别页只显示设定规模不显示旧报名进度', `document.querySelector('.group-management-row .group-structure-cell b')?.textContent.trim() === '32 支' && !document.querySelector('.group-management-row .group-structure-cell')?.textContent.includes('32 / 32')`);
    await screenshot('组别设置-1672x941.png');
    await click('.group-management-row:nth-of-type(3) [data-action="open-format-settings"]');
    await waitFor('.format-page');
    await assert('旧版8队淘汰数据自动升级为三轮七场', `[...document.querySelectorAll('.format-stage-card b')].map(node => node.textContent.trim()).join('|') === '8进4|4进2|决赛' && [...document.querySelectorAll('.format-preview-metrics b')].map(node => node.textContent.trim()).join('|') === '8|3|0|7'`);
    await assert('8队单败淘汰按完整轮次生成', `[...document.querySelectorAll('.format-stage-card b')].map(node => node.textContent.trim()).join('|') === '8进4|4进2|决赛'`);
    await assert('单场淘汰场次数为4加2加1', `[...document.querySelectorAll('.format-preview-stage header strong')].map(node => node.textContent.trim()).join('|') === '4 场比赛|2 场比赛|1 场比赛'`);
    await assert('8队单败淘汰摘要为3轮7场且无轮空', `[...document.querySelectorAll('.format-preview-metrics b')].map(node => node.textContent.trim()).join('|') === '8|3|0|7'`);
    await assert('淘汰赛明确划分上下半区', `document.querySelectorAll('.preview-knockout-zones').length === 2 && document.querySelector('.format-preview-flow')?.textContent.includes('上半区冠军') && document.querySelector('.format-preview-flow')?.textContent.includes('下半区冠军')`);
    await assert('淘汰赛阶段不再显示小组积分参数', `document.querySelector('.knockout-stage-rules') && !document.querySelector('[data-format-setting="groupCount"]')`);
    await screenshot('单场淘汰-上下半区-1672x941.png');
    await click('[data-action="back-to-groups"]');
    await waitFor('.group-management-list');
    await evaluate(`(() => { const spaces = JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2') || '[]'); spaces[0].groupRows[1].target = 6; localStorage.setItem('sxf_tournament_spaces_v2', JSON.stringify(spaces)); location.reload(); })()`);
    await wait(400);
    await waitFor('.group-management-list');
    await click('.group-management-row:nth-of-type(3) [data-action="open-format-settings"]');
    await waitFor('.format-page');
    await assert('6队单败淘汰生成2加2加1共5场', `[...document.querySelectorAll('.format-preview-stage header strong')].map(node => node.textContent.trim()).join('|') === '2 场比赛|2 场比赛|1 场比赛'`);
    await assert('6队淘汰摘要显示3轮2个轮空和5场比赛', `[...document.querySelectorAll('.format-preview-metrics b')].map(node => node.textContent.trim()).join('|') === '6|3|2|5'`);
    await assert('6队首轮对阵跳过两个轮空签位', `document.querySelector('.preview-knockout-zones')?.textContent.includes('3号签位 vs 6号签位')`);
    await click('[data-action="back-to-groups"]');
    await waitFor('.group-management-list');
    await evaluate(`(() => { const spaces = JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2') || '[]'); spaces[0].groupRows[1].name = spaces[0].groupRows[0].name; localStorage.setItem('sxf_tournament_spaces_v2', JSON.stringify(spaces)); location.reload(); })()`);
    await wait(400);
    await waitFor('.group-management-list');
    await assert('可识别两个同名组别的独立行数据', `[...document.querySelectorAll('.group-management-row strong')].every(node => node.textContent === 'U12男子组')`);
    await click('.group-management-row:nth-of-type(3) [data-action="edit-group"]');
    await waitFor('[data-group-form]');
    await assert('标准组别与自定义名称分开维护', `Boolean(document.querySelector('[data-group-form] select[name="baseGroup"]') && document.querySelector('[data-group-form] input[name="name"]'))`);
    await change('[data-group-form] [name="name"]', 'U12乙组');
    await click('[data-action="save-group"]');
    await waitFor('.group-management-list');
    await assert('修改第二个组别不会联动修改第一个组别', `(() => { const names = [...document.querySelectorAll('.group-management-row strong')].map(node => node.textContent.trim()); const rows = JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2') || '[]')[0]?.groupRows || []; return names.join('|') === 'U12男子组|U12乙组' && rows[0].id && rows[1].id && rows[0].id !== rows[1].id; })()`);
    await evaluate(`(() => { const spaces = JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2') || '[]'); spaces[0].groupRows[1].name = spaces[0].groupRows[0].name; localStorage.setItem('sxf_tournament_spaces_v2', JSON.stringify(spaces)); location.reload(); })()`);
    await wait(400);
    await waitFor('.group-management-list');
    await click('.group-management-row:nth-of-type(3) [data-action="request-delete-group"]');
    await assert('空组别删除前要求二次确认', `document.getElementById('modalTitle')?.textContent === '确认删除组别' && document.querySelector('[data-action="confirm-delete-group"]')`);
    await click('[data-action="confirm-delete-group"]');
    await assert('确认后只删除点击的同名空组别', `document.querySelectorAll('.group-management-row').length === 1 && document.querySelector('.group-management-row')?.textContent.includes('32 支')`);
    await click('.group-management-row [data-action="request-delete-group"]');
    await assert('旧joined字段不会误判为真实入驻球队', `document.getElementById('modalTitle')?.textContent === '确认删除组别' && !document.getElementById('modalBody')?.textContent.includes('已有 32 支球队入驻')`);
    await click('[data-action="close-modal"]');
    await click('.group-management-row [data-action="open-format-settings"]');
    await waitFor('.format-page');
    await assert('点击查看赛制进入只读预览页', `location.hash === '#event/format' && document.querySelector('[data-action="back-to-groups"]') && document.querySelector('.format-group-toolbar')?.textContent.includes('已按组别资料生成')`);
    await assert('赛制预览没有任何结构设置操作', `!document.querySelector('.format-type-card') && !document.querySelector('.format-stage-remove') && !document.querySelector('[data-action="add-format-stage"]') && !document.querySelector('[data-format-point]') && !document.querySelector('#pageActions [data-action="save-page"]')`);
    await assert('进入预览页直接按组别资料生成阶段', `document.querySelectorAll('.format-stage-card').length === 4`);
    await assert('右侧提供分阶段与总场次预览', `document.querySelector('.format-preview-panel') && document.querySelectorAll('.format-preview-metrics b').length === 4 && document.querySelector('.format-save-note')?.textContent.includes('共')`);
    await assert('赛事状态与数据字段一致', `document.getElementById('eventStatus')?.textContent === '筹备中'`);
    await assert('没有把原型切片作为正式界面背景', `![...document.querySelectorAll('*')].some(node => getComputedStyle(node).backgroundImage.includes('reference-crops'))`);
    await screenshot('组别与赛制-1672x941.png');

    await click('[data-action="edit-group"]');
    await waitFor('[data-group-form]');
    await assert('组别资料统一提供分组与晋级结构', `Boolean(document.querySelector('[data-group-form] [name="groupCount"]') && document.querySelector('[data-group-form] [name="teamsPerGroup"]') && document.querySelector('[data-group-form] [name="advancePerGroup"]'))`);
    await assert('组别赛制仅保留五种青少年常用模式', `[...document.querySelectorAll('[data-group-form] [name="competition"] option')].map(node => node.textContent.trim()).join('|') === '小组循环 + 淘汰赛（不带排位赛）|小组循环 + 淘汰赛（带排位赛）|小组循环 + 单循环|单败淘汰|全部球队单循环'`);
    await change('[data-group-form] [name="competition"]', '小组循环 + 淘汰赛（带排位赛）');
    await change('[data-group-form] [name="groupCount"]', '2');
    await change('[data-group-form] [name="teamsPerGroup"]', '4');
    await assert('8队两组带排位赛保留分组结构并自动计算计划队数', `document.querySelector('[data-group-form] [name="target"]')?.value === '8' && document.querySelector('[data-group-form] [name="competition"]')?.value === '小组循环 + 淘汰赛（带排位赛）'`);
    await click('[data-action="save-group"]');
    await waitFor('.format-page');
    await assert('带排位赛生成小组循环和排位赛两个阶段共16场', `[...document.querySelectorAll('.format-stage-card b')].map(node => node.textContent.trim()).join('|') === '小组单循环|全员分层排位赛' && document.querySelector('.format-generated-summary')?.textContent.includes('16 场')`);
    await click('[data-action="edit-group"]');
    await waitFor('[data-group-form]');
    await change('[data-group-form] [name="competition"]', '小组循环 + 单循环');
    await change('[data-group-form] [name="groupCount"]', '3');
    await change('[data-group-form] [name="teamsPerGroup"]', '3');
    await change('[data-group-form] [name="advancePerGroup"]', '1');
    await assert('9队分3组每组第一名进入晋级组单循环', `document.querySelector('[data-group-form] [name="target"]')?.value === '9' && document.querySelector('[data-group-structure-summary]')?.textContent.includes('共 3 队进入晋级组单循环')`);
    await click('[data-action="save-group"]');
    await waitFor('.format-page');
    await assert('9队两阶段赛制生成小组循环和晋级组单循环', `[...document.querySelectorAll('.format-stage-card b')].map(node => node.textContent.trim()).join('|') === '小组单循环|晋级组单循环'`);
    await assert('9队案例第一阶段9场第二阶段3场共12场', `[...document.querySelectorAll('.format-preview-stage header strong')].map(node => node.textContent.trim()).join('|') === '9 场比赛|3 场比赛' && document.querySelector('.format-generated-summary')?.textContent.includes('12 场')`);
    await assert('3支晋级球队循环赛不产生淘汰签位警告', `!document.querySelector('.format-validation-list')?.textContent.includes('轮空位')`);
    await click('[data-action="edit-group"]');
    await waitFor('[data-group-form]');
    await change('[data-group-form] [name="competition"]', '小组循环 + 争冠单败淘汰');
    await change('[data-group-form] [name="groupCount"]', '8');
    await change('[data-group-form] [name="teamsPerGroup"]', '4');
    await change('[data-group-form] [name="advancePerGroup"]', '2');
    await assert('分组结构自动计算32支计划球队', `document.querySelector('[data-group-form] [name="target"]')?.value === '32' && document.querySelector('[data-group-form] [name="target"]')?.readOnly`);
    await click('[data-action="save-group"]');
    await waitFor('.format-page');
    await assert('赛制页不再重复编辑分组结构', `!document.querySelector('[data-format-setting]') && !document.querySelector('[data-format-point]') && (() => { const row = JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2'))[0].groupRows[0]; return Number(row.groupCount) === 8 && Number(row.teamsPerGroup) === 4 && Number(row.advancePerGroup) === 2; })()`);
    await assert('8组每组4队前2名会生成16队完整淘汰链路', `[...document.querySelectorAll('.format-stage-card b')].map(node => node.textContent.trim()).join('|') === '小组单循环|16强淘汰赛|1/4决赛|半决赛|决赛'`);
    await assert('16队淘汰阶段场次为8加4加2加1', `[...document.querySelectorAll('.format-preview-stage header strong')].slice(1).map(node => node.textContent.trim()).join('|') === '8 场比赛|4 场比赛|2 场比赛|1 场比赛'`);
    await assert('8组4队小组单循环共48场', `document.querySelector('.format-preview-stage header strong')?.textContent.trim() === '48 场比赛'`);
    await assert('小组加16队单败总计63场', `document.querySelector('.format-generated-summary')?.textContent.includes('63 场') && [...document.querySelectorAll('.format-preview-metrics b')].at(-1)?.textContent.trim() === '63'`);
    await screenshot('小组赛加16队淘汰-1672x941.png');
    await click('[data-action="edit-group"]');
    await waitFor('[data-group-form]');
    await assert('单败赛制提示是否设置三四名决赛', `!document.querySelector('[data-third-place-field]')?.hidden && document.querySelector('[name="thirdPlaceMatch"]')?.value === 'no' && document.querySelector('[data-third-place-field]')?.textContent.includes('增加 1 场季军赛')`);
    await screenshot('编辑组别-三四名决赛选项-1672x941.png');
    await change('[data-group-form] [name="thirdPlaceMatch"]', 'yes');
    await click('[data-action="save-group"]');
    await waitFor('.format-page');
    await assert('开启三四名决赛后自动增加独立阶段', `[...document.querySelectorAll('.format-stage-card b')].map(node => node.textContent.trim()).join('|') === '小组单循环|16强淘汰赛|1/4决赛|半决赛|三、四名决赛|决赛'`);
    await assert('三四名决赛计入阶段场次和赛事总场次', `document.querySelector('.format-preview-flow')?.textContent.includes('半决赛负者 1') && document.querySelector('.format-generated-summary')?.textContent.includes('64 场') && [...document.querySelectorAll('.format-preview-metrics b')].at(-1)?.textContent.trim() === '64'`);
    await screenshot('含三四名决赛-1672x941.png');
    await click('[data-action="edit-group"]');
    await waitFor('[data-group-form]');
    await change('[data-group-form] [name="thirdPlaceMatch"]', 'no');
    await click('[data-action="save-group"]');
    await waitFor('.format-page');
    await assert('关闭三四名决赛后恢复原赛制结构', `![...document.querySelectorAll('.format-stage-card b')].some(node => node.textContent.includes('三、四名')) && document.querySelector('.format-generated-summary')?.textContent.includes('63 场')`);
    await click('[data-action="edit-group"]');
    await waitFor('[data-group-form]');
    await change('[data-group-form] [name="advancePerGroup"]', '1');
    await click('[data-action="save-group"]');
    await waitFor('.format-page');
    await assert('每组晋级数改为1后自动缩减为8队淘汰', `[...document.querySelectorAll('.format-stage-card b')].map(node => node.textContent.trim()).join('|') === '小组单循环|1/4决赛|半决赛|决赛'`);
    await click('[data-action="edit-group"]');
    await waitFor('[data-group-form]');
    await change('[data-group-form] [name="advancePerGroup"]', '2');
    await click('[data-action="save-group"]');
    await waitFor('.format-page');
    await assert('每组晋级数恢复2后自动恢复16强轮次', `[...document.querySelectorAll('.format-stage-card b')].map(node => node.textContent.trim()).join('|') === '小组单循环|16强淘汰赛|1/4决赛|半决赛|决赛'`);
    await click('[data-action="edit-group"]');
    await waitFor('[data-group-form]');
    await assert('分组赛制不再暴露已废弃的分组双败选项', `![...document.querySelectorAll('[data-group-form] [name="competition"] option')].some(node => node.textContent.includes('小组循环 + 双败'))`);
    await click('[data-action="close-modal"]');
    await verifyCompetitionPreview('小组循环赛（组内排名）', 1, '48');
    await assert('单独小组循环赛明确无第二阶段', `document.querySelector('.format-preview-metrics')?.textContent.includes('排名方式') && document.querySelector('.format-preview-flow')?.textContent.includes('无第二阶段') && document.querySelector('.format-group-source')?.textContent.includes('积分排名')`);
    await click('[data-action="edit-group"]');
    await waitFor('[data-group-form]');
    await assert('单独小组循环赛不再显示每组晋级设置', `document.querySelector('[data-group-advance-field]')?.hidden && document.querySelector('[data-group-structure-summary]')?.textContent.includes('不产生晋级球队，也不设置第二阶段')`);
    await screenshot('编辑组别-单独小组循环赛-1672x941.png');
    await click('[data-action="close-modal"]');
    await verifyCompetitionPreview('全部球队单循环', 1, '496');
    await click('[data-action="edit-group"]');
    await waitFor('[data-group-form]');
    await assert('循环赛仍显示三四名决赛说明但禁止选择', `!document.querySelector('[data-third-place-field]')?.hidden && document.querySelector('[name="thirdPlaceMatch"]')?.disabled && document.querySelector('[data-third-place-hint]')?.textContent.includes('最终名次按积分排名')`);
    await click('[data-action="close-modal"]');
    await verifyCompetitionPreview('全部球队双循环', 1, '992');
    await verifyCompetitionPreview('单败淘汰（邀请赛）', 5, '31');
    await verifyCompetitionPreview('双败淘汰（邀请赛）', 4, '62–63');
    await verifyCompetitionPreview('小组循环 + 争冠单败淘汰', 5, '63');
    await assert('编辑组别后直接生成并保存对应赛制结构', `(() => { const row = JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2') || '[]')[0]?.groupRows?.[0]; return row?.competitionConfig?.configured && row?.competitionConfig?.stages?.length === 5 && Number(row?.competitionConfig?.groupCount) === 8; })()`);

    await click('[data-action="edit-group"]');
    await waitFor('[data-group-form]');
    await change('[data-group-form] [name="teamsPerGroup"]', '2');
    await change('[data-group-form] [name="advancePerGroup"]', '4');
    await click('[data-action="save-group"]');
    await assert('每组晋级数大于球队数会在组别资料中阻断', `Boolean(document.querySelector('[data-group-form]')) && document.getElementById('toast')?.textContent.includes('晋级数量不能大于')`);
    await click('[data-action="close-modal"]');
    await assert('非法组别结构不会覆盖已保存赛制', `(() => { const row = JSON.parse(localStorage.getItem('sxf_tournament_spaces_v2') || '[]')[0]?.groupRows?.[0]; return Number(row?.competitionConfig?.groupCount) === 8 && Number(row?.competitionConfig?.teamsPerGroup) === 4; })()`);

    await evaluate(`location.reload()`);
    await wait(450);
    await waitFor('.format-page');
    await assert('刷新后恢复最后一次合法组别结构和总场次', `document.querySelector('.format-group-source')?.textContent.includes('8 组') && document.querySelector('.format-group-source')?.textContent.includes('4 队') && document.querySelector('.format-generated-summary')?.textContent.includes('63 场')`);

    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await wait(180);
    await assert('1440宽度仍无横向错位', `document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1`);
    await screenshot('组别与赛制-1440x900.png');
    await send('Emulation.setDeviceMetricsOverride', { width: 1100, height: 760, deviceScaleFactor: 1, mobile: false });
    await wait(180);
    await assert('窄屏页首左右区域不再重叠', `(() => { const left = document.querySelector('.topbar-context')?.getBoundingClientRect(); const right = document.querySelector('.topbar-actions')?.getBoundingClientRect(); return left && right && left.right <= right.left + 1; })()`);
    await assert('赛制预览页首不再出现保存操作', `!document.getElementById('pageActions')?.textContent.trim()`);
    await assert('窄屏阶段卡片文字不再溢出', `[...document.querySelectorAll('.format-stage-card')].every(node => node.scrollWidth <= node.clientWidth + 1)`);
    await assert('预览页不存在可编辑下拉框', `document.querySelectorAll('.format-stage-form select').length === 0`);
    await screenshot('组别与赛制-1100x760.png');
    await click('[data-action="back-to-groups"]');
    await assert('预览结束返回组别列表', `location.hash === '#event/groups' && Boolean(document.querySelector('.group-management-list'))`);
    if (consoleErrors.length) throw new Error(`控制台错误：${consoleErrors.join(' | ')}`);
    process.stdout.write('组别与赛制交互验证完成。\n');
  } finally {
    if (socket?.readyState === WebSocket.OPEN) socket.close();
    browser.kill();
  }
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
