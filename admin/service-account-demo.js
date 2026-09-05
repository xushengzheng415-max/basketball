(() => {
  'use strict';

  const ICON_ROOT = './assets/icons/pc-common/svg/';
  const store = window.SXFTournamentStore;
  const view = document.getElementById('serviceView');
  const notes = document.getElementById('flowNotes');
  const statePanel = document.getElementById('statePanel');
  const toast = document.getElementById('serviceToast');
  const params = new URLSearchParams(location.search);
  let flow = params.get('flow') === 'parent' ? 'parent' : 'invite';
  let inviteStep = store.read().invitation.status === 'accepted' ? 2 : 0;
  let parentStep = 0;

  function icon(name, className = '') {
    return `<span class="sxf-icon ${className}" style="--icon:url('${ICON_ROOT}${name}.svg')" aria-hidden="true"></span>`;
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function row(label, value) {
    return `<div class="service-row"><span>${label}</span><b>${value}</b></div>`;
  }

  function button(label, action, style = '') {
    return `<button type="button" class="service-button ${style}" data-action="${action}">${label}</button>`;
  }

  function flowSteps(items, current) {
    return `<div class="flow-steps">${items.map(([title, detail], index) => `<div class="flow-step ${index < current ? 'done' : index === current ? 'active' : ''}"><i>${index < current ? icon('circle-check-big') : index + 1}</i><div><b>${title}</b><small>${detail}</small></div></div>`).join('')}</div>`;
  }

  function renderInvite() {
    const state = store.read();
    const invitation = state.invitation;
    notes.innerHTML = `<h2>外请人员绑定路径</h2>${flowSteps([
      ['查看任务', '服务号消息只展示指定赛事与场次'],
      ['手机号核验', '确认邀请手机号和当前微信归属'],
      ['接受并绑定', '获得本场球员数据台权限'],
      ['执行与结算', '完成任务后进入分账队列']
    ], inviteStep)}`;

    if (inviteStep === 0) {
      view.innerHTML = `<section class="service-page"><div class="service-hero"><span class="service-hero-icon">${icon('send')}</span><h2>赛事任务邀请</h2><p>蜂动体育篮球俱乐部邀请你参与比赛现场记录</p></div><div class="service-card">${row('赛事','2026 蜂动青少年篮球联赛')}${row('场次',invitation.matchId)}${row('对阵',invitation.match)}${row('时间',invitation.time)}${row('场地',invitation.venue)}${row('岗位',invitation.role)}</div><div class="service-tip">该邀请仅提供本场球员数据记录权限，不会加入机构教练库，也无法查看机构教务、课消、薪酬或经营数据。</div>${button('核验手机号并查看权限','invite-verify')}</section>`;
    } else if (inviteStep === 1) {
      view.innerHTML = `<section class="service-page"><div class="service-hero"><span class="service-hero-icon">${icon('phone')}</span><h2>验证邀请手机号</h2><p>验证通过后将当前微信与本场任务绑定</p></div><label class="service-field">手机号<input value="${invitation.phone}"></label><label class="service-field">验证码<input value="123456"></label><div class="service-tip">演示固定验证码：123456。正式环境由短信接口发送并校验。</div><label class="agreement"><input type="checkbox" checked>我已阅读并同意赛事现场任务规则与数据保密要求</label>${button('验证并接受任务','invite-accept')}${button('返回任务详情','invite-back','secondary')}</section>`;
    } else if (inviteStep === 2) {
      view.innerHTML = `<section class="service-page"><div class="service-hero"><span class="service-hero-icon">${icon('circle-check-big')}</span><h2>绑定成功</h2><p>你已成为 ${invitation.matchId} 的球员数据记录员</p></div><div class="bound-state">任务已接受 · PC 后台已同步</div><div class="scope-card allow"><b>可访问</b><br>本场双方阵容、换人、球员得分归属、命中/出手、篮板、助攻、抢断、盖帽和失误。</div><div class="scope-card deny"><b>不可访问</b><br>机构课程、课消、学员经营、财务流水、教练薪酬和其他未分配赛事。</div><div class="service-card">${row('预计记录人数','5 人以内')}${row('预计任务收入','¥162.50')}${row('任务状态','待比赛开始')}</div>${button('查看现场任务','invite-task')}</section>`;
    } else {
      view.innerHTML = `<section class="service-page"><div class="service-hero"><span class="service-hero-icon">${icon('clipboard-check')}</span><h2>现场任务</h2><p>${invitation.matchId} · ${invitation.match}</p></div><div class="service-card">${row('开赛时间','07月20日 10:15')}${row('签到时间','09:45 前')}${row('控制台','球员数据统计台')}${row('负责球员','张子轩等 5 人')}${row('任务收入','¥162.50')}</div><div class="service-tip">比赛开始前进入横屏球员数据台。每次投篮需选择“命中”或“未中”，系统自动计算命中率。</div>${button('模拟进入球员数据台','launch-console')}${button('返回绑定结果','invite-bound','secondary')}</section>`;
    }

    statePanel.innerHTML = `<h2>PC 后台同步状态</h2><div class="state-list"><div class="state-item"><span>邀请编号</span><strong>${invitation.id}</strong></div><div class="state-item"><span>绑定状态</span><strong class="${invitation.status === 'accepted' ? 'ok' : 'warn'}">${invitation.status === 'accepted' ? '已接受并绑定' : '等待服务号接受'}</strong></div><div class="state-item"><span>授权范围</span><strong>仅 ${invitation.matchId} 球员数据台</strong></div><div class="state-item"><span>机构教练库</span><strong>不写入</strong></div></div><a class="state-link" href="./tournament-center.html?demo=1#onsite/bindings">返回 PC 查看绑定结果</a>`;
  }

  function renderParent() {
    const state = store.read();
    const profile = state.parentProfile;
    notes.innerHTML = `<h2>家长资料与数据包路径</h2>${flowSteps([
      ['匹配球员', '手机号匹配球队提交的基础名单'],
      ['确认监护关系', '核验家长与孩子的关系'],
      ['补全资料', '上传头像、证件页与出生信息'],
      ['选择数据服务', '自愿购买，不影响报名与参赛'],
      ['查看数据报告', '比赛复核后生成个人报告']
    ], parentStep)}`;

    if (parentStep === 0) {
      view.innerHTML = `<section class="service-page"><div class="service-hero"><span class="service-hero-icon">${icon('users-round')}</span><h2>发现待完善球员资料</h2><p>球队已提交基础名单，请确认是否为你的孩子</p></div><div class="service-card player-match"><span class="player-avatar">${icon('user-round')}</span><div><b>${profile.player}</b><small>${profile.team} · U12 · #4</small></div></div><div class="service-card">${row('家长手机号',profile.phone)}${row('球队来源','领队小程序提交')}${row('当前状态','待家长确认')}</div>${button('是我的孩子，继续完善','parent-confirm')}${button('不是我的孩子','parent-reject','secondary')}</section>`;
    } else if (parentStep === 1) {
      view.innerHTML = `<section class="service-page"><div class="service-hero"><span class="service-hero-icon">${icon('shield-check')}</span><h2>确认监护关系</h2><p>用于赛事资格审核，不向其他球队公开</p></div><label class="service-field">与球员关系<input value="父亲"></label><label class="service-field">家长姓名<input value="张海峰"></label><label class="service-field">球员出生年月<input value="${profile.birth}"></label><label class="agreement"><input type="checkbox" checked>我确认所填信息真实，并同意用于本次赛事资格审核</label>${button('确认并上传资料','parent-identity')}</section>`;
    } else if (parentStep === 2) {
      view.innerHTML = `<section class="service-page"><div class="service-hero"><span class="service-hero-icon">${icon('upload')}</span><h2>补全球员资料</h2><p>清晰正面照片用于赛事名单和数据报告</p></div><button type="button" class="upload-area" data-action="parent-upload"><span><b>${icon('upload')}</b>上传球员正面照片<br><small>JPG / PNG，不超过 5MB</small></span></button><div class="service-card">${row('姓名',profile.player)}${row('球队',profile.team)}${row('出生年月',profile.birth)}${row('资格资料','等待上传')}</div>${button('完成资料提交','parent-upload')}</section>`;
    } else if (parentStep === 3) {
      view.innerHTML = `<section class="service-page"><div class="service-hero"><span class="service-hero-icon">${icon('chart-column')}</span><h2>个人数据服务</h2><p>自愿购买，不购买也不影响球队报名、正式名单和参赛</p></div><div class="service-card">${row('服务内容','个人完整技术统计')}${row('统计项目','得分、篮板、助攻、抢断等')}${row('命中率','两分 / 三分 / 罚球')}${row('赛后报告','服务号查看与分享')}${row('单场价格','¥50.00')}</div><div class="service-tip">平台收取 15% 服务费，主办方获得 20%，现场记录员获得 65%。主办方负责保证记录任务落地。</div>${button('购买本场数据包','parent-buy')}${button('暂不购买，直接完成','parent-skip','secondary')}</section>`;
    } else {
      view.innerHTML = `<section class="service-page"><div class="service-hero"><span class="service-hero-icon">${icon(profile.packagePurchased ? 'circle-check-big' : 'shield-check')}</span><h2>${profile.packagePurchased ? '数据包购买成功' : '资料已提交'}</h2><p>球员基础报名与资格资料已进入主办方审核</p></div><div class="bound-state">${profile.packagePurchased ? '支付成功 · 等待比赛数据' : '未购买数据包 · 不影响参赛'}</div><div class="service-card">${row('球员',profile.player)}${row('资格资料','已提交审核')}${row('个人数据包',profile.packagePurchased ? '已购买' : '未购买')}${row('报告状态',profile.packagePurchased ? '比赛复核后生成' : '不生成完整报告')}</div>${profile.packagePurchased ? button('查看示例数据报告','parent-report') : button('返回赛事服务首页','parent-home')}</section>`;
    }

    statePanel.innerHTML = `<h2>赛事后台同步状态</h2><div class="state-list"><div class="state-item"><span>球员匹配</span><strong class="ok">${profile.player} · ${profile.team}</strong></div><div class="state-item"><span>身份关系</span><strong class="${profile.identityStatus === 'confirmed' ? 'ok' : 'warn'}">${profile.identityStatus === 'confirmed' ? '已确认' : '待确认'}</strong></div><div class="state-item"><span>资料状态</span><strong class="${profile.photoStatus === 'submitted' ? 'ok' : 'warn'}">${profile.photoStatus === 'submitted' ? '已提交审核' : '待补充'}</strong></div><div class="state-item"><span>数据包</span><strong>${profile.packagePurchased ? '已购买 · ¥50.00' : '未购买'}</strong></div></div><a class="state-link" href="./tournament-center.html?demo=1#registration/progress">返回 PC 查看入驻进度</a>`;
  }

  function render() {
    document.querySelectorAll('.demo-header nav button').forEach((button) => {
      button.classList.toggle('active', button.dataset.flow === flow);
    });
    if (flow === 'invite') renderInvite();
    else renderParent();
  }

  document.addEventListener('click', (event) => {
    const flowButton = event.target.closest('[data-flow]');
    if (flowButton) {
      flow = flowButton.dataset.flow;
      render();
      return;
    }
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'invite-verify') inviteStep = 1;
    if (action === 'invite-back') inviteStep = 0;
    if (action === 'invite-accept') {
      store.update((state) => {
        state.invitation.status = 'accepted';
        state.invitation.acceptedAt = new Date().toISOString();
      });
      inviteStep = 2;
      showToast('手机号验证成功，场次权限已绑定');
    }
    if (action === 'invite-task') inviteStep = 3;
    if (action === 'invite-bound') inviteStep = 2;
    if (action === 'launch-console') showToast('演示：比赛开始后进入横屏球员数据台');
    if (action === 'parent-confirm') parentStep = 1;
    if (action === 'parent-reject') showToast('已提交归属异常，等待领队核对');
    if (action === 'parent-identity') {
      store.update((state) => { state.parentProfile.identityStatus = 'confirmed'; });
      parentStep = 2;
    }
    if (action === 'parent-upload') {
      store.update((state) => { state.parentProfile.photoStatus = 'submitted'; });
      parentStep = 3;
      showToast('资料已提交赛事后台审核');
    }
    if (action === 'parent-buy') {
      store.update((state) => {
        state.parentProfile.packagePurchased = true;
        state.parentProfile.reportStatus = '比赛复核后生成';
      });
      parentStep = 4;
      showToast('模拟支付成功');
    }
    if (action === 'parent-skip') parentStep = 4;
    if (action === 'parent-report') showToast('示例报告：18 分 / 6 篮板 / 两分命中率 48.6%');
    if (action === 'parent-home') parentStep = 0;
    render();
  });

  render();
})();
