const TAB_BASE = '/components/sxf-tabbar/';

const TAB_ITEMS = [
  { key: 'home', label: '\u5de5\u4f5c\u53f0', icon: TAB_BASE + 'workbench.png', activeIcon: TAB_BASE + 'workbench-active.png', url: '/pages/home/index' },
  { key: 'tournament', label: '\u8d5b\u4e8b', icon: TAB_BASE + 'tournament.png', activeIcon: TAB_BASE + 'tournament-active.png', url: '/pages/tournament/index' },
  { key: 'player', label: '\u7403\u5458', icon: TAB_BASE + 'player.png', activeIcon: TAB_BASE + 'player-active.png', url: '/pages/team/index' },
  { key: 'education', label: '\u6559\u52a1', icon: TAB_BASE + 'education.png', activeIcon: TAB_BASE + 'education-active.png', url: '/pages/education/index' },
  { key: 'data', label: '\u6570\u636e', icon: TAB_BASE + 'data.png', activeIcon: TAB_BASE + 'data-active.png', url: '/pages/data/index' },
  { key: 'mine', label: '\u6211\u7684', icon: TAB_BASE + 'mine.png', activeIcon: TAB_BASE + 'mine-active.png', url: '/pages/mine/index' }
];

Component({
  properties: {
    active: {
      type: String,
      value: 'home'
    },
    tournamentBadgeCount: {
      type: Number,
      value: -1
    }
  },

  data: {
    items: [],
    navigating: false
  },

  observers: {
    active() {
      this.syncItems();
    },
    tournamentBadgeCount() {
      this.syncItems();
    }
  },

  lifetimes: {
    attached() {
      this.syncItems();
    }
  },

  methods: {
    buildItems(active) {
      const storedCount = Number(wx.getStorageSync('sxfTournamentPendingReviewCount') || 0);
      const pendingCount = this.properties.tournamentBadgeCount >= 0 ? this.properties.tournamentBadgeCount : storedCount;
      return TAB_ITEMS.map((item) => {
        const isActive = item.key === active;
        return {
          ...item,
          iconSrc: isActive ? item.activeIcon : item.icon,
          activeClass: isActive ? 'active' : '',
          showBadge: item.key === 'tournament' && pendingCount > 0,
          badgeText: pendingCount > 9 ? '9+' : String(pendingCount)
        };
      });
    },

    syncItems(nextActive) {
      const active = nextActive || this.properties.active;
      this.setData({ items: this.buildItems(active) });
    },

    onTabTap(event) {
      if (this.data.navigating) return;
      const key = event.currentTarget.dataset.key;
      const target = TAB_ITEMS.find((item) => item.key === key);
      if (!target || key === this.properties.active) return;

      this.setData({ navigating: true, items: this.buildItems(key) }, () => {
        wx.redirectTo({
          url: target.url,
          fail: () => {
            this.setData({ navigating: false });
            this.syncItems();
          }
        });
      });
    }
  }
});
