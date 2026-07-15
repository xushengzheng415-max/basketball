const featureBase = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/pages/data/';
const tabBase = 'cloud://cloudbase-d4g93f0re5f3274c1.636c-cloudbase-d4g93f0re5f3274c1-1446269281/ui-assets/assets/common/tabbar/';

const features = [
  { title: '赛事数据', icon: `${featureBase}icon-event-data.png`, status: '规划中', statusClass: '', cardClass: 'feature-card' },
  { title: '球员技术统计', icon: `${featureBase}icon-player-stats.png`, status: '规划中', statusClass: '', cardClass: 'feature-card' },
  { title: '球队数据', icon: `${featureBase}icon-team-data.png`, status: '已开放', statusClass: 'open', cardClass: 'feature-card open', url: '/pages/team-data/index' },
  { title: '成长趋势', icon: `${featureBase}icon-growth-trend.png`, status: '规划中', statusClass: '', cardClass: 'feature-card' },
  { title: '家长端同步', icon: `${featureBase}icon-parent-sync.png`, status: '规划中', statusClass: '', cardClass: 'feature-card' },
  { title: '数据海报', icon: `${featureBase}icon-data-poster.png`, status: '规划中', statusClass: '', cardClass: 'feature-card' }
];

const rangeItems = [
  {
    title: '比赛比分保存',
    desc: '记录并保存比赛实时比分数据',
    icon: `${featureBase}icon-scoreboard.png`,
    url: '/pages/scorer/index'
  },
  {
    title: '最近赛果展示',
    desc: '展示近期比赛结果与比分',
    icon: `${featureBase}icon-result-list.png`,
    url: '/pages/home/index'
  },
  {
    title: '基础球员信息',
    desc: '管理球员姓名、号码、球队等基础信息',
    icon: `${featureBase}icon-basic-player.png`,
    url: '/pages/team/index'
  }
];

const tabItems = [
  { key: 'workbench', label: '工作台', icon: `${tabBase}workbench.png`, url: '/pages/home/index', labelClass: '' },
  { key: 'tournament', label: '赛事', icon: `${tabBase}tournament.png`, url: '/pages/tournament/index', labelClass: '' },
  { key: 'player', label: '球员', icon: `${tabBase}player.png`, url: '/pages/team/index', labelClass: '' },
  { key: 'education', label: '教务', icon: `${tabBase}education.png`, disabled: true, labelClass: '' },
  { key: 'data', label: '数据', icon: `${tabBase}data-active.png`, disabled: true, labelClass: 'active' },
  { key: 'mine', label: '我的', icon: `${tabBase}mine.png`, url: '/pages/mine/index', labelClass: '' }
];

function openUrl(url) {
  if (!url) return;
  const tabUrls = ['/pages/home/index', '/pages/tournament/index', '/pages/team/index', '/pages/mine/index'];
  if (tabUrls.indexOf(url) >= 0) {
    wx.redirectTo({ url });
    return;
  }
  wx.navigateTo({ url });
}

Page({
  data: {
    features,
    rangeItems,
    tabItems
  },

  goWorkbench() {
    wx.redirectTo({ url: '/pages/home/index' });
  },

  goRangeItem(event) {
    openUrl(event.currentTarget.dataset.url);
  },

  goFeature(event) {
    openUrl(event.currentTarget.dataset.url);
  },

  goTab(event) {
    const { disabled, url } = event.currentTarget.dataset;
    if (disabled) return;
    openUrl(url);
  }
});
