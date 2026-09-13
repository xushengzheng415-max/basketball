const AUDIO_CROSSFADE_DURATION_MS = 180;
const AUDIO_FADE_OUT_DURATION_MS = 520;
const AUDIO_CROSSFADE_STEP_MS = 20;
const AUDIO_URGENT_TYPES = new Set([
  'buzzer',
  'countdown',
  'two',
  'three',
  'freeThrowMade',
  'freeThrowMiss',
  'voice'
]);

function clampVolume(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function disposeAudioContext(context) {
  if (!context) return;
  try { context.stop(); } catch (_) {}
  try { context.destroy(); } catch (_) {}
}

function clearAudioFade(host) {
  if (host.audioFadeTimer) clearInterval(host.audioFadeTimer);
  host.audioFadeTimer = null;
}

function uniqueContexts(contexts) {
  return contexts.filter((context, index, list) => context && list.indexOf(context) === index);
}

function startAudioTransition(host, nextContext, type, targetVolume) {
  clearAudioFade(host);
  const previous = uniqueContexts([host.audioContext].concat(host.audioRetiringContexts || [])).filter((context) => context !== nextContext);
  const target = clampVolume(targetVolume);
  const urgent = AUDIO_URGENT_TYPES.has(type || 'voice');
  const startVolume = previous.length && !urgent ? Math.min(target, 0.08) : target;
  const previousVolumes = previous.map((context) => ({ context, volume: clampVolume(context.volume) }));
  host.audioContext = nextContext;
  host.audioRetiringContexts = previous;
  nextContext.volume = startVolume;
  nextContext.play();
  if (!previous.length) return;
  const startedAt = Date.now();
  const timer = setInterval(() => {
    const progress = Math.min(1, (Date.now() - startedAt) / AUDIO_CROSSFADE_DURATION_MS);
    if (host.audioContext === nextContext && !urgent) {
      try { nextContext.volume = startVolume + (target - startVolume) * progress; } catch (_) {}
    }
    previousVolumes.forEach((item) => {
      try { item.context.volume = item.volume * (1 - progress); } catch (_) {}
    });
    if (progress < 1) return;
    clearInterval(timer);
    if (host.audioFadeTimer === timer) host.audioFadeTimer = null;
    previous.forEach(disposeAudioContext);
    host.audioRetiringContexts = [];
  }, AUDIO_CROSSFADE_STEP_MS);
  host.audioFadeTimer = timer;
}

function stopAudioTransition(host) {
  clearAudioFade(host);
  uniqueContexts([host.audioContext].concat(host.audioRetiringContexts || [])).forEach(disposeAudioContext);
  host.audioContext = null;
  host.audioRetiringContexts = [];
}

function fadeAudioVolume(host, context, targetVolume, duration, onComplete) {
  if (!context) {
    if (typeof onComplete === 'function') onComplete();
    return;
  }
  clearAudioFade(host);
  uniqueContexts(host.audioRetiringContexts || []).filter((item) => item !== context).forEach(disposeAudioContext);
  host.audioRetiringContexts = [];
  const start = clampVolume(context.volume);
  const target = clampVolume(targetVolume);
  const fadeDuration = Math.max(0, Number(duration) || 0);
  if (!fadeDuration || Math.abs(start - target) < 0.001) {
    try { context.volume = target; } catch (_) {}
    if (typeof onComplete === 'function') onComplete();
    return;
  }
  const startedAt = Date.now();
  const timer = setInterval(() => {
    const progress = Math.min(1, (Date.now() - startedAt) / fadeDuration);
    try { context.volume = start + (target - start) * progress; } catch (_) {}
    if (progress < 1) return;
    clearInterval(timer);
    if (host.audioFadeTimer === timer) host.audioFadeTimer = null;
    if (typeof onComplete === 'function') onComplete();
  }, AUDIO_CROSSFADE_STEP_MS);
  host.audioFadeTimer = timer;
}

function fadeOutAudioTransition(host, duration) {
  clearAudioFade(host);
  const contexts = uniqueContexts([host.audioContext].concat(host.audioRetiringContexts || []));
  host.audioContext = null;
  host.audioRetiringContexts = contexts;
  if (!contexts.length) return;
  const startVolumes = contexts.map((context) => ({ context, volume: clampVolume(context.volume) }));
  const fadeDuration = Math.max(0, Number(duration) || AUDIO_FADE_OUT_DURATION_MS);
  const startedAt = Date.now();
  const timer = setInterval(() => {
    const progress = Math.min(1, (Date.now() - startedAt) / fadeDuration);
    startVolumes.forEach((item) => {
      try { item.context.volume = item.volume * (1 - progress); } catch (_) {}
    });
    if (progress < 1) return;
    clearInterval(timer);
    if (host.audioFadeTimer === timer) host.audioFadeTimer = null;
    contexts.forEach(disposeAudioContext);
    host.audioRetiringContexts = [];
  }, AUDIO_CROSSFADE_STEP_MS);
  host.audioFadeTimer = timer;
}

function isCurrentAudio(host, context) {
  return host.audioContext === context;
}

module.exports = {
  AUDIO_CROSSFADE_DURATION_MS,
  AUDIO_FADE_OUT_DURATION_MS,
  AUDIO_URGENT_TYPES,
  disposeAudioContext,
  fadeAudioVolume,
  fadeOutAudioTransition,
  isCurrentAudio,
  startAudioTransition,
  stopAudioTransition
};
