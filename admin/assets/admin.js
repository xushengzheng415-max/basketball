// 平台运营后台独立交互，不复用机构登录状态。
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const data = {
  tenants: [
    { name: '蜂跃篮球学院', owner: '李明', city: '北京市', campuses: 6, coaches: 28, students: 532, plan: '专业版', activity: 92, execution: 88, expires: '2026-06-30', status: '正常使用', risk: '低风险' },
    { name: '飞跃篮球训练营', owner: '张伟', city: '上海市', campuses: 4, coaches: 19, students: 312, plan: '标准版', activity: 78, execution: 76, expires: '2025-07-15', status: '正常使用', risk: '低风险' },
    { name: '冠军篮球训练营', owner: '王磊', city: '武汉市', campuses: 3, coaches: 15, students: 256, plan: '标准版', activity: 65, execution: 69, expires: '2025-05-25', status: '即将到期', risk: '中风险' },
    { name: '启航篮球教育', owner: '陈晨', city: '广州市', campuses: 2, coaches: 11, students: 198, plan: '基础版', activity: 48, execution: 52, expires: '2025-04-20', status: '即将到期', risk: '中风险' },
    { name: '未来之星篮球馆', owner: '刘洋', city: '成都市', campuses: 5, coaches: 22, students: 421, plan: '专业版', activity: 90, execution: 85, expires: '2025-08-10', status: '正常使用', risk: '低风险' },
    { name: '热血篮球公园', owner: '赵强', city: '深圳市', campuses: 2, coaches: 8, students: 142, plan: '基础版', activity: 35, execution: 40, expires: '2025-04-18', status: '风险机构', risk: '高风险' },
    { name: '星火篮球俱乐部', owner: '孙悦', city: '杭州市', campuses: 3, coaches: 13, students: 210, plan: '标准版', activity: 60, execution: 63, expires: '2025-09-05', status: '正常使用', risk: '低风险' },
    { name: '篮途体育中心', owner: '周杰', city: '南京市', campuses: 4, coaches: 17, students: 305, plan: '标准版', activity: 70, execution: 72, expires: '2025-06-05', status: '正常使用', risk: '低风险' }
  ],
  channels: [
    { name: '上海东区合伙人', type: '城市合伙人', owner: '张伟', area: '上海·浦东新区等8区', leads: 28, deals: 6, sales: 58600, commission: 11720, status: '启用' },
    { name: '杭州篮途学院', type: '机构转介绍', owner: '李娜', area: '杭州·全市', leads: 18, deals: 3, sales: 22800, commission: 2280, status: '启用' },
    { name: '赵教练推荐', type: '教练推荐', owner: '赵磊', area: '北京·朝阳区', leads: 24, deals: 4, sales: 17900, commission: 1790, status: '启用' },
    { name: '成都西区合伙人', type: '城市合伙人', owner: '王强', area: '成都·高新区等6区', leads: 16, deals: 2, sales: 12600, commission: 1260, status: '启用' },
    { name: '深圳教练联盟', type: '教练推荐', owner: '陈刚', area: '深圳·全市', leads: 12, deals: 2, sales: 9800, commission: 980, status: '启用' }
  ],
  openRecords: [
    ['未来星篮球学院', '李老师', '138****6666', '待开通', '2025-05-31 10:30'],
    ['星火篮球俱乐部', '张教练', '139****1234', '待开通', '2025-05-31 09:15'],
    ['鹏飞篮球馆', '刘馆长', '137****5678', '待开通', '2025-05-31 08:40'],
    ['飞跃篮球训练营', '王校长', '139****9088', '已开通', '2025-05-30 15:30']
  ],
  strategies: [
    { name: '到期前四周续费跟进', type: '续费提升', scope: '全部机构', trigger: '学员课包到期前28天', steps: 6, enabled: 186, result: '续费转化率 18.7%' },
    { name: '课后评价二次触达', type: '家长触达', scope: '全部机构', trigger: '学员上课后24小时', steps: 4, enabled: 132, result: '评价触达率 62.3%' },
    { name: '周末主题体验营邀约', type: '活动运营', scope: '限篮球馆', trigger: '潜客30天未到访', steps: 5, enabled: 96, result: '到访率 21.8%' },
    { name: '老学员转介绍活动', type: '转介绍', scope: '全部机构', trigger: '学员在读满60天', steps: 7, enabled: 154, result: '参与率 34.6%' },
    { name: '寒暑假续费专项方案', type: '续费提升', scope: '限篮球馆', trigger: '寒暑假前30天', steps: 8, enabled: 112, result: '续费转化率 16.2%' }
  ]
};

const state = { view: 'dashboard', selectedTenant: data.tenants[0], selectedStrategy: data.strategies[0], timer: null };

const metric = (icon, label, value, note = '较上月 <b>↑ 8.5%</b>') => `<article class="metric-card"><div class="metric-label"><span class="metric-icon">${icon}</span>${label}</div><strong>${value}</strong><small>${note}</small></article>`;
const status = value => {
  const klass = /正常|启用|已开通|已完成|低风险|已启用|在售/.test(value) ? 'ok' : /待|即将|中风险|跟进/.test(value) ? 'warn' : /高风险|风险|未启用|退款/.test(value) ? 'bad' : 'info';
  return `<span class="status ${klass}">${value}</span>`;
};
const progress = value => `${value}%<span class="progress"><i style="width:${value}%"></i></span>`;
const money = value => `¥ ${Number(value).toLocaleString('zh-CN')}`;

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(state.timer);
  state.timer = setTimeout(() => el.classList.remove('show'), 2300);
}

function linePanel(title = '租户增长', values = [94, 99, 106, 109, 117, 121, 130, 128, 136, 135, 140, 142]) {
  return `<section class="panel"><div class="panel-head"><div><h3>${title}</h3><span>近 30 天趋势</span></div><div class="legend"><span>租户总数</span><span>新增租户</span></div></div><div class="panel-body"><div class="chart-wrap"><canvas class="line-chart" data-values="${values.join(',')}"></canvas></div></div></section>`;
}

function dashboardView() {
  return `<section class="view-section">
    <div class="metric-grid">${metric('▥','租户总数','128')}${metric('●','活跃机构','86','较上月 <b>↑ 6.7%</b>')}${metric('¥','本月订阅收入','¥ 326,800','较上月 <b>↑ 12.4%</b>')}${metric('▼','分销线索','42','较上月 <b>↑ 4.2%</b>')}</div>
    <div class="dashboard-grid">
      ${linePanel()}
      <section class="panel"><div class="panel-head"><h3>套餐收入</h3><span>本月</span></div><div class="panel-body"><div class="donut-layout"><div class="donut"><span>¥326,800<small>本月收入</small></span></div><div class="donut-legend"><span><i></i>基础版 <b>39.3%</b></span><span><i></i>专业版 <b>32.5%</b></span><span><i></i>旗舰版 <b>22.0%</b></span><span><i></i>定制版 <b>6.2%</b></span></div></div></div></section>
      <section class="panel"><div class="panel-head"><h3>活跃校区</h3><span>累计</span></div><div class="panel-body"><div class="gauge"></div><div class="gauge-value"><strong>642</strong><span>活跃校区总数</span></div><p class="positive" style="text-align:center;font-size:11px">较上月 ↑ 9.3%</p></div></section>
    </div>
    <div class="dashboard-grid" style="margin-top:12px">
      <section class="panel"><div class="panel-head"><h3>机构健康度</h3><span>重点机构</span></div><div class="panel-body"><div class="health-grid"><div class="health"><i>✓</i><strong>62</strong><span>高活跃 · 72.1%</span></div><div class="health"><i>!</i><strong>18</strong><span>需关注 · 20.9%</span></div><div class="health"><i>×</i><strong>9</strong><span>即将到期 · 7.0%</span></div></div><div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>机构名称</th><th>健康度</th><th>活跃校区</th><th>风险提示</th></tr></thead><tbody>${data.tenants.slice(0,3).map(t => `<tr><td>${t.name}</td><td>${status(t.risk)}</td><td>${t.campuses}</td><td>${t.status}</td></tr>`).join('')}</tbody></table></div></div></section>
      <section class="panel"><div class="panel-head"><h3>渠道贡献</h3><span>本月收入</span></div><div class="panel-body"><div class="donut-layout"><div class="donut" style="background:conic-gradient(var(--orange) 0 56%,var(--yellow) 56% 86%,var(--blue) 86%)"><span>55.8%<small>直营收入</small></span></div><div class="donut-legend"><span><i></i>直营 <b>¥182,400</b></span><span><i></i>分销商 <b>¥96,800</b></span><span><i></i>合作渠道 <b>¥47,600</b></span></div></div></div></section>
      <section class="panel"><div class="panel-head"><h3>待处理事项</h3><span>共 27 项</span></div><div class="panel-body"><div class="todo-list"><button class="todo-item" data-view-target="provisioning"><i>＋</i><span>开通账号审核</span><strong>6</strong></button><button class="todo-item" data-view-target="tenants"><i>!</i><span>续费风险跟进</span><strong>9</strong></button><button class="todo-item" data-view-target="finance"><i>¥</i><span>佣金待结算</span><strong>12</strong></button></div><button class="button primary" style="width:100%;margin-top:12px" data-toast="运营报表已生成（演示）">生成运营报表</button></div></section>
    </div>
  </section>`;
}

function tenantRows(list = data.tenants) {
  return list.map(t => { const originalIndex = data.tenants.indexOf(t); return `<tr class="tenant-row ${state.selectedTenant.name === t.name ? 'selected' : ''}" data-tenant="${originalIndex}"><td>${t.name}</td><td>${t.owner}</td><td>${t.city}</td><td>${t.campuses}</td><td>${t.coaches}</td><td>${t.students}</td><td>${t.plan}</td><td>${progress(t.activity)}</td><td>${progress(t.execution)}</td><td>${t.expires}</td><td>${status(t.status)}</td><td><button class="action-link" data-tenant-button="${originalIndex}">查看</button><button class="action-link" data-toast="权限调整将在真实鉴权接入后开放">权限</button></td></tr>`; }).join('');
}

function tenantsView() {
  return `<section class="view-section"><div class="page-actions"><div class="context"><h2>机构租户管理</h2><p>管理机构状态、套餐、活跃度与续费风险。</p></div><button class="button primary" data-view-target="provisioning">＋ 新建机构</button></div>
    <div class="filter-bar"><input id="tenantSearch" placeholder="搜索机构名称、负责人或城市" /><select id="tenantStatus"><option value="">全部状态</option><option>正常使用</option><option>即将到期</option><option>风险机构</option></select><select><option>全部套餐</option><option>基础版</option><option>标准版</option><option>专业版</option></select><button class="button secondary" id="resetTenantFilter">重置</button></div>
    <div class="metric-grid five">${metric('●','机构总数','256','较上月 +12')}${metric('✓','正常使用','198','占比 77.34%')}${metric('○','待激活','18','占比 7.03%')}${metric('◴','即将到期','23','30天内到期')}${metric('!','风险机构','17','需重点关注')}</div>
    <section class="panel"><div class="table-wrap"><table><thead><tr><th>机构名称</th><th>负责人</th><th>城市</th><th>校区</th><th>教练</th><th>学员</th><th>套餐</th><th>活跃度</th><th>执行率</th><th>到期时间</th><th>状态</th><th>操作</th></tr></thead><tbody id="tenantTable">${tenantRows()}</tbody></table></div><div class="table-footer"><span>共 256 条 · 当前展示演示数据</span><div class="pagination"><button>‹</button><button class="active">1</button><button>2</button><button>3</button><button>›</button></div></div></section></section>`;
}

function provisioningView() {
  return `<section class="view-section"><div class="page-actions"><div class="context"><h2>机构开通与账号下发</h2><p>完成机构建档、套餐授权、功能开关与渠道绑定。</p></div></div><div class="grid-3">
    <section class="panel"><div class="panel-head"><h3>新建机构</h3><span>步骤 1 / 3</span></div><div class="panel-body"><form id="provisionForm"><div class="form-section"><h3>机构信息</h3><div class="form-grid"><label class="field">机构名称<input name="org" value="飞跃篮球训练营" required /></label><label class="field">联系人<input name="owner" value="王校长" required /></label><label class="field">手机号<input name="phone" value="13900009088" required /></label><label class="field">所在城市<select><option>上海市</option><option>北京市</option><option>广州市</option></select></label></div></div><div class="form-section"><h3>开通账号</h3><div class="form-grid"><label class="field">管理员账号<input value="王校长" /></label><label class="field">初始密码<input value="已自动生成" readonly /></label></div><button type="button" class="button secondary" style="margin-top:12px" data-toast="短信通知已加入发送队列（演示）">发送短信通知</button></div><button class="button primary" style="width:100%;margin-top:14px" type="submit">确认开通</button></form></div></section>
    <section class="panel"><div class="panel-head"><h3>套餐配置</h3><span>步骤 2 / 3</span></div><div class="panel-body"><div class="form-section"><h3>专业版</h3><div class="detail-grid"><div class="detail-cell"><span>校区上限</span><strong>3 个</strong></div><div class="detail-cell"><span>教练账号</span><strong>20 人</strong></div></div></div><div class="form-section"><h3>功能开关</h3>${['教务管理','成长报告','导出报表','赛事管理'].map((x,i)=>`<div class="switch-row"><span>${x}</span><small class="positive">${i===2?'关闭':'开启'}</small><button class="switch ${i===2?'':'on'}" type="button" aria-label="切换${x}"></button></div>`).join('')}</div><div class="form-section"><h3>分销绑定</h3><label class="field">渠道来源<select><option>合作渠道一</option><option>平台直营</option><option>教练推荐</option></select></label></div></div></section>
    <section class="panel"><div class="panel-head"><h3>开通记录</h3><span>步骤 3 / 3</span></div><div class="panel-body"><div class="metric-grid" style="grid-template-columns:1fr 1fr">${metric('◴','待开通','6','等待审核')}${metric('✓','已开通','128','累计开通')}</div><div class="table-wrap"><table><thead><tr><th>机构</th><th>联系人</th><th>状态</th></tr></thead><tbody id="openRecordTable">${data.openRecords.map(r=>`<tr><td>${r[0]}<br><span class="muted">${r[2]}</span></td><td>${r[1]}</td><td>${status(r[3])}</td></tr>`).join('')}</tbody></table></div></div></section>
  </div></section>`;
}

function plansView() {
  const plans = [['基础版','3,980','2校区 · 10教练 · 200学员'],['标准版','7,980','5校区 · 30教练 · 800学员'],['专业版','15,800','10校区 · 60教练 · 2000学员'],['旗舰版','29,800','校区、教练与学员不限']];
  return `<section class="view-section"><div class="page-actions"><div class="context"><h2>套餐与产品管理</h2><p>配置套餐权益、增值服务和售卖状态。</p></div><button class="button primary" data-modal="新建套餐">＋ 新建套餐</button></div><div class="metric-grid five">${metric('◇','套餐总数','4','全部套餐')}${metric('▣','在售套餐','4','当前上架中')}${metric('▥','付费机构','128','已付费使用')}${metric('●','试用机构','36','试用中')}${metric('¥','本月套餐收入','¥268,760','较上月 <b>↑18.6%</b>')}</div>
    <div class="grid-2"><section class="panel"><div class="panel-head"><h3>套餐列表</h3><span>点击选择套餐</span></div><div class="panel-body"><div class="grid-2" id="planCards">${plans.map((p,i)=>`<article class="plan-card ${i===0?'selected':''}" data-plan="${p[0]}"><h3>${p[0]} ${status('在售')}</h3><strong>¥ ${p[1]}<small class="muted" style="font-size:10px"> / 年</small></strong><p class="muted">${p[2]}</p><button class="action-link">编辑配置 →</button></article>`).join('')}</div></div></section>
    <section class="panel"><div class="panel-head"><h3 id="planEditorTitle">编辑套餐：基础版</h3><span>功能权限配置</span></div><div class="panel-body"><div class="form-section">${['教务管理','教练管理','家长运营','招生线索','续费策略','经营分析','数据大屏'].map((x,i)=>`<div class="switch-row"><span>${x}<small class="muted" style="display:block">${i===6?'数据可视化大屏':'包含该模块完整功能'}</small></span><button class="switch ${i===6?'':'on'}" type="button"></button></div>`).join('')}</div><div class="action-row" style="justify-content:flex-end;margin-top:14px"><button class="button secondary" data-toast="套餐设置已保存到本地演示状态">保存设置</button><button class="button primary" data-toast="套餐已发布（演示）">发布套餐</button></div></div></section></div>
    <div class="grid-2" style="margin-top:12px"><section class="panel"><div class="panel-head"><h3>增值服务</h3><span>4 项</span></div><div class="table-wrap"><table><thead><tr><th>服务名称</th><th>计费方式</th><th>价格</th><th>已购机构</th><th>状态</th></tr></thead><tbody><tr><td>短信通知包</td><td>按量计费</td><td>0.05元/条</td><td>86</td><td>${status('启用')}</td></tr><tr><td>数据存储扩容</td><td>按年计费</td><td>500元/年</td><td>32</td><td>${status('启用')}</td></tr><tr><td>定制开发服务</td><td>按项目计费</td><td>面议</td><td>8</td><td>${status('启用')}</td></tr></tbody></table></div></section><section class="panel"><div class="panel-head"><h3>套餐变更记录</h3><span>最近变更</span></div><div class="table-wrap"><table><thead><tr><th>时间</th><th>套餐</th><th>变更内容</th><th>操作人</th></tr></thead><tbody><tr><td>2025-05-20 14:30</td><td>基础版</td><td>关闭数据大屏功能</td><td>系统管理员</td></tr><tr><td>2025-04-28 10:15</td><td>基础版</td><td>教练上限 8 → 10</td><td>系统管理员</td></tr></tbody></table></div></section></div></section>`;
}

function channelRows() { return data.channels.map((c,i)=>`<tr><td>${c.name}</td><td>${c.type}</td><td>${c.owner}</td><td>${c.area}</td><td>${c.leads}</td><td>${c.deals}</td><td>${money(c.sales)}</td><td>${money(c.commission)}</td><td>${status(c.status)}</td><td><button class="action-link" data-channel="${i}">查看</button><button class="action-link" data-toast="渠道编辑将在真实权限接入后开放">编辑</button></td></tr>`).join(''); }

function channelsView() {
  return `<section class="view-section"><div class="page-actions"><div class="context"><h2>分销渠道管理</h2><p>管理渠道商、客户线索、分销订单与佣金规则。</p></div><div class="action-row"><button class="button secondary" data-modal="新增渠道商">新增渠道商</button><button class="button secondary" data-modal="新增客户线索">新增客户线索</button><button class="button primary" data-modal="创建分销订单">创建分销订单</button></div></div><div class="metric-grid six">${metric('●','渠道商','24个')}${metric('⌘','有效渠道','18个')}${metric('▤','本月线索','86条')}${metric('⌂','成交机构','12家')}${metric('¥','渠道销售额','¥98,600')}${metric('¥','待结算佣金','¥18,420')}</div><div class="filter-bar"><input placeholder="搜索渠道商名称或负责人" /><select><option>全部类型</option><option>城市合伙人</option><option>教练推荐</option></select><select><option>全部状态</option><option>启用</option><option>暂停</option></select></div><section class="panel"><div class="table-wrap"><table><thead><tr><th>渠道商</th><th>类型</th><th>负责人</th><th>覆盖区域</th><th>客户数</th><th>成交数</th><th>销售额</th><th>待结算</th><th>状态</th><th>操作</th></tr></thead><tbody>${channelRows()}</tbody></table></div><div class="table-footer"><span>共 24 条</span><div class="pagination"><button class="active">1</button><button>2</button><button>›</button></div></div></section><div class="grid-2" style="margin-top:12px"><section class="panel"><div class="panel-head"><h3>渠道漏斗（本月）</h3><span>转化路径</span></div><div class="panel-body"><div class="funnel"><div class="funnel-step"><strong>86</strong><span>线索</span></div><div class="funnel-step"><strong>64</strong><span>跟进</span></div><div class="funnel-step"><strong>38</strong><span>试用</span></div><div class="funnel-step"><strong>12</strong><span>成交</span></div></div></div></section>${linePanel('渠道贡献趋势',[35,49,64,76,84,92])}</div></section>`;
}

function financeView() {
  const orders=[['SO20250531001','上海东区合伙人','专业版（年付）','首购','¥19,800','已完成'],['SO20250531002','杭州飞跃篮球','标准版（年付）','续费','¥9,800','已完成'],['SO20250530015','深圳巅峰体育','高级版','升级','¥12,800','开票中'],['SO20250530014','北京星火篮球','专业版（年付）','首购','¥19,800','已完成']];
  return `<section class="view-section"><div class="page-actions"><div class="context"><h2>平台财务与佣金结算</h2><p>统计订阅、续费、增值服务、退款与渠道佣金。</p></div><div class="action-row"><button class="button secondary" data-modal="创建结算单">创建结算单</button><button class="button secondary" data-toast="收款状态已确认（演示）">确认收款</button><button class="button primary" data-toast="财务报表已生成（演示）">导出财务报表</button></div></div><div class="metric-grid seven">${metric('¥','订阅实收','¥286,000')}${metric('↻','续费收入','¥128,600')}${metric('＋','增值服务','¥36,800')}${metric('↩','退款金额','¥12,400','环比 <span class="negative">▼4.2%</span>')}${metric('¥','待收款','¥42,600')}${metric('▤','渠道佣金','¥18,420')}${metric('✦','平台净收入','¥249,980')}</div><div class="dashboard-grid">${linePanel('订阅收入趋势（含税）',[72,85,91,96,101,114])}<section class="panel"><div class="panel-head"><h3>收入结构</h3><span>含税</span></div><div class="panel-body"><div class="donut-layout"><div class="donut" style="background:conic-gradient(var(--orange) 0 92%,var(--blue) 92% 99%,var(--green) 99%)" data-center="¥451,400\A合计"></div><div class="donut-legend"><span><i></i>订阅收入 <b>91.8%</b></span><span><i></i>增值服务 <b>8.2%</b></span><span><i></i>退款 <b>-2.8%</b></span></div></div></div></section><section class="panel"><div class="panel-head"><h3>财务待办</h3><span>38 项</span></div><div class="panel-body"><div class="todo-list"><div class="todo-item"><i>¥</i><span>待确认收款</span><strong>12</strong></div><div class="todo-item"><i>▤</i><span>待结算佣金</span><strong>8</strong></div><div class="todo-item"><i>↩</i><span>退款审核</span><strong>6</strong></div><div class="todo-item"><i>□</i><span>发票申请</span><strong>9</strong></div></div></div></section></div><section class="panel" style="margin-top:12px"><div class="panel-head"><h3>平台订单</h3><span>SaaS订阅 + 增值服务</span></div><div class="table-wrap"><table><thead><tr><th>订单号</th><th>机构名称</th><th>套餐名称</th><th>类型</th><th>实收金额</th><th>状态</th><th>操作</th></tr></thead><tbody>${orders.map(o=>`<tr>${o.slice(0,5).map(v=>`<td>${v}</td>`).join('')}<td>${status(o[5])}</td><td><button class="action-link" data-toast="订单详情已打开（演示）">查看</button></td></tr>`).join('')}</tbody></table></div></section></section>`;
}

function bigscreenView() {
  return `<section class="view-section bigscreen"><div class="page-actions"><button class="button secondary" data-view-target="dashboard">← 返回驾驶舱</button><button class="button primary" id="fullscreenButton">全屏展示</button></div><div class="big-title">平台全局数据大屏</div><div class="metric-grid">${metric('▥','租户总数','128')}${metric('●','活跃机构','86')}${metric('¥','本月订阅收入','¥326,800')}${metric('▼','分销线索','42')}</div><div class="dashboard-grid">${linePanel('租户增长趋势',[72,78,84,89,98,105,112,119,123,128])}<section class="panel"><div class="panel-head"><h3>风险工单</h3><span>实时</span></div><div class="panel-body"><div class="todo-list"><div class="todo-item"><i>!</i><span>续费风险</span><strong>9</strong></div><div class="todo-item"><i>¥</i><span>佣金待结算</span><strong>12</strong></div><div class="todo-item"><i>＋</i><span>账号开通待审</span><strong>6</strong></div></div></div></section><section class="panel"><div class="panel-head"><h3>机构健康度</h3><span>实时</span></div><div class="panel-body"><div class="health-grid"><div class="health"><i>✓</i><strong>62</strong><span>高活跃</span></div><div class="health"><i>!</i><strong>18</strong><span>需关注</span></div><div class="health"><i>×</i><strong>9</strong><span>即将到期</span></div></div></div></section></div><div class="grid-2" style="margin-top:12px"><section class="panel"><div class="panel-head"><h3>套餐收入结构</h3><span>¥326,800</span></div><div class="panel-body"><div class="donut-layout"><div class="donut" data-center="¥326,800\A本月收入"></div><div class="donut-legend"><span><i></i>基础版 <b>39.3%</b></span><span><i></i>专业版 <b>32.5%</b></span><span><i></i>旗舰版 <b>22.0%</b></span></div></div></div></section><section class="panel"><div class="panel-head"><h3>渠道贡献</h3><span>收入构成</span></div><div class="panel-body">${[['直营收入',182400,56],['分销收入',96800,30],['合作渠道',47600,14]].map(x=>`<div class="benchmark-row"><b>${x[0]}</b><div class="range-bar" style="--position:${x[2]}%"></div><strong>${money(x[1])}</strong></div>`).join('')}</div></section></div></section>`;
}

function successView() {
  const tiers=[['red','未启用','12','尚未完成基础配置或未正式启用'],['orange','低执行','18','已启用但执行力度不足'],['yellow','过程改善','42','执行到位，处于稳步提升阶段'],['green','已产生结果','56','持续产出成果，表现优秀']];
  return `<section class="view-section"><div class="page-actions"><div class="context"><h2>机构成功度分层</h2><p>根据启用、执行、增长和风险信号进行运营分层。</p></div><button class="button primary" data-toast="成功度分层报告已生成（演示）">生成分层报告</button></div><div class="tier-grid">${tiers.map(t=>`<article class="tier ${t[0]}"><span>${t[1]}</span><strong>${t[2]}</strong><h3>${t[1]}</h3><p>${t[3]}</p></article>`).join('')}</div><section class="panel" style="margin-top:12px"><div class="panel-head"><h3>成功度评分</h3><span>0—100 分</span></div><div class="panel-body"><div style="height:10px;background:linear-gradient(90deg,var(--red) 0 25%,var(--orange) 25% 50%,var(--yellow) 50% 75%,var(--green) 75%);border-radius:999px"></div><div class="tier-grid" style="margin-top:13px">${tiers.map((t,i)=>`<div><b style="color:var(--${i===0?'red':i===1?'orange':i===2?'yellow':'green'})">${i*20+(i?20:0)}—${i===3?100:i*20+39}分</b><p class="muted" style="font-size:10px">${t[3]}</p></div>`).join('')}</div></div></section><section class="panel" style="margin-top:12px"><div class="panel-head"><h3>机构列表</h3><span>按执行指数排序</span></div><div class="table-wrap"><table><thead><tr><th>机构名称</th><th>所在城市</th><th>启用状态</th><th>执行指数</th><th>增长信号</th><th>风险等级</th><th>运营建议</th><th>操作</th></tr></thead><tbody>${data.tenants.slice(0,6).map(t=>`<tr><td>${t.name}</td><td>${t.city}</td><td>${status(t.status==='正常使用'?'已启用':'未启用')}</td><td>${progress(t.execution)}</td><td class="${t.activity>60?'positive':'negative'}">${t.activity>60?'强增长 ↑':'弱增长 ↓'}</td><td>${status(t.risk)}</td><td>${t.activity>80?'打造标杆，资源倾斜':t.activity>50?'优化路径，提升执行':'重点激活，完成基础设置'}</td><td><button class="action-link" data-toast="策略模板已下发（演示）">下发模板</button></td></tr>`).join('')}</tbody></table></div></section></section>`;
}

function benchmarkView() {
  const metrics=[['平台活跃度（分）',78.2,62],['教务执行率（%）',92.4,68],['续费转化率（%）',48.7,64],['风险学员率（%）',8.6,35],['家长转介绍率（%）',23.5,61]];
  return `<section class="view-section"><div class="page-actions"><div class="context"><h2>行业基准中心</h2><p>以匿名聚合数据对比同规模机构的经营表现。</p></div><span class="demo-badge">匿名聚合 · 不披露机构敏感信息</span></div><div class="filter-bar"><select><option>全部城市</option><option>北京市</option><option>上海市</option></select><select><option>全部规模</option><option>小型机构</option><option>中型机构</option></select><select><option>全部课程类型</option><option>篮球培训</option></select><select><option>近30天</option><option>近90天</option></select></div><div class="metric-grid five">${metrics.map((m,i)=>metric(['●','▤','↻','!','♥'][i],m[0],m[1],`行业中位数 ${[72.1,89.3,42.6,10.3,19.6][i]} · <b>${m[2]}% 分位</b>`)).join('')}</div><div class="grid-main-side"><section class="panel"><div class="panel-head"><h3>本机构与行业区间对比</h3><span>行业区间 P10—P90</span></div><div class="panel-body">${metrics.map((m,i)=>`<div class="benchmark-row"><b>${m[0]}</b><div class="range-bar" style="--position:${m[2]}%"></div><strong>${m[1]}</strong></div>`).join('')}</div></section><section class="panel"><div class="panel-head"><h3>差距与机会</h3><span>3 项建议</span></div><div class="panel-body"><div class="todo-list"><div class="todo-item"><i>↗</i><span>续费转化率提升空间<br><small class="muted">机会度：高</small></span></div><div class="todo-item"><i>♥</i><span>家长触达与转介绍<br><small class="muted">机会度：中</small></span></div><div class="todo-item"><i>✓</i><span>到课稳定性优化<br><small class="muted">机会度：中</small></span></div></div><button class="button primary" style="width:100%;margin-top:12px" data-view-target="strategies">查看提升策略</button></div></section></div><section class="panel" style="margin-top:12px"><div class="panel-body"><strong>匿名样本说明</strong><p class="muted">本报告对比样本为同行业、同规模机构匿名聚合数据。演示样本机构数：2,156 家；覆盖城市：215 个。</p></div></section></section>`;
}

function strategiesView() {
  const s=state.selectedStrategy;
  return `<section class="view-section"><div class="page-actions"><div class="context"><h2>增长策略模板</h2><p>把成熟运营动作沉淀为可复用、可下发、可复盘的任务模板。</p></div><button class="button primary" data-modal="新建增长策略模板">＋ 新建模板</button></div><div class="metric-grid">${metric('▤','模板总数','48','较上月 ↑8')}${metric('✓','启用中','26','较上月 ↑6')}${metric('⌂','覆盖机构','368家','较上月 ↑45')}${metric('◴','待复盘','12个','较上月 ↓3')}</div><div class="grid-2"><section class="panel"><div class="panel-head"><h3>模板列表</h3><input id="strategySearch" style="height:34px;background:#11161b;border:1px solid var(--line);border-radius:6px;padding:0 10px" placeholder="搜索模板" /></div><div class="panel-body"><div class="strategy-list" id="strategyList">${data.strategies.map((x,i)=>`<article class="strategy-item ${x.name===s.name?'active':''}" data-strategy="${i}"><div><b>${x.name}</b><small class="muted" style="display:block;margin-top:4px">${x.type} · ${x.trigger}</small></div><span>${x.scope}</span><span>${x.steps} 步</span><strong>${x.result}</strong></article>`).join('')}</div></div></section><section class="panel"><div class="panel-head"><div><h3 id="strategyTitle">${s.name}</h3><span>${s.type} · 启用中</span></div><span>模板 ID：TMP2024050001</span></div><div class="panel-body"><div class="detail-grid"><div class="detail-cell"><span>适用范围</span><strong>${s.scope}</strong></div><div class="detail-cell"><span>触发条件</span><strong>${s.trigger}</strong></div><div class="detail-cell"><span>已启用机构</span><strong>${s.enabled} 家</strong></div><div class="detail-cell"><span>最近效果</span><strong>${s.result}</strong></div></div><div class="grid-2" style="margin-top:14px"><div class="form-section"><h3>执行步骤时间轴</h3><div class="timeline"><div><b>第1天</b><span>发送提醒短信</span></div><div><b>第3天</b><span>班主任沟通</span></div><div><b>第7天</b><span>推送专属优惠</span></div><div><b>第14天</b><span>家长常见问题解答</span></div><div><b>第27天</b><span>最后提醒与关怀</span></div></div></div><div class="form-section"><h3>消息内容预览</h3><p class="muted">【赛小蜂篮球】家长您好，孩子的课程即将到期。为了不影响后续上课，请及时完成续费。点击查看详情。</p></div></div><div class="action-row" style="justify-content:flex-end;margin-top:14px"><button class="button secondary" data-toast="草稿已保存">保存草稿</button><button class="button primary" data-toast="策略已发布到机构（演示）">发布到机构</button></div></div></section></div><section class="panel" style="margin-top:12px"><div class="panel-head"><h3>执行反馈与复盘（近30天）</h3><span>效果趋势</span></div><div class="metric-grid" style="padding:14px;margin:0">${metric('▥','已接收机构','356家','接收率 96.7%')}${metric('▶','已启用机构','186家','启用率 50.5%')}${metric('✓','任务完成率','78.6%','较上月 <b>↑6.3%</b>')}${metric('↗','带动成交线索','2,458条','较上月 <b>↑18.2%</b>')}</div></section></section>`;
}

function valueView() {
  const path=[['◎','数据识别','1,248'],['✦','机会提示','1,023'],['➤','机构执行','932'],['✓','结果回收','683'],['✹','证据归因','518']];
  return `<section class="view-section"><div class="page-actions"><div class="context"><h2>产品价值证明</h2><p>把经营机会、运营动作、执行结果和可核验增量串成证据链。</p></div><button class="button primary" id="valueReport">生成价值报告</button></div><div class="filter-bar"><select><option>全部机构</option>${data.tenants.map(t=>`<option>${t.name}</option>`).join('')}</select><select><option>全部校区</option></select><select><option>近90天</option><option>近30天</option></select></div><div class="metric-grid five">${metric('◎','识别经营机会','1,248','较上周期 <b>↑18.6%</b>')}${metric('✓','已下发运营任务','932','较上周期 <b>↑15.3%</b>')}${metric('⌂','机构完成任务','683','完成率 <b>73.3%</b>')}${metric('●','辅助成交线索','518','较上周期 <b>↑22.1%</b>')}${metric('¥','可核验增量金额','¥1,268,540','较上周期 <b>↑24.7%</b>')}</div><div class="grid-2"><section class="panel"><div class="panel-head"><h3>价值形成链路</h3><span>转化率 = 下一环节 / 上一环节</span></div><div class="panel-body"><div class="value-path">${path.map((x,i)=>`<div class="value-step"><i>${x[0]}</i><b>${x[1]}</b><strong>${x[2]}</strong><small class="muted">${i?'转化率 '+[0,82.1,91.1,73.3,75.8][i]+'%':'—'}</small></div>`).join('')}</div></div></section><section class="panel"><div class="panel-head"><h3>价值证据清单</h3><span>可核验等级</span></div><div class="table-wrap"><table><thead><tr><th>事项类型</th><th>执行人</th><th>完成证据</th><th>关联成交</th><th>等级</th></tr></thead><tbody><tr><td>续费跟进</td><td>王教练</td><td>沟通记录、续费合同</td><td>¥28,800</td><td class="positive">★★★★★</td></tr><tr><td>家长回访</td><td>李老师</td><td>回访录音、满意度</td><td>¥12,600</td><td class="positive">★★★★☆</td></tr><tr><td>转介绍活动</td><td>张教练</td><td>活动海报、报名名单</td><td>¥18,900</td><td class="positive">★★★★☆</td></tr></tbody></table></div></section></div><div class="grid-2" style="margin-top:12px"><section class="panel"><div class="panel-head"><h3>使用前后趋势对比</h3><span>使用后近90天 / 使用前90天</span></div><div class="panel-body"><div class="compare-grid">${[['月营收','1,268,540','24.7%'],['续费率','68.3%','11.4pt'],['课消完成率','82.6%','9.8pt'],['家长好评率','94.2%','6.7pt']].map((x,i)=>`<div class="compare"><h4>${x[0]}</h4><strong>${x[1]}</strong><small class="positive">↑ ${x[2]}</small><div class="bars"><i class="bar" style="height:${65+i*7}%"></i><i class="bar before" style="height:${52+i*5}%"></i></div><div class="bar-labels"><span>使用后</span><span>使用前</span></div></div>`).join('')}</div></div></section><section class="panel"><div class="panel-head"><h3>归因说明与边界</h3><span>审慎使用</span></div><div class="panel-body"><div class="detail-hero"><h3>平台提供经营机会识别、任务工具与结果记录</h3><p>不承诺无条件增长，实际结果取决于机构经营基础与执行质量。</p></div><div class="todo-list" style="margin-top:12px"><div class="todo-item"><i>◎</i><span>机会识别：基于数据与模型识别潜在经营机会，辅助决策参考。</span></div><div class="todo-item"><i>▤</i><span>任务工具：提供标准化执行工具与流程，提升机构执行效率。</span></div><div class="todo-item"><i>✓</i><span>结果记录：留存执行过程与结果证据，支持效果归因与复盘。</span></div><div class="todo-item"><i>!</i><span>边界声明：报告所示增量为可核验结果，不构成收益承诺。</span></div></div></div></section></div></section>`;
}

const views = { dashboard: dashboardView, tenants: tenantsView, provisioning: provisioningView, plans: plansView, channels: channelsView, finance: financeView, bigscreen: bigscreenView, success: successView, benchmark: benchmarkView, strategies: strategiesView, value: valueView };

function renderView(name, title) {
  state.view = name;
  $('#viewTitle').textContent = title || $(`[data-view="${name}"]`)?.dataset.title || '平台运营后台';
  $('#viewRoot').innerHTML = (views[name] || dashboardView)();
  $$('[data-view]', $('#sideNav')).forEach(button => button.classList.toggle('active', button.dataset.view === name));
  $('#viewRoot').focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'smooth' });
  requestAnimationFrame(drawCharts);
  bindViewEvents();
  if (window.innerWidth < 880) $('#sidebar').classList.remove('mobile-open');
}

function drawCharts() {
  $$('.line-chart').forEach(canvas => {
    const values = canvas.dataset.values.split(',').map(Number);
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(320, rect.width * ratio);
    canvas.height = Math.max(180, rect.height * ratio);
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    const w = canvas.width / ratio, h = canvas.height / ratio, pad = 22;
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) { const y = pad + i * (h - pad * 2) / 4; ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke(); }
    const min = Math.min(...values) * .9, max = Math.max(...values) * 1.05;
    const points = values.map((v, i) => [pad + i * (w - pad * 2) / (values.length - 1), h - pad - (v - min) / (max - min) * (h - pad * 2)]);
    const gradient = ctx.createLinearGradient(0, pad, 0, h); gradient.addColorStop(0, 'rgba(255,114,0,.38)'); gradient.addColorStop(1, 'rgba(255,114,0,0)');
    ctx.beginPath(); ctx.moveTo(points[0][0], h - pad); points.forEach(p => ctx.lineTo(...p)); ctx.lineTo(points.at(-1)[0], h - pad); ctx.closePath(); ctx.fillStyle = gradient; ctx.fill();
    ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.strokeStyle = '#ff7200'; ctx.lineWidth = 3; ctx.stroke();
    points.forEach(p => { ctx.beginPath(); ctx.arc(p[0], p[1], 3, 0, Math.PI * 2); ctx.fillStyle = '#ff9b18'; ctx.fill(); });
  });
}

function tenantDrawer(t) {
  openDrawer(t.name, `<div class="detail-hero"><h3>${t.name}</h3><p>${t.city} · ${status(t.status)}</p></div><div class="detail-grid"><div class="detail-cell"><span>负责人</span><strong>${t.owner}</strong></div><div class="detail-cell"><span>当前套餐</span><strong>${t.plan}</strong></div><div class="detail-cell"><span>校区 / 教练</span><strong>${t.campuses} / ${t.coaches}</strong></div><div class="detail-cell"><span>学员数量</span><strong>${t.students}</strong></div><div class="detail-cell"><span>平台活跃度</span><strong>${progress(t.activity)}</strong></div><div class="detail-cell"><span>教务执行率</span><strong>${progress(t.execution)}</strong></div><div class="detail-cell"><span>到期时间</span><strong>${t.expires}</strong></div><div class="detail-cell"><span>续费风险</span><strong>${status(t.risk)}</strong></div></div><div class="form-section" style="margin-top:14px"><h3>运营建议</h3><p class="muted">${t.activity > 80 ? '核心指标优秀，建议沉淀标杆案例并扩大品牌影响。' : t.activity > 50 ? '执行基础良好，建议持续优化续费和家长触达路径。' : '活跃度偏低，建议完成基础启用检查并安排一对一跟进。'}</p></div>`);
}

function channelDrawer(c) {
  openDrawer(c.name, `<div class="detail-hero"><h3>${c.name}</h3><p>ID：CH-202405-0001 · ${status(c.status)}</p></div><div class="detail-grid"><div class="detail-cell"><span>渠道类型</span><strong>${c.type}</strong></div><div class="detail-cell"><span>负责人</span><strong>${c.owner}</strong></div><div class="detail-cell"><span>覆盖区域</span><strong>${c.area}</strong></div><div class="detail-cell"><span>客户线索</span><strong>${c.leads}</strong></div><div class="detail-cell"><span>销售额</span><strong>${money(c.sales)}</strong></div><div class="detail-cell"><span>待结算佣金</span><strong>${money(c.commission)}</strong></div></div><div class="form-section" style="margin-top:14px"><h3>佣金规则</h3><div class="switch-row"><span>SaaS 订阅（平台分销）</span><strong>首购 20% · 续费 10%</strong></div><div class="switch-row"><span>结算周期</span><strong>按月结算</strong></div><div class="switch-row"><span>客户归属保护期</span><strong>90 天</strong></div></div>`);
}

function bindViewEvents() {
  $$('[data-view-target]', $('#viewRoot')).forEach(button => button.addEventListener('click', () => renderView(button.dataset.viewTarget)));
  $$('[data-toast]', $('#viewRoot')).forEach(button => button.addEventListener('click', () => toast(button.dataset.toast)));
  $$('[data-modal]', $('#viewRoot')).forEach(button => button.addEventListener('click', () => openModal(button.dataset.modal, '该功能已完成前端交互框架；真实提交将在平台鉴权和业务接口接入后启用。')));
  $$('.switch', $('#viewRoot')).forEach(button => button.addEventListener('click', () => { button.classList.toggle('on'); toast(`功能已${button.classList.contains('on') ? '开启' : '关闭'}（演示状态）`); }));
  const tenantTable = $('#tenantTable');
  if (tenantTable) tenantTable.addEventListener('click', event => { const button=event.target.closest('[data-tenant-button]'), row=event.target.closest('.tenant-row'); if(button){tenantDrawer(data.tenants[Number(button.dataset.tenantButton)]);return;} if(row&&!event.target.closest('button')){state.selectedTenant=data.tenants[Number(row.dataset.tenant)];tenantDrawer(state.selectedTenant);} });
  $$('[data-channel]', $('#viewRoot')).forEach(button => button.addEventListener('click', () => channelDrawer(data.channels[Number(button.dataset.channel)])));
  const tenantSearch = $('#tenantSearch');
  if (tenantSearch) {
    const filter = () => { const q=tenantSearch.value.trim().toLowerCase(), s=$('#tenantStatus').value; const list=data.tenants.filter(t=>(!q||[t.name,t.owner,t.city].join(' ').toLowerCase().includes(q))&&(!s||t.status===s)); $('#tenantTable').innerHTML=tenantRows(list); };
    tenantSearch.addEventListener('input', filter); $('#tenantStatus').addEventListener('change', filter); $('#resetTenantFilter').addEventListener('click',()=>{tenantSearch.value='';$('#tenantStatus').value='';filter();});
  }
  const form = $('#provisionForm');
  if (form) form.addEventListener('submit', event => { event.preventDefault(); const fd=new FormData(form), name=fd.get('org'); data.openRecords.unshift([name,fd.get('owner'),String(fd.get('phone')).replace(/(\d{3})\d{4}(\d{4})/,'$1****$2'),'已开通',new Date().toLocaleString('zh-CN')]); openModal('机构开通成功',`${name} 已加入开通记录。当前为验收演示状态，未向任何真实账号发送消息。`); });
  $$('.plan-card', $('#viewRoot')).forEach(card => card.addEventListener('click',()=>{$$('.plan-card').forEach(x=>x.classList.remove('selected'));card.classList.add('selected');$('#planEditorTitle').textContent=`编辑套餐：${card.dataset.plan}`;}));
  $$('.strategy-item', $('#viewRoot')).forEach((item,index)=>item.addEventListener('click',()=>{state.selectedStrategy=data.strategies[index];renderView('strategies');}));
  const full = $('#fullscreenButton'); if(full) full.addEventListener('click',()=>document.documentElement.requestFullscreen?.());
  const report = $('#valueReport'); if(report) report.addEventListener('click',()=>openModal('生成价值报告','报告将包含价值形成链路、证据清单、使用前后对比与归因边界。当前为演示数据，确认后将打开打印预览。',()=>window.print()));
}

function openDrawer(title, body) { $('#drawerTitle').textContent=title; $('#drawerBody').innerHTML=body; $('#drawer').classList.add('open'); $('#drawer').setAttribute('aria-hidden','false'); }
function closeDrawer() { $('#drawer').classList.remove('open'); $('#drawer').setAttribute('aria-hidden','true'); }
function openModal(title, body, onConfirm) { $('#modalTitle').textContent=title; $('#modalBody').innerHTML=`<p>${body}</p>`; $('#modalBackdrop').classList.add('open'); $('#modalConfirm').onclick=()=>{closeModal();onConfirm?.();if(!onConfirm)toast(`${title}：已确认（演示）`);}; }
function closeModal() { $('#modalBackdrop').classList.remove('open'); }

function showApp() { $('#loginScreen').classList.add('is-hidden'); $('#appShell').classList.remove('is-hidden'); sessionStorage.setItem('sxfPlatformPreview','1'); renderView('dashboard'); }
function showLogin() { sessionStorage.removeItem('sxfPlatformPreview'); $('#appShell').classList.add('is-hidden'); $('#loginScreen').classList.remove('is-hidden'); $('#userPopover').classList.remove('open'); }

$('#loginForm').addEventListener('submit', event => { event.preventDefault(); showApp(); toast('欢迎进入赛小蜂平台运营后台'); });
$('#togglePassword').addEventListener('click',()=>{const input=$('#loginPassword');input.type=input.type==='password'?'text':'password';});
$('#getCode').addEventListener('click',event=>{let seconds=30;event.currentTarget.disabled=true;event.currentTarget.textContent=`${seconds}s 后重试`;const id=setInterval(()=>{seconds--;event.currentTarget.textContent=`${seconds}s 后重试`;if(seconds<=0){clearInterval(id);event.currentTarget.disabled=false;event.currentTarget.textContent='获取验证码';}},1000);toast('验收验证码已发送（演示）');});
$('#sideNav').addEventListener('click',event=>{const button=event.target.closest('[data-view]');if(button)renderView(button.dataset.view,button.dataset.title);});
$('#refreshButton').addEventListener('click',()=>{renderView(state.view);toast('页面数据已刷新');});
$('#collapseSidebar').addEventListener('click',()=>$('#sidebar').classList.toggle('collapsed'));
$('#menuToggle').addEventListener('click',()=>$('#sidebar').classList.toggle('mobile-open'));
$('#closeDrawer').addEventListener('click',closeDrawer); $('#drawerSecondary').addEventListener('click',closeDrawer); $('#drawerPrimary').addEventListener('click',()=>{closeDrawer();toast('变更已保存到演示状态');});
$('#closeModal').addEventListener('click',closeModal); $('#modalCancel').addEventListener('click',closeModal); $('#modalBackdrop').addEventListener('click',event=>{if(event.target===event.currentTarget)closeModal();});
$('#userMenu').addEventListener('click',event=>{event.stopPropagation();$('#userPopover').classList.toggle('open');}); $('#logoutButton').addEventListener('click',showLogin); document.addEventListener('click',()=>$('#userPopover').classList.remove('open'));
document.addEventListener('click',event=>{const target=event.target.closest('[data-toast]');if(target&&!$('#viewRoot').contains(target))toast(target.dataset.toast);});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeDrawer();closeModal();$('#sidebar').classList.remove('mobile-open');}});
window.addEventListener('resize',()=>{clearTimeout(window.__chartResize);window.__chartResize=setTimeout(drawCharts,150);});

if (sessionStorage.getItem('sxfPlatformPreview') || new URLSearchParams(location.search).get('preview') === '1') showApp();
