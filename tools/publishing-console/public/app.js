'use strict';

const platformGrid = document.querySelector('#platform-grid');
const accountOptions = document.querySelector('#account-options');
const jobsRoot = document.querySelector('#jobs');
const form = document.querySelector('#job-form');
const formMessage = document.querySelector('#form-message');
const refreshButton = document.querySelector('#refresh-button');
const shutdownButton = document.querySelector('#shutdown-button');
const releaseDialog = document.querySelector('#release-dialog');
const releasePack = document.querySelector('#release-pack');
const dialogTitle = document.querySelector('#dialog-title');
const dialogClose = document.querySelector('#dialog-close');
const bindDialog = document.querySelector('#bind-dialog');
const bindForm = document.querySelector('#bind-form');
const bindDialogTitle = document.querySelector('#bind-dialog-title');
const bindDialogClose = document.querySelector('#bind-dialog-close');
const bindPlatform = document.querySelector('#bind-platform');
const bindDisplayName = document.querySelector('#bind-display-name');
const bindConfirmed = document.querySelector('#bind-confirmed');
const bindOpenPortal = document.querySelector('#bind-open-portal');
const bindPositioning = document.querySelector('#bind-positioning');
const bindMessage = document.querySelector('#bind-message');
const bindSubmit = document.querySelector('#bind-submit');
const browserPlatformMark = document.querySelector('#browser-platform-mark');
const browserPlatformName = document.querySelector('#browser-platform-name');
const browserPlatformStatus = document.querySelector('#browser-platform-status');
const browserReload = document.querySelector('#browser-reload');
const browserExternal = document.querySelector('#browser-external');
const choosePackageButton = document.querySelector('#choose-package');
const chooseImagesButton = document.querySelector('#choose-images');
const selectedImagesRoot = document.querySelector('#selected-images');
const sourceModeInputs = [...document.querySelectorAll('input[name="input_type"]')];
const urlSourceFields = document.querySelector('#url-source-fields');
const packageSourceFields = document.querySelector('#package-source-fields');
const urlImageFields = document.querySelector('#url-image-fields');
const browserPlaceholderTitle = document.querySelector('#browser-placeholder-title');
const browserPlaceholderText = document.querySelector('#browser-placeholder-text');

let dashboardPlatforms = [];
const desktopMode = Boolean(window.sxfDesktop?.isDesktop);
let activePlatformId = '';
let selectedImagePaths = [];

if (desktopMode) document.body.classList.add('desktop-mode');

const platformMarks = {
  'wechat-official-account': '微',
  toutiao: '头',
  dingduan: '顶',
  baijiahao: '百',
  penguin: '企',
  zhihu: '知'
};
const platformPositioning = {
  toutiao: '企业文章账号：事实和争议前置，发布篮球教培与青少年篮球内容。',
  dingduan: '企业文章账号：强调真实地域、行业或生活关联，不虚构本地角度。',
  baijiahao: '企业文章账号：围绕明确搜索问题组织标题和正文。',
  penguin: '企业资讯账号：新闻式开头，提高事实与信息密度。',
  zhihu: '问答账号：结论先行，提供证据边界并回应主要异议。'
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function statusText(platform) {
  if (platform.session_authenticated && platform.content_profile_available) return '已登录 · 写作规则可用';
  if (platform.session_authenticated) return '已登录 · 等待写作规则';
  if (platform.configured && platform.content_profile_available) return '账号已绑定 · 登录待确认 · 写作规则可用';
  if (platform.configured) return '账号已绑定 · 登录待确认';
  if (platform.content_profile_available) return '未登录 · 写作规则可用';
  return '等待登录与配置';
}

function renderPlatforms(platforms) {
  platformGrid.innerHTML = platforms.map((platform) => {
    const account = platform.accounts[0];
    let secondaryAction = '';
    if (platform.id === 'wechat-official-account' && platform.enabled) {
      secondaryAction = `<button class="account-edit" data-check-account="${escapeHtml(account.id)}" type="button">检测</button>`;
    } else if (platform.id !== 'wechat-official-account') {
      secondaryAction = `<button class="account-edit" data-bind-platform="${escapeHtml(platform.id)}" type="button">修正</button>`;
    }
    return `
      <article class="platform-card ${platform.enabled || platform.session_authenticated ? 'enabled' : ''} ${activePlatformId === platform.id ? 'active' : ''}" data-platform-card="${escapeHtml(platform.id)}">
        <div class="platform-mark">${platformMarks[platform.id] || '稿'}</div>
        <div class="platform-content">
          <div class="platform-title">
            <h3>${escapeHtml(platform.name)}</h3>
            <span class="status-dot"></span>
          </div>
          <p>${escapeHtml(account?.display_name || (platform.session_authenticated ? '已登录，账号名待确认' : '登录后自动绑定'))}</p>
          <small>${escapeHtml(statusText(platform))} · ${escapeHtml(platform.route)}</small>
        </div>
        <div class="account-actions">
          <button class="account-action" data-open-platform="${escapeHtml(platform.id)}" type="button">${platform.configured || platform.session_authenticated ? '打开' : '登录'}</button>
          ${secondaryAction}
        </div>
      </article>
    `;
  }).join('');

  for (const card of platformGrid.querySelectorAll('[data-platform-card]')) {
    card.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      openPlatform(card.dataset.platformCard).catch(showPlatformError);
    });
  }
  for (const button of platformGrid.querySelectorAll('[data-open-platform]')) {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      openPlatform(button.dataset.openPlatform).catch(showPlatformError);
    });
  }
  for (const button of platformGrid.querySelectorAll('[data-check-account]')) {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      checkAccount(button);
    });
  }
  for (const button of platformGrid.querySelectorAll('[data-bind-platform]')) {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      openBindDialog(button.dataset.bindPlatform);
    });
  }
}

function openBindDialog(platformId) {
  const platform = dashboardPlatforms.find((item) => item.id === platformId);
  if (!platform) return;
  const account = platform.accounts[0];
  bindPlatform.value = platformId;
  bindDialogTitle.textContent = `绑定${platform.name}`;
  bindDisplayName.value = account?.display_name || '';
  bindConfirmed.checked = false;
  bindPositioning.textContent = platformPositioning[platformId] || '';
  bindMessage.textContent = '';
  bindMessage.className = 'form-message';
  bindSubmit.textContent = account ? '更新绑定' : '保存绑定';
  bindOpenPortal.textContent = desktopMode ? '① 打开内置登录页' : '① 打开官方登录页';
  bindDialog.showModal();
  setTimeout(() => bindOpenPortal.focus(), 50);
}

function renderAccountOptions(platforms) {
  const accounts = platforms.flatMap((platform) => platform.accounts)
    .filter((account) => account.enabled && account.content_profile_available);
  accountOptions.innerHTML = accounts.length
    ? accounts.map((account) => `
      <label class="check-option">
        <input type="checkbox" name="account_id" value="${escapeHtml(account.id)}" checked>
        <span>${escapeHtml(account.display_name || account.profile_display_name)}</span>
        <small>${escapeHtml(account.platform)}</small>
      </label>
    `).join('')
    : '<p class="empty">尚无可用账号。</p>';
}

function renderJobs(jobs) {
  if (!jobs.length) {
    jobsRoot.innerHTML = `
      <div class="empty-state">
        <strong>还没有正式操作箱</strong>
        <span>粘贴公开文章链接，或导入写作技能生成的文章图片文件夹。</span>
      </div>
    `;
    return;
  }
  jobsRoot.innerHTML = jobs.map((job) => {
    const statusLabels = {
      queued: '待改写',
      adapted: '已改写',
      docx_created: 'Word已生成',
      validated: '可人工发布',
      failed: '处理失败',
      skipped: '已跳过'
    };
    const status = Object.entries(job.counts || {})
      .map(([key, count]) => `${statusLabels[key] || key} ${count}`)
      .join(' · ');
    const sourceLabel = job.input_type === 'skill_package' ? '技能文件夹' : '公开链接';
    return `
      <article class="job-row">
        <div>
          <strong>${escapeHtml(job.title)}</strong>
          <span>${escapeHtml(sourceLabel)} · ${escapeHtml(job.job_id)}</span>
        </div>
        <div class="job-meta">
          <span>${escapeHtml(status || '待改写')}</span>
          <time>${formatDate(job.created_at)}</time>
          <button class="pack-button" data-job-id="${escapeHtml(job.job_id)}">${job.ready ? '查看发布包' : '查看任务'}</button>
        </div>
      </article>
    `;
  }).join('');
  for (const button of jobsRoot.querySelectorAll('[data-job-id]')) {
    button.addEventListener('click', () => {
      openReleasePack(button.dataset.jobId).catch(showReleasePackError);
    });
  }
}

function showReleasePackError(error) {
  dialogTitle.textContent = '发布包打开失败';
  releasePack.innerHTML = `
    <div class="waiting-pack">
      <strong>暂时无法打开发布包</strong>
      <span>${escapeHtml(error?.message || '请刷新任务后重试')}</span>
    </div>
  `;
  if (!releaseDialog.open) releaseDialog.showModal();
}

function setBrowserHeader(platformId, status) {
  const platform = dashboardPlatforms.find((item) => item.id === platformId);
  activePlatformId = platformId;
  browserPlatformMark.textContent = platformMarks[platformId] || '台';
  browserPlatformName.textContent = platform?.name || '官方创作后台';
  browserPlatformStatus.textContent = status || '右侧显示该平台的官方创作后台';
  browserExternal.hidden = platformId !== 'zhihu';
  for (const card of platformGrid.querySelectorAll('[data-platform-card]')) {
    card.classList.toggle('active', card.dataset.platformCard === platformId);
  }
}

function showBrowserPlaceholder(platformId, mode) {
  if (!browserPlaceholderTitle || !browserPlaceholderText) return;
  if (mode === 'external' && platformId === 'zhihu') {
    browserPlaceholderTitle.textContent = '知乎已在系统浏览器打开';
    browserPlaceholderText.textContent = '请在系统浏览器完成安全验证、登录、内容核对和手动发布。登录后可返回左侧点击“修正”填写账号名称。';
    return;
  }
  if (mode === 'webview2' && platformId === 'zhihu') {
    browserPlaceholderTitle.textContent = '正在启动知乎 WebView2';
    browserPlaceholderText.textContent = '登录页将在右侧显示；如平台临时拒绝加载，可点击右上角“浏览器兜底”。';
    return;
  }
  browserPlaceholderTitle.textContent = '正在打开官方页面';
  browserPlaceholderText.textContent = '页面加载完成后会显示在这里。';
}

function showPlatformError(error) {
  browserPlatformStatus.textContent = error.message || '平台页面打开失败';
  browserPlatformStatus.classList.add('error-text');
}

async function openPlatform(platform) {
  const platformConfig = dashboardPlatforms.find((item) => item.id === platform);
  if (!platformConfig) throw new Error('平台配置不存在');
  setBrowserHeader(platform, '正在打开官方创作后台…');
  showBrowserPlaceholder(platform, platform === 'zhihu' ? 'webview2' : 'loading');
  let popup = null;
  let browserOpened = false;
  if (desktopMode && platformConfig?.portal_url) {
    await window.sxfDesktop.openPlatform(platform, platformConfig.portal_url);
    browserOpened = true;
  } else if (platformConfig?.portal_url) {
    popup = window.open(platformConfig.portal_url, '_blank');
    if (popup) {
      popup.opener = null;
      browserOpened = true;
    }
  }
  const response = await fetch('/api/open-platform', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform, browser_opened: browserOpened })
  });
  const data = await response.json();
  if (!response.ok && popup) popup.close();
  if (!response.ok) throw new Error(data.error || '无法打开平台');
  browserPlatformStatus.classList.remove('error-text');
  return data;
}

async function copyText(value, button) {
  await navigator.clipboard.writeText(value || '');
  const original = button.textContent;
  button.textContent = '已复制';
  setTimeout(() => { button.textContent = original; }, 1400);
}

async function openReleasePack(jobId) {
  const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '发布包读取失败');
  dialogTitle.textContent = data.job.title;
  const sourceLabel = data.job.input_type === 'skill_package'
    ? '写作技能输出文件夹'
    : '公开文章链接';
  const warningHtml = data.job.warnings.length
    ? `<div class="release-warnings">${data.job.warnings.map((warning) => `<span>${escapeHtml(warning)}</span>`).join('')}</div>`
    : '';
  const imageHtml = data.job.images?.length
    ? `
      <section class="release-image-section">
        <div class="release-image-heading">
          <strong>文章图片</strong>
          <span>共 ${data.job.images.length} 张；每个平台的 Word 发布包已嵌入其中适用的3张图片。</span>
        </div>
        <div class="release-image-grid">
          ${data.job.images.map((image) => `
            <figure>
              <img src="${escapeHtml(image.preview_url)}" alt="${escapeHtml(image.alt_text)}" loading="lazy">
              <figcaption>${escapeHtml(image.caption || image.credit || image.alt_text)}</figcaption>
            </figure>
          `).join('')}
        </div>
      </section>
    `
    : `
      <div class="release-warnings">
        <span>当前任务没有可预览图片，请打开 Word 发布包核对嵌图。</span>
      </div>
    `;
  releasePack.innerHTML = `
    <div class="release-overview">
      <strong>${escapeHtml(sourceLabel)}</strong>
      <span>${escapeHtml(data.job.source_url || data.job.source_folder || '')}</span>
      <small>操作箱：${escapeHtml(data.job.job_path)}</small>
      <button class="open-job-folder" data-open-job-folder="${escapeHtml(data.job.job_id)}">打开操作箱文件夹</button>
    </div>
    ${warningHtml}
    ${imageHtml}
    ${data.job.accounts.map((account) => `
    <article class="release-account">
      <div class="release-account-title">
        <div>
          <strong>${escapeHtml(account.id)}</strong>
          <span>${escapeHtml(account.platform)} · ${account.ready_for_release ? '已验证，可人工发布' : '正在等待改写或检查'}</span>
        </div>
        ${account.ready_for_release ? `
          <div class="release-account-actions">
            <button data-open-docx="${escapeHtml(account.id)}" data-docx-path="${escapeHtml(account.docx_path || '')}">打开带图Word</button>
            <button class="prepare-release-button" data-prepare-release="${escapeHtml(account.id)}" data-release-platform="${escapeHtml(account.platform)}" data-docx-path="${escapeHtml(account.docx_path || '')}">一键准备发布</button>
          </div>
        ` : ''}
      </div>
      ${account.ready_for_release ? `
        <label>标题</label>
        <div class="copy-field">
          <input type="text" readonly value="${escapeHtml(account.title)}">
          <button data-copy-value="${escapeHtml(account.title)}">复制标题</button>
        </div>
        <label>正文</label>
        <div class="copy-field body-field">
          <textarea readonly>${escapeHtml(account.article)}</textarea>
          <button data-copy-body>复制正文</button>
        </div>
        ${account.docx_path ? `<p class="docx-path">Word发布包：${escapeHtml(account.docx_path)}</p>` : ''}
        <div class="manual-checks">
          <span>□ 人工登录</span>
          <span>□ 核对封面与分类</span>
          <span>□ 完成平台声明</span>
          <span>□ 预览后手动发布</span>
        </div>
      ` : `
        <div class="waiting-pack">
          <strong>当前状态：${escapeHtml(account.status)}</strong>
          <span>在 Codex 对话中说“处理最新操作箱”，完成平台化改写、图片嵌入和Word视觉检查后，这里才会出现可复制正文。</span>
        </div>
      `}
    </article>
  `).join('')}`;
  for (const accountRoot of releasePack.querySelectorAll('.release-account')) {
    const titleButton = accountRoot.querySelector('[data-copy-value]');
    const bodyButton = accountRoot.querySelector('[data-copy-body]');
    const docxButton = accountRoot.querySelector('[data-open-docx]');
    const prepareButton = accountRoot.querySelector('[data-prepare-release]');
    if (titleButton) {
      titleButton.addEventListener('click', () => copyText(titleButton.dataset.copyValue, titleButton));
    }
    if (bodyButton) {
      bodyButton.addEventListener('click', () => copyText(accountRoot.querySelector('textarea').value, bodyButton));
    }
    if (docxButton) {
      docxButton.addEventListener('click', async () => {
        try {
          await openAccountDocx(
            data.job.job_id,
            docxButton.dataset.openDocx,
            docxButton,
            docxButton.dataset.docxPath
          );
        } catch (error) {
          docxButton.textContent = '打开失败';
          docxButton.title = error.message || '无法打开带图Word';
        }
      });
    }
    if (prepareButton) {
      prepareButton.addEventListener('click', async () => {
        const originalText = prepareButton.textContent;
        prepareButton.disabled = true;
        prepareButton.textContent = '正在准备…';
        try {
          await openAccountDocx(
            data.job.job_id,
            prepareButton.dataset.prepareRelease,
            null,
            prepareButton.dataset.docxPath
          );
          if (desktopMode) releaseDialog.close();
          await openPlatform(prepareButton.dataset.releasePlatform);
        } catch (error) {
          prepareButton.textContent = '准备失败';
          prepareButton.title = error.message || '无法准备发布素材';
          return;
        } finally {
          prepareButton.disabled = false;
          if (prepareButton.textContent !== '准备失败') prepareButton.textContent = originalText;
        }
      });
    }
  }
  const openJobFolderButton = releasePack.querySelector('[data-open-job-folder]');
  openJobFolderButton?.addEventListener('click', async () => {
    try {
      if (desktopMode && window.sxfDesktop?.openOperationFolder) {
        const result = await window.sxfDesktop.openOperationFolder(data.job.job_path);
        if (!result?.ok) throw new Error(result?.error || '无法打开操作箱文件夹');
      } else {
        const response = await fetch('/api/open-job-folder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_id: openJobFolderButton.dataset.openJobFolder })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || '无法打开操作箱文件夹');
      }
      openJobFolderButton.textContent = '文件夹已打开';
      setTimeout(() => {
        openJobFolderButton.textContent = '打开操作箱文件夹';
      }, 1500);
    } catch (error) {
      openJobFolderButton.textContent = '打开失败，请重试';
      openJobFolderButton.title = error.message || '无法打开操作箱文件夹';
    }
  });
  releaseDialog.showModal();
}

async function openAccountDocx(jobId, accountId, button, docxPath) {
  if (desktopMode && window.sxfDesktop?.openDocx) {
    const result = await window.sxfDesktop.openDocx(docxPath);
    if (!result?.ok) throw new Error(result?.error || '无法打开带图Word');
    if (button) {
      const originalText = button.textContent;
      button.textContent = 'Word已打开';
      setTimeout(() => {
        button.textContent = originalText;
      }, 1500);
    }
    return result;
  }
  const response = await fetch('/api/open-account-docx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: jobId, account_id: accountId })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || '无法打开带图Word');
  if (button) {
    const originalText = button.textContent;
    button.textContent = 'Word已打开';
    setTimeout(() => {
      button.textContent = originalText;
    }, 1500);
  }
  return result;
}

async function loadDashboard() {
  const response = await fetch('/api/dashboard', { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '控制台读取失败');
  dashboardPlatforms = data.platforms;
  renderPlatforms(data.platforms);
  renderAccountOptions(data.platforms);
  renderJobs(data.jobs);
  document.querySelector('#configured-count').textContent =
    data.platforms.filter((platform) => platform.configured).length;
  document.querySelector('#enabled-count').textContent =
    data.platforms.filter((platform) => platform.enabled).length;
  document.querySelector('#job-count').textContent = data.jobs.length;
  document.querySelector('#app-version').textContent = `v${data.app_version || '—'}`;
  document.querySelector('#operation-box-path').textContent = data.operation_box_root;
  if (desktopMode) {
    const notice = document.querySelector('.bind-notice span');
    if (notice) {
      notice.textContent = '平台会显示在右侧内置浏览器中。你手动登录后，控制台自动识别页面显示的账号名称；此表单仅用于识别失败时手动修正。';
    }
  }
}

function renderSelectedImages() {
  selectedImagesRoot.innerHTML = selectedImagePaths.length
    ? selectedImagePaths.map((imagePath) => {
      const fileName = imagePath.split(/[\\/]/).pop();
      return `<span title="${escapeHtml(imagePath)}">${escapeHtml(fileName)}</span>`;
    }).join('')
    : '<span>尚未选择图片</span>';
}

choosePackageButton.addEventListener('click', async () => {
  if (!desktopMode) return;
  const result = await window.sxfDesktop.chooseSourceFolder();
  if (!result.canceled && result.path) {
    document.querySelector('#source-folder').value = result.path;
  }
});

function updateSourceMode() {
  const inputType = sourceModeInputs.find((input) => input.checked)?.value || 'public_url';
  const isPackage = inputType === 'skill_package';
  urlSourceFields.hidden = isPackage;
  urlImageFields.hidden = isPackage;
  packageSourceFields.hidden = !isPackage;
  document.querySelector('#source-url').required = !isPackage;
  document.querySelector('#source-folder').required = isPackage;
  for (const input of sourceModeInputs) {
    input.closest('.source-mode-option')?.classList.toggle('active', input.checked);
  }
}

for (const input of sourceModeInputs) input.addEventListener('change', updateSourceMode);
updateSourceMode();

chooseImagesButton.addEventListener('click', async () => {
  if (!desktopMode) return;
  const result = await window.sxfDesktop.chooseImages();
  if (!result.canceled) {
    selectedImagePaths = result.paths || [];
    renderSelectedImages();
  }
});

browserReload.addEventListener('click', async () => {
  if (!desktopMode || !activePlatformId) return;
  browserReload.disabled = true;
  try {
    await window.sxfDesktop.reloadPlatform();
  } finally {
    setTimeout(() => { browserReload.disabled = false; }, 800);
  }
});

browserExternal.addEventListener('click', async () => {
  if (!desktopMode || activePlatformId !== 'zhihu') return;
  browserExternal.disabled = true;
  try {
    await window.sxfDesktop.openPlatformExternal(activePlatformId);
  } finally {
    setTimeout(() => { browserExternal.disabled = false; }, 800);
  }
});

if (desktopMode) {
  window.sxfDesktop.onPlatformStatus((payload) => {
    if (!payload?.platform) return;
    setBrowserHeader(payload.platform, payload.status);
    showBrowserPlaceholder(
      payload.platform,
      payload.external ? 'external' : (payload.webview2 ? 'webview2' : 'loading')
    );
    browserPlatformStatus.classList.toggle('error-text', Boolean(payload.error));
  });
  window.sxfDesktop.onPlatformBound(async (payload) => {
    if (!payload?.platform) return;
    if (payload.active || activePlatformId === payload.platform) {
      setBrowserHeader(payload.platform, payload.message || `已自动绑定：${payload.displayName}`);
    }
    await loadDashboard();
    if (bindDialog.open && bindPlatform.value === payload.platform) {
      bindDisplayName.value = payload.displayName;
      bindConfirmed.checked = true;
      bindMessage.textContent = payload.message;
      bindMessage.className = 'form-message success-text';
      setTimeout(() => bindDialog.close(), 900);
    }
  });
  window.sxfDesktop.onPlatformSession((payload) => {
    if (!payload?.platform || !payload.authenticated) return;
    const platform = dashboardPlatforms.find((item) => item.id === payload.platform);
    if (!platform) return;
    platform.session_authenticated = true;
    renderPlatforms(dashboardPlatforms);
    if (payload.active || activePlatformId === payload.platform) {
      setBrowserHeader(payload.platform, payload.message || '已确认登录会话');
    }
  });
}

bindOpenPortal.addEventListener('click', async () => {
  const original = bindOpenPortal.textContent;
  bindOpenPortal.disabled = true;
  bindOpenPortal.textContent = '正在打开官方页面…';
  try {
    await openPlatform(bindPlatform.value);
    bindOpenPortal.textContent = '官方页面已打开';
  } catch (error) {
    bindMessage.textContent = error.message;
    bindMessage.className = 'form-message error-text';
    bindOpenPortal.textContent = original;
  } finally {
    setTimeout(() => {
      bindOpenPortal.disabled = false;
      if (bindOpenPortal.textContent === '官方页面已打开') {
        bindOpenPortal.textContent = '再次打开官方登录页';
      }
    }, 1400);
  }
});

bindForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  bindMessage.textContent = '';
  bindSubmit.disabled = true;
  const original = bindSubmit.textContent;
  bindSubmit.textContent = '正在保存…';
  try {
    const response = await fetch('/api/bind-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: bindPlatform.value,
        display_name: bindDisplayName.value.trim(),
        confirmed_manual_login: bindConfirmed.checked
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '绑定保存失败');
    bindMessage.textContent = data.message;
    bindMessage.className = 'form-message success-text';
    await loadDashboard();
    setTimeout(() => bindDialog.close(), 650);
  } catch (error) {
    bindMessage.textContent = error.message;
    bindMessage.className = 'form-message error-text';
  } finally {
    bindSubmit.disabled = false;
    bindSubmit.textContent = original;
  }
});

async function checkAccount(button) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = '检测中…';
  try {
    const response = await fetch('/api/check-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: button.dataset.checkAccount })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '连接检测失败');
    button.textContent = `可用 · 草稿 ${data.details.draft_count ?? '—'}`;
    button.classList.add('success');
  } catch (error) {
    button.textContent = '检测失败';
    button.title = error.message;
    button.classList.add('failed');
  } finally {
    setTimeout(() => {
      button.disabled = false;
      if (!button.classList.contains('success')) button.textContent = original;
    }, 2500);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  formMessage.textContent = '';
  const inputType = sourceModeInputs.find((input) => input.checked)?.value || 'public_url';
  const title = document.querySelector('#master-title').value.trim();
  const sourceUrl = document.querySelector('#source-url').value.trim();
  const sourceFolder = document.querySelector('#source-folder').value.trim();
  const accountIds = [...form.querySelectorAll('input[name="account_id"]:checked')]
    .map((input) => input.value);
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  submit.textContent = '正在创建…';
  try {
    const response = await fetch('/api/create-job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input_type: inputType,
        title,
        source_url: sourceUrl,
        source_folder: sourceFolder,
        account_ids: accountIds,
        image_paths: inputType === 'public_url' ? selectedImagePaths : []
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '创建失败');
    formMessage.textContent = `已放入待改写操作箱，导入图片 ${data.imported_image_count || 0} 张。下一步：在 Codex 对话中说“处理最新操作箱”。`;
    formMessage.className = 'form-message success-text';
    selectedImagePaths = [];
    renderSelectedImages();
    await loadDashboard();
  } catch (error) {
    formMessage.textContent = error.message;
    formMessage.className = 'form-message error-text';
  } finally {
    submit.disabled = false;
    submit.textContent = '放入待改写操作箱';
  }
});

refreshButton.addEventListener('click', () => loadDashboard().catch((error) => {
  jobsRoot.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
}));

shutdownButton.addEventListener('click', async () => {
  shutdownButton.disabled = true;
  shutdownButton.textContent = '正在退出…';
  try {
    await fetch('/api/shutdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    document.body.innerHTML = `
      <div class="shutdown-screen">
        <strong>控制台已退出</strong>
        <span>现在可以关闭这个页面。</span>
      </div>
    `;
  } catch {
    shutdownButton.disabled = false;
    shutdownButton.textContent = '退出控制台';
  }
});

dialogClose.addEventListener('click', () => releaseDialog.close());
releaseDialog.addEventListener('click', (event) => {
  if (event.target === releaseDialog) releaseDialog.close();
});
bindDialogClose.addEventListener('click', () => bindDialog.close());
bindDialog.addEventListener('click', (event) => {
  if (event.target === bindDialog) bindDialog.close();
});

loadDashboard().catch((error) => {
  platformGrid.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
});
