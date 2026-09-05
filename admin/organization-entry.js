(() => {
  'use strict';

  const PC_AUTH_API = 'https://sxf-basketball-d9gp6yt0rd1f7be4d.service.tcloudbase.com/api/pc-auth';
  const SESSION_KEY = 'sxf_pc_organization_session_v2';
  const IDENTITY_META = {
    institution: { name: '机构名称', placeholder: '例如：蜂动体育篮球俱乐部', type: '机构类型', options: ['篮球俱乐部', '培训机构', '体育场馆', '其他'] },
    school: { name: '学校名称', placeholder: '例如：郑州市实验小学', type: '学校学段', options: ['小学', '初中', '高中', '大学', '其他'] },
    organizer: { name: '主办方名称', placeholder: '例如：郑州青少年篮球联赛组委会', type: '主办类型', options: ['机构主办', '学校主办', '社会组织', '其他'] }
  };
  const state = { sessionToken: '', identityType: 'institution', workspace: 'tournament', logo: '', challenge: null, polling: null, organization: null, access: null };
  window.__sxfOrganizationEntryVersion = '20260822-2';
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const status = (message = '', type = '') => {
    const target = $('#flowStatus');
    target.textContent = message;
    target.className = `flow-status ${type}`;
  };
  const showStep = (step) => {
    $$('.step-view').forEach((view) => view.classList.toggle('active', view.dataset.step === step));
    const index = ['scan', 'profile', 'workspace', 'claim', 'hub'].indexOf(step);
    const progressIndex = Math.min(3, Math.max(0, index));
    $$('.progress li').forEach((item, itemIndex) => item.classList.toggle('active', itemIndex <= progressIndex));
    $('#stepCount').textContent = `${Math.min(4, index + 1)} / 4`;
    const copy = {
      scan: ['安全登录', '微信扫码登录', '请使用微信扫一扫，授权后PC将自动登录。'],
      profile: ['组织开户', '确认身份并登记资料', '基础资料仅用于创建你的组织工作台，可在组织设置中后续调整。'],
      workspace: ['工作面板', '选择默认进入的工作面', '两个中心在体验期内均可使用，此处仅决定默认首页。'],
      claim: ['权益开通', '正在领取体验期', '完成开户即可获得365天赛事与教务全功能体验期。'],
      hub: ['组织工作台', '选择今天的工作面', '赛事中心与教务中心均已按当前组织隔离。']
    }[step];
    $('#stepEyebrow').textContent = copy[0]; $('#stepTitle').textContent = copy[1]; $('#stepDescription').textContent = copy[2];
  };
  const saveSession = () => localStorage.setItem(SESSION_KEY, JSON.stringify({ sessionToken: state.sessionToken, organization: state.organization, access: state.access, savedAt: Date.now() }));
  const clearPolling = () => { if (state.polling) window.clearInterval(state.polling); state.polling = null; };

  async function invoke(action, payload = {}) {
    window.__sxfOrganizationEntryDebug = `invoke:${action}`;
    window.__sxfOrganizationEntryDebug = `calling:${action}`;
    const response = await fetch(PC_AUTH_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...payload }) });
    window.__sxfOrganizationEntryDebug = `returned:${action}`;
    const data = await response.json();
    if (!data?.ok) throw new Error(data?.message || data?.error || '云端请求失败');
    return data;
  }
  async function createChallenge() {
    clearPolling(); status('正在生成安全二维码…');
    const result = await invoke('createChallenge');
    state.challenge = result;
    const loginQr = $('#loginQr');
    const wechatLoginQr = $('#wechatLoginQr');
    if (result.wechatLoginReady && result.wechatLogin) {
      if (typeof window.WxLogin !== 'function') throw new Error('微信登录组件加载失败，请刷新页面');
      loginQr.hidden = true;
      wechatLoginQr.hidden = false;
      wechatLoginQr.innerHTML = '';
      new window.WxLogin({ self_redirect: true, id: 'wechatLoginQr', appid: result.wechatLogin.appId, scope: result.wechatLogin.scope || 'snsapi_login', redirect_uri: encodeURIComponent(result.wechatLogin.redirectUri), state: result.wechatLogin.state, style: 'black' });
      $('#qrState').textContent = '等待微信扫码授权';
    } else {
      if (!result.miniProgramCodeReady || !result.miniProgramCodeDataUrl) throw new Error(result.miniProgramCodeError || '微信登录暂不可用，请稍后刷新');
      wechatLoginQr.hidden = true;
      loginQr.hidden = false;
      loginQr.src = result.miniProgramCodeDataUrl;
      $('#qrState').textContent = '网站应用配置中，当前使用小程序确认';
    }
    status('');
    state.polling = window.setInterval(async () => {
      try {
        const detail = await invoke('status', { challengeId: result.challengeId, secret: result.secret });
        if (detail.status === 'confirmed') { clearPolling(); await exchangeChallenge(); }
        if (detail.status === 'expired') { clearPolling(); $('#qrState').textContent = '二维码已失效，请刷新'; }
      } catch (_) { /* 临时网络波动不打断二维码 */ }
    }, 1800);
  }
  window.addEventListener('message', async (event) => {
    if (event.origin !== window.location.origin || event.data?.type !== 'sxf-wechat-login-confirmed' || !state.challenge) return;
    try {
      const detail = await invoke('status', { challengeId: state.challenge.challengeId, secret: state.challenge.secret });
      if (detail.status === 'confirmed') { clearPolling(); await exchangeChallenge(); }
    } catch (_) { /* 轮询会继续补偿 */ }
  });
  async function exchangeChallenge() {
    status('微信身份已确认，正在进入组织工作台…', 'success');
    const result = await invoke('exchange', { challengeId: state.challenge.challengeId, secret: state.challenge.secret });
    state.sessionToken = result.sessionToken; saveSession();
    await hydrateProfile();
  }
  function applyOrganization(organization, access) {
    state.organization = organization; state.access = access;
    if (state.sessionToken) saveSession();
    $('#hubName').textContent = organization?.name || organization?.identityProfile?.entityName || '你的组织';
    $('#identitySummary').textContent = `主身份：${({ institution: '机构', school: '学校', organizer: '赛事主办方' })[organization?.identityType] || '待确认'}`;
    const expiration = Number(access?.trialExpiresAt || organization?.trialExpiresAt || 0);
    $('#trialSummary').textContent = expiration ? `体验期至：${new Date(expiration).toLocaleDateString('zh-CN')}` : '体验期：待领取';
    $('#hubAccess').textContent = access?.trialActive ? '赛事中心与教务中心均在365天体验期内可用。' : '赛事中心基础功能可用，教务中心体验期已结束。';
  }
  async function hydrateProfile() {
    const detail = await invoke('me', { sessionToken: state.sessionToken });
    if (!detail.organization?.onboardingCompleted) { showStep('profile'); return; }
    applyOrganization(detail.organization, detail.access);
    showStep('hub');
  }
  function syncIdentityForm() {
    const meta = IDENTITY_META[state.identityType];
    $('#entityNameLabel').textContent = meta.name; $('#entityName').placeholder = meta.placeholder; $('#detailTypeLabel').textContent = meta.type;
    $('#detailType').innerHTML = meta.options.map((option) => `<option>${option}</option>`).join('');
    $$('.identity-card').forEach((card) => card.classList.toggle('active', card.dataset.identity === state.identityType));
  }
  function regionData() {
    const regions = window.SXF_CHINA_REGIONS && window.SXF_CHINA_REGIONS.regions;
    return Array.isArray(regions) ? regions : [];
  }
  function fillRegionOptions(select, items, selectedName, placeholder) {
    select.innerHTML = `<option value="">${placeholder}</option>${items.map((item) => `<option value="${item.name}">${item.name}</option>`).join('')}`;
    if (selectedName && items.some((item) => item.name === selectedName)) select.value = selectedName;
  }
  function refreshCityOptions(selectedCity = '') {
    const provinceName = $('#province').value;
    const province = regionData().find((item) => item.name === provinceName);
    const cities = province && Array.isArray(province.children) ? province.children : [];
    fillRegionOptions($('#city'), cities, selectedCity, province ? '请选择城市' : '请先选择省份');
    $('#city').disabled = cities.length === 0;
  }
  function setRegionSelection(provinceName = '', cityName = '') {
    const regions = regionData();
    fillRegionOptions($('#province'), regions, provinceName, '请选择省份');
    refreshCityOptions(cityName);
  }
  function initRegionSelectors() {
    setRegionSelection();
    $('#province').addEventListener('change', () => refreshCityOptions());
  }
  async function readLogo(file) {
    if (!file) return '';
    if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 2 * 1024 * 1024) throw new Error('Logo仅支持2MB以内的PNG、JPG或WEBP');
    return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Logo读取失败')); reader.readAsDataURL(file); });
  }
  async function claimTrial() {
    const button = $('#claimTrial'); button.disabled = true; button.textContent = '正在开通…'; showStep('claim');
    try {
      const result = await invoke('completeOnboarding', {
        sessionToken: state.sessionToken,
        identityType: state.identityType,
        preferredWorkspace: state.workspace,
        profile: { entityName: $('#entityName').value.trim(), detailType: $('#detailType').value, province: $('#province').value.trim(), city: $('#city').value.trim(), contactName: $('#contactName').value.trim(), contactPhone: $('#contactPhone').value.trim(), logo: state.logo }
      });
      applyOrganization(result.organization, result.access);
      $('#claimText').textContent = `已为${result.organization.name}开通赛事中心与教务中心365天全功能体验期。`;
      $('#enterWorkspace').disabled = false;
      $('#enterWorkspace').textContent = state.workspace === 'education' ? '进入教务中心' : '进入赛事中心';
      status('体验期已领取。', 'success');
    } catch (error) { showStep('profile'); status(error.message || '开户失败，请检查资料后重试', 'error'); }
    finally { button.disabled = false; button.textContent = '确认并领取365天体验期'; }
  }
  function launch(workspace) {
    if (!state.organization?.organizationId) return;
    if (workspace === 'education') { window.location.href = `./education-center.html?organizationId=${encodeURIComponent(state.organization.organizationId)}#overview`; return; }
    window.location.href = `./tournament-center.html?organizationId=${encodeURIComponent(state.organization.organizationId)}#workbench`;
  }
  async function restoreSession() {
    try {
      const cached = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (!cached?.sessionToken) return false;
      state.sessionToken = cached.sessionToken; await hydrateProfile(); return true;
    } catch (_) { localStorage.removeItem(SESSION_KEY); return false; }
  }
  $('#refreshQr').addEventListener('click', () => createChallenge().catch((error) => status(error.message, 'error')));
  $$('.identity-card').forEach((card) => card.addEventListener('click', () => { state.identityType = card.dataset.identity; syncIdentityForm(); }));
  $$('.workspace-card').forEach((card) => card.addEventListener('click', () => { state.workspace = card.dataset.workspace; $$('.workspace-card').forEach((item) => item.classList.toggle('active', item === card)); }));
  $('#organizationLogo').addEventListener('change', async (event) => { try { state.logo = await readLogo(event.target.files?.[0]); status(state.logo ? 'Logo已准备好。' : '', 'success'); } catch (error) { event.target.value = ''; status(error.message, 'error'); } });
  $('#profileForm').addEventListener('submit', (event) => { event.preventDefault(); showStep('workspace'); });
  $('#claimTrial').addEventListener('click', claimTrial);
  $('#enterWorkspace').addEventListener('click', () => launch(state.workspace));
  $$('[data-launch]').forEach((button) => button.addEventListener('click', () => launch(button.dataset.launch)));
  $$('[data-back]').forEach((button) => button.addEventListener('click', () => showStep(button.dataset.back)));
  $('#editProfile').addEventListener('click', () => { if (state.organization?.identityProfile) { const profile = state.organization.identityProfile; state.identityType = state.organization.identityType || 'institution'; syncIdentityForm(); $('#entityName').value = profile.entityName || ''; $('#detailType').value = profile.detailType || $('#detailType').value; setRegionSelection(profile.region?.province || '', profile.region?.city || ''); $('#contactName').value = profile.contactName || ''; $('#contactPhone').value = profile.contactPhone || ''; } showStep('profile'); });
  initRegionSelectors();
  syncIdentityForm();
  restoreSession().then((restored) => { if (!restored) createChallenge().catch((error) => status(error.message, 'error')); });
})();
