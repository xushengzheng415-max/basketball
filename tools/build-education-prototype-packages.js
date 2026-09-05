'use strict';

const fs = require('fs');
const path = require('path');

const root = 'E:\\Documents\\saixoafeng_basketball\\赛小蜂篮球UI\\3.0版本\\01-机构PC后台\\01-机构经营后台';
const items = [
  {
    name: '课程管理-v3', source: `${root}\\02-教务中心\\01-课程管理\\01-确认稿\\课程管理-v3.png`,
    summary: '课程列表、课程详情、关联课包和开班情况的PC主从页面。',
    title: '课程管理', action: '新建课程', master: { x: 270, y: 202, width: 722, height: 713 }, detail: { x: 1004, y: 202, width: 644, height: 713 },
    fields: '课程名称、课程分类、适龄范围、默认单节时长、课程介绍、招生状态、关联课包、已开班级',
    interactions: '搜索与状态筛选；选择课程；新建/编辑/暂停课程；进入关联课包和班级。'
  },
  {
    name: '班级管理-v2', source: `${root}\\02-教务中心\\02-班级管理\\01-确认稿\\班级管理-v2.png`,
    summary: '班级列表、课程与教练、在班学员和排课摘要的PC主从页面。',
    title: '班级管理', action: '新建班级', master: { x: 270, y: 202, width: 722, height: 713 }, detail: { x: 1004, y: 202, width: 644, height: 713 },
    fields: '班级名称、关联课程、主教练、容量、开班日期、校区、场地、在班学员、排课摘要、状态',
    interactions: '搜索/筛选班级；选择班级；新建/修改/结束班级；添加、移出或转班学员；进入排课。'
  },
  {
    name: '排课管理-v3', source: `${root}\\02-教务中心\\03-排课管理\\01-确认稿\\排课管理-v3.png`,
    summary: '周课表、时间刻度、冲突检查与排课详情的PC排课页面。',
    title: '排课管理', action: '新建排课', master: { x: 268, y: 203, width: 866, height: 705 }, detail: { x: 1145, y: 203, width: 503, height: 705 },
    fields: '周日期、班级、课程、教练、场地、开始时间、时长、课堂进度、预计学员、冲突和同步状态',
    interactions: '切换周；按班级/教练/场地筛选；缩放时间刻度；单节或批量排课；修改、调课、停课和冲突确认。'
  },
  {
    name: '学员管理-v1', source: `${root}\\03-学员管理\\01-确认稿\\学员管理-v1.png`,
    summary: '学员列表、家长绑定、课程账户和近期出勤的PC主从页面。',
    title: '学员管理', action: '家长扫码建档', master: { x: 268, y: 205, width: 716, height: 700 }, detail: { x: 996, y: 205, width: 652, height: 700 },
    fields: '学员姓名、头像、性别、出生日期、学校年级、家长关系与手机号、建档状态、课程、课包、班级、课时、有效期',
    interactions: '搜索/筛选学员；生成家长通用建档码；确认、退回或合并档案；补充课程课包班级；编辑和续费。'
  },
  {
    name: '员工与权限-v2', source: `${root}\\07-员工与权限\\01-确认稿\\员工与权限-v2.png`,
    summary: '用于教练管理的员工列表、微信邀请和使用端权限PC主从页面。',
    title: '教练管理', action: '添加教练', master: { x: 278, y: 182, width: 654, height: 730 }, detail: { x: 941, y: 182, width: 704, height: 730 },
    fields: '教练姓名、手机号、微信绑定、擅长方向、负责班级、小程序状态、最近使用、账号状态',
    interactions: '搜索/筛选教练；生成一次性小程序码和邀请链接；刷新、复制和撤销邀请；停用教练；查看班级。'
  }
];

function crop(id, output, bbox, notes) {
  return { id, category: 'reference', implementation: 'crop-reference', output: `08-reference-crops/${output}.png`, source_bbox: bbox, notes };
}

for (const item of items) {
  const assetDir = path.join(path.dirname(item.source), `${item.name}_assets`);
  const manifestPath = path.join(assetDir, 'manifest.json');
  const current = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const screen = current.screen;
  const sidebar = { x: 0, y: 0, width: 250, height: screen.height };
  const header = { x: 250, y: 0, width: screen.width - 250, height: 106 };
  const filters = { x: 268, y: 117, width: screen.width - 292, height: 77 };
  current.summary = item.summary;
  current.status = 'preparing';
  current.entries = [
    current.entries.find((entry) => entry.id === 'source-prototype'),
    { id: 'layout-sidebar', category: 'layout', implementation: 'panel-structure', source_bbox: sidebar, notes: '固定机构侧栏；代码实现并统一复用赛事中心尺寸和视觉规则。' },
    { id: 'layout-header', category: 'layout', implementation: 'panel-structure', source_bbox: header, notes: '固定页面标题、校区、日期、报表、赛事中心和账号区域。' },
    { id: 'layout-filters', category: 'layout', implementation: 'panel-structure', source_bbox: filters, notes: '搜索、业务筛选和主操作区。' },
    { id: 'layout-master', category: 'layout', implementation: 'panel-structure', source_bbox: item.master, notes: '左侧主列表或周课表，使用真实数据和选择状态。' },
    { id: 'layout-detail', category: 'layout', implementation: 'panel-structure', source_bbox: item.detail, notes: '右侧详情、编辑、状态和关联业务面板。' },
    { id: 'page-title', category: 'text', implementation: 'text-code', text: item.title, source_bbox: { x: 275, y: 24, width: 260, height: 45 }, notes: '页面主标题由正式路由渲染。' },
    { id: 'primary-action', category: 'control', implementation: 'code', action: item.action, target: '正式业务表单或邀请面板', states: ['default', 'hover', 'loading', 'disabled'], source_bbox: { x: screen.width - 155, y: 134, width: 120, height: 45 }, notes: '主按钮必须连接真实接口，禁止死按钮。' },
    crop('crop-sidebar', '固定侧栏', sidebar, '侧栏尺寸、字号、层级与选中态参考。'),
    crop('crop-master', '主列表或课表', item.master, '主要数据区域、表头、行高和选中态参考。'),
    crop('crop-detail', '详情面板', item.detail, '右侧详情层级、卡片间距和底部操作参考。')
  ];
  fs.writeFileSync(manifestPath, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
  const readme = `# ${item.name} 原型拆解说明\n\n源图：\`${item.source}\`  \n尺寸：\`${screen.width} × ${screen.height}\`\n\n## 页面结构\n\n固定机构侧栏与顶部栏；业务区由筛选工具条、左侧主列表/课表和右侧详情面板组成。正式页面沿用3.0主从结构，不把原图作为背景。\n\n## 交互与状态\n\n${item.interactions} 所有按钮必须覆盖默认、悬停、加载、禁用、空数据和接口失败状态。\n\n## 数据字段\n\n${item.fields}。所有列表、详情、计数和状态来自正式教务接口，不写入原型演示数据。\n\n## 素材决策\n\n品牌Logo、头像和真实照片使用正式素材；侧栏图标优先复用项目通用图标库。文字、表格、按钮、卡片、开关、课表和图表全部使用代码重建。参考裁切和标注层只用于截图比较，不进入生产页面。\n\n## 素材缺口\n\n无阻断性图片素材缺口。若通用图标库缺少语义图标，实施时按项目图标规则补充有授权来源的SVG；不得使用Emoji或原型裁切代替。\n\n## 开发边界\n\n正式目标为 \`admin/education-center.html\` 及其真实云接口。赛事数据不进入教务页面；教练只使用小程序，家长只通过服务号查看本人孩子；支付、退款和对账不在本轮范围。\n`;
  fs.writeFileSync(path.join(assetDir, 'README.md'), readme, 'utf8');
  process.stdout.write(`Prepared ${manifestPath}\n`);
}
