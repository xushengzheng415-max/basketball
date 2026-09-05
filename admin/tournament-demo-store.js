(() => {
  'use strict';

  const organizationId = new URLSearchParams(location.search).get('organizationId') || 'local';
  const KEY = `sxf_tournament_demo_state_v1_${organizationId}`;
  const defaultState = {
    eventId: 'youth-2026',
    organization: '蜂动体育篮球俱乐部',
    groupAssignments: {
      A: ['雷霆队', '飞跃队', '极光队', '猎鹰队'],
      B: ['晨光队', '雄鹿队', '风暴队', '先锋队'],
      C: ['蓝鲸队', '勇士队', '猛虎队', '光明队'],
      D: ['未来之星', '城市篮魔', '破浪队', '黑豹队']
    },
    unassignedTeams: ['闪电队', '星海队', '烈焰队', '疾风队', '荒野队', '天狼队', '极地队', '银河战舰队'],
    scheduleGenerated: false,
    invitation: {
      id: 'INV-G1003-DATA',
      matchId: 'G1003',
      match: '蓝鲸队 VS 勇士队',
      venue: '1号场',
      time: '2026-07-20 14:00',
      role: '球员数据记录员',
      phone: '13800005678',
      displayName: '李娜',
      status: 'pending',
      acceptedAt: ''
    },
    parentProfile: {
      phone: '13800001234',
      player: '张子轩',
      team: '蜂动勇士',
      birth: '2014年05月',
      identityStatus: 'pending',
      photoStatus: 'pending',
      packagePurchased: false,
      reportStatus: '未生成'
    },
    resultReviews: {
      G1001: 'approved',
      G1002: 'returned',
      G1003: 'pending',
      G1004: 'pending',
      G1005: 'approved',
      G1006: 'pending'
    },
    settlementStatus: 'pending',
    updatedAt: Date.now()
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function read() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      return saved ? Object.assign(clone(defaultState), saved) : clone(defaultState);
    } catch (error) {
      return clone(defaultState);
    }
  }

  function write(state) {
    state.updatedAt = Date.now();
    localStorage.setItem(KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('sxf:tournament-state', { detail: clone(state) }));
    return state;
  }

  function update(mutator) {
    const state = read();
    mutator(state);
    return write(state);
  }

  window.SXFTournamentStore = { key: KEY, defaults: clone(defaultState), read, write, update };
})();
