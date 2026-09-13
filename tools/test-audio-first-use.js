'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Module = require('module');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const scorer = read('native-dist/pages/scorer-board/index.js');
const settings = read('native-dist/pages/mc-settings/index.js');
const getLibrary = read('cloudfunctions/sxGetAudioLibrary/index.js');
const saveLibrary = read('cloudfunctions/sxSaveAudioLibrary/index.js');

assert(scorer.includes("wx.showLoading({ title: '加载比赛音乐'"), '首次预加载缺少进行中提示');
assert(scorer.includes("title: '音效加载完成'"), '首次预加载缺少成功弹窗');
assert(scorer.includes("title: '音效未加载完整'"), '首次预加载缺少失败说明');
assert(scorer.includes("confirmText: '重新加载'"), '预加载失败缺少重试操作');
assert(scorer.includes("sourcesForType('attack')") && scorer.includes("sourcesForType('defense')"), '首次预加载未包含进攻或防守音乐');
assert(scorer.includes("['warmup', 'attack', 'defense']") && scorer.includes('preferredSource'), '首次预加载未准备三类最低可用音乐');
assert(scorer.includes('preloadNextWarmupAudio') && scorer.includes('this.ensureAudioCached(nextSource)'), '暖场音乐未提前准备下一首');
assert(scorer.includes('preloadRemainingAudio') && scorer.includes('pendingEssential'), '非关键音乐未转入后台预加载');
assert(scorer.includes('signedUrlRefreshed') && scorer.includes('requestFreshSignedUrl'), '短期地址失效后未自动刷新重试');
assert(scorer.includes("callCloud('sxGetAudioUrl'"), '私有云音频缺少短期地址回退');
assert(getLibrary.includes('buildUrlMap') && getLibrary.includes('urlMap'), '音效库未返回短期播放地址');
assert(saveLibrary.includes("'warmup'"), '云端音效库不支持暖场分类');
assert(settings.includes("'ambience'"), '互动音效未加入自定义音效来源');

async function verifyFirstUseFeedback() {
  const previousWx = global.wx;
  const previousPage = global.Page;
  const originalLoad = Module._load;
  const storage = Object.create(null);
  let definition = null;
  let loadingShown = 0;
  let loadingHidden = 0;
  let cachedCount = 0;
  let backgroundCount = 0;
  const modals = [];
  global.wx = {
    getStorageSync(key) { return storage[key]; },
    setStorageSync(key, value) { storage[key] = value; },
    showLoading() { loadingShown += 1; },
    hideLoading() { loadingHidden += 1; },
    showModal(options) { modals.push(options); }
  };
  global.Page = (value) => { definition = value; };
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === '../../utils/cloud') return { callCloud: async () => ({ ok: true }), cloud: null };
    if (request === '../../utils/scoreVoice') return { buildScoreVoice: () => '' };
    if (request === '../../utils/roster-sync') return { pullRoster: async () => [], resolveImageUrl: (value) => value };
    return originalLoad.call(this, request, parent, isMain);
  };
  const scorerPath = path.join(root, 'native-dist/pages/scorer-board/index.js');
  delete require.cache[require.resolve(scorerPath)];
  try { require(scorerPath); }
  finally {
    Module._load = originalLoad;
    global.Page = previousPage;
  }
  assert(definition, '计分板页面定义加载失败');
  const page = Object.assign({}, definition, { data: JSON.parse(JSON.stringify(definition.data)) });
  page.getPersistentAudioPath = async () => '';
  page.ensureAudioCached = async () => { cachedCount += 1; return 'saved://audio.mp3'; };
  page.preloadRemainingAudio = async (sources) => { backgroundCount = sources.length; };
  await definition.preloadCommonAudio.call(page);
  assert.strictEqual(loadingShown, 1, '首次使用必须显示预加载提示');
  assert.strictEqual(loadingHidden, 1, '预加载结束必须关闭加载提示');
  assert.strictEqual(modals.length, 1, '首次预加载结束必须显示结果弹窗');
  assert.strictEqual(modals[0].title, '音效加载完成', '首次预加载成功文案错误');
  assert.strictEqual(cachedCount, 3, '首次进入只应阻塞加载暖场、进攻、防守各一首');
  assert(backgroundCount > 0, '其余音乐必须转入后台预加载');
  global.wx = previousWx;
}

verifyFirstUseFeedback()
  .then(() => process.stdout.write('首次音效预加载、结果提示和私有地址回退检查通过\n'))
  .catch((error) => {
    global.wx = undefined;
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
