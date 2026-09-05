(function () {
  const params = new URLSearchParams(location.search);
  const screen = params.get('screen') || 'flow';
  const side = params.get('side') === 'away' ? 'away' : 'home';
  const app = document.getElementById('app');

  const match = {
    name: '2026 青少年篮球邀请赛 · U12 小组赛',
    court: '郑州全民健身中心 · 1号场',
    home: '郑州小蜂队',
    away: '洛阳闪电队',
    homeScore: 56,
    awayScore: 52,
    period: '第 4 节',
    clock: '02:36'
  };

  const homePlayers = [
    ['07','陈子昂','后卫',18], ['11','周星宇','前锋',12], ['23','赵嘉树','后卫',10],
    ['15','李浩然','中锋',8], ['03','王奕辰','前锋',8], ['09','孙铭泽','后卫',0]
  ];
  const awayPlayers = [
    ['06','郭明轩','后卫',20], ['18','韩一鸣','前锋',13], ['32','程宇航','中锋',9],
    ['08','冯子墨','后卫',6], ['21','郑凯文','前锋',4], ['12','高文博','中锋',0]
  ];

  const icon = (text) => `<span aria-hidden="true">${text}</span>`;
  const topbar = (role) => `
    <header class="topbar">
      <div class="brand"><div class="brand-mark">S</div><div><strong>赛小蜂篮球</strong><span>比赛现场协同系统</span></div></div>
      <div class="match-id"><strong>${match.name}</strong><span>${match.court} · 场次 #A-12</span></div>
      <span class="sync-pill">实时同步 · 28ms</span>
      <span class="role-pill">${role}</span>
      <button class="top-action" data-go="flow">流程总览</button>
    </header>`;

  const scoreStrip = () => `
    <section class="live-score-strip">
      <div class="strip-team"><div class="team-badge">郑</div><div class="team-copy"><small>主队</small><strong>${match.home}</strong></div><div class="strip-score">${match.homeScore}</div></div>
      <div class="strip-center"><span class="period-chip">${match.period}</span><div><div class="clock">${match.clock}</div><span class="clock-caption">官方比赛时间 · 裁判控制</span></div></div>
      <div class="strip-team away"><div class="strip-score">${match.awayScore}</div><div class="team-copy"><small>客队</small><strong>${match.away}</strong></div><div class="team-badge red">洛</div></div>
    </section>`;

  function renderFlow() {
    const lanes = [
      ['PC 主办方','赛事创建与任务调度',[
        ['01','创建赛事与场次','确认赛制、球队、场地与比赛时间'],
        ['02','分配主裁判','场次权限限定，服务号通知接受'],
        ['03','查看三端在线','裁判、主队教练、客队教练状态'],
        ['04','只读监控','官方比分、两队统计进度与异常'],
        ['05','归档与查询','核验结果进入统一平台数据库']]],
      ['主裁判','比分 / 时间 / MC',[
        ['01','接受执裁任务','核对场次、设备、音频与网络'],
        ['02','接管官方控制台','比分、时间、节次、犯规与暂停'],
        ['03','控制 MC','得分、攻防、暂停音乐与紧急停止'],
        ['04','确认官方赛果','结束比赛不受教练数据阻塞'],
        ['05','分队核验数据','确认发布、退回或拒绝请求']]],
      ['主队主教练','本队数据 + 平板战术板',[
        ['01','接受主队统计任务','仅获得主队阵容和数据权限'],
        ['02','记录本队球员数据','顶部只读同步官方比分和时间'],
        ['03','一键切换战术板','画路线、摆阵容、保存暂停方案'],
        ['04','校验并提交','球员得分合计必须等于官方比分'],
        ['05','进入主队数据视图','仅核验通过版本对球队发布']]],
      ['客队主教练','本队数据 + 平板战术板',[
        ['01','接受客队统计任务','仅获得客队阵容和数据权限'],
        ['02','记录本队球员数据','与主队端并行、互不可见'],
        ['03','一键切换战术板','工具只服务本队临场布置'],
        ['04','校验并提交','可独立退回，不阻塞主队'],
        ['05','进入客队数据视图','统一数据库、球队范围展示']]]
    ];
    app.innerHTML = `<div class="flow-shell">
      <div class="flow-header"><div><span class="eyebrow">UNIFIED MATCH OPERATIONS</span><h1>一场比赛，一套平台，三个现场工作面</h1><p>裁判负责官方比分、比赛时间与 MC；双方主教练分别承接本队球员数据统计任务，并可在平板端切换战术板。所有数据围绕同一个 match_id 实时同步，权限分离但不形成数据孤岛。</p></div><div class="flow-meta"><span class="status-pill">统一事件流</span><span class="status-pill">角色最小权限</span><span class="status-pill">赛后分队核验</span></div></div>
      <div class="flow-lanes">${lanes.map((lane, laneIndex) => `<section class="flow-lane"><div class="lane-name"><span class="eyebrow">ROLE 0${laneIndex+1}</span><strong>${lane[0]}</strong><span>${lane[1]}</span></div><div class="lane-track">${lane[2].map((c, i) => `<article class="flow-card ${i===1 || i===3 ? 'highlight':''}"><small>${c[0]}</small><strong>${c[1]}</strong><p>${c[2]}</p></article>`).join('')}</div></section>`).join('')}</div>
      <div class="flow-footer"><div class="rule"><strong>官方比分唯一</strong><span>裁判控制台是比分、时间、节次和赛果的唯一写入端。</span></div><div class="rule"><strong>教练只记本队</strong><span>主客队任务分离、独立提交、独立核验，互相不可编辑。</span></div><div class="rule"><strong>战术板不进赛事数据</strong><span>战术草图属于球队私有内容，不向裁判和主办方公开。</span></div><div class="rule"><strong>MVP 自动禁用</strong><span>教练自录数据仅供球队复盘，不直接驱动官方个人奖项。</span></div></div>
    </div>`;
  }

  function readyScreen(role) {
    const isRef = role === 'referee';
    const title = isRef ? '接管本场官方控制台' : `接受${side === 'home' ? '主队' : '客队'}球员数据统计任务`;
    const desc = isRef ? '您将成为本场比分、时间、节次与 MC 的唯一控制人。双方主教练的数据录入与您的官方比分实时同步，但不会改动官方赛果。' : '本任务仅开放本队阵容与球员数据。您可以边比赛边记录，也可以使用平板战术板进行临场布置；不记录不会影响球队参赛。';
    const roleName = isRef ? '主裁判' : `${side === 'home' ? '主队' : '客队'}主教练`;
    const checks = isRef ? [
      ['场次与球队','主客队、场地、开赛时间已确认','已确认'],['官方控制权限','当前没有其他设备接管比分板','可接管'],['MC 音频','12 个常用音效已缓存','已就绪'],['网络与离线保护','实时连接正常，已启用本地事件缓存','正常']
    ] : [
      ['球队身份',`${side === 'home' ? match.home : match.away} · 主教练权限`,'已确认'],['比赛名单','12 人名单，首发阵容待确认','可编辑'],['数据任务','仅记录本队，不可修改官方比分','已授权'],['平板能力','横屏数据录入与战术板均可使用','已就绪']
    ];
    app.innerHTML = `<div class="shell">${topbar(roleName)}<div class="content ready-layout"><section class="panel task-hero"><div><span class="eyebrow">MATCH TASK · #A-12</span><h1>${title}</h1><p>${desc}</p><div class="match-card"><div class="mini-team"><div class="team-badge">郑</div><div class="team-copy"><small>主队</small><strong>${match.home}</strong></div></div><span class="versus">VS</span><div class="mini-team away"><div class="team-copy"><small>客队</small><strong>${match.away}</strong></div><div class="team-badge red">洛</div></div></div></div><div class="task-actions"><button class="btn primary" data-go="${isRef ? 'referee-live' : 'coach-live'}">${isRef ? '确认接管控制台' : '记录本队数据'}</button>${!isRef ? '<button class="btn">本场不记录</button>' : ''}<button class="btn">查看竞赛规程</button></div></section><section class="panel checklist"><div class="panel-head"><strong>开赛前检查</strong><span>全部完成后可进入现场工作台</span></div>${checks.map(c => `<div class="check-row"><div class="check-icon">✓</div><div class="check-copy"><strong>${c[0]}</strong><span>${c[1]}</span></div><span class="check-state">${c[2]}</span></div>`).join('')}<div class="device-choice">${isRef ? '建议裁判使用横屏平板或大屏手机，并保持屏幕常亮。比分、时间与 MC 操作均在同一屏完成。' : '检测到平板设备：将自动使用三栏横屏布局，并开放“战术板”快捷按钮；手机端保留数据录入，战术板建议在平板使用。'}</div></section></div></div>`;
  }

  function refereeLive() {
    const scoreSide = (which, score, home) => `<section class="side-score ${home ? 'home':'away'}"><div class="score-name"><div><strong>${which}</strong><span>${home ? match.home : match.away}</span></div><span>球队犯规 ${home ? 4 : 3}</span></div><div class="big-score">${score}</div><div class="score-buttons"><button class="btn minus">−1</button><button class="btn">+1</button><button class="btn">+2</button><button class="btn">+3</button></div><div class="minor-controls"><div class="counter-control"><span>暂停</span><strong>${home ? 1 : 2} / 3　＋</strong></div><div class="counter-control"><span>犯规</span><strong>${home ? 4 : 3}　＋</strong></div></div></section>`;
    app.innerHTML = `<div class="shell">${topbar('主裁判 · 官方控制端')}<div class="content ref-grid"><section class="panel ref-main"><div class="score-control">${scoreSide('主队',56,true)}<div class="clock-console"><div class="console-period"><span>第 4 节 / 共 4 节</span><span>进攻 18s</span></div><div class="console-clock">02:36</div><button class="clock-main" id="clock-toggle">暂停计时</button><div class="clock-row"><button class="btn">上一节</button><button class="btn">下一节</button></div><div class="possession"><button>←</button><span>球权 · 主队</span><button>→</button></div></div>${scoreSide('客队',52,false)}</div><div class="event-footer"><div class="event-last"><span>最近操作</span><strong>02:41 · 主队 +2 · 当前比分 56 : 52</strong></div><button class="btn">撤销上一步</button><button class="btn danger" data-go="referee-review">结束比赛</button></div></section><aside class="panel mc-console"><div class="panel-head"><strong>MC 现场控制</strong><span>由主裁判控制</span></div><div class="now-playing"><small>正在播放</small><strong>主队进攻节奏 · 00:18</strong><div class="wave">${Array.from({length:18},(_,i)=>`<i style="height:${7+(i%5)*4}px"></i>`).join('')}</div></div><div class="mc-label">得分与攻防</div><div class="mc-grid"><button class="mc-key"><strong>主队得分</strong><span>欢呼 + 播报</span></button><button class="mc-key"><strong>客队得分</strong><span>提示音</span></button><button class="mc-key"><strong>主队进攻</strong><span>节奏音乐</span></button><button class="mc-key"><strong>客队进攻</strong><span>节奏音乐</span></button><button class="mc-key"><strong>暂停音乐</strong><span>60 秒</span></button><button class="mc-key"><strong>防守音效</strong><span>口号循环</span></button></div><div class="mc-label">快捷音量　68%</div><input type="range" min="0" max="100" value="68" /><button class="mc-stop">紧急停止全部音频</button></aside></div></div>`;
  }

  function playerRows(players) {
    return players.map((p,i)=>`<div class="player-row ${i===0?'active':''}" data-player="${i}"><div class="jersey">${p[0]}</div><div><strong>${p[1]}</strong><span>${p[2]} · ${i<5?'场上':'替补'}</span></div><span class="player-points">${p[3]}</span></div>`).join('');
  }

  function coachLive() {
    const players = side === 'home' ? homePlayers : awayPlayers;
    const team = side === 'home' ? match.home : match.away;
    const score = side === 'home' ? match.homeScore : match.awayScore;
    app.innerHTML = `<div class="shell">${topbar(`${side==='home'?'主队':'客队'}主教练 · 球员数据端`)}${scoreStrip()}<div class="content coach-grid"><aside class="panel roster"><div class="panel-head"><strong>${team}</strong><span>本场阵容 12 人</span></div><div class="roster-tabs"><button class="btn ghost-orange" style="flex:1">场上 5 人</button><button class="btn" style="flex:1">全部名单</button></div><div class="player-list">${playerRows(players)}</div><button class="btn">换人 / 调整阵容</button></aside><section class="panel coach-work"><div class="mode-tabs"><button class="mode-tab active">球员数据</button><button class="mode-tab">阵容</button><button class="mode-tab tactics" data-go="coach-tactics">战术板</button><button class="mode-tab">事件记录</button></div><div class="selected-player"><div class="jersey">${players[0][0]}</div><div><strong>${players[0][1]}</strong><span>${players[0][2]} · 已上场 21:34</span></div><div class="selected-total"><b>${players[0][3]}</b><small>本场得分</small></div></div><div class="stat-actions"><button class="stat-btn score"><strong>+1</strong><span>罚球命中</span></button><button class="stat-btn score"><strong>+2</strong><span>两分命中</span></button><button class="stat-btn score"><strong>+3</strong><span>三分命中</span></button><button class="stat-btn"><strong>−1</strong><span>得分修正</span></button><button class="stat-btn"><strong>+1</strong><span>篮板</span></button><button class="stat-btn"><strong>+1</strong><span>助攻</span></button><button class="stat-btn"><strong>+1</strong><span>抢断</span></button><button class="stat-btn"><strong>+1</strong><span>盖帽</span></button><button class="stat-btn"><strong>+1</strong><span>失误</span></button><button class="stat-btn"><strong>+1</strong><span>个人犯规</span></button><button class="stat-btn"><strong>投篮</strong><span>未命中</span></button><button class="stat-btn"><strong>更多</strong><span>自定义事件</span></button></div><div class="event-stream"><div class="event-stream-head"><strong>本队最近记录</strong><span>仅本队可见 · 自动保存</span></div><div class="event-item"><time>02:41</time><b>#${players[0][0]} ${players[0][1]}</b><em>两分命中 +2</em></div><div class="event-item"><time>03:08</time><b>#${players[1][0]} ${players[1][1]}</b><em>防守篮板 +1</em></div><div class="event-item"><time>03:35</time><b>#${players[2][0]} ${players[2][1]}</b><em>助攻 +1</em></div></div></section><aside class="panel coach-side"><div class="score-reconcile"><div class="reconcile-row"><div><small>本队官方比分</small><strong>${score}</strong></div><div style="text-align:right"><small>球员得分合计</small><strong>${score}</strong></div></div><div class="progress"><i></i></div><div class="reconcile-ok">✓ 得分完全一致，可继续记录</div></div><div class="mini-stats"><div class="mini-stat"><span>篮板</span><strong>${side==='home'?24:21}</strong></div><div class="mini-stat"><span>助攻</span><strong>${side==='home'?14:12}</strong></div><div class="mini-stat"><span>抢断</span><strong>${side==='home'?7:6}</strong></div><div class="mini-stat"><span>失误</span><strong>${side==='home'?9:11}</strong></div></div><div class="coach-tip"><strong>战术板已就绪</strong><br>暂停时点击“战术板”，当前场上 5 人会自动带入；战术内容属于球队私有，不同步给裁判、对手或主办方。</div><div class="submit-bar"><button class="btn" data-go="coach-submit">赛后检查</button><button class="btn primary" data-go="coach-tactics">打开战术板</button></div></aside></div></div>`;
  }

  function coachTactics() {
    const team = side === 'home' ? match.home : match.away;
    app.innerHTML = `<div class="shell">${topbar(`${side==='home'?'主队':'客队'}主教练 · 平板战术板`)}${scoreStrip()}<div class="content tactics-grid"><aside class="panel toolbox"><div class="panel-head"><strong>战术工具</strong><span>触控笔 / 手指</span></div><div class="tool-group"><button class="tool active">路线箭头</button><button class="tool">自由画笔</button><button class="tool">传球虚线</button><button class="tool">防守标记</button><button class="tool">文字标签</button><button class="tool">橡皮擦</button></div><div class="mc-label">画笔颜色</div><div class="color-row"><button class="color-dot active"></button><button class="color-dot blue"></button><button class="color-dot white"></button></div><div class="mc-label">场地视图</div><div class="tool-group"><button class="tool active">全场</button><button class="tool">半场</button></div><button class="btn">撤销</button><button class="btn danger">清空画板</button><button class="btn" data-go="coach-live">返回数据录入</button></aside><section class="panel court-wrap"><div class="court"><div class="center-circle"></div><div class="paint left"></div><div class="paint right"></div><div class="three left"></div><div class="three right"></div><div class="hoop left"></div><div class="hoop right"></div>${[1,2,3,4,5].map(n=>`<div class="marker m${n}">${n}</div>`).join('')}${[1,2,3,4,5].map(n=>`<div class="marker xmark x${n}">×</div>`).join('')}<div class="route r1"></div><div class="route r2"></div><div class="court-note">当前阵容已从比赛数据端同步 · ${team}</div></div></section><aside class="panel playbook"><div class="panel-head"><strong>我的战术</strong><span>仅本队可见</span></div><div class="timeout-clock"><span>本次暂停剩余</span><strong>00:42</strong></div><div class="play-card active"><strong>边线球 · 双掩护</strong><span>第 4 节关键回合，07 号持球，15 号顺下。</span></div><div class="play-card"><strong>全场紧逼 · 1-2-1-1</strong><span>落后或追分阶段快速切换。</span></div><div class="play-card"><strong>底线球 · 电梯门</strong><span>为 11 号创造底角三分机会。</span></div><button class="btn">＋ 新建战术</button><button class="btn primary">保存当前战术</button><div class="coach-tip">战术板不会写入官方比赛事件，也不在赛后裁判核验中出现；只有本队获得授权的教练可以查看。</div></aside></div></div>`;
  }

  function coachSubmit() {
    const players = side === 'home' ? homePlayers : awayPlayers;
    const team = side === 'home' ? match.home : match.away;
    const score = side === 'home' ? 56 : 52;
    app.innerHTML = `<div class="shell">${topbar(`${side==='home'?'主队':'客队'}主教练 · 赛后提交`)}${scoreStrip()}<div class="content submit-grid"><section class="panel summary-table"><div class="panel-head"><strong>${team} · 球员数据汇总</strong><span>提交后锁定，裁判退回时才能继续修改</span></div><div class="summary-row header"><span>号码</span><span>球员</span><span>得分</span><span>篮板</span><span>助攻</span><span>抢断</span><span>盖帽</span><span>失误</span></div>${players.slice(0,5).map((p,i)=>`<div class="summary-row"><span>#${p[0]}</span><strong>${p[1]}</strong><b>${p[3]}</b><span>${[4,6,3,8,3][i]}</span><span>${[5,2,4,1,2][i]}</span><span>${[2,1,2,1,1][i]}</span><span>${[0,1,0,2,1][i]}</span><span>${[2,1,1,3,2][i]}</span></div>`).join('')}</section><aside class="panel summary-side"><div class="panel-head"><strong>提交前自动检查</strong><span>3 项通过，1 项提醒</span></div><div class="validation"><div class="v-icon">✓</div><div><strong>得分一致</strong><span>球员得分合计 ${score} = 官方比分 ${score}</span></div><em>通过</em></div><div class="validation"><div class="v-icon">✓</div><div><strong>名单有效</strong><span>所有数据均属于本场有效名单球员</span></div><em>通过</em></div><div class="validation"><div class="v-icon">✓</div><div><strong>事件完整</strong><span>无重复事件或异常节次记录</span></div><em>通过</em></div><div class="validation warning"><div class="v-icon">!</div><div><strong>单一球员得分较高</strong><span>#${players[0][0]} ${players[0][1]} 得分占本队 ${Math.round(players[0][3]/score*100)}%</span></div><em>需说明</em></div><textarea class="submit-note" placeholder="给主裁判的说明（选填）">#${players[0][0]} 本场承担主要进攻任务，得分记录已复查。</textarea><div class="award-banner"><strong>数据用途说明</strong><span>本数据由球队教练录入，经裁判确认后用于球队复盘与家长展示，不自动作为赛事 MVP 等官方奖项依据。</span></div><button class="btn primary">提交主裁判核验</button><button class="btn" data-go="coach-live">返回继续检查</button></aside></div></div>`;
  }

  function distribution(players, away) {
    const max = Math.max(...players.map(p=>p[3]));
    return `<div class="distribution">${players.slice(0,5).map(p=>`<div class="bar-row"><span>#${p[0]} ${p[1]}</span><div class="bar-track"><i style="width:${Math.max(8,p[3]/max*100)}%"></i></div><strong>${p[3]}</strong></div>`).join('')}</div>`;
  }

  function refereeReview() {
    const review = (home) => { const players=home?homePlayers:awayPlayers, team=home?match.home:match.away, score=home?56:52; return `<section class="panel review-team ${home?'':'away-review'}"><div class="review-title"><div class="team-badge ${home?'':'red'}">${home?'郑':'洛'}</div><div><strong>${team}</strong><span>${home?'主队':'客队'}主教练提交 · 18:42</span></div><span class="status-pill" style="margin-left:auto">待核验</span></div><div class="review-score"><div><span>官方总比分</span><strong>${score}</strong></div><div class="equals">=</div><div><span>球员得分合计</span><strong>${score}</strong></div></div>${distribution(players,!home)}<div class="alert-card">${home?'系统提醒：#07 陈子昂得到 18 分，占本队 32%。未发现单人包揽全部得分、名单异常或重复事件。':'自动检查全部通过：得分分布合理，名单与上场状态一致，无赛后集中补录。'}</div><div class="coach-tip"><strong>裁判核验范围</strong><br>结合现场印象确认是否存在明显乱加分或错误归属；无需逐项背书篮板、助攻等扩展统计。</div><div class="review-actions"><button class="btn success" data-go="team-data">确认发布</button><button class="btn">退回修改</button><button class="btn danger">拒绝请求</button></div></section>`; };
    app.innerHTML = `<div class="shell">${topbar('主裁判 · 赛后数据核验')}${scoreStrip()}<div class="content review-grid">${review(true)}${review(false)}</div></div>`;
  }

  function teamData() {
    app.innerHTML = `<div class="shell">${topbar('统一平台 · 球队数据视图')}<div class="content team-data-grid"><section class="panel data-dashboard"><div class="panel-head"><strong>${match.home} · 本场数据</strong><span>已由主裁判确认发布</span><div class="head-spacer"></div><button class="btn">导出球队报告</button></div><div class="kpi-grid"><div class="kpi"><span>球队得分</span><strong>56</strong></div><div class="kpi"><span>篮板</span><strong>24</strong></div><div class="kpi"><span>助攻</span><strong>14</strong></div><div class="kpi"><span>抢断</span><strong>7</strong></div></div><div class="rank-list"><div class="rank-row header"><span>排名</span><span>球员</span><span>得分</span><span>篮板</span><span>助攻</span><span>效率</span></div>${homePlayers.slice(0,5).map((p,i)=>`<div class="rank-row"><span>${i+1}</span><strong>#${p[0]} ${p[1]}</strong><span>${p[3]}</span><span>${[4,6,3,8,3][i]}</span><span>${[5,2,4,1,2][i]}</span><span>${[22,18,15,17,12][i]}</span></div>`).join('')}</div></section><aside class="panel audit-side"><div class="source-banner"><strong>✓ 数据已发布</strong><span>来源：郑州小蜂队主教练<br>核验：本场主裁判 王老师<br>版本：V1 · 2026-08-19 18:46</span></div><div class="award-banner"><strong>不可作为官方奖项自动依据</strong><span>本数据用于球队复盘、球员成长记录和家长展示。赛事 MVP 等官方个人奖项需采用独立评审机制。</span></div><div class="panel-head"><strong>数据流转记录</strong></div><div class="timeline-item"><strong>主教练提交</strong><span>18:42 · 得分合计与官方比分一致</span></div><div class="timeline-item"><strong>系统自动检查</strong><span>18:42 · 3 项通过，1 项提醒</span></div><div class="timeline-item"><strong>主裁判确认发布</strong><span>18:46 · 未发现明显异常</span></div><div class="timeline-item"><strong>球队数据视图同步</strong><span>18:46 · 家长端可按授权查看</span></div></aside></div></div>`;
  }

  function renderFlowFlexible() {
    const lanes = [
      ['PC 主办方','赛事与人员入口',[['01','创建场次','生成裁判和两队数据任务'],['02','分配主裁判','官方比分、时间与 MC'],['03','查看在线状态','不介入球队内部数据分工'],['04','查看核验状态','完整/自选口径明确标识'],['05','统一归档','同一比赛、分权限展示']]],
      ['主裁判','官方比赛控制',[['01','接受执裁任务','确认场次和设备'],['02','接管控制台','比分、时间、节次与 MC'],['03','确认官方赛果','不等待球队数据完成'],['04','核验得分归属','仅完整得分口径需对账'],['05','分队确认发布','主客队互不阻塞']]],
      ['球队主教练','数据总负责人 + 战术',[['01','选择工作方式','自己记录、分发或只管战术'],['02','设置统计口径','只选择本场想记录的数据'],['03','最多分发5人','按技能、球员或混合分工'],['04','实时监控/接管','查看覆盖、冲突和同步'],['05','汇总确认提交','明确完整或部分数据']]],
      ['助理教练','专项数据执行',[['01','接受专项任务','权限只覆盖分配范围'],['02','按技能记录','进攻、防守、投篮等'],['03','或按球员记录','负责指定球员集合'],['04','随时交接任务','未同步数据先处理'],['05','提交给主教练','不直接发布赛事数据']]]
    ];
    app.innerHTML = `<div class="flow-shell"><div class="flow-header"><div><span class="eyebrow">FLEXIBLE TEAM DATA OPERATIONS</span><h1>主裁判管比赛，主教练编排数据，最多 5 名助教协作</h1><p>球队数据不再绑定单一记录人。主教练先选择本场统计口径，再把“统计项目 × 球员范围”组合成任务，按技能、按球员或混合分发；主教练也可以自己记录，同时使用球队私有战术板。</p></div><div class="flow-meta"><span class="status-pill">自选统计口径</span><span class="status-pill">最多5名助教</span><span class="status-pill">重复/漏项检查</span></div></div><div class="flow-lanes">${lanes.map((lane, laneIndex)=>`<section class="flow-lane"><div class="lane-name"><span class="eyebrow">ROLE 0${laneIndex+1}</span><strong>${lane[0]}</strong><span>${lane[1]}</span></div><div class="lane-track">${lane[2].map((c,i)=>`<article class="flow-card ${i===1||i===3?'highlight':''}"><small>${c[0]}</small><strong>${c[1]}</strong><p>${c[2]}</p></article>`).join('')}</div></section>`).join('')}</div><div class="flow-footer"><div class="rule"><strong>每队最多 6 名记录人</strong><span>1 名主教练 + 最多 5 名助理教练；主教练始终是最终数据负责人。</span></div><div class="rule"><strong>三种分工方式</strong><span>按技能、按球员或混合拆分，系统按“球员×指标”检查重复写入。</span></div><div class="rule"><strong>部分统计不是零</strong><span>未选择的指标显示“未统计”，不能把缺失数据当作 0。</span></div><div class="rule"><strong>裁判核验分层</strong><span>只有完整球员得分归属需要与官方比分强一致；其他数据由主教练确认。</span></div></div></div>`;
  }

  function headCoachHub() {
    app.innerHTML = `<div class="shell">${topbar(`${side==='home'?'主队':'客队'}主教练 · 数据总负责人`)}<div class="content coach-hub-grid"><section class="panel hub-main"><span class="eyebrow">CHOOSE YOUR WORK MODE</span><h1>这场比赛，您想怎样组织数据？</h1><p>主教练始终拥有本队数据的配置、监控、收回和最终提交权。您可以亲自记录，也可以只使用战术板，把统计任务交给最多 5 名助理教练。</p><div class="work-modes"><button class="work-mode" data-go="coach-live"><small>方式 01</small><strong>我记录数据，也使用战术板</strong><span>适合一名教练独立完成；可随时再邀请助教加入。</span></button><button class="work-mode active" data-go="coach-dispatch"><small>方式 02 · 推荐多人协作</small><strong>我只管战术，数据分发给助教</strong><span>先选统计口径，再按技能或球员分配给最多 5 人。</span></button><button class="work-mode" data-go="coach-dispatch"><small>方式 03</small><strong>我和助教共同记录</strong><span>把部分指标留给自己，其余任务分发给助教。</span></button><button class="work-mode"><small>方式 04</small><strong>本场不记录球员数据</strong><span>不影响官方比分、赛果、积分或正常使用战术板。</span></button></div></section><aside class="panel hub-side"><div class="panel-head"><strong>本队协作成员</strong><span>最多可添加 5 名助教</span></div><div class="role-capacity"><div class="capacity-row"><strong>当前数据协作</strong><b>3 / 5</b></div><p>主教练不计入 5 名助教上限。比赛中仍可增减人员或收回任务。</p></div><div class="member-stack"><div class="member"><div class="avatar">张</div><div><strong>张教练</strong><span>擅长进攻与投篮数据</span></div><em>在线</em></div><div class="member"><div class="avatar">李</div><div><strong>李教练</strong><span>擅长防守与篮板数据</span></div><em>在线</em></div><div class="member"><div class="avatar">王</div><div><strong>王教练</strong><span>可按球员分组记录</span></div><em>待接受</em></div></div><button class="btn">＋ 邀请助理教练</button><button class="btn primary" data-go="coach-dispatch">设置统计口径与分工</button><button class="btn" data-go="coach-tactics">直接打开战术板</button></aside></div></div>`;
  }

  function coachDispatch() {
    app.innerHTML = `<div class="shell">${topbar(`${side==='home'?'主队':'客队'}主教练 · 数据任务编排`)}${scoreStrip()}<div class="content dispatch-grid"><aside class="panel scope-panel"><div class="panel-head"><strong>本场统计口径</strong><span>只记录您想要的数据</span></div><div class="scope-group"><strong>得分与投篮</strong><small>可只记得分，不必记录命中/未中</small><div class="chip-grid"><button class="scope-chip on">罚球得分 +1</button><button class="scope-chip on">两分得分 +2</button><button class="scope-chip on">三分得分 +3</button><button class="scope-chip blue-on">投篮出手</button><button class="scope-chip">投篮命中</button><button class="scope-chip">投篮未中</button></div></div><div class="scope-group"><strong>进攻数据</strong><div class="chip-grid"><button class="scope-chip">助攻</button><button class="scope-chip">进攻篮板</button><button class="scope-chip">失误</button><button class="scope-chip">造犯规</button></div></div><div class="scope-group"><strong>防守数据</strong><div class="chip-grid"><button class="scope-chip on">抢断</button><button class="scope-chip on">盖帽</button><button class="scope-chip">防守篮板</button><button class="scope-chip">个人犯规</button></div></div><div class="scope-warning">当前为“自选统计口径”：未选择的项目在报告中显示“未统计”，不会显示为 0，也不会参与完整率比较。</div><button class="btn">保存为我的统计模板</button></aside><section class="panel assignment-panel"><div class="panel-head"><strong>人员与任务分工</strong><span>每个“球员×指标”只设一个主负责人</span></div><div class="assignment-tabs"><button class="btn active">按技能分工</button><button class="btn">按球员分工</button><button class="btn">混合分工</button></div><div class="assignment-list"><div class="assignment-card"><div class="avatar">张</div><div class="assignment-copy"><strong>张教练 · 进攻记录</strong><span>负责全队已选得分与投篮项目</span><div class="assignment-tags"><i>罚球 +1</i><i>两分 +2</i><i>三分 +3</i><i>投篮出手</i><i class="player-scope">全队 12 人</i></div></div><em class="assignment-state">已接受</em></div><div class="assignment-card"><div class="avatar">李</div><div class="assignment-copy"><strong>李教练 · 防守记录</strong><span>负责全队抢断与盖帽</span><div class="assignment-tags"><i>抢断</i><i>盖帽</i><i class="player-scope">全队 12 人</i></div></div><em class="assignment-state">已接受</em></div><div class="assignment-card"><div class="avatar">王</div><div class="assignment-copy"><strong>王教练 · 指定球员补充</strong><span>示例：切换“按球员”后负责 5 名球员的全部已选项目</span><div class="assignment-tags"><i class="player-scope">#07 #11 #23 #15 #03</i></div></div><em class="assignment-state">待接受</em></div><div class="assignment-card self"><div class="avatar">我</div><div class="assignment-copy"><strong>主教练 · 战术板为主</strong><span>当前不承担数据录入，保留随时接管权</span><div class="assignment-tags"><i>监控全部任务</i><i>最终确认提交</i></div></div><em class="assignment-state">总负责人</em></div></div><button class="btn">＋ 添加一条任务分工</button></section><aside class="panel people-panel"><div class="panel-head"><strong>协作状态</strong><span>3 / 5 名助教</span></div><div class="coverage-card"><strong>已选统计项目覆盖</strong><b>100%</b><p>所有已选项目均有负责人；未选择的指标不计入缺失范围。</p></div><div class="conflict-card"><strong>重复检查：0 项冲突</strong><br>若同一球员的同一指标分配给两人，系统会阻止开始并要求指定唯一主负责人。</div><div class="member-stack"><div class="member"><div class="avatar">张</div><div><strong>张教练</strong><span>进攻数据 · 全队</span></div><em>已接受</em></div><div class="member"><div class="avatar">李</div><div><strong>李教练</strong><span>防守数据 · 全队</span></div><em>已接受</em></div><div class="member"><div class="avatar">王</div><div><strong>王教练</strong><span>指定球员 · 待确认</span></div><em>待接受</em></div></div><button class="btn">＋ 邀请助教（还可 2 人）</button><button class="btn" data-go="assistant-ready">预览助教收到的任务</button><button class="btn primary" data-go="coach-monitor">确认分工并开始</button></aside></div></div>`;
  }

  function assistantReady() {
    app.innerHTML = `<div class="shell">${topbar('助理教练 · 专项数据任务')}<div class="content assistant-ready-grid"><section class="panel assistant-hero"><div><span class="eyebrow">ASSISTANT TASK · OFFENSE DATA</span><h1>张教练，主教练邀请您记录进攻数据</h1><p>您的权限只覆盖本场主队的“罚球得分、两分得分、三分得分和投篮出手”。其他指标由其他教练负责；您不能修改官方比分，也看不到客队未公开数据。</p><div class="scope-summary"><div class="scope-summary-card"><small>统计项目范围</small><strong>得分 + 投篮出手</strong><span>罚球 +1、两分 +2、三分 +3、投篮出手；不区分命中或未命中。</span></div><div class="scope-summary-card"><small>球员范围</small><strong>主队全部 12 人</strong><span>场上阵容优先显示，替补球员可通过号码快速查找。</span></div><div class="scope-summary-card"><small>任务负责人</small><strong>主教练 · 刘老师</strong><span>主教练可以修改范围、收回任务并最终确认整队数据。</span></div><div class="scope-summary-card"><small>数据口径</small><strong>自选统计 · 部分指标</strong><span>未分配给您的数据不显示为 0，不计入您的完成度。</span></div></div></div><div class="task-actions"><button class="btn primary" data-go="assistant-live">接受并进入记录</button><button class="btn">无法参加</button></div></section><aside class="panel checklist"><div class="panel-head"><strong>任务边界检查</strong></div><div class="check-row"><div class="check-icon">✓</div><div class="check-copy"><strong>无重复写入</strong><span>您的任务与其他教练没有“球员×指标”冲突</span></div><span class="check-state">通过</span></div><div class="check-row"><div class="check-icon">✓</div><div class="check-copy"><strong>球队身份有效</strong><span>仅限郑州小蜂队本场比赛</span></div><span class="check-state">通过</span></div><div class="check-row"><div class="check-icon">✓</div><div class="check-copy"><strong>离线保护可用</strong><span>断网事件会保存在本机，恢复后去重同步</span></div><span class="check-state">正常</span></div><div class="device-choice">接受后，数据按钮将只显示本次分配给您的项目，避免比赛中误记其他教练负责的数据。</div></aside></div></div>`;
  }

  function coachDispatchByPlayer() {
    app.innerHTML = `<div class="shell">${topbar('主队主教练 · 按球员分工')}${scoreStrip()}<div class="content dispatch-grid"><aside class="panel scope-panel"><div class="panel-head"><strong>本场统计口径</strong><span>所有球员使用同一口径</span></div><div class="scope-group"><strong>本场选择 8 项</strong><small>得分归属 + 常用攻防数据</small><div class="chip-grid"><button class="scope-chip on">罚球 +1</button><button class="scope-chip on">两分 +2</button><button class="scope-chip on">三分 +3</button><button class="scope-chip blue-on">投篮出手</button><button class="scope-chip on">篮板</button><button class="scope-chip on">助攻</button><button class="scope-chip on">抢断</button><button class="scope-chip on">盖帽</button></div></div><div class="scope-warning">按球员分工时，每名记录人负责指定球员的全部已选指标；球员范围不能重叠。</div><button class="btn" data-go="coach-dispatch">返回按技能分工</button></aside><section class="panel assignment-panel"><div class="panel-head"><strong>人员与球员分组</strong><span>12 名球员已全部覆盖</span></div><div class="assignment-tabs"><button class="btn">按技能分工</button><button class="btn active">按球员分工</button><button class="btn">混合分工</button></div><div class="assignment-list"><div class="assignment-card"><div class="avatar">张</div><div class="assignment-copy"><strong>张教练 · A 组球员</strong><span>负责 5 名球员的全部 8 项已选数据</span><div class="assignment-tags"><i class="player-scope">#07 陈子昂</i><i class="player-scope">#11 周星宇</i><i class="player-scope">#23 赵嘉树</i><i class="player-scope">#15 李浩然</i><i class="player-scope">#03 王奕辰</i></div></div><em class="assignment-state">5 人</em></div><div class="assignment-card"><div class="avatar">李</div><div class="assignment-copy"><strong>李教练 · B 组球员</strong><span>负责另外 5 名球员的全部已选数据</span><div class="assignment-tags"><i class="player-scope">#09 孙铭泽</i><i class="player-scope">#06 郭泽</i><i class="player-scope">#18 韩一鸣</i><i class="player-scope">#32 程宇航</i><i class="player-scope">#08 冯子墨</i></div></div><em class="assignment-state">5 人</em></div><div class="assignment-card self"><div class="avatar">我</div><div class="assignment-copy"><strong>主教练 · C 组球员 + 战术板</strong><span>自己记录剩余 2 人，同时保留战术板</span><div class="assignment-tags"><i class="player-scope">#21 郑凯文</i><i class="player-scope">#12 高文博</i><i>全部 8 项</i></div></div><em class="assignment-state">2 人</em></div></div><button class="btn">调整球员分组</button></section><aside class="panel people-panel"><div class="coverage-card"><strong>球员范围覆盖</strong><b>12 / 12</b><p>所有参赛球员均有唯一负责人；0 名球员重复、0 名球员漏分配。</p></div><div class="coverage-card"><strong>已选指标覆盖</strong><b>100%</b><p>每个球员均覆盖本场选择的 8 项指标。</p></div><div class="coach-tip"><strong>混合分工示例</strong><br>也可以让张教练负责 A 组球员的进攻数据、李教练负责 A 组球员的防守数据，再由其他助教负责 B 组球员；系统仍按“球员×指标”检查冲突。</div><button class="btn" data-go="assistant-ready">预览助教任务</button><button class="btn primary" data-go="coach-monitor">确认分组并开始</button></aside></div></div>`;
  }

  function assistantLive() {
    app.innerHTML = `<div class="shell">${topbar('助理教练张老师 · 进攻数据')} ${scoreStrip()}<div class="content assistant-grid"><aside class="panel roster"><div class="panel-head"><strong>主队场上阵容</strong><span>全部 12 人可选</span></div><div class="player-list">${playerRows(homePlayers)}</div><button class="btn">号码快速查找</button></aside><section class="panel coach-work"><div class="task-scope-banner"><div class="avatar">张</div><div><strong>我的任务：全队得分与投篮出手</strong><span>不区分投中/未中 · 其他数据由队友负责</span></div><b>已同步 28ms</b></div><div class="selected-player"><div class="jersey">07</div><div><strong>陈子昂</strong><span>后卫 · 场上</span></div><div class="selected-total"><b>18</b><small>我记录的得分</small></div></div><div class="stat-actions"><button class="stat-btn score"><strong>+1</strong><span>罚球得分</span></button><button class="stat-btn score"><strong>+2</strong><span>两分得分</span></button><button class="stat-btn score"><strong>+3</strong><span>三分得分</span></button><button class="stat-btn"><strong>+1</strong><span>投篮出手</span></button><button class="stat-btn locked-stat"><strong>+1</strong><span>篮板 · 李教练</span></button><button class="stat-btn locked-stat"><strong>+1</strong><span>抢断 · 李教练</span></button><button class="stat-btn locked-stat"><strong>+1</strong><span>助攻 · 未统计</span></button><button class="stat-btn"><strong>撤销</strong><span>我的上一步</span></button></div><div class="event-stream"><div class="event-stream-head"><strong>我记录的最近事件</strong><span>只可撤销本人事件</span></div><div class="event-item"><time>02:41</time><b>#07 陈子昂</b><em>两分得分 +2</em></div><div class="event-item"><time>03:18</time><b>#11 周星宇</b><em>投篮出手 +1</em></div><div class="event-item"><time>03:46</time><b>#23 赵嘉树</b><em>三分得分 +3</em></div></div></section><aside class="panel coach-side"><div class="score-reconcile"><div class="reconcile-row"><div><small>官方主队比分</small><strong>56</strong></div><div style="text-align:right"><small>已归属球员得分</small><strong>56</strong></div></div><div class="progress"><i></i></div><div class="reconcile-ok">✓ 完整得分任务已对齐</div></div><div class="teammate-status"><strong>本队协作状态</strong><div class="teammate-row"><i></i><span>李教练 · 抢断/盖帽</span><em>记录中</em></div><div class="teammate-row"><i></i><span>主教练 · 战术板</span><em>在线</em></div><div class="teammate-row"><i style="background:var(--yellow)"></i><span>王教练 · 指定球员</span><em>待接受</em></div></div><div class="coach-tip">任务范围由主教练配置。需要调整时发起申请，不直接抢占其他教练负责的数据。</div><button class="btn">申请调整任务</button><button class="btn primary" data-go="coach-monitor">完成本节记录</button></aside></div></div>`;
  }

  function coachMonitor() {
    const rows = [
      ['张','张教练','得分、投篮出手','全队12人','38条','在线'],
      ['李','李教练','抢断、盖帽','全队12人','13条','在线'],
      ['王','王教练','指定球员全部已选项','#07等5人','0条','待接受'],
      ['我','主教练','监控、最终确认','全队','—','战术板']
    ];
    app.innerHTML = `<div class="shell">${topbar('主队主教练 · 数据任务监控')}${scoreStrip()}<div class="content monitor-grid"><section class="panel monitor-main"><div class="panel-head"><strong>实时任务状态</strong><span>主教练可暂停、转交或收回任意任务</span><div class="head-spacer"></div><button class="btn" data-go="coach-dispatch">调整分工</button></div><div class="monitor-table"><div class="monitor-row header"><span></span><span>记录人</span><span>负责范围</span><span>事件数</span><span>状态</span></div>${rows.map(r=>`<div class="monitor-row"><div class="avatar">${r[0]}</div><strong>${r[1]}</strong><span>${r[2]} · ${r[3]}</span><span>${r[4]}</span><em>${r[5]}</em></div>`).join('')}</div><div class="panel-head"><strong>统计口径覆盖图</strong><span>绿色为已分配，黄色为部分球员覆盖</span></div><div class="coverage-map"><div class="map-head">指标 / 球员组</div><div class="map-head">#07 #11</div><div class="map-head">#23 #15</div><div class="map-head">#03 #09</div><div class="map-head">其他球员</div><div class="map-head">负责人</div><div class="map-head">得分</div><div class="covered">已覆盖</div><div class="covered">已覆盖</div><div class="covered">已覆盖</div><div class="covered">已覆盖</div><div>张教练</div><div class="map-head">投篮出手</div><div class="covered">已覆盖</div><div class="covered">已覆盖</div><div class="covered">已覆盖</div><div class="covered">已覆盖</div><div>张教练</div><div class="map-head">抢断 / 盖帽</div><div class="partial">王教练</div><div class="partial">王教练</div><div class="covered">李教练</div><div class="covered">李教练</div><div>混合分工</div></div></section><aside class="panel monitor-side"><div class="coverage-card"><strong>已选口径任务覆盖</strong><b>100%</b><p>0 项重复、0 项漏分配。未选择指标不纳入覆盖计算。</p></div><div class="role-capacity"><div class="capacity-row"><strong>助理教练名额</strong><b>3 / 5</b></div><p>还可邀请 2 人。主教练不占助教名额。</p></div><div class="coach-tip"><strong>比赛中交接规则</strong><br>收回或转交前先同步当前设备的未上传事件；交接完成后原负责人立即变为只读。</div><button class="btn" data-go="coach-dispatch">调整 / 收回任务</button><button class="btn primary" data-go="coach-tactics">打开我的战术板</button><button class="btn" data-go="coach-submit">进入赛后汇总</button></aside></div></div>`;
  }

  function coachSubmitFlexible() {
    const players = side === 'home' ? homePlayers : awayPlayers;
    const team = side === 'home' ? match.home : match.away;
    app.innerHTML = `<div class="shell">${topbar(`${side==='home'?'主队':'客队'}主教练 · 多人数据汇总`)}${scoreStrip()}<div class="content submit-grid"><section class="panel summary-table"><div class="panel-head"><strong>${team} · 多人协作数据汇总</strong><span>3 名记录人 · 自选统计口径</span></div><div class="summary-row header"><span>号码</span><span>球员</span><span>得分</span><span>出手</span><span>抢断</span><span>盖帽</span><span>篮板</span><span>助攻</span></div>${players.slice(0,5).map((p,i)=>`<div class="summary-row"><span>#${p[0]}</span><strong>${p[1]}</strong><b>${p[3]}</b><span>${[12,9,8,6,6][i]}</span><span>${[2,1,2,1,1][i]}</span><span>${[0,1,0,2,1][i]}</span><span class="not-tracked">未统计</span><span class="not-tracked">未统计</span></div>`).join('')}</section><aside class="panel summary-side"><div class="data-mouth"><strong>本场数据口径：自选统计</strong><span>完整记录：1/2/3 分得分归属、投篮出手、抢断、盖帽。未记录：投篮命中/未中、篮板、助攻、失误等。</span></div><div class="validation"><div class="v-icon">✓</div><div><strong>多人任务已汇总</strong><span>张教练 38 条、李教练 13 条、主教练 2 条修正</span></div><em>通过</em></div><div class="validation"><div class="v-icon">✓</div><div><strong>完整得分归属一致</strong><span>球员得分合计 56 = 官方比分 56</span></div><em>需裁判核验</em></div><div class="validation"><div class="v-icon">✓</div><div><strong>无重复写入</strong><span>所有“球员×指标”均只有一个主负责人</span></div><em>通过</em></div><div class="validation warning"><div class="v-icon">!</div><div><strong>部分指标未统计</strong><span>未选择项目将在报告中显示“未统计”，不是 0</span></div><em>已知悉</em></div><div class="source-banner"><strong>主教练最终责任</strong><span>助教只能提交给主教练。由主教练确认整队汇总版本后，再进入得分归属核验和球队数据发布。</span></div><button class="btn primary">确认整队汇总并提交</button><button class="btn" data-go="coach-monitor">返回任务监控</button></aside></div></div>`;
  }

  function refereeReviewFlexible() {
    const card = (home, complete) => { const team=home?match.home:match.away, score=home?56:52, players=home?homePlayers:awayPlayers; return `<section class="panel review-team ${home?'':'away-review'}"><div class="review-title"><div class="team-badge ${home?'':'red'}">${home?'郑':'洛'}</div><div><strong>${team}</strong><span>${complete?'完整得分归属 · 3名教练协作':'自选统计 · 未完整记录得分'}</span></div><span class="status-pill" style="margin-left:auto">${complete?'需核验':'口径确认'}</span></div><div class="data-mouth"><strong>${complete?'完整得分口径':'部分统计口径'}</strong><span>${complete?'球员得分归属覆盖全场，必须与官方比分一致。':'只记录投篮出手、抢断等自选指标；缺失项目不会显示为 0。'}</span></div>${complete?`<div class="review-score"><div><span>官方总比分</span><strong>${score}</strong></div><div class="equals">=</div><div><span>球员得分合计</span><strong>${score}</strong></div></div>${distribution(players,!home)}<div class="alert-card">系统提醒：最高得分球员占本队 32%，未发现单人包揽全部得分、重复归属或名单异常。</div>`:`<div class="review-score"><div><span>官方总比分</span><strong>${score}</strong></div><div class="equals" style="color:var(--yellow)">≠</div><div><span>已记录球员得分</span><strong>34</strong></div></div><div class="alert-card">本队未选择“完整得分归属”，因此 34 分不能与官方 52 分作完整性比较，也不能据此判断漏记或作弊。</div>`}<div class="review-actions"><button class="btn success" data-go="team-data">${complete?'确认得分并发布':'确认口径并发布'}</button><button class="btn">退回主教练</button><button class="btn danger">拒绝请求</button></div></section>`; };
    app.innerHTML = `<div class="shell">${topbar('主裁判 · 分层数据核验')}${scoreStrip()}<div class="content review-grid">${card(true,true)}${card(false,false)}</div></div>`;
  }

  function teamDataFlexible() {
    app.innerHTML = `<div class="shell">${topbar('统一平台 · 球队自选数据视图')}<div class="content team-data-grid"><section class="panel data-dashboard"><div class="panel-head"><strong>${match.home} · 本场自选数据</strong><span>3 名教练协作 · 已确认发布</span><div class="head-spacer"></div><button class="btn">导出球队报告</button></div><div class="data-mouth" style="margin-bottom:10px"><strong>本场记录口径</strong><span>得分归属（完整）、投篮出手、抢断、盖帽；篮板、助攻、失误等未纳入本场统计。</span></div><div class="kpi-grid"><div class="kpi"><span>球员得分合计</span><strong>56</strong></div><div class="kpi"><span>投篮出手</span><strong>41</strong></div><div class="kpi"><span>抢断</span><strong>7</strong></div><div class="kpi"><span>盖帽</span><strong>4</strong></div></div><div class="rank-list"><div class="rank-row header"><span>排名</span><span>球员</span><span>得分</span><span>出手</span><span>篮板</span><span>助攻</span></div>${homePlayers.slice(0,5).map((p,i)=>`<div class="rank-row"><span>${i+1}</span><strong>#${p[0]} ${p[1]}</strong><span>${p[3]}</span><span>${[12,9,8,6,6][i]}</span><span class="not-tracked">未统计</span><span class="not-tracked">未统计</span></div>`).join('')}</div></section><aside class="panel audit-side"><div class="source-banner"><strong>✓ 多人协作数据已发布</strong><span>主教练：刘老师 · 最终确认<br>记录人：张教练、李教练、刘老师<br>得分核验：本场主裁判 王老师</span></div><div class="award-banner"><strong>部分统计必须保留口径</strong><span>未统计项目不能显示为 0，也不能用于跨比赛完整排名。教练自录数据仍不得自动驱动官方 MVP 等个人奖项。</span></div><div class="panel-head"><strong>数据流转记录</strong></div><div class="timeline-item"><strong>主教练设置口径并分工</strong><span>17:50 · 选择 6 项指标，分发 3 名记录人</span></div><div class="timeline-item"><strong>助理教练协作记录</strong><span>18:00—18:42 · 共同步 53 条事件</span></div><div class="timeline-item"><strong>主教练确认整队汇总</strong><span>18:45 · 0 项冲突，完整得分一致</span></div><div class="timeline-item"><strong>主裁判确认得分归属</strong><span>18:48 · 发布至球队数据视图</span></div></aside></div></div>`;
  }

  function renderFlowSimple() {
    const steps = [
      ['PC 赛事端','设置比赛与主裁判','只确定场次、双方球队、比赛时间和主裁判。'],
      ['双方球队','递交首发与替补','主队、客队分别提交名单；主办方只看是否完成。'],
      ['数据管理员','一键启动现场系统','三个前置条件就绪后启动，不配置球队内部数据权限。'],
      ['双方主教练','分配权限并发送','比赛前完成助教分工，通过通知或二维码发送权限。'],
      ['比赛现场','扫码绑定后直接操作','裁判进入比分/时间/MC；教练团队进入各自页面。']
    ];
    app.innerHTML = `<div class="simple-flow"><div class="simple-flow-head"><div><span class="eyebrow">SIMPLIFIED MATCH LAUNCH</span><h1>五步进入比赛，不把设置挂在裁判身上</h1><p>PC只准备场次、主裁判和双方名单；现场数据管理员确认条件后统一启动；球队内部的助教分工由各自主教练完成。裁判收到的是已经准备好的场次，核对后直接进入比分、时间和 MC。</p></div><div class="flow-meta"><span class="status-pill">名单先提交</span><span class="status-pill">数据管理员一键启动</span><span class="status-pill">通知 / 二维码绑定</span></div></div><div class="five-steps">${steps.map((s,i)=>`<article class="simple-step ${i===2||i===3?'active':''}"><div class="step-number">0${i+1}</div><small>${s[0]}</small><strong>${s[1]}</strong><p>${s[2]}</p></article>`).join('')}</div><div class="simple-results"><div class="result-card"><strong>主裁判页面</strong><span>只显示场次、双方球队、开赛时间和“进入控制台”，不再配置名单、助教或复杂参数。</span></div><div class="result-card"><strong>主教练页面</strong><span>进入本队工作台后，再设置统计口径、助教权限和战术板；球队内部配置不暴露给裁判。</span></div><div class="result-card"><strong>助理教练页面</strong><span>收到服务通知或扫描球队权限二维码，确认身份后直接进入本人被授权的操作面板。</span></div></div><div class="simple-rule"><strong>启动门槛只有 3 项：</strong><span>主裁判已确定　·　主队名单已提交　·　客队名单已提交</span><span>满足后由数据管理员一键启动</span></div></div>`;
  }

  function dataManagerLaunch() {
    app.innerHTML = `<div class="shell">${topbar('现场数据管理员 · 启动比赛系统')}<div class="content launch-grid"><section class="panel launch-main"><div><span class="eyebrow">MATCH READY CHECK</span><h1>三项准备完成，即可启动现场系统</h1><p>数据管理员只确认比赛是否具备启动条件，不参与裁判设置，也不干预双方球队内部的助教权限。</p></div><div class="ready-cards"><div class="ready-card"><div class="ready-icon">✓</div><strong>主裁判已确定</strong><span>王老师 · 已接受场次任务<br>负责比分、时间和 MC</span></div><div class="ready-card"><div class="ready-icon">✓</div><strong>主队名单已提交</strong><span>郑州小蜂队<br>首发 5 人 · 替补 7 人</span></div><div class="ready-card"><div class="ready-icon">✓</div><strong>客队名单已提交</strong><span>洛阳闪电队<br>首发 5 人 · 替补 7 人</span></div></div><div class="roster-ready"><div class="roster-side"><strong>${match.home}</strong><span>主教练刘老师已确认 · 12 人</span></div><span class="versus">名单完成</span><div class="roster-side" style="text-align:right"><strong>${match.away}</strong><span>主教练陈老师已确认 · 12 人</span></div></div><div class="coach-tip"><strong>启动后自动发生</strong><br>主裁判获得官方控制台入口；双方主教练进入各自球队页面；主教练可以继续在比赛前分配助教权限并发送通知或二维码。</div></section><aside class="panel launch-side"><div class="panel-head"><strong>启动状态</strong><span>场次 #A-12</span></div><div class="launch-status"><strong>✓ 已满足启动条件</strong><span>没有缺失名单或主裁判。无需再填写其他设置。</span></div><div class="match-card" style="grid-template-columns:1fr auto 1fr;margin:0"><div class="mini-team"><div class="team-badge">郑</div><div class="team-copy"><small>主队</small><strong>郑州小蜂队</strong></div></div><span class="versus">VS</span><div class="mini-team away"><div class="team-copy"><small>客队</small><strong>洛阳闪电队</strong></div><div class="team-badge red">洛</div></div></div><button class="btn primary" data-go="coach-ready">启动本场现场系统</button><button class="btn">返回场次列表</button><div class="device-choice">启动只开放各角色入口，不代表比赛计时已经开始。正式开赛仍由主裁判在控制台操作。</div></aside></div></div>`;
  }

  function refereeSimpleReady() {
    app.innerHTML = `<div class="shell">${topbar('主裁判 · 场次任务')}<section class="panel ref-simple"><span class="eyebrow">REFEREE MATCH TASK</span><h1>本场已准备完成，核对后直接进入控制台</h1><p>主裁判不需要设置球队名单、助理教练或数据统计口径。这些内容已由 PC 和双方主教练分别完成。</p><div class="match-card"><div class="mini-team"><div class="team-badge">郑</div><div class="team-copy"><small>主队 · 名单已提交</small><strong>${match.home}</strong></div></div><span class="versus">18:00 · 1号场</span><div class="mini-team away"><div class="team-copy"><small>客队 · 名单已提交</small><strong>${match.away}</strong></div><div class="team-badge red">洛</div></div></div><div class="ref-duty"><div class="duty-card"><strong>官方比分与赛果</strong><span>主裁判唯一写入，球队数据不能修改。</span></div><div class="duty-card"><strong>比赛时间与节次</strong><span>开始、暂停、节次和比赛结束。</span></div><div class="duty-card"><strong>MC 现场音频</strong><span>得分、攻防、暂停音乐和紧急停止。</span></div></div><div class="ref-enter"><button class="btn primary" data-go="referee-live">进入比分 / 时间 / MC 控制台</button><button class="btn">任务有误</button></div></section></div>`;
  }

  function refereeBaseline() {
    app.innerHTML = `<div class="referee-baseline"><img src="assets/主裁判原版控制台.jpg" alt="既有主裁判比赛控制台" /></div>`;
  }

  function refereeMobileBaseline() {
    app.innerHTML = `<div class="referee-baseline"><img src="assets/主裁判手机横屏原版控制台.jpg" alt="既有主裁判手机横屏控制台" /></div>`;
  }

  function coachInvite() {
    app.innerHTML = `<div class="shell pregame-shell">${topbar('主队主教练 · 分工完成')}<div class="content completion-grid"><section class="panel completion-main"><span class="eyebrow">赛前第 4 步</span><h1>分工已保存，系统已自动通知</h1><p>已加入的助教立即收到本场任务；待接受的临时助教在接受邀请后自动获得对应权限，不需要再次扫码。</p><div class="completion-list"><div class="invite-task"><div class="avatar">张</div><div><strong>张教练 · 进攻数据</strong><span>全队 · 罚球、两分、三分、投篮出手</span></div><em>已通知</em></div><div class="invite-task"><div class="avatar">李</div><div><strong>李教练 · 防守数据</strong><span>全队 · 抢断、盖帽</span></div><em>已通知</em></div><div class="invite-task"><div class="avatar">王</div><div><strong>王教练 · 指定球员</strong><span>#07 #11 #23 #15 #03</span></div><em>待接受</em></div></div><div class="coach-tip"><strong>权限只在本队本场有效</strong><br>开赛后分工自动锁定；比赛归档或主教练收回后权限自动失效。</div></section><aside class="panel completion-side"><div class="pl-status"><strong>3 项任务</strong><span>2 已送达 · 1 待接受</span></div><button class="btn primary" data-go="coach-monitor">查看协作进度</button><button class="btn" data-go="assistant-ready">预览助教任务</button><button class="btn" data-go="coach-dispatch">返回调整分工</button></aside></div></div>`;
  }

  const phoneHeader = (role, status = '在线') => `<header class="phone-top"><button class="phone-back">‹</button><div class="phone-role"><strong>${role}</strong><span>● ${status}</span></div><button class="phone-more">···</button></header>`;
  const phoneScore = () => `<section class="phone-card phone-score"><div class="phone-team"><strong>郑州小蜂</strong><b>56</b></div><div class="phone-clock"><strong>02:36</strong><span>第4节</span></div><div class="phone-team"><strong>洛阳闪电</strong><b>52</b></div></section>`;

  function refereeMobile() {
    const side = (name, home) => `<div class="phone-side-box ${home?'home':'away'}"><div class="phone-side-name"><span>${name}</span><span>${home?'犯规4':'犯规3'}</span></div><div class="phone-score-btns"><button>+1</button><button>+2</button><button>+3</button></div><div class="phone-minor"><button>犯规 +</button><button>暂停 +</button></div></div>`;
    app.innerHTML = `<div class="phone-shell">${phoneHeader('主裁判','同步正常')}${phoneScore()}<section class="phone-card"><div class="phone-section-title"><strong>计分</strong><span>官方</span></div><div class="phone-team-actions">${side('主队',true)}${side('客队',false)}</div><div class="phone-clock-main"><button>暂停计时</button><button class="undo">撤销</button></div></section><div class="phone-tabs"><button class="active">计分</button><button>MC</button><button>记录</button></div><section class="phone-card"><div class="phone-section-title"><strong>MC</strong><span>音量 68%</span></div><div class="phone-mc"><button>主队得分</button><button>客队得分</button><button>主队进攻</button><button>客队进攻</button><button>暂停音乐</button><button>防守音效</button></div></section><button class="phone-danger">结束比赛</button></div>`;
  }

  function coachMobile() {
    app.innerHTML = `<div class="phone-shell">${phoneHeader('主队主教练','数据同步')}${phoneScore()}<div class="phone-tabs"><button class="active">数据</button><button data-go="coach-mobile-tactics">战术</button><button data-go="coach-mobile-tasks">任务</button></div><section class="phone-card"><div class="phone-player-strip">${homePlayers.slice(0,6).map((p,i)=>`<button class="phone-player ${i===0?'active':''}"><strong>#${p[0]}</strong><span>${p[1]}</span></button>`).join('')}</div></section><section class="phone-card"><div class="phone-selected"><div class="jersey">07</div><div><strong>陈子昂</strong><span>后卫 · 场上</span></div><b>18</b></div><div class="phone-stat-grid"><button class="primary-stat"><strong>+1</strong><span>罚球</span></button><button class="primary-stat"><strong>+2</strong><span>两分</span></button><button class="primary-stat"><strong>+3</strong><span>三分</span></button><button><strong>+1</strong><span>篮板</span></button><button><strong>+1</strong><span>助攻</span></button><button><strong>+1</strong><span>抢断</span></button></div></section><div class="phone-scope"><strong>得分 56 / 56</strong><span>一致</span></div><div class="phone-bottom"><button class="active">数据</button><button data-go="coach-mobile-tactics">战术板</button><button data-go="coach-mobile-tasks">任务</button></div></div>`;
  }

  function assistantMobile() {
    app.innerHTML = `<div class="phone-shell">${phoneHeader('张教练','进攻数据')}${phoneScore()}<div class="phone-scope"><strong>我的任务</strong><span>得分 · 投篮出手</span></div><section class="phone-card"><div class="phone-player-strip">${homePlayers.slice(0,6).map((p,i)=>`<button class="phone-player ${i===0?'active':''}"><strong>#${p[0]}</strong><span>${p[1]}</span></button>`).join('')}</div></section><section class="phone-card"><div class="phone-selected"><div class="jersey">07</div><div><strong>陈子昂</strong><span>当前球员</span></div><b>18</b></div><div class="phone-stat-grid"><button class="primary-stat"><strong>+1</strong><span>罚球</span></button><button class="primary-stat"><strong>+2</strong><span>两分</span></button><button class="primary-stat"><strong>+3</strong><span>三分</span></button><button><strong>+1</strong><span>出手</span></button><button><strong>−1</strong><span>修正</span></button><button><strong>↶</strong><span>撤销</span></button></div></section><div class="phone-scope"><strong>已归属 56</strong><span>官方 56 · 一致</span></div><button class="phone-primary">完成本节</button></div>`;
  }

  function coachMobileTasks() {
    app.innerHTML = `<div class="phone-shell">${phoneHeader('主教练 · 任务','3/5 助教')}<div class="phone-tabs"><button data-go="coach-mobile">数据</button><button data-go="coach-mobile-tactics">战术</button><button class="active">任务</button></div><section class="phone-card"><div class="phone-section-title"><strong>助教分工</strong><span>3 / 5</span></div><div class="phone-task-list"><div class="phone-task"><div class="avatar">张</div><div><strong>张教练</strong><span>得分 · 投篮</span></div><em>在线</em></div><div class="phone-task"><div class="avatar">李</div><div><strong>李教练</strong><span>抢断 · 盖帽</span></div><em>在线</em></div><div class="phone-task"><div class="avatar">王</div><div><strong>王教练</strong><span>5名球员</span></div><em>待绑定</em></div></div></section><button class="phone-primary" data-go="coach-invite">发送权限</button><button class="phone-primary" style="background:var(--surface-3)" data-go="coach-monitor">查看进度</button><div class="phone-bottom"><button data-go="coach-mobile">数据</button><button data-go="coach-mobile-tactics">战术板</button><button class="active">任务</button></div></div>`;
  }

  function coachMobileTactics() {
    app.innerHTML = `<div class="phone-shell">${phoneHeader('主教练 · 战术板','球队私有')}${phoneScore()}<div class="phone-tabs"><button data-go="coach-mobile">数据</button><button class="active">战术</button><button data-go="coach-mobile-tasks">任务</button></div><section class="phone-card" style="padding:10px"><div class="court" style="width:100%;aspect-ratio:1.25"><div class="center-circle" style="width:76px;height:76px"></div><div class="paint left"></div><div class="three left"></div><div class="hoop left"></div>${[1,2,3,4,5].map(n=>`<div class="marker m${n}" style="width:36px;height:36px">${n}</div>`).join('')}<div class="route r1" style="width:120px"></div></div></section><div class="phone-stat-grid"><button class="primary-stat"><strong>↗</strong><span>路线</span></button><button><strong>✎</strong><span>画笔</span></button><button><strong>↶</strong><span>撤销</span></button></div><button class="phone-primary">保存战术</button><div class="phone-bottom"><button data-go="coach-mobile">数据</button><button class="active">战术板</button><button data-go="coach-mobile-tasks">任务</button></div></div>`;
  }

  function refereeMobileLandscape() {
    const sideBox = (name, fouls, home) => `<div class="pl-side ${home?'home':'away'}"><div class="pl-side-head"><span>${name}</span><span>犯规 ${fouls}</span></div><div class="pl-score-buttons"><button>+1</button><button>+2</button><button>+3</button><button class="minor">犯规+</button><button class="minor">暂停+</button></div></div>`;
    app.innerHTML = `<div class="phone-landscape">${phoneHeader('主裁判 · 比分/时间/MC','同步正常')}<div class="pl-grid pl-ref"><section class="pl-panel"><div class="pl-scorebar"><div class="pl-team"><strong>郑州小蜂</strong><b>56</b></div><div class="pl-clock"><strong>02:36</strong><span>第4节</span></div><div class="pl-team"><b>52</b><strong>洛阳闪电</strong></div></div><div class="pl-team-control">${sideBox('主队',4,true)}${sideBox('客队',3,false)}</div><div class="pl-clock-actions"><button class="primary">暂停计时</button><button>撤销</button><button>球权 →</button></div></section><aside class="pl-panel"><div class="pl-title"><strong>MC</strong><span>音量 68%</span></div><div class="pl-mc-grid"><button>主队得分</button><button>客队得分</button><button>主队进攻</button><button>客队进攻</button><button>暂停音乐</button><button>防守音效</button></div><button class="pl-end">结束比赛</button></aside></div></div>`;
  }

  function coachMobileLandscape() {
    app.innerHTML = `<div class="phone-landscape">${phoneHeader('主队主教练 · 数据','比分只读')}<div class="pl-grid pl-coach"><aside class="pl-panel"><div class="pl-title"><strong>场上球员</strong><span>5人</span></div><div class="pl-roster">${homePlayers.slice(0,5).map((p,i)=>`<div class="pl-player ${i===0?'active':''}"><b>#${p[0]}</b><strong>${p[1]}</strong><em>${p[3]}</em></div>`).join('')}</div></aside><section class="pl-panel pl-actions"><div class="pl-selected"><div class="jersey">07</div><div><strong>陈子昂</strong><span>当前球员</span></div><b>18</b></div><div class="pl-stat-grid"><button class="hot"><strong>+1</strong><span>罚球</span></button><button class="hot"><strong>+2</strong><span>两分</span></button><button class="hot"><strong>+3</strong><span>三分</span></button><button><strong>+1</strong><span>篮板</span></button><button><strong>+1</strong><span>助攻</span></button><button><strong>+1</strong><span>抢断</span></button></div></section><aside class="pl-panel pl-side-info"><div class="pl-status"><strong>郑州小蜂 56 : 52</strong><span>第4节 · 02:36 · 得分一致</span></div><div class="pl-nav"><button class="active">数据</button><button data-go="coach-mobile-tactics">战术</button><button data-go="coach-mobile-tasks">任务</button></div><button class="pl-primary" data-go="coach-mobile-tactics">打开战术板</button><button class="pl-primary" style="background:var(--surface-3)" data-go="coach-submit">赛后汇总</button></aside></div></div>`;
  }

  function assistantMobileLandscape() {
    app.innerHTML = `<div class="phone-landscape">${phoneHeader('张教练 · 得分/出手','专项任务')}<div class="pl-grid pl-coach"><aside class="pl-panel"><div class="pl-title"><strong>球员</strong><span>全队</span></div><div class="pl-roster">${homePlayers.slice(0,5).map((p,i)=>`<div class="pl-player ${i===0?'active':''}"><b>#${p[0]}</b><strong>${p[1]}</strong><em>${p[3]}</em></div>`).join('')}</div></aside><section class="pl-panel pl-actions"><div class="pl-selected"><div class="jersey">07</div><div><strong>陈子昂</strong><span>我的按钮</span></div><b>18</b></div><div class="pl-stat-grid"><button class="hot"><strong>+1</strong><span>罚球</span></button><button class="hot"><strong>+2</strong><span>两分</span></button><button class="hot"><strong>+3</strong><span>三分</span></button><button><strong>+1</strong><span>出手</span></button><button><strong>−1</strong><span>修正</span></button><button><strong>↶</strong><span>撤销</span></button></div></section><aside class="pl-panel pl-side-info"><div class="pl-status"><strong>已归属 56 / 官方 56</strong><span>一致 · 同步正常</span></div><button class="pl-primary">完成本节</button><button class="pl-primary" style="background:var(--surface-3)">申请调任务</button></aside></div></div>`;
  }

  function coachTasksLandscape() {
    app.innerHTML = `<div class="phone-landscape">${phoneHeader('主教练 · 助教任务','3/5在线')}<div class="pl-grid pl-task"><section class="pl-panel"><div class="pl-title"><strong>助教分工</strong><span>比赛前设置</span></div><div class="pl-task-list"><div class="pl-task-row"><div class="avatar">张</div><div><strong>张教练</strong><span>得分 · 投篮</span></div><em>在线</em></div><div class="pl-task-row"><div class="avatar">李</div><div><strong>李教练</strong><span>抢断 · 盖帽</span></div><em>在线</em></div><div class="pl-task-row"><div class="avatar">王</div><div><strong>王教练</strong><span>5名球员</span></div><em>待绑定</em></div></div></section><aside class="pl-panel pl-side-info"><div class="pl-nav"><button data-go="coach-mobile">数据</button><button data-go="coach-mobile-tactics">战术</button><button class="active">任务</button></div><button class="pl-primary" data-go="coach-invite">发送权限</button><button class="pl-primary" style="background:var(--surface-3)" data-go="coach-monitor">查看进度</button><button class="pl-primary" style="background:var(--surface-3)" data-go="coach-dispatch">调整分工</button></aside></div></div>`;
  }

  function coachTacticsLandscape() {
    app.innerHTML = `<div class="phone-landscape">${phoneHeader('主教练 · 战术板','球队私有')}<div class="pl-grid pl-tactics"><aside class="pl-panel"><div class="pl-title"><strong>工具</strong></div><div class="pl-tools"><button>路线</button><button>画笔</button><button>撤销</button><button>清空</button></div><div class="pl-nav" style="padding:7px"><button data-go="coach-mobile">数据</button><button class="active">战术</button><button data-go="coach-mobile-tasks">任务</button></div></aside><section class="pl-panel pl-court"><div class="court"><div class="center-circle"></div><div class="paint left"></div><div class="three left"></div><div class="hoop left"></div>${[1,2,3,4,5].map(n=>`<div class="marker m${n}" style="width:34px;height:34px">${n}</div>`).join('')}<div class="route r1" style="width:130px"></div></div></section><aside class="pl-panel pl-side-info"><div class="pl-status"><strong>第4节 · 02:36</strong><span>郑州小蜂 56 : 52</span></div><button class="pl-primary">保存战术</button><button class="pl-primary" style="background:var(--surface-3)" data-go="coach-mobile">返回数据</button></aside></div></div>`;
  }

  function tacticMarkers() {
    const own = [
      ['m1','assets/avatar-left-7.png','07'],
      ['m2','assets/avatar-left-11.png','11'],
      ['m3','assets/avatar-left-23.png','23'],
      ['m4','assets/avatar-left-30.png','30'],
      ['m5','assets/avatar-left-34.png','34']
    ];
    const opponents = [['x1','06'],['x2','09'],['x3','18'],['x4','21'],['x5','32']];
    return `${own.map(item=>`<div class="marker own-avatar ${item[0]}"><img src="${item[1]}" alt="本方${item[2]}号" /><span>${item[2]}</span></div>`).join('')}${opponents.map(item=>`<div class="marker opponent ${item[0]}">${item[1]}</div>`).join('')}`;
  }

  function coachTacticsBranded() {
    app.innerHTML = `<div class="shell">${topbar('主队主教练 · 平板战术板')}${scoreStrip()}<div class="content tactics-grid"><aside class="panel toolbox"><div class="panel-head"><strong>工具</strong><span>触控笔 / 手指</span></div><div class="tool-group"><button class="tool active">路线</button><button class="tool">画笔</button><button class="tool">传球</button><button class="tool">防守</button><button class="tool">文字</button><button class="tool">橡皮</button></div><div class="mc-label">颜色</div><div class="color-row"><button class="color-dot active"></button><button class="color-dot blue"></button><button class="color-dot white"></button></div><button class="btn">撤销</button><button class="btn danger">清空</button><button class="btn" data-go="coach-live">返回数据</button></aside><section class="panel court-wrap"><div class="court">${tacticMarkers()}<div class="route r1"></div><div class="route r2"></div></div></section><aside class="panel playbook"><div class="panel-head"><strong>战术</strong><span>本方头像 · 对方号码</span></div><div class="timeout-clock"><span>暂停剩余</span><strong>00:42</strong></div><div class="play-card active"><strong>边线球 · 双掩护</strong><span>07 持球，34 顺下</span></div><div class="play-card"><strong>全场紧逼</strong><span>1-2-1-1</span></div><button class="btn">＋ 新战术</button><button class="btn primary">保存战术</button></aside></div></div>`;
  }

  function coachTacticsLandscapeBranded() {
    app.innerHTML = `<div class="phone-landscape">${phoneHeader('主教练 · 战术板','球队私有')}<div class="pl-grid pl-tactics"><aside class="pl-panel"><div class="pl-title"><strong>工具</strong></div><div class="pl-tools"><button>路线</button><button>画笔</button><button>撤销</button><button>清空</button></div><div class="pl-nav" style="padding:7px"><button data-go="coach-mobile">数据</button><button class="active">战术</button><button data-go="coach-mobile-tasks">任务</button></div></aside><section class="pl-panel pl-court"><div class="court">${tacticMarkers()}<div class="route r1" style="width:120px"></div></div></section><aside class="pl-panel pl-side-info"><div class="pl-status"><strong>第4节 · 02:36</strong><span>本方头像 · 对方号码</span></div><button class="pl-primary">保存战术</button><button class="pl-primary" style="background:var(--surface-3)" data-go="coach-mobile">返回数据</button></aside></div></div>`;
  }

  function headCoachHubSimplified() {
    app.innerHTML = `<div class="shell">${topbar('主队主教练 · 比赛数据')}<div class="content simple-hub"><section class="panel simple-hub-main"><span class="eyebrow">赛前选择</span><h1>这场谁来记数据？</h1><p>选择一种方式，比赛前随时可以改。</p><div class="simple-mode-row"><button class="simple-mode" data-go="coach-live"><b>方式 1</b><strong>我自己记</strong><span>数据和战术板都由我操作</span></button><button class="simple-mode active" data-go="coach-dispatch"><b>方式 2</b><strong>分给助教</strong><span>选项目、选助教、发送权限</span></button><button class="simple-mode"><b>方式 3</b><strong>不记录</strong><span>只使用战术板，不影响比赛</span></button></div></section><aside class="panel simple-hub-side"><div class="panel-head"><strong>助教</strong><span>3 / 5</span></div><div class="member"><div class="avatar">张</div><div><strong>张教练</strong><span>在线</span></div><em>可分配</em></div><div class="member"><div class="avatar">李</div><div><strong>李教练</strong><span>在线</span></div><em>可分配</em></div><div class="member"><div class="avatar">王</div><div><strong>王教练</strong><span>待邀请</span></div><em>未绑定</em></div><button class="btn">＋ 添加助教</button><button class="btn primary" data-go="coach-dispatch">下一步</button><button class="btn" data-go="coach-tactics">打开战术板</button></aside></div></div>`;
  }

  function coachDispatchSimplified() {
    app.innerHTML = `<div class="shell">${topbar('主队主教练 · 助教分工')}${scoreStrip()}<div class="content simple-dispatch"><aside class="panel simple-template"><div class="simple-step-head"><b>1</b><strong>记录什么</strong></div><button class="template-choice active"><strong>基础得分</strong><span>罚球、两分、三分</span></button><button class="template-choice"><strong>常用数据</strong><span>得分、投篮、篮板、助攻、抢断</span></button><button class="template-choice"><strong>自定义</strong><span>自己挑选项目</span></button><button class="btn">保存为常用模板</button></aside><section class="panel simple-assign"><div class="simple-step-head"><b>2</b><strong>分给谁</strong><span class="status-pill" style="margin-left:auto">最多 5 名助教</span></div><div class="simple-assistant"><div class="avatar">张</div><div><strong>张教练</strong><span>已绑定</span></div><div class="assign-pill">全队 · 得分</div><button class="btn">修改</button></div><div class="simple-assistant"><div class="avatar">李</div><div><strong>李教练</strong><span>已绑定</span></div><div class="assign-pill">全队 · 抢断 / 盖帽</div><button class="btn">修改</button></div><div class="simple-assistant"><div class="avatar">王</div><div><strong>王教练</strong><span>待绑定</span></div><div class="assign-pill">#07 #11 #23 #15 #03</div><button class="btn">修改</button></div><button class="btn">＋ 再分配一名助教</button><div class="auto-check">✓ 系统已自动检查：没有重复分工</div><div class="simple-send"><button class="btn primary" data-go="coach-invite">发送权限</button><button class="btn">自定义高级分工</button></div></section></div></div>`;
  }

  function coachMonitorSimplified() {
    app.innerHTML = `<div class="shell">${topbar('主队主教练 · 数据进度')}${scoreStrip()}<div class="content simple-monitor"><section class="panel simple-monitor-main"><div class="panel-head"><strong>助教进度</strong><span>系统自动汇总</span></div><div class="simple-progress-row"><div class="avatar">张</div><div><strong>张教练</strong><span>全队得分</span></div><b>38 条</b><em>记录中</em></div><div class="simple-progress-row"><div class="avatar">李</div><div><strong>李教练</strong><span>抢断 / 盖帽</span></div><b>13 条</b><em>记录中</em></div><div class="simple-progress-row"><div class="avatar">王</div><div><strong>王教练</strong><span>5 名球员</span></div><b>—</b><em style="color:var(--yellow)">待绑定</em></div><button class="btn">调整分工</button></section><aside class="panel simple-monitor-side"><div class="launch-status"><strong>✓ 数据正常</strong><span>无重复、同步正常</span></div><div class="role-capacity"><div class="capacity-row"><strong>已在线</strong><b>2 / 3</b></div></div><button class="btn primary" data-go="coach-tactics">打开战术板</button><button class="btn" data-go="coach-submit">赛后汇总</button><button class="btn">发送提醒</button></aside></div></div>`;
  }

  function tacticFullStage() {
    return `<div class="tactic-full-stage">${tacticMarkers()}<div class="route r1"></div><div class="route r2"></div><div class="tactic-floating tools"><button class="active">路线</button><button>画笔</button><button>传球</button><button>防守</button><button>文字</button><button>橡皮</button><button>撤销</button><button class="danger">清空</button></div><div class="tactic-floating status"><strong>Q4 · 02:36</strong><span>56 : 52</span></div><div class="tactic-legend">本方头像 · 对方号码</div><div class="tactic-floating plays"><button class="active">边线球</button><button>全场紧逼</button><button>＋</button></div><div class="tactic-floating actions"><button class="active">保存</button><button data-go="coach-live">返回数据</button></div></div>`;
  }

  function coachTacticsFullscreenPad() {
    app.innerHTML = `<div class="tactic-full-screen">${tacticFullStage()}</div>`;
  }

  function coachTacticsFullscreenPhone() {
    app.innerHTML = `<div class="tactic-full-screen">${tacticFullStage()}</div>`;
  }

  function coachMobileLandscapeFull() {
    app.innerHTML = `<div class="phone-landscape">${phoneHeader('主队主教练 · 数据','比分只读')}<div class="pl-grid pl-coach"><aside class="pl-panel"><div class="pl-title"><strong>场上球员</strong><span>5人</span></div><div class="pl-roster">${homePlayers.slice(0,5).map((p,i)=>`<div class="pl-player ${i===0?'active':''}"><b>#${p[0]}</b><strong>${p[1]}</strong><em>${p[3]}</em></div>`).join('')}</div></aside><section class="pl-panel pl-actions"><div class="pl-selected"><div class="jersey">07</div><div><strong>陈子昂</strong><span>当前球员</span></div><b>18</b></div><div class="pl-stat-grid full"><button class="hot"><strong>+1</strong><span>罚球</span></button><button class="hot"><strong>+2</strong><span>两分</span></button><button class="hot"><strong>+3</strong><span>三分</span></button><button><strong>−1</strong><span>修正</span></button><button><strong>+1</strong><span>篮板</span></button><button><strong>+1</strong><span>助攻</span></button><button><strong>+1</strong><span>抢断</span></button><button><strong>+1</strong><span>盖帽</span></button><button><strong>+1</strong><span>失误</span></button><button><strong>+1</strong><span>犯规</span></button><button><strong>投篮</strong><span>未中</span></button><button><strong>更多</strong><span>自定义</span></button></div></section><aside class="pl-panel pl-side-info"><div class="pl-status"><strong>郑州小蜂 56 : 52</strong><span>Q4 · 02:36 · 得分一致</span></div><div class="pl-feature-nav"><button class="active">数据</button><button>阵容</button><button data-go="coach-mobile-tactics">战术板</button><button>事件</button><button data-go="coach-mobile-tasks">任务</button><button data-go="coach-mobile-submit">汇总</button></div><button class="pl-primary" data-go="coach-mobile-tactics">打开战术板</button></aside></div></div>`;
  }

  function assistantMobileLandscapeFull() {
    app.innerHTML = `<div class="phone-landscape">${phoneHeader('张教练 · 专项数据','得分/出手')}<div class="pl-grid pl-coach"><aside class="pl-panel"><div class="pl-title"><strong>球员</strong><span>全队</span></div><div class="pl-roster">${homePlayers.slice(0,5).map((p,i)=>`<div class="pl-player ${i===0?'active':''}"><b>#${p[0]}</b><strong>${p[1]}</strong><em>${p[3]}</em></div>`).join('')}</div></aside><section class="pl-panel pl-actions"><div class="pl-selected"><div class="jersey">07</div><div><strong>陈子昂</strong><span>我的任务</span></div><b>18</b></div><div class="pl-stat-grid full"><button class="hot"><strong>+1</strong><span>罚球</span></button><button class="hot"><strong>+2</strong><span>两分</span></button><button class="hot"><strong>+3</strong><span>三分</span></button><button><strong>+1</strong><span>出手</span></button><button disabled><strong>锁定</strong><span>篮板</span></button><button disabled><strong>锁定</strong><span>抢断</span></button><button disabled><strong>锁定</strong><span>助攻</span></button><button><strong>↶</strong><span>撤销</span></button></div></section><aside class="pl-panel pl-side-info"><div class="pl-status"><strong>已归属 56 / 官方 56</strong><span>一致 · 同步正常</span></div><div class="pl-feature-nav"><button class="active">数据</button><button>阵容</button><button>事件</button><button>任务</button></div><button class="pl-primary">完成本节</button><button class="pl-primary" style="background:var(--surface-3)">申请调任务</button></aside></div></div>`;
  }

  function coachTasksLandscapeFull() {
    app.innerHTML = `<div class="phone-landscape">${phoneHeader('主教练 · 助教分工','3/5')}<div class="pl-grid" style="grid-template-columns:210px 1fr 160px"><aside class="pl-panel"><div class="pl-title"><strong>1 记录什么</strong></div><div class="pl-template-list"><button class="pl-template-item active"><strong>基础得分</strong><span>罚球、两分、三分</span></button><button class="pl-template-item"><strong>常用数据</strong><span>得分、投篮、篮板等</span></button><button class="pl-template-item"><strong>自定义</strong><span>自己挑选</span></button></div></aside><section class="pl-panel"><div class="pl-title"><strong>2 分给谁</strong><span>自动查重</span></div><div class="pl-assign-list"><div class="pl-assign-row"><div class="avatar">张</div><div><strong>张教练</strong><span>已绑定</span></div><b>全队 · 得分</b><button>改</button></div><div class="pl-assign-row"><div class="avatar">李</div><div><strong>李教练</strong><span>已绑定</span></div><b>抢断 / 盖帽</b><button>改</button></div><div class="pl-assign-row"><div class="avatar">王</div><div><strong>王教练</strong><span>待绑定</span></div><b>5 名球员</b><button>改</button></div></div></section><aside class="pl-panel pl-side-info"><div class="pl-status"><strong>✓ 无重复</strong><span>系统自动检查</span></div><button class="pl-primary" data-go="coach-mobile-invite">发送权限</button><button class="pl-primary" style="background:var(--surface-3)" data-go="coach-mobile-monitor">查看进度</button><button class="pl-primary" style="background:var(--surface-3)">高级分工</button></aside></div></div>`;
  }

  function coachReadyLandscapeFull() {
    app.innerHTML = `<div class="phone-landscape">${phoneHeader('主教练 · 比赛数据','赛前')}<div class="pl-grid pl-task"><section class="pl-panel"><div class="pl-title"><strong>这场谁来记数据？</strong><span>比赛前可修改</span></div><div class="pl-mode-grid"><button class="pl-mode-card"><b>方式1</b><strong>我自己记</strong><span>数据和战术板都由我操作</span></button><button class="pl-mode-card active" data-go="coach-mobile-tasks"><b>方式2</b><strong>分给助教</strong><span>选项目、选助教、发权限</span></button><button class="pl-mode-card"><b>方式3</b><strong>不记录</strong><span>只使用战术板</span></button></div></section><aside class="pl-panel pl-side-info"><div class="pl-status"><strong>助教 3 / 5</strong><span>张、李在线 · 王待绑定</span></div><button class="pl-primary" data-go="coach-mobile-tasks">下一步</button><button class="pl-primary" style="background:var(--surface-3)" data-go="coach-mobile-tactics">战术板</button></aside></div></div>`;
  }

  function coachInviteLandscapeFull() {
    app.innerHTML = `<div class="phone-landscape">${phoneHeader('主教练 · 分工完成','已自动通知')}<div class="pl-grid pl-task"><section class="pl-panel"><div class="pl-title"><strong>任务已保存</strong><span>开赛前可修改</span></div><div class="pl-task-list"><div class="pl-task-row"><div class="avatar">张</div><div><strong>张教练</strong><span>全队 · 得分</span></div><em>已通知</em></div><div class="pl-task-row"><div class="avatar">李</div><div><strong>李教练</strong><span>抢断 / 盖帽</span></div><em>已通知</em></div><div class="pl-task-row"><div class="avatar">王</div><div><strong>王教练</strong><span>5 名球员</span></div><em>待接受</em></div></div></section><aside class="pl-panel pl-side-info"><div class="pl-status"><strong>自动通知完成</strong><span>无需再次扫码或转发</span></div><button class="pl-primary" data-go="coach-mobile-monitor">查看协作进度</button><button class="pl-primary" style="background:var(--surface-3)" data-go="assistant-mobile-ready">预览助教任务</button><button class="pl-primary" style="background:var(--surface-3)" data-go="coach-mobile-tasks">返回调整</button></aside></div></div>`;
  }

  function assistantReadyLandscapeFull() {
    app.innerHTML = `<div class="phone-landscape">${phoneHeader('张教练 · 接受任务','主队')}<div class="pl-grid pl-task"><section class="pl-panel"><div class="pl-title"><strong>本场任务</strong><span>U12小组赛</span></div><div class="pl-mode-grid"><div class="pl-mode-card active"><b>统计项目</b><strong>得分 / 出手</strong><span>罚球、两分、三分、投篮出手</span></div><div class="pl-mode-card"><b>球员范围</b><strong>全队 12 人</strong><span>场上球员优先</span></div><div class="pl-mode-card"><b>负责人</b><strong>主教练刘老师</strong><span>本场有效</span></div></div></section><aside class="pl-panel pl-side-info"><div class="pl-status"><strong>✓ 无冲突</strong><span>仅限本队本场</span></div><button class="pl-primary" data-go="assistant-mobile">接受任务</button><button class="pl-primary" style="background:var(--surface-3)">无法参加</button></aside></div></div>`;
  }

  function coachMonitorLandscapeFull() {
    app.innerHTML = `<div class="phone-landscape">${phoneHeader('主教练 · 数据进度','2/3在线')}<div class="pl-grid pl-task"><section class="pl-panel"><div class="pl-title"><strong>助教进度</strong><span>自动汇总</span></div><div class="pl-task-list"><div class="pl-task-row"><div class="avatar">张</div><div><strong>张教练</strong><span>全队得分</span></div><em>38条</em></div><div class="pl-task-row"><div class="avatar">李</div><div><strong>李教练</strong><span>抢断/盖帽</span></div><em>13条</em></div><div class="pl-task-row"><div class="avatar">王</div><div><strong>王教练</strong><span>5名球员</span></div><em style="color:var(--yellow)">待绑定</em></div></div></section><aside class="pl-panel pl-side-info"><div class="pl-status"><strong>✓ 数据正常</strong><span>无重复 · 同步正常</span></div><button class="pl-primary" data-go="coach-mobile-tactics">战术板</button><button class="pl-primary" data-go="coach-mobile-submit">赛后汇总</button><button class="pl-primary" style="background:var(--surface-3)" data-go="coach-mobile-tasks">调整分工</button></aside></div></div>`;
  }

  function coachSubmitLandscapeFull() {
    app.innerHTML = `<div class="phone-landscape">${phoneHeader('主教练 · 赛后汇总','3人协作')}<div class="pl-grid pl-task"><section class="pl-panel"><div class="pl-title"><strong>球员数据</strong><span>自选统计</span></div><div class="pl-summary-table"><div class="pl-summary-row header"><span>号码</span><span>球员</span><span>得分</span><span>出手</span><span>抢断</span><span>盖帽</span></div>${homePlayers.slice(0,5).map((p,i)=>`<div class="pl-summary-row"><span>#${p[0]}</span><strong>${p[1]}</strong><span>${p[3]}</span><span>${[12,9,8,6,6][i]}</span><span>${[2,1,2,1,1][i]}</span><span>${[0,1,0,2,1][i]}</span></div>`).join('')}</div></section><aside class="pl-panel pl-side-info"><div class="pl-status"><strong>✓ 得分一致</strong><span>56 = 官方 56</span></div><div class="pl-status"><strong>✓ 无重复</strong><span>未统计项不记0</span></div><button class="pl-primary">确认并提交</button><button class="pl-primary" style="background:var(--surface-3)" data-go="coach-mobile-monitor">返回进度</button></aside></div></div>`;
  }

  function coachChoices(activeName) {
    return [['张','张教练','4项数据'],['李','李教练','5名球员'],['王','王教练','未分配']].map(item=>`<div class="coach-choice ${item[1]===activeName?'active':''}"><div class="avatar">${item[0]}</div><div><strong>${item[1]}</strong><span>${item[2]}</span></div><em>${item[1]===activeName?'当前':'选择'}</em></div>`).join('');
  }

  function dataClaimContent(compact = false) {
    const categories = [
      ['得分',['罚球+1|张','两分+2|张','三分+3|available']],
      ['投篮',['罚球未中|available','两分未中|available','三分未中|available','投篮出手|selecting']],
      ['进攻',['助攻|available','进攻篮板|李','失误|available']],
      ['防守',['防守篮板|李','抢断|李','盖帽|available']],
      ['纪律',['个人犯规|available','技术犯规|available']]
    ];
    return categories.map(category=>`<div class="data-category"><strong>${category[0]}</strong><div class="claim-grid">${category[1].map(raw=>{const [label,state]=raw.split('|');const cls=state==='available'?'available':state==='selecting'?'selecting':'taken';const owner=cls==='taken'?`<small>${state}</small>`:'';return `<button class="claim-chip ${cls}">${label}${owner}</button>`}).join('')}</div></div>`).join('');
  }

  function playerClaimContent() {
    const players = [
      ['#07 陈子昂','李','taken'],['#11 周星宇','李','taken'],['#23 赵嘉树','李','taken'],['#15 李浩然','李','taken'],
      ['#03 王奕辰','李','taken'],['#09 孙铭泽','可分配','available'],['#06 郭泽','可分配','available'],['#18 韩一鸣','选择中','selecting'],
      ['#32 程宇航','可分配','available'],['#08 冯子墨','可分配','available'],['#21 郑凯文','张','taken'],['#12 高文博','可分配','available']
    ];
    return `<div class="player-claim-grid">${players.map(p=>`<button class="player-claim ${p[2]}"><strong>${p[0]}</strong><span>${p[1]}</span></button>`).join('')}</div>`;
  }

  function coachDispatchByDataNew() {
    app.innerHTML = `<div class="shell">${topbar('主队主教练 · 数据分工')}${scoreStrip()}<div class="content classify-grid"><aside class="panel classify-side"><div class="classify-step"><b>1</b><strong>分工方式</strong></div><div class="classify-modes"><button class="active">按数据分</button><button data-go="coach-dispatch-player">按球员分</button></div><div class="classify-step"><b>2</b><strong>选择教练</strong></div>${coachChoices('张教练')}</aside><section class="panel classify-main"><div class="panel-head"><strong>给张教练选择数据</strong><div class="head-spacer"></div><div class="legend-row"><span class="legend-item"><i class="legend-dot"></i>可分配</span><span class="legend-item"><i class="legend-dot selecting"></i>选择中</span><span class="legend-item"><i class="legend-dot taken"></i>已分配</span></div></div>${dataClaimContent()}</section><aside class="panel classify-actions"><div class="assignment-summary"><strong>张教练</strong><span>记录全队所有球员的指定数据<br>已确认：罚球、两分<br>正在选择：投篮出手</span></div><button class="btn primary">确认本次选择</button><button class="btn">选择下一位教练</button><button class="btn primary" data-go="coach-invite">完成并发送权限</button><div class="auto-check">灰色已占用，绿色可由其他教练承接</div></aside></div></div>`;
  }

  function coachDispatchByPlayerNew() {
    app.innerHTML = `<div class="shell">${topbar('主队主教练 · 球员分工')}${scoreStrip()}<div class="content classify-grid"><aside class="panel classify-side"><div class="classify-step"><b>1</b><strong>分工方式</strong></div><div class="classify-modes"><button data-go="coach-dispatch">按数据分</button><button class="active">按球员分</button></div><div class="classify-step"><b>2</b><strong>选择教练</strong></div>${coachChoices('李教练')}</aside><section class="panel classify-main"><div class="panel-head"><strong>给李教练选择球员</strong><div class="head-spacer"></div><div class="legend-row"><span class="legend-item"><i class="legend-dot"></i>可分配</span><span class="legend-item"><i class="legend-dot selecting"></i>选择中</span><span class="legend-item"><i class="legend-dot taken"></i>已分配</span></div></div>${playerClaimContent()}<div class="coach-tip"><strong>按球员分工</strong><br>李教练可以记录已分配球员的全部数据；比赛中点击才产生记录，不点击则没有该项事件。</div></section><aside class="panel classify-actions"><div class="assignment-summary"><strong>李教练</strong><span>负责 5 名球员<br>可操作这些球员的全部数据按钮</span></div><button class="btn primary">确认本次选择</button><button class="btn">选择下一位教练</button><button class="btn primary" data-go="coach-invite">完成并发送权限</button></aside></div></div>`;
  }

  function coachMobileTasksDataNew() {
    app.innerHTML = `<div class="phone-landscape">${phoneHeader('主教练 · 按数据分工','3/5')}<div class="pl-grid pl-classify"><aside class="pl-panel pl-classify-side"><div class="classify-modes"><button class="active">按数据</button><button data-go="coach-mobile-tasks-player">按球员</button></div>${coachChoices('张教练')}</aside><section class="pl-panel pl-classify-main"><div class="pl-title"><strong>张教练 · 选择数据</strong><span>绿可选 · 灰已分</span></div>${dataClaimContent(true)}</section><aside class="pl-panel pl-classify-actions"><div class="pl-status"><strong>全队 · 指定数据</strong><span>张教练</span></div><button class="pl-primary">确认选择</button><button class="pl-primary" style="background:var(--surface-3)">下一位</button><button class="pl-primary" data-go="coach-mobile-invite">发送权限</button></aside></div></div>`;
  }

  function coachMobileTasksPlayerNew() {
    app.innerHTML = `<div class="phone-landscape">${phoneHeader('主教练 · 按球员分工','3/5')}<div class="pl-grid pl-classify"><aside class="pl-panel pl-classify-side"><div class="classify-modes"><button data-go="coach-mobile-tasks">按数据</button><button class="active">按球员</button></div>${coachChoices('李教练')}</aside><section class="pl-panel pl-classify-main"><div class="pl-title"><strong>李教练 · 选择球员</strong><span>全部数据可记</span></div>${playerClaimContent()}</section><aside class="pl-panel pl-classify-actions"><div class="pl-status"><strong>5 名球员</strong><span>点击才记录</span></div><button class="pl-primary">确认选择</button><button class="pl-primary" style="background:var(--surface-3)">下一位</button><button class="pl-primary" data-go="coach-mobile-invite">发送权限</button></aside></div></div>`;
  }

  function coachDispatchByDataPregame() {
    app.innerHTML = `<div class="shell pregame-shell">${topbar('主队主教练 · 赛前权限分配')}<div class="content classify-grid"><aside class="panel classify-side"><div class="classify-step"><b>1</b><strong>分工方式</strong></div><div class="classify-modes"><button class="active">按数据分</button><button data-go="coach-dispatch-player">按球员分</button></div><div class="classify-step"><b>2</b><strong>选择教练</strong></div>${coachChoices('张教练')}</aside><section class="panel classify-main"><div class="panel-head"><strong>给张教练选择数据</strong><div class="head-spacer"></div><span class="status-pill">比赛未开始</span><div class="legend-row"><span class="legend-item"><i class="legend-dot"></i>可分配</span><span class="legend-item"><i class="legend-dot selecting"></i>选择中</span><span class="legend-item"><i class="legend-dot taken"></i>已分配</span></div></div>${dataClaimContent()}</section><aside class="panel classify-actions"><div class="assignment-summary"><strong>张教练</strong><span>记录全队所有球员的指定数据<br>已确认：罚球、两分<br>正在选择：投篮出手</span></div><button class="btn primary">确认本次选择</button><button class="btn">选择下一位教练</button><button class="btn primary" data-go="coach-invite">完成并发送权限</button><div class="auto-check">开赛后自动锁定，只能查看</div></aside></div></div>`;
  }

  function coachDispatchByPlayerPregame() {
    app.innerHTML = `<div class="shell pregame-shell">${topbar('主队主教练 · 赛前权限分配')}<div class="content classify-grid"><aside class="panel classify-side"><div class="classify-step"><b>1</b><strong>分工方式</strong></div><div class="classify-modes"><button data-go="coach-dispatch">按数据分</button><button class="active">按球员分</button></div><div class="classify-step"><b>2</b><strong>选择教练</strong></div>${coachChoices('李教练')}</aside><section class="panel classify-main"><div class="panel-head"><strong>给李教练选择球员</strong><div class="head-spacer"></div><span class="status-pill">比赛未开始</span><div class="legend-row"><span class="legend-item"><i class="legend-dot"></i>可分配</span><span class="legend-item"><i class="legend-dot selecting"></i>选择中</span><span class="legend-item"><i class="legend-dot taken"></i>已分配</span></div></div>${playerClaimContent()}<div class="coach-tip"><strong>按球员分工</strong><br>李教练可以记录已分配球员的全部数据；点击才产生事件。</div></section><aside class="panel classify-actions"><div class="assignment-summary"><strong>李教练</strong><span>负责 5 名球员<br>可操作这些球员的全部数据按钮</span></div><button class="btn primary">确认本次选择</button><button class="btn">选择下一位教练</button><button class="btn primary" data-go="coach-invite">完成并发送权限</button><div class="auto-check">开赛后自动锁定，只能查看</div></aside></div></div>`;
  }

  function coachMobileTasksDataPregame() {
    app.innerHTML = `<div class="phone-landscape">${phoneHeader('主教练 · 赛前按数据分工','未开赛 · 3/5')}<div class="pl-grid pl-classify"><aside class="pl-panel pl-classify-side"><div class="classify-modes"><button class="active">按数据</button><button data-go="coach-mobile-tasks-player">按球员</button></div>${coachChoices('张教练')}</aside><section class="pl-panel pl-classify-main"><div class="pl-title"><strong>张教练 · 选择数据</strong><span>绿可选 · 灰已分</span></div><div class="pl-category-tabs"><button>得分</button><button class="active">投篮</button><button>进攻</button><button>防守</button><button>纪律</button></div><div class="pl-data-focus"><strong>投篮数据</strong><div class="claim-grid"><button class="claim-chip available">罚球未中</button><button class="claim-chip available">两分未中</button><button class="claim-chip available">三分未中</button><button class="claim-chip selecting">投篮出手</button><button class="claim-chip taken">两分命中 <small>张</small></button><button class="claim-chip taken">三分命中 <small>李</small></button></div></div></section><aside class="pl-panel pl-classify-actions"><div class="pl-status"><strong>全队 · 指定数据</strong><span>赛前分配</span></div><button class="pl-primary">确认选择</button><button class="pl-primary" style="background:var(--surface-3)">下一位</button><button class="pl-primary" data-go="coach-mobile-invite">发送权限</button></aside></div></div>`;
  }

  function coachMobileTasksPlayerPregame() {
    app.innerHTML = `<div class="phone-landscape">${phoneHeader('主教练 · 赛前按球员分工','未开赛 · 3/5')}<div class="pl-grid pl-classify"><aside class="pl-panel pl-classify-side"><div class="classify-modes"><button data-go="coach-mobile-tasks">按数据</button><button class="active">按球员</button></div>${coachChoices('李教练')}</aside><section class="pl-panel pl-classify-main"><div class="pl-title"><strong>李教练 · 选择球员</strong><span>全部数据可记</span></div>${playerClaimContent()}</section><aside class="pl-panel pl-classify-actions"><div class="pl-status"><strong>5 名球员</strong><span>赛前分配</span></div><button class="pl-primary">确认选择</button><button class="pl-primary" style="background:var(--surface-3)">下一位</button><button class="pl-primary" data-go="coach-mobile-invite">发送权限</button></aside></div></div>`;
  }

  function coachMonitorLocked() {
    app.innerHTML = `<div class="shell">${topbar('主队主教练 · 数据进度')}${scoreStrip()}<div class="content simple-monitor"><section class="panel simple-monitor-main"><div class="panel-head"><strong>助教进度</strong><span>开赛后分工已锁定</span></div><div class="simple-progress-row"><div class="avatar">张</div><div><strong>张教练</strong><span>全队得分</span></div><b>38 条</b><em>记录中</em></div><div class="simple-progress-row"><div class="avatar">李</div><div><strong>李教练</strong><span>抢断 / 盖帽</span></div><b>13 条</b><em>记录中</em></div><div class="simple-progress-row"><div class="avatar">王</div><div><strong>王教练</strong><span>5 名球员</span></div><b>—</b><em style="color:var(--yellow)">未上线</em></div><button class="btn" disabled>赛前分工已锁定</button></section><aside class="panel simple-monitor-side"><div class="launch-status"><strong>✓ 数据正常</strong><span>无重复、同步正常</span></div><div class="role-capacity"><div class="capacity-row"><strong>已在线</strong><b>2 / 3</b></div></div><button class="btn primary" data-go="coach-tactics">打开战术板</button><button class="btn" data-go="coach-submit">赛后汇总</button><button class="btn">发送提醒</button></aside></div></div>`;
  }

  function coachMonitorLandscapeLocked() {
    app.innerHTML = `<div class="phone-landscape">${phoneHeader('主教练 · 数据进度','开赛后已锁定')}<div class="pl-grid pl-task"><section class="pl-panel"><div class="pl-title"><strong>助教进度</strong><span>只读</span></div><div class="pl-task-list"><div class="pl-task-row"><div class="avatar">张</div><div><strong>张教练</strong><span>全队得分</span></div><em>38条</em></div><div class="pl-task-row"><div class="avatar">李</div><div><strong>李教练</strong><span>抢断/盖帽</span></div><em>13条</em></div><div class="pl-task-row"><div class="avatar">王</div><div><strong>王教练</strong><span>5名球员</span></div><em style="color:var(--yellow)">未上线</em></div></div></section><aside class="pl-panel pl-side-info"><div class="pl-status"><strong>✓ 分工已锁定</strong><span>开赛后不可修改</span></div><button class="pl-primary" data-go="coach-mobile-tactics">战术板</button><button class="pl-primary" data-go="coach-mobile-submit">赛后汇总</button><button class="pl-primary" style="background:var(--surface-3)">发送提醒</button></aside></div></div>`;
  }

  function dataClaimContentTwoState() {
    const categories = [
      ['得分',['罚球+1|张','两分+2|张','三分+3|available']],
      ['投篮',['罚球未中|available','两分未中|available','三分未中|available','投篮出手|张']],
      ['进攻',['助攻|available','进攻篮板|李','失误|available']],
      ['防守',['防守篮板|李','抢断|李','盖帽|available']],
      ['纪律',['个人犯规|available','技术犯规|available']]
    ];
    return categories.map(category=>`<div class="data-category"><strong>${category[0]}</strong><div class="claim-grid">${category[1].map(raw=>{const [label,state]=raw.split('|');const taken=state!=='available';return `<button class="claim-chip ${taken?'taken':'available'}">${label}${taken?`<small>${state}</small>`:''}</button>`}).join('')}</div></div>`).join('');
  }

  function playerClaimContentTwoState() {
    const players = [
      ['#07 陈子昂','李','taken'],['#11 周星宇','李','taken'],['#23 赵嘉树','李','taken'],['#15 李浩然','李','taken'],
      ['#03 王奕辰','李','taken'],['#09 孙铭泽','可分配','available'],['#06 郭泽','可分配','available'],['#18 韩一鸣','可分配','available'],
      ['#32 程宇航','可分配','available'],['#08 冯子墨','可分配','available'],['#21 郑凯文','张','taken'],['#12 高文博','可分配','available']
    ];
    return `<div class="player-claim-grid">${players.map(p=>`<button class="player-claim ${p[2]}"><strong>${p[0]}</strong><span>${p[1]}</span></button>`).join('')}</div>`;
  }

  function coachDispatchDataDirect() {
    app.innerHTML = `<div class="shell pregame-shell">${topbar('主队主教练 · 赛前权限分配')}<div class="content classify-grid"><aside class="panel classify-side"><div class="classify-step"><b>1</b><strong>分工方式</strong></div><div class="classify-modes"><button class="active">按数据分</button><button data-go="coach-dispatch-player">按球员分</button></div><div class="classify-step"><b>2</b><strong>选择教练</strong></div>${coachChoices('张教练')}<button class="btn" data-go="coach-add-assistant">＋ 添加助教</button></aside><section class="panel classify-main"><div class="panel-head"><strong>张教练 · 点击绿色数据直接分配</strong><div class="head-spacer"></div><span class="status-pill">比赛未开始</span><div class="legend-row"><span class="legend-item"><i class="legend-dot"></i>可分配</span><span class="legend-item"><i class="legend-dot taken"></i>已分配</span></div></div>${dataClaimContentTwoState()}</section><aside class="panel classify-actions"><div class="assignment-summary"><strong>张教练</strong><span>记录全队所有球员的指定数据<br>已分配 4 项</span></div><button class="btn">选择下一位教练</button><button class="btn primary" data-go="coach-invite">完成分工</button><div class="auto-check">完成后系统自动通知，无需再次扫码</div></aside></div></div>`;
  }

  function coachDispatchPlayerDirect() {
    app.innerHTML = `<div class="shell pregame-shell">${topbar('主队主教练 · 赛前权限分配')}<div class="content classify-grid"><aside class="panel classify-side"><div class="classify-step"><b>1</b><strong>分工方式</strong></div><div class="classify-modes"><button data-go="coach-dispatch">按数据分</button><button class="active">按球员分</button></div><div class="classify-step"><b>2</b><strong>选择教练</strong></div>${coachChoices('李教练')}<button class="btn" data-go="coach-add-assistant">＋ 添加助教</button></aside><section class="panel classify-main"><div class="panel-head"><strong>李教练 · 点击绿色球员直接分配</strong><div class="head-spacer"></div><span class="status-pill">比赛未开始</span><div class="legend-row"><span class="legend-item"><i class="legend-dot"></i>可分配</span><span class="legend-item"><i class="legend-dot taken"></i>已分配</span></div></div>${playerClaimContentTwoState()}<div class="coach-tip"><strong>按球员分工</strong><br>负责教练可以记录这些球员的全部数据；点击数据按钮才产生事件。</div></section><aside class="panel classify-actions"><div class="assignment-summary"><strong>李教练</strong><span>已分配 5 名球员<br>可操作全部数据按钮</span></div><button class="btn">选择下一位教练</button><button class="btn primary" data-go="coach-invite">完成分工</button><div class="auto-check">完成后系统自动通知，无需再次扫码</div></aside></div></div>`;
  }

  function coachMobileTasksDataDirect() {
    app.innerHTML = `<div class="phone-landscape">${phoneHeader('主教练 · 赛前按数据分工','未开赛 · 3/5')}<div class="pl-grid pl-classify"><aside class="pl-panel pl-classify-side"><div class="classify-modes"><button class="active">按数据</button><button data-go="coach-mobile-tasks-player">按球员</button></div>${coachChoices('张教练')}<button class="pl-primary" data-go="coach-mobile-add-assistant">＋助教</button></aside><section class="pl-panel pl-classify-main"><div class="pl-title"><strong>张教练 · 点击绿色直接分配</strong><span>绿可分 · 灰已分</span></div><div class="pl-category-tabs"><button>得分</button><button class="active">投篮</button><button>进攻</button><button>防守</button><button>纪律</button></div><div class="pl-data-focus"><strong>投篮数据</strong><div class="claim-grid"><button class="claim-chip available">罚球未中</button><button class="claim-chip available">两分未中</button><button class="claim-chip available">三分未中</button><button class="claim-chip taken">投篮出手 <small>张</small></button><button class="claim-chip taken">两分命中 <small>张</small></button><button class="claim-chip taken">三分命中 <small>李</small></button></div></div></section><aside class="pl-panel pl-classify-actions"><div class="pl-status"><strong>全队 · 指定数据</strong><span>已分 4 项</span></div><button class="pl-primary" style="background:var(--surface-3)">下一位</button><button class="pl-primary" data-go="coach-mobile-invite">完成分工</button></aside></div></div>`;
  }

  function coachMobileTasksPlayerDirect() {
    app.innerHTML = `<div class="phone-landscape">${phoneHeader('主教练 · 赛前按球员分工','未开赛 · 3/5')}<div class="pl-grid pl-classify"><aside class="pl-panel pl-classify-side"><div class="classify-modes"><button data-go="coach-mobile-tasks">按数据</button><button class="active">按球员</button></div>${coachChoices('李教练')}<button class="pl-primary" data-go="coach-mobile-add-assistant">＋助教</button></aside><section class="pl-panel pl-classify-main"><div class="pl-title"><strong>李教练 · 点击绿色直接分配</strong><span>绿可分 · 灰已分</span></div>${playerClaimContentTwoState()}</section><aside class="pl-panel pl-classify-actions"><div class="pl-status"><strong>5 名球员</strong><span>全部数据可记</span></div><button class="pl-primary" style="background:var(--surface-3)">下一位</button><button class="pl-primary" data-go="coach-mobile-invite">完成分工</button></aside></div></div>`;
  }

  function coachAddAssistantPad() {
    app.innerHTML = `<div class="shell pregame-shell">${topbar('主队主教练 · 添加助教')}<div class="content add-coach-grid add-coach-simplified"><section class="panel add-coach-panel"><span class="eyebrow">赛前第 2 步</span><div class="panel-head"><strong>先添加本场协作人员</strong><span>主教练 + 最多 5 名助教</span></div><div class="candidate-row"><div class="avatar">张</div><div><strong>张教练</strong><span>球队助理教练 · 已认证</span></div><button class="btn success">已加入</button></div><div class="candidate-row"><div class="avatar">李</div><div><strong>李教练</strong><span>球队助理教练 · 已认证</span></div><button class="btn primary">加入本场</button></div><div class="candidate-row"><div class="avatar">赵</div><div><strong>赵教练</strong><span>机构教练 · 未加入球队</span></div><button class="btn">加入本场</button></div></section><section class="panel add-coach-panel share-panel"><div class="panel-head"><strong>邀请临时助教</strong><span>仅本队本场有效</span></div><button class="share-primary"><b>转发小程序给微信好友或群</b><span>对方打开后确认身份，即加入本场</span></button><button class="secondary-methods">其他邀请方式：手机号 / 现场二维码 / 历史教练</button><div class="coach-tip">临时助教不会进入机构员工、课程、课消或薪酬数据。</div></section><aside class="panel add-coach-status"><div class="coach-limit"><strong>本场助教</strong><b>3 / 5</b></div><div class="member"><div class="avatar">张</div><div><strong>张教练</strong><span>已有教练</span></div><em>已加入</em></div><div class="member"><div class="avatar">李</div><div><strong>李教练</strong><span>已有教练</span></div><em>已加入</em></div><div class="member"><div class="avatar">王</div><div><strong>王教练</strong><span>微信邀请</span></div><em>待接受</em></div><button class="btn primary" data-go="coach-dispatch">已有助教，去分工</button><button class="btn" data-go="coach-ready">返回上一步</button></aside></div></div>`;
  }

  function coachAddAssistantMobile() {
    app.innerHTML = `<div class="phone-landscape">${phoneHeader('主教练 · 添加助教','赛前第2步 · 3/5')}<div class="pl-grid pl-add-coach pl-add-coach-simple"><section class="pl-panel pl-add-panel"><div class="pl-title"><strong>已有教练</strong><span>直接加入本场</span></div><div class="candidate-row"><div class="avatar">张</div><div><strong>张教练</strong><span>球队助教</span></div><button>已加入</button></div><div class="candidate-row"><div class="avatar">李</div><div><strong>李教练</strong><span>球队助教</span></div><button>加入</button></div><div class="candidate-row"><div class="avatar">赵</div><div><strong>赵教练</strong><span>机构教练</span></div><button>加入</button></div></section><section class="pl-panel pl-add-panel share-panel"><div class="pl-title"><strong>临时助教</strong><span>本场有效</span></div><button class="share-primary compact"><b>转发小程序给好友或群</b><span>打开后确认身份即可加入</span></button><button class="secondary-methods">其他方式</button></section><aside class="pl-panel pl-side-info"><div class="pl-status"><strong>3 / 5</strong><span>2已加入 · 1待接受</span></div><button class="pl-primary" data-go="coach-mobile-tasks">已有助教，去分工</button><button class="pl-primary" style="background:var(--surface-3)" data-go="coach-mobile-ready">返回</button></aside></div></div>`;
  }

  function coachReadyWithAdd() {
    app.innerHTML = `<div class="shell pregame-shell">${topbar('主队主教练 · 比赛数据')}<div class="content simple-hub"><section class="panel simple-hub-main"><span class="eyebrow">赛前第 1 步</span><h1>这场谁来记录？</h1><p>先选择方式；如果需要协作，先加人，再分配技能。</p><div class="simple-mode-row"><button class="simple-mode" data-go="coach-live"><b>方式 1</b><strong>我自己记</strong><span>数据和战术板都由主教练操作</span></button><button class="simple-mode active" data-go="coach-add-assistant"><b>方式 2</b><strong>分给助教</strong><span>添加助教后，按数据或球员分工</span></button><button class="simple-mode"><b>方式 3</b><strong>本场不记录</strong><span>只保留比分同步和战术板</span></button></div></section><aside class="panel simple-hub-side"><div class="panel-head"><strong>本场协作</strong><span>2 已加入 · 1 待接受</span></div><div class="member"><div class="avatar">张</div><div><strong>张教练</strong><span>球队已有教练</span></div><em>已加入</em></div><div class="member"><div class="avatar">李</div><div><strong>李教练</strong><span>球队已有教练</span></div><em>已加入</em></div><div class="member"><div class="avatar">王</div><div><strong>王教练</strong><span>微信临时邀请</span></div><em>待接受</em></div><button class="btn primary" data-go="coach-add-assistant">＋ 添加助教</button><button class="btn" data-go="coach-dispatch">已有助教，去分工</button><button class="btn" data-go="coach-tactics">打开战术板</button></aside></div></div>`;
  }

  function coachReadyMobileWithAdd() {
    app.innerHTML = `<div class="phone-landscape">${phoneHeader('主教练 · 比赛数据','赛前第1步')}<div class="pl-grid pl-task"><section class="pl-panel"><div class="pl-title"><strong>这场谁来记录？</strong><span>先加人，再分工</span></div><div class="pl-mode-grid"><button class="pl-mode-card"><b>方式1</b><strong>我自己记</strong><span>数据和战术板都由我操作</span></button><button class="pl-mode-card active" data-go="coach-mobile-add-assistant"><b>方式2</b><strong>分给助教</strong><span>先添加助教，再分配技能</span></button><button class="pl-mode-card"><b>方式3</b><strong>本场不记录</strong><span>只保留比分同步和战术板</span></button></div></section><aside class="pl-panel pl-side-info"><div class="pl-status"><strong>助教 3 / 5</strong><span>2已加入 · 1待接受</span></div><button class="pl-primary" data-go="coach-mobile-add-assistant">添加助教</button><button class="pl-primary" style="background:var(--surface-3)" data-go="coach-mobile-tasks">已有助教，去分工</button><button class="pl-primary" style="background:var(--surface-3)" data-go="coach-mobile-tactics">战术板</button></aside></div></div>`;
  }

  const renderers = {
    flow: renderFlowSimple,
    'data-start': dataManagerLaunch,
    'referee-ready': refereeSimpleReady,
    'coach-ready': coachReadyWithAdd,
    'referee-live': refereeBaseline,
    'coach-live': coachLive,
    'coach-dispatch': coachDispatchDataDirect,
    'coach-dispatch-player': coachDispatchPlayerDirect,
    'coach-add-assistant': coachAddAssistantPad,
    'coach-invite': coachInvite,
    'referee-mobile': refereeMobileBaseline,
    'coach-mobile': coachMobileLandscapeFull,
    'assistant-mobile': assistantMobileLandscapeFull,
    'coach-mobile-ready': coachReadyMobileWithAdd,
    'coach-mobile-tasks': coachMobileTasksDataDirect,
    'coach-mobile-tasks-player': coachMobileTasksPlayerDirect,
    'coach-mobile-add-assistant': coachAddAssistantMobile,
    'coach-mobile-invite': coachInviteLandscapeFull,
    'assistant-mobile-ready': assistantReadyLandscapeFull,
    'coach-mobile-monitor': coachMonitorLandscapeLocked,
    'coach-mobile-submit': coachSubmitLandscapeFull,
    'coach-mobile-tactics': coachTacticsFullscreenPhone,
    'assistant-ready': assistantReady,
    'assistant-live': assistantLive,
    'coach-monitor': coachMonitorLocked,
    'coach-tactics': coachTacticsFullscreenPad,
    'coach-submit': coachSubmitFlexible,
    'referee-review': refereeReviewFlexible,
    'team-data': teamDataFlexible
  };

  const mobileAliases = {
    'referee-live': 'referee-mobile',
    'coach-ready': 'coach-mobile-ready',
    'coach-add-assistant': 'coach-mobile-add-assistant',
    'coach-dispatch': 'coach-mobile-tasks',
    'coach-dispatch-player': 'coach-mobile-tasks-player',
    'coach-invite': 'coach-mobile-invite',
    'assistant-ready': 'assistant-mobile-ready',
    'coach-live': 'coach-mobile',
    'assistant-live': 'assistant-mobile',
    'coach-monitor': 'coach-mobile-monitor',
    'coach-submit': 'coach-mobile-submit'
  };
  const phoneLandscape = params.get('device') === 'phone' || (window.innerWidth < 1000 && window.innerHeight < 520);
  const targetScreen = phoneLandscape && mobileAliases[screen] ? mobileAliases[screen] : screen;
  (renderers[targetScreen] || renderFlowSimple)();

  document.addEventListener('click', (event) => {
    const liveTaskEntry = event.target.closest('[data-go="coach-mobile-tasks"]');
    if (liveTaskEntry && screen === 'coach-mobile') {
      location.search = new URLSearchParams({ screen: 'coach-mobile-monitor', side }).toString();
      return;
    }
    const invitePreview = event.target.closest('[data-go="assistant-ready"]');
    if (invitePreview && (screen === 'coach-dispatch' || screen === 'coach-dispatch-player')) {
      location.search = new URLSearchParams({ screen: 'coach-invite', side }).toString();
      return;
    }
    const go = event.target.closest('[data-go]');
    if (go) {
      const next = go.dataset.go;
      const nextParams = new URLSearchParams({ screen: next });
      if (side === 'away' && next.startsWith('coach')) nextParams.set('side', 'away');
      location.search = nextParams.toString();
      return;
    }
    const assignmentTab = event.target.closest('.assignment-tabs .btn');
    if (assignmentTab && assignmentTab.textContent.trim() === '按球员分工') {
      location.search = new URLSearchParams({ screen: 'coach-dispatch-player', side }).toString();
      return;
    }
    if (assignmentTab && assignmentTab.textContent.trim() === '按技能分工') {
      location.search = new URLSearchParams({ screen: 'coach-dispatch', side }).toString();
      return;
    }
    const player = event.target.closest('.player-row');
    if (player) {
      document.querySelectorAll('.player-row').forEach(el => el.classList.remove('active'));
      player.classList.add('active');
    }
    const stat = event.target.closest('.stat-btn');
    if (stat) {
      stat.animate([{transform:'scale(1)'},{transform:'scale(.94)'},{transform:'scale(1)'}], {duration:180});
    }
    const mc = event.target.closest('.mc-key');
    if (mc) {
      document.querySelectorAll('.mc-key').forEach(el => el.style.borderColor = '');
      mc.style.borderColor = 'rgba(255,107,44,.7)';
    }
  });
})();
