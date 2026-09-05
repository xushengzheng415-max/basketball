(() => {
  'use strict';
  const API = 'https://www.sxfbasketball.cn/api/scoreboard';
  const $ = (id) => document.getElementById(id);
  const app = $('app'), pairing = $('pairing'), board = $('board'), form = $('pairingForm'), input = $('codeInput');
  let code = '', pollTimer = 0, tickTimer = 0, failures = 0, snapshot = null, receivedAt = 0, serverOffset = 0;
  const params = new URLSearchParams(location.search);

  const demoData = {
    ok: true, serverTime: Date.now(),
    match: { name: '2026 赛小蜂青少年篮球邀请赛', court: '一号场', stage: 'U12 决赛', home: { name: '蜂火少年队', logo: 'https://www.sxfbasketball.cn/admin/assets/demo/youth-basketball/logos/future-swarm.png' }, away: { name: '凌云篮球队', logo: 'https://www.sxfbasketball.cn/admin/assets/demo/youth-basketball/logos/sky-pioneers.png' } },
    state: { status: 'live', version: 8, homeScore: 46, awayScore: 42, period: 3, totalPeriods: 4, periodMinutes: 10, clockSeconds: 286, clockRunning: true, timerMode: 'down', homeFouls: 4, awayFouls: 3, homeTimeouts: 2, awayTimeouts: 1, possession: 'home', shotClockEnabled: true, shotClock: 18, shotClockRunning: true, restCountdownVisible: false, updatedAt: Date.now() }
  };

  const formatClock = (seconds) => {
    const safe = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
  };
  const DIGITAL_SEGMENTS = { '0': 'abcdef', '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg', '5': 'acdfg', '6': 'acdefg', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg' };
  const renderDigitalScore = (id, value, teamLabel) => {
    const score = String(Math.max(0, Math.floor(Number(value) || 0)));
    const node = $(id);
    node.setAttribute('aria-label', `${teamLabel} ${score} 分`);
    node.innerHTML = score.split('').map((digit) => `<span class="digital-digit" aria-hidden="true">${['a','b','c','d','e','f','g'].map((segment) => `<i class="digital-seg ${segment}${DIGITAL_SEGMENTS[digit].includes(segment) ? ' is-on' : ''}"></i>`).join('')}</span>`).join('');
  };
  const digitalDigit = (digit) => `<span class="digital-digit" aria-hidden="true">${['a','b','c','d','e','f','g'].map((segment) => `<i class="digital-seg ${segment}${DIGITAL_SEGMENTS[digit].includes(segment) ? ' is-on' : ''}"></i>`).join('')}</span>`;
  const renderDigitalClock = (seconds) => {
    const text = formatClock(seconds);
    const node = $('clock');
    const parts = text.split(':');
    node.setAttribute('aria-label', `比赛时间 ${Number(parts[0])}分${Number(parts[1])}秒`);
    node.innerHTML = `${parts[0].split('').map(digitalDigit).join('')}<span class="digital-colon" aria-hidden="true"></span>${parts[1].split('').map(digitalDigit).join('')}`;
  };
  const effectiveValue = (base, running, direction) => {
    if (!snapshot || !running || snapshot.status === 'completed') return Math.max(0, Number(base) || 0);
    const elapsed = Math.max(0, Math.floor(((Date.now() + serverOffset) - (Number(snapshot.updatedAt) || receivedAt + serverOffset)) / 1000));
    return Math.max(0, Number(base) + direction * elapsed);
  };
  const setLogo = (side, data) => {
    const image = $(`${side}Logo`), initial = $(`${side}Initial`), name = data.name || (side === 'home' ? '主队' : '客队');
    $(`${side}Name`).textContent = name;
    initial.textContent = name.slice(0, 1);
    image.onerror = () => { image.hidden = true; initial.hidden = false; };
    if (data.logo) { image.src = data.logo; image.hidden = false; initial.hidden = true; }
    else { image.hidden = true; initial.hidden = false; }
  };
  function renderTick() {
    if (!snapshot) return;
    const clockDirection = snapshot.timerMode === 'up' ? 1 : -1;
    renderDigitalClock(effectiveValue(snapshot.clockSeconds, snapshot.clockRunning, clockDirection));
    if (snapshot.shotClockEnabled) $('shotClock').textContent = String(Math.floor(effectiveValue(snapshot.shotClock, snapshot.shotClockRunning, -1))).padStart(2, '0');
  }
  function render(data) {
    const match = data.match || {}, state = data.state || {};
    snapshot = state; receivedAt = Date.now(); serverOffset = Number(data.serverTime || Date.now()) - receivedAt;
    $('matchName').textContent = match.name || '篮球比赛';
    $('matchMeta').textContent = [match.stage, match.court].filter(Boolean).join(' · ') || '现场比赛';
    setLogo('home', match.home || {}); setLogo('away', match.away || {});
    renderDigitalScore('homeScore', state.homeScore, match.home && match.home.name || '主队');
    renderDigitalScore('awayScore', state.awayScore, match.away && match.away.name || '客队');
    ['homeFouls','awayFouls','homeTimeouts','awayTimeouts'].forEach((key) => { $(key).textContent = Math.max(0, Number(state[key] || 0)); });
    $('period').textContent = Number(state.period) > Number(state.totalPeriods) ? `加时 ${Number(state.period) - Number(state.totalPeriods)}` : `第 ${Math.max(1, Number(state.period || 1))} 节`;
    const awayPossession = state.possession === 'away';
    $('possessionLeft').classList.toggle('is-active', !awayPossession);
    $('possessionRight').classList.toggle('is-active', awayPossession);
    $('possessionLeft').setAttribute('aria-label', `${match.home && match.home.name || '主队'}${awayPossession ? '无球权' : '球权'}`);
    $('possessionRight').setAttribute('aria-label', `${match.away && match.away.name || '客队'}${awayPossession ? '球权' : '无球权'}`);
    $('shotClockPanel').hidden = !state.shotClockEnabled;
    const completed = state.status === 'completed';
    const resting = state.restCountdownVisible;
    $('gameStatus').textContent = completed ? '比赛结束' : resting ? (state.restKind === 'timeout' ? '球队暂停' : '节间休息') : state.clockRunning ? '比赛进行中' : '比赛暂停';
    $('footerText').textContent = completed ? '本场比赛最终赛果' : '比分由裁判计分台实时同步';
    renderTick();
  }
  function connection(mode, label) {
    const node = $('connection'); node.className = `connection is-${mode}`; node.querySelector('span').textContent = label;
    $('offlineMask').hidden = mode !== 'offline' || failures < 3;
  }
  async function request() {
    if (!code) return;
    try {
      connection('connecting', failures ? '重新连接' : '同步中');
      const data = params.get('demo') === '1' ? demoData : await fetch(`${API}?code=${encodeURIComponent(code)}`, { cache: 'no-store' }).then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.ok) throw new Error(payload.message || '大屏连接失败');
        return payload;
      });
      failures = 0; render(data); connection('live', data.state && data.state.status === 'completed' ? '已结束' : '实时同步');
      pairing.hidden = true; board.hidden = false; app.classList.remove('is-pairing');
    } catch (error) {
      failures += 1;
      if (!snapshot) { $('pairingError').textContent = error.message || '无法连接比赛'; stop(); pairing.hidden = false; board.hidden = true; }
      else connection('offline', '连接中断');
    }
  }
  function start(nextCode) {
    code = String(nextCode || '').replace(/\D/g, '').slice(0, 6);
    if (!/^\d{6}$/.test(code) && params.get('demo') !== '1') { $('pairingError').textContent = '请输入完整的6位大屏码'; return; }
    input.value = code; $('pairingError').textContent = '';
    history.replaceState(null, '', `${location.pathname}?code=${encodeURIComponent(code || '000000')}${params.get('demo') === '1' ? '&demo=1' : ''}`);
    stop(); request(); pollTimer = window.setInterval(request, 1000); tickTimer = window.setInterval(renderTick, 250);
  }
  function stop() { clearInterval(pollTimer); clearInterval(tickTimer); pollTimer = 0; tickTimer = 0; }
  form.addEventListener('submit', (event) => { event.preventDefault(); start(input.value); });
  input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, '').slice(0, 6); });
  $('changeCode').addEventListener('click', () => { stop(); snapshot = null; code = ''; board.hidden = true; pairing.hidden = false; input.value = ''; input.focus(); history.replaceState(null, '', location.pathname); });
  $('fullscreen').addEventListener('click', () => { const target = document.documentElement; if (!document.fullscreenElement && target.requestFullscreen) target.requestFullscreen(); else if (document.exitFullscreen) document.exitFullscreen(); });
  window.addEventListener('online', request); window.addEventListener('beforeunload', stop);
  const initial = params.get('code') || (params.get('demo') === '1' ? '000000' : '');
  if (initial) start(initial);
})();
