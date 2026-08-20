const voiceStyles = [
  { id: 'standard', name: '赛小智' },
  { id: 'live', name: '赛小瑾' },
  { id: 'kids', name: '赛小萌' }
];

function pick(list, seed) {
  if (!list.length) return '';
  return list[Math.abs(seed) % list.length];
}

function parseClock(clockText) {
  const parts = String(clockText || '00:00').split(':');
  const minutes = Number(parts[0] || 0);
  const seconds = Number(parts[1] || 0);
  if (!minutes && !seconds) return '时间已经走完';
  if (!seconds) return `${minutes}分钟`;
  return `${minutes}分${seconds}秒`;
}

function getLeader(data) {
  const diff = Math.abs(data.homeScore - data.awayScore);
  if (!diff) return { diff, leaderName: '', trailingName: '' };
  const homeLeads = data.homeScore > data.awayScore;
  return {
    diff,
    leaderName: homeLeads ? data.homeName : data.awayName,
    trailingName: homeLeads ? data.awayName : data.homeName
  };
}

function getSituationLine(data, style) {
  const leader = getLeader(data);
  const time = parseClock(data.clockText);
  const lateGame = data.timerMode === 'down' && data.period >= data.totalPeriods && data.clockSeconds <= 120;

  if (!leader.diff) {
    if (style === 'kids') return '两队现在打成平手，小队员们都还有机会。';
    if (style === 'live') return '双方回到同一起跑线，现场悬念又起来了。';
    return '双方目前战平，比赛悬念仍在。';
  }

  if (lateGame && leader.diff <= 5) {
    if (style === 'kids') return `最后${time}，分差只有${leader.diff}分，大家要继续专注。`;
    if (style === 'live') return `最后${time}，只差${leader.diff}分，关键回合来了。`;
    return `比赛进入关键时刻，分差只有${leader.diff}分。`;
  }

  if (leader.diff <= 5) {
    if (style === 'kids') return `${leader.trailingName}还咬得很紧，比赛很精彩。`;
    if (style === 'live') return `分差只有${leader.diff}分，一次进攻就可能改变局面。`;
    return `${leader.leaderName}暂时领先${leader.diff}分，优势并不大。`;
  }

  if (leader.diff <= 12) {
    if (style === 'kids') return `${leader.leaderName}现在领先，但${leader.trailingName}还有追分机会。`;
    if (style === 'live') return `${leader.leaderName}逐渐掌握主动，${leader.trailingName}需要打出回应。`;
    return `${leader.leaderName}暂时掌握主动，目前领先${leader.diff}分。`;
  }

  if (style === 'kids') return `${leader.leaderName}领先比较多，${leader.trailingName}也要继续加油。`;
  if (style === 'live') return `${leader.leaderName}已经拉开分差，${leader.trailingName}需要尽快找到节奏。`;
  return `${leader.leaderName}领先优势比较明显，目前领先${leader.diff}分。`;
}

function getLatestLine(data, style) {
  const latest = data.latestEvent || '';
  if (!latest || latest.indexOf('+') < 0) return '';

  if (latest.indexOf('+3') >= 0) {
    if (style === 'kids') return '刚刚这记三分很棒，出手非常果断。';
    if (style === 'live') return '刚刚三分命中，这一下很提气。';
    return '最近一次得分来自三分球。';
  }

  if (latest.indexOf('+2') >= 0) {
    if (style === 'kids') return '刚刚两分打进，配合不错。';
    if (style === 'live') return '这次两分打进，节奏很干脆。';
    return '最近一次进攻拿到两分。';
  }

  if (latest.indexOf('+1') >= 0) {
    if (style === 'kids') return '罚球拿分也很关键。';
    if (style === 'live') return '罚球稳稳命中，比分继续变化。';
    return '最近一次得分来自罚球。';
  }

  return '';
}

function buildStandard(data, seed) {
  const starts = ['现在为您播报场上比分。', '来看一下当前比分。', '赛小蜂为您带来即时比分。'];
  return [
    pick(starts, seed),
    `第${data.period}节，${data.timerMode === 'down' ? '比赛还剩' : '比赛已经进行'}${parseClock(data.clockText)}。`,
    `目前${data.homeName}${data.homeScore}分，${data.awayName}${data.awayScore}分。`,
    getSituationLine(data, 'standard'),
    getLatestLine(data, 'standard')
  ].filter(Boolean).join('\n');
}

function buildLive(data, seed) {
  const starts = ['漂亮，来看一下当前比分！', '现场比分马上带到！', '赛小蜂 MC 为你播报！'];
  return [
    pick(starts, seed),
    `第${data.period}节，时间${data.timerMode === 'down' ? '还剩' : '已经来到'}${parseClock(data.clockText)}。`,
    `${data.homeName}${data.homeScore}比${data.awayScore}${data.awayName}。`,
    getSituationLine(data, 'live'),
    getLatestLine(data, 'live')
  ].filter(Boolean).join('\n');
}

function buildKids(data, seed) {
  const starts = ['小朋友们加油，我们来看比分。', '现在播报一下比赛比分。', '赛小蜂提醒大家，继续专注比赛。'];
  return [
    pick(starts, seed),
    `现在是第${data.period}节，${data.timerMode === 'down' ? '还剩' : '已经进行了'}${parseClock(data.clockText)}。`,
    `${data.homeName}得到${data.homeScore}分，${data.awayName}得到${data.awayScore}分。`,
    getSituationLine(data, 'kids'),
    getLatestLine(data, 'kids')
  ].filter(Boolean).join('\n');
}

function buildScoreVoice(data, style) {
  const safeData = Object.assign({
    homeName: '主队',
    awayName: '客队',
    homeScore: 0,
    awayScore: 0,
    period: 1,
    totalPeriods: 4,
    clockText: '00:00',
    clockSeconds: 0,
    timerMode: 'down',
    latestEvent: ''
  }, data || {});
  const seed = safeData.homeScore * 13 + safeData.awayScore * 7 + safeData.period * 3 + safeData.clockSeconds;

  if (style === 'live') return buildLive(safeData, seed);
  if (style === 'kids') return buildKids(safeData, seed);
  return buildStandard(safeData, seed);
}

module.exports = { voiceStyles, buildScoreVoice };
