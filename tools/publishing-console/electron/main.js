'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const {
  app,
  BrowserView,
  BrowserWindow,
  dialog,
  ipcMain,
  session,
  shell
} = require('electron');

const CONTROL_PORT = Number(process.env.PUBLISHING_CONSOLE_PORT || 4318);
const CONTROL_URL = `http://127.0.0.1:${CONTROL_PORT}/`;
const OPERATION_BOX_ROOT = path.resolve(
  process.env.OPERATION_BOX_ROOT
    || 'E:\\Documents\\saixoafeng_basketball\\公众号\\操作箱'
);
const TEST_MODE = process.env.SXF_DESKTOP_TEST_MODE === '1';
const TEST_CAPTURE_DIR = process.env.SXF_TEST_CAPTURE_DIR || '';
const TEST_DETECTION_LOG = process.env.SXF_TEST_DETECTION_LOG || '';
const TEST_WEBVIEW2_LOG = process.env.SXF_TEST_WEBVIEW2_LOG || '';
const SIDEBAR_WIDTH = 430;
const BROWSER_HEADER_HEIGHT = 72;
const USER_DATA_ROOT = process.env.SXF_BROWSER_PROFILE_ROOT || path.join(
  process.env.LOCALAPPDATA || app.getPath('appData'),
  'SxfPublishingConsole',
  'BrowserProfiles'
);
app.setPath('userData', USER_DATA_ROOT);
const PLATFORM_PORTALS = Object.freeze({
  'wechat-official-account': 'https://mp.weixin.qq.com/',
  toutiao: 'https://mp.toutiao.com/',
  dingduan: 'https://mp.topnews.cn/#/index',
  baijiahao: 'https://baijiahao.baidu.com/',
  penguin: 'https://om.qq.com/',
  zhihu: 'https://www.zhihu.com/creator'
});
const PLATFORM_NAMES = Object.freeze({
  'wechat-official-account': '微信公众号',
  toutiao: '头条号',
  dingduan: '顶端号',
  baijiahao: '百家号',
  penguin: '企鹅号',
  zhihu: '知乎'
});
const PLATFORM_HOST_SUFFIXES = Object.freeze({
  'wechat-official-account': ['mp.weixin.qq.com'],
  toutiao: ['toutiao.com'],
  dingduan: ['topnews.cn'],
  baijiahao: ['baidu.com'],
  penguin: ['qq.com'],
  zhihu: ['zhihu.com']
});
const WEBVIEW2_PLATFORMS = new Set(['zhihu']);

let mainWindow = null;
let activePlatform = '';
let webView2Host = null;
let appClosing = false;
const platformViews = new Map();
const accountDetectionState = new Map();

function isCanonicalPortal(platform, portalUrl) {
  return PLATFORM_PORTALS[platform] === portalUrl;
}

function safeWebPreferences(partition) {
  return {
    partition,
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    webSecurity: true,
    spellcheck: true,
    devTools: false
  };
}

function configureExternalSession(partition) {
  const platformSession = session.fromPartition(partition, { cache: true });
  platformSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'clipboard-sanitized-write');
  });
  platformSession.setPermissionCheckHandler((_webContents, permission) => (
    permission === 'clipboard-sanitized-write'
  ));
  return platformSession;
}

function configurePlatformView(platform, view) {
  view.webContents.setWindowOpenHandler(({ url }) => {
    if (!/^https?:\/\//i.test(url)) return { action: 'deny' };
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        autoHideMenuBar: true,
        webPreferences: safeWebPreferences(`persist:sxf-${platform}`)
      }
    };
  });
  view.webContents.on('will-navigate', (event, url) => {
    if (!/^https?:\/\//i.test(url)) event.preventDefault();
  });
}

function capturePlatformTestImages(platform, window, browserView) {
  if (!TEST_MODE || !TEST_CAPTURE_DIR) return;
  fs.mkdirSync(TEST_CAPTURE_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(TEST_CAPTURE_DIR, `${platform}-capture-status.txt`),
    'capture scheduled\n',
    'utf8'
  );
  setTimeout(async () => {
    try {
      const [shellImage, browserImage] = await Promise.all([
        window.webContents.capturePage(),
        browserView.webContents.capturePage()
      ]);
      fs.writeFileSync(
        path.join(TEST_CAPTURE_DIR, `${platform}-shell.png`),
        shellImage.toPNG()
      );
      fs.writeFileSync(
        path.join(TEST_CAPTURE_DIR, `${platform}-browser.png`),
        browserImage.toPNG()
      );
      const shellState = await window.webContents.executeJavaScript(`
        ({
          platformCards: document.querySelectorAll('.platform-card').length,
          accountOptions: document.querySelectorAll('.check-option').length,
          platformText: document.querySelector('#platform-grid')?.innerText || '',
          bodyClass: document.body.className
        })
      `);
      fs.writeFileSync(
        path.join(TEST_CAPTURE_DIR, `${platform}-shell-state.json`),
        `${JSON.stringify(shellState, null, 2)}\n`,
        'utf8'
      );
      fs.appendFileSync(
        path.join(TEST_CAPTURE_DIR, `${platform}-capture-status.txt`),
        'capture complete\n',
        'utf8'
      );
    } catch (error) {
      fs.appendFileSync(
        path.join(TEST_CAPTURE_DIR, `${platform}-capture-status.txt`),
        `capture failed: ${error.message}\n`,
        'utf8'
      );
    }
  }, 5000);
}

function isExpectedPlatformPage(platform, currentUrl) {
  try {
    const hostname = new URL(currentUrl).hostname.toLowerCase();
    return (PLATFORM_HOST_SUFFIXES[platform] || [])
      .some((suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`));
  } catch {
    return false;
  }
}

function layoutActivePlatform() {
  if (!mainWindow || mainWindow.isDestroyed() || !activePlatform) return;
  if (WEBVIEW2_PLATFORMS.has(activePlatform)) {
    layoutWebView2Host();
    return;
  }
  const entry = platformViews.get(activePlatform);
  if (!entry || entry.browserView.webContents.isDestroyed()) return;
  const [width, height] = mainWindow.getContentSize();
  entry.browserView.setBounds({
    x: SIDEBAR_WIDTH,
    y: BROWSER_HEADER_HEIGHT,
    width: Math.max(0, width - SIDEBAR_WIDTH),
    height: Math.max(0, height - BROWSER_HEADER_HEIGHT)
  });
  entry.browserView.setAutoResize({
    width: true,
    height: true,
    horizontal: false,
    vertical: false
  });
}

function getPlatformBounds() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { x: SIDEBAR_WIDTH, y: BROWSER_HEADER_HEIGHT, width: 900, height: 760 };
  }
  const [width, height] = mainWindow.getContentSize();
  return {
    x: SIDEBAR_WIDTH,
    y: BROWSER_HEADER_HEIGHT,
    width: Math.max(320, width - SIDEBAR_WIDTH),
    height: Math.max(240, height - BROWSER_HEADER_HEIGHT)
  };
}

function sendWebView2Command(command) {
  if (
    !webView2Host?.process
    || webView2Host.process.killed
    || !webView2Host.process.stdin.writable
  ) {
    return false;
  }
  try {
    webView2Host.process.stdin.write(`${command}\n`);
    return true;
  } catch {
    return false;
  }
}

function layoutWebView2Host() {
  if (!webView2Host || activePlatform !== 'zhihu') return;
  const bounds = getPlatformBounds();
  sendWebView2Command(`BOUNDS ${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);
}

function hideWebView2Host() {
  if (!webView2Host) return;
  webView2Host.visible = false;
  sendWebView2Command('HIDE');
}

function closeWebView2Host() {
  if (!webView2Host) return;
  const entry = webView2Host;
  webView2Host = null;
  try {
    entry.process.stdin.write('CLOSE\n');
  } catch {
    // The helper may already have exited.
  }
  setTimeout(() => {
    if (!entry.process.killed && entry.process.exitCode === null) {
      entry.process.kill();
    }
  }, 1800);
}

function webView2ExecutablePath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'webview2-host', 'SxfWebView2Host.exe')
    : path.join(__dirname, '..', 'webview2-host', 'dist', 'SxfWebView2Host.exe');
}

function parentWindowHandle() {
  const handle = mainWindow.getNativeWindowHandle();
  return handle.length >= 8
    ? handle.readBigUInt64LE(0).toString()
    : String(handle.readUInt32LE(0));
}

function isZhihuAuthenticatedUrl(value) {
  try {
    const url = new URL(value);
    if (url.hostname !== 'www.zhihu.com' && !url.hostname.endsWith('.zhihu.com')) return false;
    return !/^\/(signin|account\/unhuman)/i.test(url.pathname);
  } catch {
    return false;
  }
}

function handleWebView2Line(entry, line) {
  if (entry !== webView2Host) return;
  if (TEST_MODE && TEST_WEBVIEW2_LOG) {
    fs.appendFileSync(TEST_WEBVIEW2_LOG, `${new Date().toISOString()} ${line}\n`, 'utf8');
  }
  if (line === 'READY') {
    entry.ready = true;
    entry.visible = true;
    layoutWebView2Host();
    sendWebView2Command('SHOW');
    updateBrowserHeader({
      platform: 'zhihu',
      name: PLATFORM_NAMES.zhihu,
      status: 'WebView2 已就绪 · 请手动登录知乎',
      webview2: true
    });
    return;
  }
  if (line.startsWith('NAVIGATING ')) {
    if (activePlatform === 'zhihu') {
      updateBrowserHeader({
        platform: 'zhihu',
        name: PLATFORM_NAMES.zhihu,
        status: '正在加载知乎官方页面…',
        webview2: true
      });
    }
    return;
  }
  if (line.startsWith('NAVIGATION ')) {
    const match = /^NAVIGATION (OK|FAIL) (.*)$/.exec(line);
    if (!match) return;
    const succeeded = match[1] === 'OK';
    const currentUrl = match[2];
    if (activePlatform === 'zhihu') {
      updateBrowserHeader({
        platform: 'zhihu',
        name: PLATFORM_NAMES.zhihu,
        status: succeeded ? '知乎官方页面已打开' : '知乎页面加载失败 · 可使用浏览器兜底',
        webview2: true,
        error: !succeeded
      });
    }
    if (
      succeeded
      && isZhihuAuthenticatedUrl(currentUrl)
      && mainWindow
      && !mainWindow.isDestroyed()
    ) {
      mainWindow.webContents.send('platform:session', {
        platform: 'zhihu',
        authenticated: true,
        active: activePlatform === 'zhihu',
        message: '知乎登录会话已确认 · 可点“修正”登记账号名称'
      });
    }
    return;
  }
  if (line.startsWith('ERROR ')) {
    const message = line.slice(6) || 'WebView2 启动失败';
    updateBrowserHeader({
      platform: 'zhihu',
      name: PLATFORM_NAMES.zhihu,
      status: `${message} · 正在使用系统浏览器兜底`,
      external: true,
      error: true
    });
  }
}

function startWebView2Platform(portalUrl) {
  detachPlatformViews();
  activePlatform = 'zhihu';
  mainWindow.show();
  mainWindow.focus();

  if (webView2Host?.process && webView2Host.process.exitCode === null) {
    webView2Host.visible = true;
    layoutWebView2Host();
    sendWebView2Command('SHOW');
    sendWebView2Command('FOCUS');
    updateBrowserHeader({
      platform: 'zhihu',
      name: PLATFORM_NAMES.zhihu,
      status: webView2Host.ready ? '已切换到知乎 WebView2' : '正在启动知乎 WebView2…',
      webview2: true
    });
    return { ok: true, reused: true, embedded: true, webview2: true };
  }

  const executable = webView2ExecutablePath();
  if (!fs.existsSync(executable)) {
    updateBrowserHeader({
      platform: 'zhihu',
      name: PLATFORM_NAMES.zhihu,
      status: '缺少 WebView2 登录组件 · 已使用系统浏览器兜底',
      external: true,
      error: true
    });
    if (!TEST_MODE) shell.openExternal(portalUrl);
    return { ok: false, reused: false, embedded: false, external: true };
  }

  const bounds = getPlatformBounds();
  const userDataFolder = path.join(
    process.env.LOCALAPPDATA || app.getPath('appData'),
    'SxfPublishingConsole',
    'WebView2Profiles',
    'zhihu'
  );
  const child = spawn(executable, [
    '--parent', parentWindowHandle(),
    '--parent-pid', String(process.pid),
    '--url', portalUrl,
    '--user-data-folder', userDataFolder,
    '--x', String(bounds.x),
    '--y', String(bounds.y),
    '--width', String(bounds.width),
    '--height', String(bounds.height)
  ], {
    cwd: path.dirname(executable),
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  const entry = {
    process: child,
    ready: false,
    visible: true,
    outputBuffer: ''
  };
  webView2Host = entry;
  updateBrowserHeader({
    platform: 'zhihu',
    name: PLATFORM_NAMES.zhihu,
    status: '正在启动知乎 WebView2…',
    webview2: true
  });

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    entry.outputBuffer += chunk;
    const lines = entry.outputBuffer.split(/\r?\n/);
    entry.outputBuffer = lines.pop() || '';
    for (const line of lines) {
      if (line.trim()) handleWebView2Line(entry, line.trim());
    }
  });
  child.on('error', (error) => {
    if (entry !== webView2Host) return;
    webView2Host = null;
    if (activePlatform === 'zhihu' && !TEST_MODE && !appClosing) {
      updateBrowserHeader({
        platform: 'zhihu',
        name: PLATFORM_NAMES.zhihu,
        status: `WebView2 启动失败：${error.message} · 已打开系统浏览器`,
        external: true,
        error: true
      });
      shell.openExternal(portalUrl);
    }
  });
  child.on('exit', () => {
    if (entry !== webView2Host) return;
    webView2Host = null;
    if (activePlatform === 'zhihu' && !TEST_MODE && !appClosing) {
      updateBrowserHeader({
        platform: 'zhihu',
        name: PLATFORM_NAMES.zhihu,
        status: 'WebView2 已退出 · 已打开系统浏览器兜底',
        external: true,
        error: true
      });
      shell.openExternal(portalUrl);
    }
  });
  return { ok: true, reused: false, embedded: true, webview2: true };
}

function updateBrowserHeader(payload) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('platform:status', payload);
}

function accountDetectionScript(platform) {
  return `
    (() => {
      const platform = ${JSON.stringify(platform)};
      const clean = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
      const rejected = /^(消息|首页|主页|创作|开始创作|文章|视频|微头条|音频|管理|数据|提现|更多|设置|退出|登录|注册|发布|草稿箱|作品管理|评论管理|收益数据|粉丝数据|个人中心|创作中心|工作台|头条号|顶端号|百家号|企鹅号|知乎|头像|切换|Logo|百家号Logo)$/i;
      const selectors = {
        toutiao: ['.user-name', '.user__name', '.user-auth-avator', '[class*="user-auth"]', '[class*="userName"]', '[class*="user-name"]', '[class*="accountName"]', '[class*="account-name"]', '[class*="nickname"]'],
        dingduan: ['.user-name', '[class*="userName"]', '[class*="user-name"]', '[class*="accountName"]', '[class*="account-name"]', '[class*="nickname"]'],
        baijiahao: ['.user-name', '.mp-header-user img', '[class*="accountExchangePop"] img', 'header img[alt]', '[class*="userName"]', '[class*="user-name"]', '[class*="accountName"]', '[class*="account-name"]', '[class*="nickname"]'],
        penguin: ['.user-name', '[class*="userName"]', '[class*="user-name"]', '[class*="accountName"]', '[class*="account-name"]', '[class*="nickname"]'],
        zhihu: ['[data-za-detail-view-element_name="User"]', '[class*="AppHeader-profile"]', '[class*="userName"]', '[class*="UserName"]', '[class*="accountName"]', '[class*="nickname"]']
      };
      const authenticatedSelectors = {
        toutiao: ['.user-auth-avator', '[class*="user-auth"]', '[class*="creator"]'],
        dingduan: ['[class*="userName"]', '[class*="avatar"]', '[class*="account"]'],
        baijiahao: ['.mp-header-user', '.account-exchange-btn', '[class*="header_accountExchangePop"]'],
        penguin: ['[class*="userName"]', '[class*="avatar"]', '[class*="account"]'],
        zhihu: ['[class*="AppHeader-profile"]', '[data-za-detail-view-element_name="User"]']
      };
      const candidates = new Map();
      const consider = (element, direct) => {
        if (!element || !(element instanceof Element)) return;
        const text = clean(
          element.textContent
          || element.getAttribute('aria-label')
          || element.getAttribute('title')
          || element.getAttribute('alt')
        );
        if (text.length < 2 || text.length > 30 || rejected.test(text)) return;
        if (/^(\\d[\\d,.]*|[+\\-]?\\d+\\s*(元|天|篇|次|个)?)$/.test(text)) return;
        if (/在头条创作|粉丝数|总阅读|累计收益|消息|发布了|昨日|今日/.test(text)) return;
        if (!/[\\p{L}\\p{N}]/u.test(text)) return;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        if (rect.width < 8 || rect.height < 8 || style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return;
        const identity = clean([
          element.id,
          typeof element.className === 'string' ? element.className : '',
          element.getAttribute('aria-label')
        ].join(' '));
        let score = direct ? 52 : 0;
        if (/(nickname|nick-name|user-name|username|account-name|accountname|author-name)/i.test(identity)) score += 48;
        else if (/(user|account|profile|avatar)/i.test(identity)) score += 22;
        if (rect.top >= 0 && rect.top < 210) score += 12;
        if (rect.left > innerWidth * 0.55) score += 14;
        if (/^[\\p{Script=Han}A-Za-z0-9·._\\-（）()]{2,24}$/u.test(text)) score += 8;
        const previous = candidates.get(text);
        if (!previous || previous.score < score) candidates.set(text, { text, score, identity });
      };
      for (const selector of selectors[platform] || []) {
        for (const element of document.querySelectorAll(selector)) consider(element, true);
      }
      const headerElements = document.querySelectorAll('header *, [role="banner"] *, [class*="header"] *, [class*="Header"] *');
      for (const element of Array.from(headerElements).slice(0, 800)) consider(element, false);
      const authSignal = (authenticatedSelectors[platform] || [])
        .find((selector) => document.querySelector(selector));
      return {
        url: location.href,
        title: document.title,
        authenticated: Boolean(authSignal),
        authSignal: authSignal || '',
        candidates: [...candidates.values()].sort((a, b) => b.score - a.score).slice(0, 8)
      };
    })()
  `;
}

async function bindDetectedAccount(platform, displayName, pageUrl) {
  const response = await fetch(`${CONTROL_URL}api/bind-account`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      platform,
      display_name: displayName,
      confirmed_manual_login: true,
      detected_from_official_page: true,
      detected_page_url: pageUrl
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '自动绑定失败');
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('platform:bound', {
      platform,
      platformName: PLATFORM_NAMES[platform],
      displayName,
      message: `已自动绑定：${displayName}`,
      active: activePlatform === platform
    });
  }
  if (activePlatform === platform) {
    updateBrowserHeader({
      platform,
      name: PLATFORM_NAMES[platform],
      status: `已自动绑定：${displayName}`,
      bound: true
    });
  }
}

async function detectAndBindAccount(platform, browserView) {
  if (
    platform === 'wechat-official-account'
    || browserView.webContents.isDestroyed()
    || !isExpectedPlatformPage(platform, browserView.webContents.getURL())
  ) return;
  try {
    const result = await browserView.webContents.executeJavaScript(
      accountDetectionScript(platform),
      true
    );
    if (TEST_MODE && TEST_DETECTION_LOG) {
      fs.writeFileSync(
        TEST_DETECTION_LOG,
        `${JSON.stringify({ platform, ...result }, null, 2)}\n`,
        'utf8'
      );
      const image = await browserView.webContents.capturePage();
      fs.writeFileSync(`${TEST_DETECTION_LOG}.png`, image.toPNG());
    }
    const currentState = accountDetectionState.get(platform) || {
      name: '',
      hits: 0,
      bound: false,
      authenticated: false
    };
    if (result?.authenticated && !currentState.authenticated) {
      currentState.authenticated = true;
      accountDetectionState.set(platform, currentState);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('platform:session', {
          platform,
          authenticated: true,
          active: activePlatform === platform,
          message: platform === 'baijiahao'
            ? '已登录 · 点击右上角头像可自动识别账号名，也可点左侧“修正”'
            : '已确认登录会话'
        });
      }
    }
    const candidate = result?.candidates?.[0];
    if (!candidate || candidate.score < 74) return;
    const previous = accountDetectionState.get(platform);
    if (!previous || previous.name !== candidate.text) {
      accountDetectionState.set(platform, {
        ...currentState,
        name: candidate.text,
        hits: 1,
        bound: false
      });
      if (activePlatform === platform) {
        updateBrowserHeader({
          platform,
          name: PLATFORM_NAMES[platform],
          status: `正在确认账号：${candidate.text}`,
          bound: false
        });
      }
      return;
    }
    previous.hits += 1;
    if (previous.bound || previous.hits < 2) return;
    previous.bound = true;
    try {
      await bindDetectedAccount(platform, candidate.text, result.url);
    } catch (error) {
      previous.bound = false;
      if (activePlatform === platform) {
        updateBrowserHeader({
          platform,
          name: PLATFORM_NAMES[platform],
          status: error.message,
          error: true
        });
      }
    }
  } catch {
    // Some login pages temporarily prevent DOM inspection while redirecting.
  }
}

function detachPlatformViews() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  for (const attachedView of mainWindow.getBrowserViews()) {
    try {
      attachedView.webContents.session.flushStorageData();
    } catch {
      // Keep switching even if Chromium is already closing the old view.
    }
    mainWindow.removeBrowserView(attachedView);
  }
  mainWindow.setBrowserView(null);
}

function openExternalPlatform(platform, portalUrl) {
  hideWebView2Host();
  detachPlatformViews();
  activePlatform = platform;
  mainWindow.show();
  mainWindow.focus();
  const status = '知乎安全验证不支持内置页面 · 已在系统浏览器打开';
  updateBrowserHeader({
    platform,
    name: PLATFORM_NAMES[platform],
    status,
    external: true
  });
  if (TEST_MODE && TEST_CAPTURE_DIR) {
    fs.mkdirSync(TEST_CAPTURE_DIR, { recursive: true });
    setTimeout(async () => {
      try {
        const image = await mainWindow.webContents.capturePage();
        fs.writeFileSync(
          path.join(TEST_CAPTURE_DIR, `${platform}-external-shell.png`),
          image.toPNG()
        );
      } catch {
        // Test capture is diagnostic only.
      }
    }, 1800);
  }
  if (!TEST_MODE) {
    shell.openExternal(portalUrl).catch((error) => {
      updateBrowserHeader({
        platform,
        name: PLATFORM_NAMES[platform],
        status: `系统浏览器打开失败：${error.message}`,
        external: true,
        error: true
      });
    });
  }
  return { ok: true, reused: false, embedded: false, external: true };
}

function startAccountDetection(platform, browserView) {
  const existing = platformViews.get(platform);
  if (existing?.detectionTimer) clearInterval(existing.detectionTimer);
  const run = () => detectAndBindAccount(platform, browserView);
  const detectionTimer = setInterval(run, 2600);
  browserView.webContents.on('did-finish-load', () => setTimeout(run, 900));
  browserView.webContents.on('did-navigate-in-page', () => setTimeout(run, 900));
  setTimeout(run, 1200);
  return detectionTimer;
}

function createPlatformView(platform, portalUrl) {
  const partition = `persist:sxf-${platform}`;
  configureExternalSession(partition);
  const browserView = new BrowserView({
    webPreferences: safeWebPreferences(partition)
  });
  if (TEST_MODE && TEST_CAPTURE_DIR) {
    browserView.webContents.on('console-message', (_event, level, message, line, sourceId) => {
      fs.appendFileSync(
        path.join(TEST_CAPTURE_DIR, `${platform}-browser-console.log`),
        `${new Date().toISOString()} level=${level} ${sourceId}:${line} ${message}\n`,
        'utf8'
      );
    });
  }
  configurePlatformView(platform, browserView);
  browserView.webContents.on('did-start-loading', () => {
    if (activePlatform === platform) {
      updateBrowserHeader({
        platform,
        name: PLATFORM_NAMES[platform],
        status: '正在加载官方创作页…'
      });
    }
  });
  browserView.webContents.on('did-stop-loading', () => {
    try {
      browserView.webContents.session.flushStorageData();
    } catch {
      // Chromium will retry persisting the platform session on the next write.
    }
    if (activePlatform === platform) {
      updateBrowserHeader({
        platform,
        name: PLATFORM_NAMES[platform],
        status: '官方页面已打开 · 登录后自动绑定账号'
      });
    }
  });
  browserView.webContents.on('did-fail-load', (
    _event,
    errorCode,
    errorDescription,
    validatedURL,
    isMainFrame
  ) => {
    if (!isMainFrame || errorCode === -3 || browserView.webContents.isDestroyed()) return;
    const failureHtml = `
      <!doctype html>
      <meta charset="utf-8">
      <title>页面加载失败</title>
      <style>
        body{margin:0;background:#fffdf8;color:#172019;font-family:"Microsoft YaHei",sans-serif}
        main{max-width:720px;margin:80px auto;padding:36px;border:1px solid #dfded6;border-radius:20px}
        h2{margin-top:0}p{line-height:1.8;color:#59635b}
        a{display:inline-block;margin-top:12px;padding:12px 20px;border-radius:10px;background:#172019;color:#fff;text-decoration:none}
        code{word-break:break-all}
      </style>
      <main>
        <h2>官方页面暂时没有加载成功</h2>
        <p>请检查网络后重试。登录、验证码和发布仍需由你手动完成。</p>
        <p><code>${String(validatedURL || portalUrl)}</code></p>
        <p>错误：${String(errorDescription)}（${Number(errorCode)}）</p>
        <a href="${portalUrl}">重新打开官方页面</a>
      </main>
    `;
    browserView.webContents.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(failureHtml)}`
    );
  });
  const entry = {
    browserView,
    loaded: false,
    detectionTimer: null
  };
  platformViews.set(platform, entry);
  entry.detectionTimer = startAccountDetection(platform, browserView);
  return entry;
}

function openPlatformWindow(platform, portalUrl) {
  if (!isCanonicalPortal(platform, portalUrl)) {
    throw new Error('只允许打开已配置的官方创作页');
  }
  if (!mainWindow || mainWindow.isDestroyed()) {
    throw new Error('主控制台尚未准备好');
  }
  if (WEBVIEW2_PLATFORMS.has(platform)) {
    return startWebView2Platform(portalUrl);
  }
  hideWebView2Host();
  let entry = platformViews.get(platform);
  const reused = Boolean(entry);
  if (!entry || entry.browserView.webContents.isDestroyed()) {
    entry = createPlatformView(platform, portalUrl);
  }
  detachPlatformViews();
  activePlatform = platform;
  mainWindow.setBrowserView(entry.browserView);
  layoutActivePlatform();
  mainWindow.show();
  mainWindow.focus();
  updateBrowserHeader({
    platform,
    name: PLATFORM_NAMES[platform],
    status: entry.loaded ? '已切换到官方创作页' : '正在加载官方创作页…'
  });
  if (!entry.loaded) {
    entry.loaded = true;
    entry.browserView.webContents.loadURL(portalUrl).catch(() => {
      // did-fail-load renders an in-window retry page for real load failures.
    });
    capturePlatformTestImages(platform, mainWindow, entry.browserView);
  }
  return { ok: true, reused, embedded: true };
}

function startLocalServer() {
  process.env.PUBLISHING_CONSOLE_EMBEDDED = '1';
  global.sxfPublishingConsoleShutdown = () => app.quit();
  require(path.join(__dirname, '..', 'server.js'));
}

async function waitForServer(timeoutMs = 12000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${CONTROL_URL}api/dashboard`, { cache: 'no-store' });
      if (response.ok) return;
    } catch {
      // The local server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 180));
  }
  throw new Error('本地控制台启动超时');
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    show: !TEST_MODE || Boolean(TEST_CAPTURE_DIR),
    width: 1420,
    height: 930,
    minWidth: 1180,
    minHeight: 720,
    title: '多平台发文控制台',
    autoHideMenuBar: true,
    backgroundColor: '#f4f1e9',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      devTools: false
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(CONTROL_URL)) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });
  if (TEST_MODE && TEST_CAPTURE_DIR) {
    mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
      fs.mkdirSync(TEST_CAPTURE_DIR, { recursive: true });
      fs.appendFileSync(
        path.join(TEST_CAPTURE_DIR, 'main-console.log'),
        `${new Date().toISOString()} level=${level} ${sourceId}:${line} ${message}\n`,
        'utf8'
      );
    });
  }
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(CONTROL_URL)) event.preventDefault();
  });
  mainWindow.on('resize', layoutActivePlatform);
  mainWindow.on('closed', () => {
    appClosing = true;
    closeWebView2Host();
    mainWindow = null;
    for (const entry of platformViews.values()) {
      if (entry.detectionTimer) clearInterval(entry.detectionTimer);
      if (!entry.browserView.webContents.isDestroyed()) entry.browserView.webContents.close();
    }
    platformViews.clear();
  });
  mainWindow.loadURL(CONTROL_URL);
}

async function runPlatformSwitchTest(sequence, logPath) {
  const results = [];
  for (const platform of sequence) {
    if (!PLATFORM_PORTALS[platform]) continue;
    openPlatformWindow(platform, PLATFORM_PORTALS[platform]);
    await new Promise((resolve) => setTimeout(resolve, 3600));
    const attached = mainWindow.getBrowserViews();
    results.push({
      selected: platform,
      activePlatform,
      attachedViewCount: attached.length,
      attachedUrl: attached[0]?.webContents.getURL() || '',
      expectedHost: PLATFORM_HOST_SUFFIXES[platform]?.[0] || '',
      webView2Running: platform === 'zhihu'
        ? Boolean(webView2Host?.process && webView2Host.process.exitCode === null)
        : false,
      webView2Ready: platform === 'zhihu' ? Boolean(webView2Host?.ready) : false
    });
  }
  fs.writeFileSync(logPath, `${JSON.stringify(results, null, 2)}\n`, 'utf8');
}

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  ipcMain.handle('platform:open', (_event, payload) => {
    const platform = String(payload?.platform || '');
    const portalUrl = String(payload?.portalUrl || '');
    return openPlatformWindow(platform, portalUrl);
  });

  ipcMain.handle('platform:focus', (_event, payload) => {
    const platform = String(payload?.platform || '');
    const portalUrl = PLATFORM_PORTALS[platform];
    if (!portalUrl) return { ok: false };
    return openPlatformWindow(platform, portalUrl);
  });

  ipcMain.handle('platform:reload', () => {
    if (WEBVIEW2_PLATFORMS.has(activePlatform)) {
      if (sendWebView2Command(`NAVIGATE ${PLATFORM_PORTALS[activePlatform]}`)) {
        return { ok: true, webview2: true };
      }
      return startWebView2Platform(PLATFORM_PORTALS[activePlatform]);
    }
    const entry = platformViews.get(activePlatform);
    if (!entry || entry.browserView.webContents.isDestroyed()) return { ok: false };
    entry.browserView.webContents.reload();
    return { ok: true };
  });

  ipcMain.handle('platform:external', (_event, payload) => {
    const platform = String(payload?.platform || activePlatform);
    const portalUrl = PLATFORM_PORTALS[platform];
    if (!portalUrl) return { ok: false };
    shell.openExternal(portalUrl);
    updateBrowserHeader({
      platform,
      name: PLATFORM_NAMES[platform],
      status: '已在系统浏览器打开官方页面 · 右侧 WebView2 登录状态保持不变',
      webview2: WEBVIEW2_PLATFORMS.has(platform)
    });
    return { ok: true, external: true };
  });

  ipcMain.handle('file:choose-source-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择写作技能输出文件夹',
      properties: ['openDirectory']
    });
    return { canceled: result.canceled, path: result.filePaths[0] || '' };
  });

  ipcMain.handle('file:choose-images', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择文章图片',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: '图片', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }
      ]
    });
    return { canceled: result.canceled, paths: result.filePaths };
  });

  ipcMain.handle('file:open-docx', async (_event, payload) => {
    const filePath = path.resolve(String(payload?.path || ''));
    if (
      path.extname(filePath).toLowerCase() !== '.docx'
      || !filePath.startsWith(`${OPERATION_BOX_ROOT}${path.sep}`)
      || !fs.existsSync(filePath)
      || !fs.statSync(filePath).isFile()
    ) {
      return { ok: false, error: 'Word发布包路径无效或文件不存在' };
    }
    const error = await shell.openPath(filePath);
    return error ? { ok: false, error } : { ok: true, path: filePath };
  });

  ipcMain.handle('file:open-operation-folder', async (_event, payload) => {
    const folderPath = path.resolve(String(payload?.path || ''));
    if (
      !folderPath.startsWith(`${OPERATION_BOX_ROOT}${path.sep}`)
      || path.dirname(folderPath) !== OPERATION_BOX_ROOT
      || !fs.existsSync(path.join(folderPath, 'manifest.json'))
    ) {
      return { ok: false, error: '操作箱路径无效或文件夹不存在' };
    }
    const error = await shell.openPath(folderPath);
    return error ? { ok: false, error } : { ok: true, path: folderPath };
  });

  app.whenReady().then(async () => {
    app.setName('多平台发文控制台');
    startLocalServer();
    await waitForServer();
    createMainWindow();
    if (TEST_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    const testPlatform = process.env.SXF_TEST_PLATFORM;
    if (TEST_MODE && testPlatform && PLATFORM_PORTALS[testPlatform]) {
      openPlatformWindow(testPlatform, PLATFORM_PORTALS[testPlatform]);
    }
    const switchSequence = String(process.env.SXF_TEST_PLATFORM_SEQUENCE || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const switchLog = process.env.SXF_TEST_SWITCH_LOG;
    if (TEST_MODE && switchSequence.length > 0 && switchLog) {
      await runPlatformSwitchTest(switchSequence, switchLog);
    }
  }).catch((error) => {
    const failureWindow = new BrowserWindow({
      width: 620,
      height: 260,
      autoHideMenuBar: true
    });
    const message = encodeURIComponent(`多平台发文控制台启动失败：${error.message}`);
    failureWindow.loadURL(`data:text/html;charset=utf-8,<meta charset="utf-8"><body style="font-family:Microsoft YaHei;padding:36px"><h2>无法启动</h2><p>${message}</p></body>`);
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}
