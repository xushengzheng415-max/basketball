const TAB_BASE = '/assets/common/tabbar/';

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
    }
  },

  data: {
    items: []
  },

  observers: {
    active() {
      this.syncItems();
    }
  },

  lifetimes: {
    attached() {
      this.syncItems();
    }
  },

  methods: {
    syncItems() {
      const active = this.properties.active;
      const items = TAB_ITEMS.map((item) => {
        const isActive = item.key === active;
        return {
          ...item,
          iconSrc: isActive ? item.activeIcon : item.icon,
          activeClass: isActive ? 'active' : ''
        };
      });
      this.setData({ items });
    },

    onTabTap(event) {
      const key = event.currentTarget.dataset.key;
      const target = TAB_ITEMS.find((item) => item.key === key);
      if (!target || key === this.properties.active) return;

      wx.redirectTo({ url: target.url });
    }
  }
});