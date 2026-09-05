#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');

const HOST = '127.0.0.1';
const PORT = Number(process.env.PUBLISHING_CONSOLE_PORT || 4318);
const PUBLIC_ROOT = path.join(__dirname, 'public');
const APP_VERSION = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')).version;
  } catch {
    return 'unknown';
  }
})();
const SKILL_ROOT = process.env.PUBLISH_SKILL_ROOT
  || 'C:\\Users\\15043\\.codex\\skills\\publish-multi-account-content';
const ACCOUNTS_FILE = path.join(SKILL_ROOT, 'references', 'accounts.json');
const CREATE_JOB_SCRIPT = path.join(SKILL_ROOT, 'scripts', 'create_distribution_job.js');
const IMPORT_PACKAGE_SCRIPT = path.join(SKILL_ROOT, 'scripts', 'import_source_package.js');
const VALIDATE_ACCOUNTS_SCRIPT = path.join(SKILL_ROOT, 'scripts', 'validate_account_profiles.js');
const WECHAT_TOOL_ROOT = process.env.WECHAT_TOOL_ROOT
  || 'E:\\Documents\\sxf-basketball\\tools\\wechat-official';
const LOCAL_STATE_ROOT = process.env.SXF_PUBLISHING_STATE_ROOT
  || path.join(
    process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '.', 'AppData', 'Local'),
    'SxfPublishingConsole'
  );
const ACCOUNT_BINDINGS_FILE = path.join(LOCAL_STATE_ROOT, 'account-bindings.json');
const PLATFORM_CATALOG = [
  { id: 'wechat-official-account', name: '微信公众号', route: '官方草稿接口', portal_url: 'https://mp.weixin.qq.com/' },
  { id: 'toutiao', name: '头条号', route: '手动发布包', portal_url: 'https://mp.toutiao.com/' },
  { id: 'dingduan', name: '顶端号', route: '手动发布包', portal_url: 'https://mp.topnews.cn/#/index' },
  { id: 'baijiahao', name: '百家号', route: '手动发布包', portal_url: 'https://baijiahao.baidu.com/' },
  { id: 'penguin', name: '企鹅号', route: '手动发布包', portal_url: 'https://om.qq.com/' },
  { id: 'zhihu', name: '知乎', route: '手动发布包', portal_url: 'https://www.zhihu.com/creator' }
];
const COMPLIANCE_POLICY = Object.freeze({
  mode: 'human_publish',
  allow_official_draft_api: true,
  allow_open_canonical_portal: true,
  allow_browser_autofill: false,
  allow_browser_submit: false,
  allow_captcha_automation: false,
  allow_cookie_access: false,
  require_human_login: true,
  require_human_declarations: true,
  require_human_preview: true,
  require_human_publish: true
});
const PLATFORM_PROFILE_RULES = Object.freeze({
  toutiao: {
    positioning: '企业文章账号，发布篮球教培、青少年篮球、赛事与行业观点内容。',
    format_id: 'enterprise-article',
    purpose: '用事实前置、冲突清楚的文章解释篮球教培和青少年篮球话题。',
    title_template: '核心事实、明确对象和现实影响前置，避免悬念标题',
    word_count: { min: 800, max: 1600 }
  },
  dingduan: {
    positioning: '企业文章账号，发布具有真实地域、行业或生活关联的篮球教培内容。',
    format_id: 'enterprise-article',
    purpose: '结合真实事件的地域与行业关联，提供篮球教培判断和方法。',
    title_template: '真实地点或事件加明确行业问题，不虚构本地角度',
    word_count: { min: 800, max: 1600 }
  },
  baijiahao: {
    positioning: '企业文章账号，围绕篮球教培和青少年篮球问题提供搜索友好的专业内容。',
    format_id: 'enterprise-article',
    purpose: '围绕明确搜索问题组织独立完整的小标题和答案。',
    title_template: '明确实体加核心问题，标题与搜索意图一致',
    word_count: { min: 900, max: 1800 }
  },
  penguin: {
    positioning: '企业资讯文章账号，发布篮球教培、青少年赛事和行业观察内容。',
    format_id: 'enterprise-news-article',
    purpose: '采用新闻式开头和较高信息密度，清楚交代人物、事件和影响。',
    title_template: '事件主体加关键事实或影响，避免空泛判断',
    word_count: { min: 800, max: 1600 }
  },
  zhihu: {
    positioning: '篮球教培问答账号，围绕青少年篮球、训练、赛事和机构经营回答具体问题。',
    format_id: 'question-answer',
    purpose: '先给结论，再给证据边界、现实分析并回应主要异议。',
    title_template: '可以被直接回答的清晰问题',
    word_count: { min: 1000, max: 2200 }
  }
});

function readAccountsConfig() {
  return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
}

function readAccountBindings() {
  if (!fs.existsSync(ACCOUNT_BINDINGS_FILE)) {
    return { binding_version: 1, accounts: {} };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(ACCOUNT_BINDINGS_FILE, 'utf8'));
    return {
      binding_version: 1,
      accounts: parsed.accounts && typeof parsed.accounts === 'object'
        ? parsed.accounts
        : {}
    };
  } catch {
    return { binding_version: 1, accounts: {} };
  }
}

function writeAccountBindings(bindings) {
  fs.mkdirSync(LOCAL_STATE_ROOT, { recursive: true });
  const tempFile = `${ACCOUNT_BINDINGS_FILE}.tmp`;
  fs.writeFileSync(tempFile, `${JSON.stringify(bindings, null, 2)}\n`, 'utf8');
  fs.copyFileSync(tempFile, ACCOUNT_BINDINGS_FILE);
  fs.unlinkSync(tempFile);
}

function getOperationBoxRoot(accounts, configuredRoot) {
  const configured = accounts.find((account) => account.delivery?.operation_box_root);
  return process.env.OPERATION_BOX_ROOT
    || configuredRoot
    || configured?.delivery.operation_box_root
    || 'C:\\Users\\15043\\Documents\\Codex\\content-operation-box';
}

function createBoundProfile(
  platform,
  displayName,
  operationBoxRoot,
  storageRoot,
  bindingMode = 'manual-confirmation'
) {
  const catalog = PLATFORM_CATALOG.find((item) => item.id === platform);
  const rules = PLATFORM_PROFILE_RULES[platform];
  if (!catalog || !rules) throw new Error('该平台暂不支持本地绑定');
  return {
    id: `basketball-${platform}`,
    enabled: true,
    display_name: displayName,
    platform,
    positioning: rules.positioning,
    audience: [
      '篮球培训机构创始人和校长',
      '校区运营、招生和教务负责人',
      '教练负责人和一线教练',
      '关注青少年篮球训练与赛事的家长和从业者'
    ],
    topic_mode: 'shared_adapted',
    topic_policy: {
      trend_window_days: 7,
      include: [
        '篮球教培',
        '青少年篮球',
        '赛事与训练',
        '招生续费与家长沟通',
        '教练与校区经营',
        '安全与合规'
      ],
      exclude: [
        '无关热搜',
        '夸张标题党',
        '未经核实的数据和案例',
        '虚构本地经历或采访'
      ]
    },
    formats: [
      {
        id: rules.format_id,
        purpose: rules.purpose,
        word_count: rules.word_count,
        title_template: rules.title_template
      }
    ],
    voice: {
      use: ['自然中文', '事实清楚', '短段落', '具体判断'],
      avoid: ['机械排比', '空泛成功学', 'AI模板腔', '硬性站外引流']
    },
    sourcing_policy: {
      priority: [
        '赛事主办方、运营方或权利方公开页面',
        '专业体育媒体、主流新闻媒体和教育行业媒体',
        '政府、体育主管部门和教育部门公开资料'
      ],
      minimum_sources_for_decisive_claim: 2,
      requirements: [
        '保留来源、发布日期和证据边界',
        '涉及数据比较时重新核算',
        '不得把单一事件推导为全国趋势'
      ]
    },
    editorial_policy: {
      one_sentence_thesis: true,
      anti_slop_skill: 'stop-slop-zh',
      anti_slop_score_min: 43,
      required_reader_value: [
        '至少一个及时且可核对的事实',
        '一个与平台读者直接相关的判断',
        '一项可执行建议或观察标准'
      ],
      reject: [
        '没有证据承托的趋势判断',
        '用反问句替代论证',
        '仅做同义替换的平台改写',
        '携带微信公众号专属卡片或二维码'
      ]
    },
    benchmark_policy: {
      enabled: false,
      candidate_count: 0,
      recency_days: 90,
      excluded_formats: []
    },
    visual_policy: {
      cover: '优先复用来源清楚、适合该平台比例的真实事件图片。',
      body_images: '只使用来源明确、允许转载或用户授权的真实图片；保留署名。',
      external_promotion: '不携带微信公众号小程序卡片、二维码或其他平台专属尾图。',
      watermark_policy: '不得裁切、遮挡或擦除水印。'
    },
    storage: {
      root: storageRoot,
      daily_directory: '{M}月{D}日文章',
      subdirectories: ['文字稿', '图片素材', '资料来源']
    },
    delivery: {
      mode: 'manual_release_pack',
      permission_mode: 'review_then_publish',
      route: 'browser',
      route_tested: false,
      portal_url: catalog.portal_url,
      operation_box_root: operationBoxRoot,
      auto_publish: false
    },
    schedule: {
      timezone: 'Asia/Shanghai',
      start_time: '10:00'
    },
    monitoring: {
      completion_scope: 'release-pack-and-assets',
      alert_time: '11:30'
    },
    secret_env_names: [],
    binding: {
      mode: bindingMode,
      credentials_stored: false,
      cookies_read: false,
      bound_at: new Date().toISOString()
    }
  };
}

async function saveBoundAccount(
  platform,
  displayName,
  accounts,
  _operationBoxRoot,
  bindingMode = 'manual-confirmation'
) {
  const catalog = PLATFORM_CATALOG.find((item) => item.id === platform);
  if (!catalog) throw new Error('该平台暂不支持本地绑定');
  const bindings = readAccountBindings();
  const existing = bindings.accounts[platform] || {};
  const binding = {
    platform,
    display_name: displayName,
    mode: bindingMode,
    bound_at: new Date().toISOString(),
    first_bound_at: existing.first_bound_at || new Date().toISOString(),
    credentials_stored: false,
    cookies_read: false,
    session_partition: `persist:sxf-${platform}`
  };
  bindings.accounts[platform] = binding;
  writeAccountBindings(bindings);
  const profile = accounts.find((account) => account.platform === platform);
  return safeAccount(
    profile || {
      id: `binding-${platform}`,
      enabled: false,
      display_name: catalog.name,
      platform,
      positioning: '',
      audience: []
    },
    binding,
    Boolean(profile)
  );
}

function validateImagePaths(imagePaths) {
  if (!Array.isArray(imagePaths)) return [];
  if (imagePaths.length > 30) throw new Error('单个发布包最多导入30张图片');
  const supported = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
  return imagePaths.map((value) => {
    const imagePath = path.resolve(String(value || ''));
    if (!path.isAbsolute(imagePath) || !fs.existsSync(imagePath) || !fs.statSync(imagePath).isFile()) {
      throw new Error(`图片文件不存在：${value}`);
    }
    if (!supported.has(path.extname(imagePath).toLowerCase())) {
      throw new Error(`不支持的图片格式：${path.basename(imagePath)}`);
    }
    if (fs.statSync(imagePath).size > 20 * 1024 * 1024) {
      throw new Error(`图片超过20MB：${path.basename(imagePath)}`);
    }
    return imagePath;
  });
}

function importJobImages(jobPath, imagePaths) {
  if (imagePaths.length === 0) return [];
  const jobRoot = path.resolve(jobPath);
  const imageRoot = path.join(jobRoot, 'assets', 'images');
  const manifestPath = path.join(jobRoot, 'manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error('操作箱清单不存在，无法导入图片');
  fs.mkdirSync(imageRoot, { recursive: true });
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const imported = imagePaths.map((sourcePath, index) => {
    const extension = path.extname(sourcePath).toLowerCase();
    const base = path.basename(sourcePath, extension)
      .normalize('NFKC')
      .replace(/[^\p{L}\p{N}._-]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || `image-${index + 1}`;
    let fileName = `${String(index + 1).padStart(2, '0')}-${base}${extension}`;
    let destination = path.join(imageRoot, fileName);
    let suffix = 2;
    while (fs.existsSync(destination)) {
      fileName = `${String(index + 1).padStart(2, '0')}-${base}-${suffix}${extension}`;
      destination = path.join(imageRoot, fileName);
      suffix += 1;
    }
    fs.copyFileSync(sourcePath, destination);
    return {
      source: sourcePath,
      local_file: path.relative(jobRoot, destination),
      license: 'user-provided; publication rights require manual confirmation',
      alt_text: '',
      ai_label: 'not_declared'
    };
  });
  manifest.images = [...(manifest.images || []), ...imported];
  if (imported.length > 0) {
    manifest.warnings = [
      ...(manifest.warnings || []),
      '发布前请人工核对导入图片的版权、署名、平台比例和AI声明。'
    ];
  }
  const tempPath = `${manifestPath}.images.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  fs.copyFileSync(tempPath, manifestPath);
  fs.unlinkSync(tempPath);
  return imported;
}

function safeAccount(account, binding = null, contentProfileAvailable = true) {
  const catalog = PLATFORM_CATALOG.find((item) => item.id === account.platform);
  return {
    id: account.id,
    enabled: account.enabled,
    content_profile_available: contentProfileAvailable,
    profile_display_name: account.display_name,
    display_name: binding?.display_name || null,
    platform: account.platform,
    positioning: account.positioning,
    audience: account.audience,
    binding: {
      mode: binding?.mode || null,
      bound_at: binding?.bound_at || null,
      session_partition: binding?.session_partition || `persist:sxf-${account.platform}`,
      credentials_stored: false,
      cookies_read: false
    },
    delivery: {
      permission_mode: account.delivery?.permission_mode || 'draft_only',
      route: account.delivery?.route || 'browser',
      route_tested: Boolean(account.delivery?.route_tested),
      portal_url: account.delivery?.portal_url || catalog?.portal_url || null
    }
  };
}

function json(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function text(res, statusCode, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer'
  });
  res.end(body);
}

function binary(res, statusCode, body, contentType) {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Content-Length': body.length,
    'Cache-Control': 'private, max-age=300',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer'
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) reject(new Error('请求内容过大'));
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('请求格式无效'));
      }
    });
    req.on('error', reject);
  });
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      windowsHide: true,
      env: process.env,
      shell: false
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('操作超时'));
    }, options.timeout || 30000);
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
      else reject(new Error(stderr.trim() || stdout.trim() || `操作失败：${code}`));
    });
  });
}

function openExternalUrl(targetUrl) {
  const child = spawn('explorer.exe', [targetUrl], {
    windowsHide: true,
    detached: true,
    stdio: 'ignore',
    shell: false
  });
  child.once('error', () => {
    const fallback = spawn('cmd.exe', [
      '/d',
      '/s',
      '/c',
      `start "" "${targetUrl}"`
    ], {
      windowsHide: true,
      detached: true,
      stdio: 'ignore',
      shell: false
    });
    fallback.unref();
  });
  child.unref();
}

function openLocalFolder(folderPath) {
  const child = spawn('explorer.exe', [folderPath], {
    windowsHide: true,
    detached: true,
    stdio: 'ignore',
    shell: false
  });
  child.unref();
}

function openLocalFile(filePath) {
  const child = spawn('explorer.exe', [filePath], {
    windowsHide: true,
    detached: true,
    stdio: 'ignore',
    shell: false
  });
  child.unref();
}

function openConsolePage() {
  openExternalUrl(`http://${HOST}:${PORT}/`);
}

function listJobs(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const manifestPath = path.join(root, entry.name, 'manifest.json');
      if (!fs.existsSync(manifestPath)) return null;
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const counts = {};
        for (const account of manifest.accounts || []) {
          counts[account.status] = (counts[account.status] || 0) + 1;
        }
        return {
          job_id: manifest.job_id,
          created_at: manifest.created_at,
          title: manifest.source?.title || entry.name,
          input_type: manifest.source?.type === 'skill_package' ? 'skill_package' : 'public_url',
          source_url: manifest.source?.url || null,
          permission_mode: manifest.permission_mode || 'human_publish',
          counts,
          ready: (manifest.accounts || []).some((account) => account.status === 'validated'),
          complete: fs.existsSync(path.join(root, entry.name, 'COMPLETE')),
          path: path.join(root, entry.name)
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((left, right) => String(right.created_at).localeCompare(String(left.created_at)))
    .slice(0, 20);
}

function isSafeJobId(jobId) {
  return typeof jobId === 'string'
    && jobId.length > 0
    && jobId.length <= 240
    && jobId !== '.'
    && jobId !== '..'
    && !/[\\/\u0000-\u001f]/u.test(jobId);
}

function readJob(root, jobId) {
  if (!isSafeJobId(jobId)) throw new Error('任务编号无效');
  const jobRoot = path.resolve(root, jobId);
  const resolvedRoot = path.resolve(root);
  if (path.dirname(jobRoot) !== resolvedRoot) throw new Error('任务路径无效');
  const manifestPath = path.join(jobRoot, 'manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error('任务不存在');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const images = (manifest.images || []).flatMap((image, index) => {
    const localFile = String(image.local_file || '');
    if (!localFile) return [];
    const imagePath = path.resolve(jobRoot, localFile);
    if (!imagePath.startsWith(`${jobRoot}${path.sep}`) || !fs.existsSync(imagePath)) return [];
    const extension = path.extname(imagePath).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension)) return [];
    return [{
      index,
      alt_text: image.alt_text || path.basename(imagePath),
      caption: image.caption || '',
      credit: image.credit || '',
      preview_url: `/api/job-image?job_id=${encodeURIComponent(jobId)}&index=${index}`
    }];
  });
  return {
    job_id: manifest.job_id,
    title: manifest.source?.title || manifest.job_id,
    input_type: manifest.source?.type === 'skill_package' ? 'skill_package' : 'public_url',
    source_url: manifest.source?.url || null,
    source_folder: manifest.source?.original_folder || null,
    job_path: jobRoot,
    permission_mode: manifest.permission_mode || 'human_publish',
    publish_authorized: false,
    warnings: manifest.warnings || [],
    images,
    accounts: (manifest.accounts || []).map((account) => {
      const articleFile = account.article_file || account.content_file || '';
      const articlePath = articleFile ? path.resolve(jobRoot, articleFile) : null;
      if (articlePath && !articlePath.startsWith(`${jobRoot}${path.sep}`)) {
        throw new Error('发布包路径无效');
      }
      const docxPath = account.docx_file ? path.resolve(jobRoot, account.docx_file) : null;
      if (docxPath && !docxPath.startsWith(`${jobRoot}${path.sep}`)) {
        throw new Error('Word发布包路径无效');
      }
      return {
        id: account.id,
        platform: account.platform,
        status: account.status,
        title: account.title || '',
        summary: account.summary || '',
        tags: account.tags || [],
        category: account.category || '',
        content_type: account.content_type || 'article',
        portal_url: PLATFORM_CATALOG.find((item) => item.id === account.platform)?.portal_url || null,
        article: articlePath && fs.existsSync(articlePath) && fs.statSync(articlePath).isFile()
          ? fs.readFileSync(articlePath, 'utf8')
          : '',
        article_file: articleFile || null,
        docx_file: account.docx_file || null,
        docx_path: docxPath && fs.existsSync(docxPath) ? docxPath : null,
        ready_for_release: account.status === 'validated',
        manual_publish_required: true
      };
    })
  };
}

function validateLocalRequest(req) {
  const host = req.headers.host || '';
  if (host !== `${HOST}:${PORT}` && host !== `localhost:${PORT}`) return false;
  const origin = req.headers.origin;
  return !origin || origin === `http://${HOST}:${PORT}` || origin === `http://localhost:${PORT}`;
}

async function handleApi(req, res, url) {
  const config = readAccountsConfig();
  const accounts = config.accounts || [];
  const bindings = readAccountBindings();
  const operationBoxRoot = getOperationBoxRoot(accounts, config.operation_box_root);

  if (req.method === 'GET' && url.pathname === '/api/dashboard') {
    const platforms = PLATFORM_CATALOG.map((platform) => {
      const binding = bindings.accounts[platform.id] || null;
      const profiles = accounts.filter((account) => account.platform === platform.id);
      const linked = profiles.length > 0
        ? profiles.map((account) => safeAccount(account, binding, true))
        : binding
          ? [safeAccount({
            id: `binding-${platform.id}`,
            enabled: false,
            display_name: platform.name,
            platform: platform.id,
            positioning: '',
            audience: []
          }, binding, false)]
          : [];
      return {
        ...platform,
        configured: Boolean(binding),
        content_profile_available: profiles.some((account) => account.enabled),
        enabled: Boolean(binding) || profiles.some((account) => account.enabled),
        accounts: linked
      };
    });
    return json(res, 200, {
      ok: true,
      app_version: APP_VERSION,
      platforms,
      jobs: listJobs(operationBoxRoot),
      operation_box_root: operationBoxRoot,
      security: {
        bind: `${HOST}:${PORT}`,
        secrets_in_browser_or_env: true,
        passwords_stored_by_console: false,
        account_bindings_file: ACCOUNT_BINDINGS_FILE,
        compliance_policy: COMPLIANCE_POLICY
      },
      compliance: COMPLIANCE_POLICY
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/job-image') {
    const jobId = String(url.searchParams.get('job_id') || '');
    const imageIndex = Number(url.searchParams.get('index'));
    if (!isSafeJobId(jobId) || !Number.isInteger(imageIndex) || imageIndex < 0) {
      return json(res, 400, { ok: false, error: '图片请求无效' });
    }
    const jobRoot = path.resolve(operationBoxRoot, jobId);
    const resolvedRoot = path.resolve(operationBoxRoot);
    if (path.dirname(jobRoot) !== resolvedRoot) {
      return json(res, 400, { ok: false, error: '任务路径无效' });
    }
    const manifestPath = path.join(jobRoot, 'manifest.json');
    if (!fs.existsSync(manifestPath)) return json(res, 404, { ok: false, error: '任务不存在' });
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const image = manifest.images?.[imageIndex];
    const localFile = String(image?.local_file || '');
    const imagePath = localFile ? path.resolve(jobRoot, localFile) : '';
    if (!imagePath || !imagePath.startsWith(`${jobRoot}${path.sep}`) || !fs.existsSync(imagePath)) {
      return json(res, 404, { ok: false, error: '图片不存在' });
    }
    const extension = path.extname(imagePath).toLowerCase();
    const imageTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif'
    };
    if (!imageTypes[extension]) return json(res, 415, { ok: false, error: '图片格式不支持' });
    return binary(res, 200, fs.readFileSync(imagePath), imageTypes[extension]);
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/jobs/')) {
    const jobId = decodeURIComponent(url.pathname.slice('/api/jobs/'.length));
    return json(res, 200, { ok: true, job: readJob(operationBoxRoot, jobId) });
  }

  if (req.method === 'POST' && url.pathname === '/api/check-account') {
    const body = await readJsonBody(req);
    const account = accounts.find((item) => item.id === body.account_id);
    if (!account || !account.enabled) return json(res, 404, { ok: false, error: '账号未配置或未启用' });
    if (account.platform !== 'wechat-official-account') {
      return json(res, 409, { ok: false, error: '浏览器平台将在第二阶段接入登录检测' });
    }
    const result = await run('node', ['wechat-draft.js', 'doctor'], {
      cwd: WECHAT_TOOL_ROOT,
      timeout: 30000
    });
    let details;
    try {
      details = JSON.parse(result.stdout);
    } catch {
      details = { ok: true, message: result.stdout };
    }
    return json(res, 200, { ok: true, account_id: account.id, details });
  }

  if (req.method === 'POST' && url.pathname === '/api/create-job') {
    const body = await readJsonBody(req);
    const inputType = String(body.input_type || 'public_url');
    const title = String(body.title || '').replace(/\s+/g, ' ').trim();
    const requested = Array.isArray(body.account_ids) ? body.account_ids : [];
    const imagePaths = validateImagePaths(body.image_paths);
    if (!['public_url', 'skill_package'].includes(inputType)) {
      return json(res, 400, { ok: false, error: '请选择正确的母稿入口' });
    }
    if (title.length < 2 || title.length > 120) {
      return json(res, 400, { ok: false, error: '请输入2—120个字符的母稿标题' });
    }
    if (requested.length === 0) return json(res, 400, { ok: false, error: '至少选择一个账号' });
    for (const id of requested) {
      const account = accounts.find((item) => item.id === id);
      if (!account || !account.enabled) return json(res, 400, { ok: false, error: `账号不可用：${id}` });
    }
    fs.mkdirSync(operationBoxRoot, { recursive: true });
    let result;
    if (inputType === 'public_url') {
      const sourceUrl = String(body.source_url || '').trim();
      let parsedUrl;
      try {
        parsedUrl = new URL(sourceUrl);
      } catch {
        return json(res, 400, { ok: false, error: '请输入有效的公开文章链接' });
      }
      if (parsedUrl.protocol !== 'https:') {
        return json(res, 400, { ok: false, error: '公开文章链接必须使用 HTTPS' });
      }
      if (/tempkey|preview|draft/i.test(parsedUrl.href)) {
        return json(res, 400, { ok: false, error: '这是预览或临时链接，请先发布并粘贴永久公开链接' });
      }
      result = await run('node', [
        CREATE_JOB_SCRIPT,
        '--source-url', parsedUrl.href,
        '--title', title,
        '--accounts', requested.join(','),
        '--out', operationBoxRoot
      ], { timeout: 30000 });
    } else {
      const sourceFolder = path.resolve(String(body.source_folder || ''));
      if (!path.isAbsolute(sourceFolder) || !fs.existsSync(sourceFolder) || !fs.statSync(sourceFolder).isDirectory()) {
        return json(res, 400, { ok: false, error: '请选择存在的写作技能输出文件夹' });
      }
      result = await run('node', [
        IMPORT_PACKAGE_SCRIPT,
        '--source-folder', sourceFolder,
        '--title', title,
        '--accounts', requested.join(','),
        '--out', operationBoxRoot
      ], { timeout: 60000 });
    }
    const jobPath = result.stdout.trim().split(/\r?\n/).filter(Boolean).at(-1);
    const importedAssets = inputType === 'public_url'
      ? importJobImages(jobPath, imagePaths)
      : [];
    return json(res, 201, {
      ok: true,
      input_type: inputType,
      job_path: jobPath,
      imported_image_count: inputType === 'skill_package'
        ? JSON.parse(fs.readFileSync(path.join(jobPath, 'manifest.json'), 'utf8')).images.length
        : importedAssets.length,
      next_step: '在 Codex 对话中说“处理最新操作箱”，完成各平台改写和Word发布包。'
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/bind-account') {
    const body = await readJsonBody(req);
    const platform = String(body.platform || '');
    const displayName = String(body.display_name || '').replace(/\s+/g, ' ').trim();
    if (!PLATFORM_PROFILE_RULES[platform]) {
      return json(res, 400, { ok: false, error: '该平台不支持账号绑定' });
    }
    if (displayName.length < 2 || displayName.length > 50 || /[\u0000-\u001f]/u.test(displayName)) {
      return json(res, 400, { ok: false, error: '请输入2—50个字符的真实账号名称' });
    }
    if (body.confirmed_manual_login !== true) {
      return json(res, 400, { ok: false, error: '请先在官方页面完成登录并确认账号名称' });
    }
    const bindingMode = body.detected_from_official_page === true
      ? 'official-page-detected'
      : 'manual-confirmation';
    const account = await saveBoundAccount(
      platform,
      displayName,
      accounts,
      operationBoxRoot,
      bindingMode
    );
    return json(res, 200, {
      ok: true,
      account,
      message: '账号规则已保存；密码和登录状态仍由官方平台与浏览器保管。'
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/open-platform') {
    const body = await readJsonBody(req);
    const platform = PLATFORM_CATALOG.find((item) => item.id === body.platform);
    if (!platform) return json(res, 404, { ok: false, error: '平台不存在' });
    if (body.browser_opened !== true) openExternalUrl(platform.portal_url);
    return json(res, 200, {
      ok: true,
      platform: platform.id,
      portal_url: platform.portal_url,
      manual_publish_required: true
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/open-job-folder') {
    const body = await readJsonBody(req);
    const jobId = String(body.job_id || '');
    if (!isSafeJobId(jobId)) {
      return json(res, 400, { ok: false, error: '任务编号无效' });
    }
    const resolvedRoot = path.resolve(operationBoxRoot);
    const jobRoot = path.resolve(operationBoxRoot, jobId);
    if (path.dirname(jobRoot) !== resolvedRoot || !fs.existsSync(path.join(jobRoot, 'manifest.json'))) {
      return json(res, 404, { ok: false, error: '操作箱不存在' });
    }
    openLocalFolder(jobRoot);
    return json(res, 200, { ok: true, job_path: jobRoot });
  }

  if (req.method === 'POST' && url.pathname === '/api/open-account-docx') {
    const body = await readJsonBody(req);
    const job = readJob(operationBoxRoot, String(body.job_id || ''));
    const accountId = String(body.account_id || '');
    const account = job.accounts.find((item) => item.id === accountId);
    if (!account) return json(res, 404, { ok: false, error: '平台发布包不存在' });
    if (!account.docx_path) return json(res, 404, { ok: false, error: '带图Word发布包尚未生成' });
    openLocalFile(account.docx_path);
    return json(res, 200, {
      ok: true,
      docx_path: account.docx_path,
      manual_paste_required: true
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/shutdown') {
    json(res, 200, { ok: true, message: '控制台正在退出' });
    setTimeout(() => {
      if (typeof global.sxfPublishingConsoleShutdown === 'function') {
        server.close();
        global.sxfPublishingConsoleShutdown();
        return;
      }
      server.close(() => process.exit(0));
    }, 150);
    return;
  }

  return json(res, 404, { ok: false, error: '接口不存在' });
}

function serveStatic(req, res, url) {
  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = path.resolve(PUBLIC_ROOT, `.${requested}`);
  if (!filePath.startsWith(`${PUBLIC_ROOT}${path.sep}`)) return text(res, 403, 'Forbidden');
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return text(res, 404, 'Not found');
  const extension = path.extname(filePath);
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.svg': 'image/svg+xml'
  };
  return text(res, 200, fs.readFileSync(filePath), types[extension] || 'application/octet-stream');
}

const server = http.createServer(async (req, res) => {
  if (!validateLocalRequest(req)) return json(res, 403, { ok: false, error: '仅允许本机控制台访问' });
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    return serveStatic(req, res, url);
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message || '未知错误' });
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    openConsolePage();
    setTimeout(() => process.exit(0), 800);
    return;
  }
  throw error;
});

server.listen(PORT, HOST, () => {
  console.log(`多平台发文控制台已启动：http://${HOST}:${PORT}`);
  console.log('控制台不保存密码、Cookie 或 AppSecret。');
  if (process.pkg || process.argv.includes('--open')) {
    setTimeout(openConsolePage, 350);
  }
});
