(() => {
  'use strict';

  const STORAGE = {
    accounts: 'sxf_institution_accounts_v1',
    session: 'sxf_institution_session_v1',
    device: 'sxf_institution_device_v1',
    pins: 'sxf_institution_pins_v1',
    pinGuard: 'sxf_institution_pin_guard_v1',
    sms: 'sxf_institution_sms_v1'
  };
  const SESSION_TTL = 30 * 24 * 60 * 60 * 1000;
  const IDLE_TTL = 30 * 60 * 1000;
  const SMS_TTL = 5 * 60 * 1000;
  const SMS_COOLDOWN = 60 * 1000;
  const PIN_MAX_FAILURES = 5;
  const PIN_BLOCK_TTL = 60 * 1000;
  const TEST_CODE = '123456';

  const loginScreen = document.getElementById('loginScreen');
  const loginForm = document.getElementById('loginForm');
  const phoneInput = document.getElementById('authPhone');
  const codeInput = document.getElementById('authCode');
  const agreement = document.getElementById('authAgreement');
  const sendCodeButton = document.getElementById('sendCode');
  const authSubmit = document.getElementById('authSubmit');
  const authStatus = document.getElementById('authStatus');
  const app = document.querySelector('.app');
  const securityScreen = document.getElementById('securityScreen');
  const unlockView = document.getElementById('unlockView');
  const setupView = document.getElementById('setupView');
  const unlockForm = document.getElementById('unlockForm');
  const unlockPin = document.getElementById('unlockPin');
  const unlockStatus = document.getElementById('unlockStatus');
  const setupForm = document.getElementById('pinSetupForm');
  const setupPin = document.getElementById('setupPin');
  const confirmPin = document.getElementById('confirmPin');
  const setupStatus = document.getElementById('setupStatus');
  const onboardingView = document.getElementById('onboardingView');
  const onboardingForm = document.getElementById('onboardingForm');
  const institutionNameInput = document.getElementById('institutionName');
  const institutionLogoInput = document.getElementById('institutionLogo');
  const institutionLogoPreview = document.getElementById('institutionLogoPreview');
  const institutionLogoImage = document.getElementById('institutionLogoImage');
  const onboardingStatus = document.getElementById('onboardingStatus');
  const workspaceChoiceView = document.getElementById('workspaceChoiceView');
  const campusManagementView = document.getElementById('campusManagementView');
  const chooseOrganizer = document.getElementById('chooseOrganizer');
  const chooseManager = document.getElementById('chooseManager');
  const enterTournamentFromCampus = document.getElementById('enterTournamentFromCampus');
  const backToWorkspaceChoice = document.getElementById('backToWorkspaceChoice');
  const lockedAccount = document.getElementById('lockedAccount');
  const logoutButton = document.getElementById('logoutInstitution');
  const reauthButton = document.getElementById('reauthButton');

  let activeSession = null;
  let activeAccount = null;
  let countdownTimer = null;
  let idleTimer = null;
  let lastActivityWrite = 0;
  let institutionLogoDraft = '';

  function readJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function removeItem(key) {
    localStorage.removeItem(key);
  }

  function createDeviceId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function getDeviceId() {
    let id = localStorage.getItem(STORAGE.device);
    if (!id) {
      id = createDeviceId();
      localStorage.setItem(STORAGE.device, id);
    }
    return id;
  }

  function validPhone(phone) {
    return /^1[3-9]\d{9}$/.test(phone);
  }

  function validPin(pin) {
    return /^\d{4}$/.test(pin);
  }

  function maskPhone(phone) {
    return phone ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : '当前机构账号';
  }

  function status(target, message, type = '') {
    target.textContent = message;
    target.className = `${target.id === 'authStatus' ? 'login-status' : 'security-message'}${type ? ` ${type}` : ''}`;
  }

  function setBusy(button, busy, busyText, idleText) {
    button.disabled = busy;
    button.textContent = busy ? busyText : idleText;
  }

  function updateAccountSummary(account) {
    const institutionName = account.institutionName || '机构名称待补充';
    const campusName = account.campusName || '机构总览';
    document.getElementById('sideAccountName').textContent = `${institutionName} · ${campusName}`;
    document.getElementById('sideAccountRole').textContent = '机构超级管理员｜免费赛事版';
    document.getElementById('currentCampus').textContent = campusName;
    const avatar = document.getElementById('accountAvatar');
    avatar.replaceChildren();
    if (account.institutionLogo) {
      const image = document.createElement('img');
      image.src = account.institutionLogo;
      image.alt = `${institutionName} Logo`;
      avatar.appendChild(image);
    } else {
      avatar.textContent = institutionName === '机构名称待补充' ? '机' : institutionName.charAt(0);
    }
    lockedAccount.textContent = `${institutionName} · ${maskPhone(account.phone)}`;
  }

  function showLogin(phone = '') {
    activeSession = null;
    activeAccount = null;
    securityScreen.hidden = true;
    securityScreen.setAttribute('aria-hidden', 'true');
    loginScreen.classList.remove('login-hidden');
    app.setAttribute('aria-hidden', 'true');
    if (phone) phoneInput.value = phone;
    codeInput.value = '';
    status(authStatus, '');
    window.setTimeout(() => phoneInput.focus(), 50);
  }

  function showApp(account) {
    activeAccount = account;
    updateAccountSummary(account);
    loginScreen.classList.add('login-hidden');
    app.removeAttribute('aria-hidden');
  }

  function showSecurity(mode) {
    if (!activeAccount) return;
    securityScreen.hidden = false;
    securityScreen.setAttribute('aria-hidden', 'false');
    unlockView.hidden = mode !== 'unlock';
    setupView.hidden = mode !== 'setup';
    onboardingView.hidden = mode !== 'onboarding';
    workspaceChoiceView.hidden = mode !== 'workspace-choice';
    campusManagementView.hidden = mode !== 'campus-management';
    status(unlockStatus, '');
    status(setupStatus, '');
    status(onboardingStatus, '');
    if (mode === 'onboarding') {
      institutionNameInput.value = activeAccount?.institutionName === '机构名称待补充' ? '' : (activeAccount?.institutionName || '');
      institutionLogoDraft = activeAccount?.institutionLogo || '';
      institutionLogoInput.value = '';
      institutionLogoImage.src = institutionLogoDraft;
      institutionLogoPreview.hidden = !institutionLogoDraft;
    }
    window.setTimeout(() => (mode === 'setup' ? setupPin : mode === 'onboarding' ? institutionNameInput : mode === 'workspace-choice' ? chooseOrganizer : mode === 'campus-management' ? enterTournamentFromCampus : unlockPin).focus(), 50);
  }

  function hideSecurity() {
    securityScreen.hidden = true;
    securityScreen.setAttribute('aria-hidden', 'true');
    unlockPin.value = '';
    setupPin.value = '';
    confirmPin.value = '';
  }

  function accounts() {
    return readJson(STORAGE.accounts, {});
  }

  function saveAccount(account) {
    const records = accounts();
    records[account.phone] = account;
    writeJson(STORAGE.accounts, records);
  }

  function createInstitutionAccount(phone) {
    const now = Date.now();
    return {
      phone,
      institutionId: `SXF-${phone.slice(-4)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      institutionName: '机构名称待补充',
      institutionLogo: '',
      onboardingCompleted: false,
      campusName: '',
      role: 'institution_super_admin',
      entitlements: ['free_tournament'],
      preferredWorkspace: 'tournaments',
      createdAt: now,
      lastLoginAt: now
    };
  }

  function hasInstitutionProfile(account) {
    return Boolean(
      account && account.onboardingCompleted &&
      String(account.institutionName || '').trim() &&
      account.institutionName !== '机构名称待补充'
    );
  }

  function readLogoFile(file) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\/(png|jpeg|webp)$/.test(file.type)) {
        reject(new Error('请选择 PNG、JPG 或 WEBP 格式的 Logo。'));
        return;
      }
      if (file.size > 3 * 1024 * 1024) {
        reject(new Error('Logo 原图不能超过 3MB。'));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Logo 读取失败，请重新选择。'));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error('Logo 图片无法识别，请重新选择。'));
        image.onload = () => {
          const scale = Math.min(1, 512 / Math.max(image.width, image.height));
          const width = Math.max(1, Math.round(image.width * scale));
          const height = Math.max(1, Math.round(image.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(image, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png');
          if (dataUrl.length > 950 * 1024) {
            reject(new Error('Logo 图片仍然过大，请换一张更简单的图片。'));
            return;
          }
          resolve(dataUrl);
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function createSession(account) {
    const now = Date.now();
    return {
      phone: account.phone,
      institutionId: account.institutionId,
      deviceId: getDeviceId(),
      issuedAt: now,
      expiresAt: now + SESSION_TTL,
      lastActiveAt: now
    };
  }

  function saveSession(session) {
    activeSession = session;
    writeJson(STORAGE.session, session);
  }

  function isValidSession(session) {
    return Boolean(
      session &&
      session.phone &&
      session.deviceId === getDeviceId() &&
      Number(session.expiresAt) > Date.now()
    );
  }

  async function digest(value) {
    if (window.crypto && window.crypto.subtle) {
      const bytes = new TextEncoder().encode(value);
      const result = await window.crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(result), byte => byte.toString(16).padStart(2, '0')).join('');
    }
    let hash = 5381;
    for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
    return `fallback-${hash >>> 0}`;
  }

  function pinKey(phone) {
    return `${phone}|${getDeviceId()}`;
  }

  async function hasPin(phone) {
    const records = readJson(STORAGE.pins, {});
    return Boolean(records[pinKey(phone)]);
  }

  async function savePin(phone, pin) {
    const records = readJson(STORAGE.pins, {});
    records[pinKey(phone)] = await digest(`${getDeviceId()}:${phone}:${pin}`);
    writeJson(STORAGE.pins, records);
  }

  async function verifyPin(phone, pin) {
    const records = readJson(STORAGE.pins, {});
    const saved = records[pinKey(phone)];
    return Boolean(saved && saved === await digest(`${getDeviceId()}:${phone}:${pin}`));
  }

  function guardKey() {
    return activeSession ? pinKey(activeSession.phone) : '';
  }

  function readGuard() {
    const guards = readJson(STORAGE.pinGuard, {});
    return guards[guardKey()] || { failures: 0, blockedUntil: 0 };
  }

  function writeGuard(guard) {
    const guards = readJson(STORAGE.pinGuard, {});
    guards[guardKey()] = guard;
    writeJson(STORAGE.pinGuard, guards);
  }

  function resetGuard() {
    writeGuard({ failures: 0, blockedUntil: 0 });
  }

  const mockSmsAdapter = {
    async sendVerificationCode({ phone }) {
      const previous = readJson(STORAGE.sms, null);
      const now = Date.now();
      if (previous && previous.phone === phone && now - Number(previous.sentAt) < SMS_COOLDOWN) {
        return { ok: false, reason: 'cooldown', retryAfter: SMS_COOLDOWN - (now - Number(previous.sentAt)) };
      }
      writeJson(STORAGE.sms, {
        phone,
        code: TEST_CODE,
        sentAt: now,
        expiresAt: now + SMS_TTL,
        attempts: 0
      });
      return { ok: true, expiresIn: SMS_TTL };
    },
    async verifyCode({ phone, code }) {
      const record = readJson(STORAGE.sms, null);
      if (!record || record.phone !== phone) return { ok: false, reason: 'not_sent' };
      if (Date.now() > Number(record.expiresAt)) return { ok: false, reason: 'expired' };
      if (Number(record.attempts) >= 5) return { ok: false, reason: 'too_many_attempts' };
      if (record.code !== code) {
        record.attempts = Number(record.attempts) + 1;
        writeJson(STORAGE.sms, record);
        return { ok: false, reason: 'invalid' };
      }
      removeItem(STORAGE.sms);
      return { ok: true };
    }
  };

  const smsAdapter = window.SXFInstitutionSMS || mockSmsAdapter;

  function startCountdown(seconds) {
    window.clearInterval(countdownTimer);
    let remaining = Math.max(0, Math.ceil(seconds));
    const render = () => {
      if (remaining <= 0) {
        window.clearInterval(countdownTimer);
        sendCodeButton.disabled = false;
        sendCodeButton.textContent = '重新获取';
        return;
      }
      sendCodeButton.disabled = true;
      sendCodeButton.textContent = `${remaining}秒后重发`;
      remaining -= 1;
    };
    render();
    countdownTimer = window.setInterval(render, 1000);
  }

  async function sendCode() {
    const phone = phoneInput.value.trim();
    if (!validPhone(phone)) {
      status(authStatus, '请输入正确的11位手机号。', 'error');
      phoneInput.focus();
      return;
    }
    setBusy(sendCodeButton, true, '发送中…', '获取验证码');
    try {
      const result = await smsAdapter.sendVerificationCode({ phone });
      if (!result.ok && result.reason === 'cooldown') {
        startCountdown(result.retryAfter / 1000);
        status(authStatus, '验证码发送过于频繁，请倒计时结束后再试。', 'error');
        return;
      }
      if (!result.ok) throw new Error('验证码发送失败');
      startCountdown(60);
      status(authStatus, `验证码已发送。本轮交互验收请输入 ${TEST_CODE}。`, 'success');
      codeInput.focus();
    } catch (error) {
      setBusy(sendCodeButton, false, '', '重新获取');
      status(authStatus, '验证码发送失败，请稍后重试。', 'error');
    }
  }

  function authErrorMessage(reason) {
    return {
      not_sent: '请先获取验证码。',
      expired: '验证码已过期，请重新获取。',
      invalid: '验证码不正确，请重新输入。',
      too_many_attempts: '验证码连续错误次数过多，请重新获取。'
    }[reason] || '验证失败，请稍后重试。';
  }

  async function completeLogin(phone) {
    const records = accounts();
    const isNew = !records[phone];
    const account = records[phone] || createInstitutionAccount(phone);
    account.lastLoginAt = Date.now();
    saveAccount(account);
    const session = createSession(account);
    saveSession(session);
    activeAccount = account;
    updateAccountSummary(account);
    if (!hasInstitutionProfile(account)) {
      showSecurity('onboarding');
      return;
    }
    if (!account.workspaceRole) {
      showSecurity('workspace-choice');
      return;
    }
    if (account.workspaceRole === 'institution_manager') {
      showSecurity('campus-management');
      return;
    }
    showApp(account);
    if (await hasPin(phone)) {
      hideSecurity();
      startIdleWatch();
      if (isNew && account.preferredWorkspace === 'tournaments') {
        window.location.href = './tournament-center.html#workbench';
      }
    } else {
      showSecurity('setup');
    }
  }

  async function submitLogin(event) {
    event.preventDefault();
    const phone = phoneInput.value.trim();
    const code = codeInput.value.trim();
    if (!validPhone(phone)) {
      status(authStatus, '请输入正确的11位手机号。', 'error');
      phoneInput.focus();
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      status(authStatus, '请输入6位数字验证码。', 'error');
      codeInput.focus();
      return;
    }
    if (!agreement.checked) {
      status(authStatus, '请先阅读并同意用户服务协议和隐私政策。', 'error');
      agreement.focus();
      return;
    }
    setBusy(authSubmit, true, '正在验证…', '登录 / 注册并进入');
    try {
      const result = await smsAdapter.verifyCode({ phone, code });
      if (!result.ok) {
        status(authStatus, authErrorMessage(result.reason), 'error');
        return;
      }
      status(authStatus, '验证成功，正在进入机构后台…', 'success');
      await completeLogin(phone);
    } catch (error) {
      status(authStatus, '登录失败，请稍后重试。', 'error');
    } finally {
      setBusy(authSubmit, false, '', '登录 / 注册并进入');
    }
  }

  async function submitPinSetup(event) {
    event.preventDefault();
    const pin = setupPin.value.trim();
    const confirmation = confirmPin.value.trim();
    if (!validPin(pin)) {
      status(setupStatus, '锁屏密码必须是4位数字。', 'error');
      setupPin.focus();
      return;
    }
    if (pin !== confirmation) {
      status(setupStatus, '两次输入的密码不一致。', 'error');
      confirmPin.focus();
      return;
    }
    await savePin(activeSession.phone, pin);
    resetGuard();
    activeSession.lastActiveAt = Date.now();
    saveSession(activeSession);
    hideSecurity();
    startIdleWatch();
    if (activeAccount && activeAccount.preferredWorkspace === 'tournaments') {
      window.location.href = './tournament-center.html#workbench';
    }
  }

  async function submitOnboarding(event) {
    event.preventDefault();
    const institutionName = institutionNameInput.value.trim();
    if (institutionName.length < 2) {
      status(onboardingStatus, '请填写至少 2 个字的机构名称。', 'error');
      institutionNameInput.focus();
      return;
    }
    activeAccount.institutionName = institutionName;
    activeAccount.campusName = '';
    activeAccount.institutionLogo = institutionLogoDraft;
    activeAccount.onboardingCompleted = true;
    activeAccount.onboardingCompletedAt = Date.now();
    saveAccount(activeAccount);
    updateAccountSummary(activeAccount);
    showSecurity('workspace-choice');
  }

  async function enterSelectedWorkspace(role) {
    if (!activeAccount) return;
    activeAccount.workspaceRole = role;
    activeAccount.preferredWorkspace = role === 'organizer' ? 'tournaments' : 'campus-management';
    saveAccount(activeAccount);
    if (role === 'institution_manager') {
      showSecurity('campus-management');
      return;
    }
    showApp(activeAccount);
    if (await hasPin(activeAccount.phone)) {
      hideSecurity();
      startIdleWatch();
      window.location.href = './tournament-center.html#workbench';
      return;
    }
    showSecurity('setup');
  }

  async function submitUnlock(event) {
    event.preventDefault();
    const guard = readGuard();
    const now = Date.now();
    if (Number(guard.blockedUntil) > now) {
      const seconds = Math.ceil((Number(guard.blockedUntil) - now) / 1000);
      status(unlockStatus, `连续输错次数过多，请${seconds}秒后再试。`, 'error');
      return;
    }
    const pin = unlockPin.value.trim();
    if (!validPin(pin)) {
      status(unlockStatus, '请输入4位数字锁屏密码。', 'error');
      return;
    }
    if (await verifyPin(activeSession.phone, pin)) {
      resetGuard();
      activeSession.lastActiveAt = now;
      saveSession(activeSession);
      hideSecurity();
      startIdleWatch();
      return;
    }
    guard.failures = Number(guard.failures) + 1;
    if (guard.failures >= PIN_MAX_FAILURES) {
      guard.failures = 0;
      guard.blockedUntil = now + PIN_BLOCK_TTL;
      writeGuard(guard);
      status(unlockStatus, '连续输错5次，已限制输入60秒。登录状态仍会保留。', 'error');
    } else {
      writeGuard(guard);
      status(unlockStatus, `密码不正确，还可尝试${PIN_MAX_FAILURES - guard.failures}次。`, 'error');
    }
    unlockPin.value = '';
    unlockPin.focus();
  }

  function lockForIdle() {
    if (!activeSession || !securityScreen.hidden) return;
    showSecurity('unlock');
  }

  function recordActivity() {
    if (!activeSession || !securityScreen.hidden || loginScreen.classList.contains('login-hidden') === false) return;
    const now = Date.now();
    if (now - lastActivityWrite < 60 * 1000) return;
    lastActivityWrite = now;
    activeSession.lastActiveAt = now;
    saveSession(activeSession);
  }

  function checkIdle() {
    if (!activeSession || !securityScreen.hidden) return;
    if (Date.now() - Number(activeSession.lastActiveAt) >= IDLE_TTL) lockForIdle();
  }

  function startIdleWatch() {
    window.clearInterval(idleTimer);
    idleTimer = window.setInterval(checkIdle, 30 * 1000);
  }

  function logout(requireConfirmation = true) {
    if (requireConfirmation && !window.confirm('确定退出机构后台？退出后将撤销这台设备的30天登录状态。')) return;
    const phone = activeSession ? activeSession.phone : '';
    window.clearInterval(idleTimer);
    removeItem(STORAGE.session);
    showLogin(phone);
  }

  async function restore() {
    removeItem('sx_institution_demo_login');
    const session = readJson(STORAGE.session, null);
    if (!isValidSession(session)) {
      if (session) removeItem(STORAGE.session);
      showLogin(session && session.phone ? session.phone : '');
      return;
    }
    const account = accounts()[session.phone];
    if (!account) {
      removeItem(STORAGE.session);
      showLogin(session.phone);
      return;
    }
    activeSession = session;
    activeAccount = account;
    if (!hasInstitutionProfile(account)) {
      showSecurity('onboarding');
      return;
    }
    if (!account.workspaceRole) {
      showSecurity('workspace-choice');
      return;
    }
    if (account.workspaceRole === 'institution_manager') {
      showSecurity('campus-management');
      return;
    }
    showApp(account);
    if (!await hasPin(session.phone)) {
      showSecurity('setup');
      return;
    }
    if (Date.now() - Number(session.lastActiveAt) >= IDLE_TTL) {
      showSecurity('unlock');
      return;
    }
    hideSecurity();
    startIdleWatch();
  }

  sendCodeButton.addEventListener('click', sendCode);
  loginForm.addEventListener('submit', submitLogin);
  onboardingForm.addEventListener('submit', submitOnboarding);
  chooseOrganizer.addEventListener('click', () => enterSelectedWorkspace('organizer'));
  chooseManager.addEventListener('click', () => enterSelectedWorkspace('institution_manager'));
  enterTournamentFromCampus.addEventListener('click', () => enterSelectedWorkspace('organizer'));
  backToWorkspaceChoice.addEventListener('click', () => showSecurity('workspace-choice'));
  institutionLogoInput.addEventListener('change', async () => {
    const file = institutionLogoInput.files?.[0];
    if (!file) return;
    try {
      institutionLogoDraft = await readLogoFile(file);
      institutionLogoImage.src = institutionLogoDraft;
      institutionLogoPreview.hidden = false;
      status(onboardingStatus, 'Logo 已处理完成。', 'success');
    } catch (error) {
      institutionLogoInput.value = '';
      status(onboardingStatus, error.message || 'Logo 处理失败，请重新选择。', 'error');
    }
  });
  setupForm.addEventListener('submit', submitPinSetup);
  unlockForm.addEventListener('submit', submitUnlock);
  logoutButton.addEventListener('click', () => logout(true));
  reauthButton.addEventListener('click', () => logout(false));
  document.querySelectorAll('.login-agreement a').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    status(authStatus, '协议页面将在正式法务文本确认后开放，本轮可继续勾选进行交互验收。');
  }));
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(eventName => {
    window.addEventListener(eventName, recordActivity, { passive: true });
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) checkIdle();
  });

  restore();
})();
