'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Module = require('module');
const root = path.resolve(__dirname, '..');
const transition = require(path.join(root, 'native-dist', 'utils', 'audio-crossfade'));

function context(volume = 1) {
  return {
    volume,
    played: 0,
    paused: false,
    stopped: 0,
    destroyed: 0,
    play() { this.played += 1; this.paused = false; },
    pause() { this.paused = true; },
    seek(value) { this.currentTime = value; },
    onEnded(handler) { this.endedHandler = handler; },
    onError(handler) { this.errorHandler = handler; },
    stop() { this.stopped += 1; },
    destroy() { this.destroyed += 1; }
  };
}

async function run() {
  const host = { audioContext: null, audioRetiringContexts: [], audioFadeTimer: null };
  const attack = context();
  transition.startAudioTransition(host, attack, 'attack', 0.7);
  assert.strictEqual(attack.played, 1, 'first audio must start');
  assert.strictEqual(attack.volume, 0.7, 'first audio must start at target volume');

  const defense = context();
  transition.startAudioTransition(host, defense, 'defense', 0.7);
  assert.strictEqual(attack.destroyed, 0, 'previous audio must not stop abruptly');
  assert(defense.volume <= 0.08, 'background audio must fade in');
  await new Promise((resolve) => setTimeout(resolve, 500));
  assert.strictEqual(attack.destroyed, 1, 'previous audio must retire after fade');
  assert(Math.abs(defense.volume - 0.7) < 0.02, 'new audio must reach target volume');

  const buzzer = context();
  transition.startAudioTransition(host, buzzer, 'buzzer', 0.7);
  assert.strictEqual(buzzer.volume, 0.7, 'urgent cue must start immediately at target volume');
  assert.strictEqual(defense.destroyed, 0, 'background audio must still fade out under urgent cue');
  await new Promise((resolve) => setTimeout(resolve, 500));
  assert.strictEqual(defense.destroyed, 1, 'background audio must retire after urgent cue transition');
  transition.stopAudioTransition(host);
  assert.strictEqual(buzzer.destroyed, 1, 'stop must release current audio');

  const fadingHost = { audioContext: context(0.7), audioRetiringContexts: [], audioFadeTimer: null };
  const fadingAudio = fadingHost.audioContext;
  transition.fadeOutAudioTransition(fadingHost);
  assert.strictEqual(fadingAudio.destroyed, 0, 'manual stop must fade before releasing audio');
  await new Promise((resolve) => setTimeout(resolve, 600));
  assert.strictEqual(fadingAudio.destroyed, 1, 'manual stop must release audio after fade-out');

  const board = fs.readFileSync(path.join(root, 'native-dist', 'pages', 'scorer-board', 'index.js'), 'utf8');
  const scorer = fs.readFileSync(path.join(root, 'native-dist', 'pages', 'scorer', 'index.js'), 'utf8');
  const settings = fs.readFileSync(path.join(root, 'native-dist', 'pages', 'mc-settings', 'index.js'), 'utf8');
  const settingsView = fs.readFileSync(path.join(root, 'native-dist', 'pages', 'mc-settings', 'index.wxml'), 'utf8');
  const boardView = fs.readFileSync(path.join(root, 'native-dist', 'pages', 'scorer-board', 'index.wxml'), 'utf8');
  const scorerView = fs.readFileSync(path.join(root, 'native-dist', 'pages', 'scorer', 'index.wxml'), 'utf8');
  const warmup = require(path.join(root, 'native-dist', 'utils', 'default-warmup-audio'));
  const localMethod = settings.slice(settings.indexOf('chooseLocalAudio('), settings.indexOf('renameLocalAudio('));
  assert(board.includes('startAudioTransition(audioHost, context'), 'scorer-board crossfade missing');
  assert(scorer.includes('startAudioTransition(audioHost, context'), 'legacy scorer crossfade missing');
  assert(settings.includes("LOCAL_AUDIO_LIBRARY_KEY = 'sx_mc_local_audio_library_v1'"), 'local audio library missing');
  assert(settings.includes('wx.chooseMessageFile') && settings.includes('wx.saveFile'), 'local file picker or persistence missing');
  assert(!localMethod.includes('callCloud(') && !localMethod.includes('uploadFile'), 'local audio must not upload to cloud');
  assert(settings.includes('LOCAL_AUDIO_MAX_BYTES') && settings.includes('LOCAL_AUDIO_LIMIT'), 'local audio limits missing');
  assert.strictEqual(warmup.length, 13, 'default warmup library must contain 13 tracks');
  assert(!warmup.some((item) => item.name.includes('未来我来')), 'removed warmup track must not remain in the default manifest');
  assert(warmup.every((item) => item.channel === 'warmup' && item.fileID.includes('/mc-mp3/暖场音乐/')), 'warmup cloud mapping is invalid');
  assert(settings.includes("warmup: 'random'") && settings.includes("itemList: ['随机连续', '顺序连续', '单首循环', '播放当前']"), 'warmup mode selector is incomplete');
  assert(board.includes('shuffledAudioSources(ids, this.lastWarmupSource)') && scorer.includes('shuffledAudioSources(ids, this.lastWarmupSource)'), 'warmup must choose a new random starting track');
  assert(board.includes('advanceWarmupAudio') && board.includes("this.warmupMode === 'single'"), 'scorer-board warmup playback modes missing');
  assert(scorer.includes('advanceWarmupAudio') && scorer.includes("this.warmupMode === 'single'"), 'legacy scorer warmup playback modes missing');
  assert(board.includes('warmupAudioHost') && board.includes('fullVolume * 0.18') && board.includes('this.setWarmupDucked(false)'), 'scorer-board warmup ducking channel missing');
  assert(scorer.includes('warmupAudioHost') && scorer.includes('fullVolume * 0.18') && scorer.includes('this.setWarmupDucked(false)'), 'legacy scorer warmup ducking channel missing');
  assert(board.includes("new Set(['warmup', 'attack', 'defense'])") && scorer.includes("new Set(['warmup', 'attack', 'defense'])"), 'all three common music types must share the background channel');
  assert(board.includes("settings.customMixMode === 'stop'") && scorer.includes("settings.customMixMode === 'stop'"), 'stop-background rule must be applied by both scoreboards');
  assert(board.includes('fadeAudioVolume(host, context, 0, 520') && scorer.includes('fadeAudioVolume(host, context, 0, 520'), 'pause must fade background audio before stopping playback');
  assert(board.includes('this.restAudioSeekWasPlaying = !paused') && scorer.includes('this.restAudioSeekWasPlaying = !paused'), 'seek must remember whether playback should resume');
  assert(board.includes('fadeAudioVolume(host, context, 0, 0') && scorer.includes('fadeAudioVolume(host, context, 0, 0'), 'seek must mute before changing playback position');
  assert(board.includes('fadeAudioVolume(host, context, restoreVolume, 260)') && scorer.includes('fadeAudioVolume(host, context, restoreVolume, 260)'), 'seek release must resume with a short fade-in');
  assert(settings.includes("attack: 'random'") && settings.includes("defense: 'random'"), 'attack and defense must default to random');
  assert(settings.includes("customMixMode: 'duck'") && settings.includes("const values = ['stop', 'duck']"), 'custom effect background rule must expose exactly two modes');
  assert(!settings.includes("overlay: '音乐叠加'") && !settingsView.includes('音乐叠加'), 'overlay mode must not be exposed');
  assert(boardView.includes('音乐进度') && scorerView.includes('音乐进度'), 'scoreboard bottom bar must label music progress');
  assert(settings.includes('MC_ASSET_ALIASES') && settingsView.includes('{{assetUrls.play}}'), 'MC icons must resolve to playable URLs');
  assert(settingsView.includes('6个快捷位') && settingsView.includes('renameLocalAudio') && settingsView.includes('deleteLocalAudio'), 'local audio management controls missing');
  assert(settingsView.includes('常用音效') && settingsView.includes('自定义音效') && settingsView.includes('previewCategoryVolume'), 'separate volume controls and preview buttons are missing');
  assert((settingsView.match(/bindchanging="previewVolumeChanging"/g) || []).length === 3, 'all three volume sliders must update preview audio while dragging');
  assert(settingsView.indexOf('settings.commonVolume') < settingsView.indexOf('当前音效包') && settingsView.indexOf('当前音效包') < settingsView.indexOf('播报设置'), 'group volume controls must stay in the white global panel above voice settings');
  const voicePanelMarkup = settingsView.slice(settingsView.indexOf('<view class="dark-panel voice-panel">'), settingsView.indexOf('<view class="dark-panel category-panel">'));
  assert(!voicePanelMarkup.includes('settings.commonVolume') && !voicePanelMarkup.includes('settings.customVolume'), 'voice settings must not contain group volume controls');
  assert(settings.includes('commonVolume: 100') && settings.includes('customVolume: 100'), 'separate volume defaults are missing');
  assert(board.includes("effectiveAudioVolume(settings, resolvedVolumeGroup)") && scorer.includes("effectiveAudioVolume(settings, resolvedVolumeGroup)"), 'scoreboards must combine global and group volume');
  assert(boardView.includes('data-volume-group="common"') && boardView.includes('data-volume-group="custom"'), 'scorer-board must distinguish common and custom volume groups');
  assert(scorerView.includes('data-volume-group="common"') && scorerView.includes('data-volume-group="custom"'), 'legacy scorer must distinguish common and custom volume groups');

  const storage = Object.create(null);
  const originalLoad = Module._load;
  const originalWx = global.wx;
  const originalPage = global.Page;
  let pageDefinition = null;
  global.wx = {
    getStorageSync(key) { return storage[key]; },
    setStorageSync(key, value) { storage[key] = value; }
  };
  global.Page = (definition) => { pageDefinition = definition; };
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === '../../utils/cloud') return { callCloud: async () => ({ ok: true }), cloud: null };
    return originalLoad.call(this, request, parent, isMain);
  };
  const settingsPath = path.join(root, 'native-dist', 'pages', 'mc-settings', 'index.js');
  delete require.cache[require.resolve(settingsPath)];
  require(settingsPath);
  Module._load = originalLoad;
  global.wx = originalWx;
  global.Page = originalPage;
  assert(pageDefinition, 'MC settings page definition missing');
  const page = Object.assign({}, pageDefinition, { data: JSON.parse(JSON.stringify(pageDefinition.data)) });
  page.setData = function setData(value) { this.data = Object.assign({}, this.data, value); };
  global.wx = {
    getStorageSync(key) { return storage[key]; },
    setStorageSync(key, value) { storage[key] = value; }
  };
  page.refresh();
  const warmupCategory = page.data.categories.find((item) => item.key === 'warmup');
  assert(warmupCategory && warmupCategory.options.length === 13, 'MC settings must expose 13 default warmup tracks');
  assert.strictEqual(warmupCategory.modeText, '随机连续', 'warmup default mode must be random continuous');
  storage.sx_mc_audio_settings = { modeDefaultsVersion: 3, modes: { warmup: 'current', attack: 'random', defense: 'random' } };
  page.refresh();
  const migratedWarmup = page.data.categories.find((item) => item.key === 'warmup');
  assert.strictEqual(migratedWarmup.modeText, '随机连续', 'existing devices must migrate warmup to random continuous');
  page.resolveAudioSource = async (source) => `resolved:${source.slice(source.lastIndexOf('/') + 1)}`;
  await page.loadAssetUrls();
  assert.strictEqual(page.data.assetUrls.play, 'resolved:icon-play-common.png', 'MC play icon must resolve before display');
  assert.strictEqual(page.data.assetUrls.whistle, 'resolved:icon-whistle-common.png', 'MC rule icon must resolve before display');
  page.resolveAudioSource = async (source) => source;
  page.data.settings = Object.assign({}, page.data.settings, { volume: 50, commonVolume: 80, customVolume: 40 });
  let previewContext = null;
  global.wx.createInnerAudioContext = () => { previewContext = context(); return previewContext; };
  await page.playAudio('wxfile://common-preview.mp3', 'volume-common', 'common');
  assert(Math.abs(previewContext.volume - 0.4) < 0.001, 'common preview must combine global and common volume');
  page.previewVolumeChanging({ currentTarget: { dataset: { key: 'commonVolume' } }, detail: { value: 40 } });
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert(Math.abs(previewContext.volume - 0.2) < 0.02, 'common preview volume must follow the slider without restarting playback');
  transition.stopAudioTransition(page);
  page.data.settings = Object.assign({}, page.data.settings, { commonVolume: 80, customVolume: 40 });
  await page.playAudio('wxfile://custom-preview.mp3', 'volume-custom', 'custom');
  assert(Math.abs(previewContext.volume - 0.2) < 0.001, 'custom preview must combine global and custom volume');
  page.previewVolumeChanging({ currentTarget: { dataset: { key: 'customVolume' } }, detail: { value: 20 } });
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert(Math.abs(previewContext.volume - 0.1) < 0.02, 'custom preview volume must follow the slider without restarting playback');
  transition.stopAudioTransition(page);
  global.wx = originalWx;

  function loadScorerPage(relativePath) {
    const originalModuleLoad = Module._load;
    const previousWx = global.wx;
    const previousPage = global.Page;
    let definition = null;
    global.wx = {
      getStorageSync() { return null; },
      setStorageSync() {},
      createInnerAudioContext() { return context(); }
    };
    global.Page = (value) => { definition = value; };
    Module._load = function scorerModuleLoad(request, parent, isMain) {
      if (request === '../../utils/cloud') return { callCloud: async () => ({ ok: true }), cloud: null };
      if (request === '../../utils/scoreVoice') return { buildScoreVoice: () => '' };
      if (request === '../../utils/roster-sync') return { pullRoster: async () => [], resolveImageUrl: (value) => value };
      return originalModuleLoad.call(this, request, parent, isMain);
    };
    const pagePath = path.join(root, relativePath);
    delete require.cache[require.resolve(pagePath)];
    try { require(pagePath); }
    finally {
      Module._load = originalModuleLoad;
      global.wx = previousWx;
      global.Page = previousPage;
    }
    return definition;
  }
  const boardDefinition = loadScorerPage('native-dist/pages/scorer-board/index.js');
  assert(boardDefinition, 'scorer-board must initialize without runtime errors');
  assert(loadScorerPage('native-dist/pages/scorer/index.js'), 'legacy scorer must initialize without runtime errors');
  const boardPage = Object.assign({}, boardDefinition, { data: JSON.parse(JSON.stringify(boardDefinition.data)) });
  boardPage.setData = function setData(value) { this.data = Object.assign({}, this.data, value); };
  const background = context(0.7);
  boardPage.getWarmupAudioHost().audioContext = background;
  boardPage.data.warmupPlaying = true;
  background.currentTime = 30;
  background.duration = 120;
  boardPage.syncRestAudioProgress();
  assert.strictEqual(boardPage.data.restAudioProgress, 25, 'warmup progress must follow current playback time');
  assert.strictEqual(boardPage.data.restAudioCurrentText, '00:30', 'warmup current time must be formatted');
  assert.strictEqual(boardPage.data.restAudioDurationText, '02:00', 'warmup duration must be formatted');
  global.wx = { getStorageSync() { return { volume: 70, modeDefaultsVersion: 3 }; } };
  boardPage.setWarmupDucked(true);
  await new Promise((resolve) => setTimeout(resolve, 280));
  assert(background.volume < 0.16 && background.volume > 0.1, 'foreground audio must duck warmup volume');
  boardPage.setWarmupDucked(false);
  await new Promise((resolve) => setTimeout(resolve, 580));
  assert(Math.abs(background.volume - 0.7) < 0.03, 'warmup volume must recover after foreground audio');
  if (boardPage.warmupDuckTimer) clearInterval(boardPage.warmupDuckTimer);
  global.wx = originalWx;
  console.log('audio crossfade and local audio tests passed');
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
