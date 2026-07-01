export type GameStatus = 'live' | 'ready' | 'done';

export interface TeamScore {
  name: string;
  shortName: string;
  score: number;
  fouls: number;
  timeouts: number;
  color: string;
}

export interface LiveGame {
  id: string;
  status: GameStatus;
  court: string;
  period: string;
  clock: string;
  home: TeamScore;
  away: TeamScore;
  lastEvent: string;
}

export const liveGame: LiveGame = {
  id: 'game-0720-u12-a',
  status: 'live',
  court: '蜂巢 1 号场',
  period: 'Q3',
  clock: '06:24',
  home: {
    name: '赛小蜂黄队',
    shortName: '黄队',
    score: 42,
    fouls: 3,
    timeouts: 1,
    color: '#F8D568'
  },
  away: {
    name: '海岸少年队',
    shortName: '海岸',
    score: 39,
    fouls: 4,
    timeouts: 2,
    color: '#2F80ED'
  },
  lastEvent: '8 号 张乐 快攻上篮 +2'
};

export const todayGames = [
  liveGame,
  {
    id: 'game-0720-u10-b',
    status: 'ready' as GameStatus,
    court: '蜂巢 2 号场',
    period: '待开赛',
    clock: '15:30',
    home: { name: '赛小蜂蓝队', shortName: '蓝队', score: 0, fouls: 0, timeouts: 2, color: '#2F80ED' },
    away: { name: '风暴训练营', shortName: '风暴', score: 0, fouls: 0, timeouts: 2, color: '#21A67A' },
    lastEvent: '双方阵容待确认'
  },
  {
    id: 'game-0719-u14-final',
    status: 'done' as GameStatus,
    court: '中心馆',
    period: '已结束',
    clock: '完赛',
    home: { name: '赛小蜂黑队', shortName: '黑队', score: 68, fouls: 5, timeouts: 0, color: '#101820' },
    away: { name: '星火少年队', shortName: '星火', score: 64, fouls: 6, timeouts: 0, color: '#D83B01' },
    lastEvent: '赛小蜂黑队获得 U14 组冠军'
  }
];

export const eventLog = [
  '06:24 Q3 黄队 8号 张乐 上篮命中 +2',
  '06:49 Q3 海岸 11号 王祺 防守犯规',
  '07:18 Q3 黄队 请求暂停',
  '07:42 Q3 海岸 5号 陈一 三分命中 +3'
];

export const playerLeaders = [
  { name: '张乐', number: 8, points: 18, rebounds: 6, assists: 4 },
  { name: '林浩', number: 12, points: 14, rebounds: 9, assists: 2 },
  { name: '陈一', number: 5, points: 13, rebounds: 3, assists: 5 }
];

export const standings = [
  { team: '赛小蜂黄队', wins: 5, losses: 1, points: 11 },
  { team: '海岸少年队', wins: 4, losses: 2, points: 10 },
  { team: '风暴训练营', wins: 3, losses: 3, points: 9 }
];

export const homeMetrics = [
  { label: '今日比赛', value: '12', hint: '3 场进行中' },
  { label: '待确认阵容', value: '4', hint: '赛前 30 分钟提醒' },
  { label: '待审核赛果', value: '2', hint: '需运营确认' }
];

export const operationAlerts = [
  { level: 'high', title: '15:30 蜂巢 2 号场阵容未确认', action: '联系双方教练' },
  { level: 'medium', title: 'U12 A 组第 6 轮赛果待审核', action: '查看事件流' },
  { level: 'low', title: '明日 09:00 场地排班待发布', action: '进入赛事管理' }
];

export const activeLineup = [
  { number: 8, name: '张乐', fouls: 2, points: 18, status: '场上' },
  { number: 12, name: '林浩', fouls: 1, points: 14, status: '场上' },
  { number: 23, name: '周远', fouls: 0, points: 6, status: '场上' },
  { number: 3, name: '孙皓', fouls: 0, points: 4, status: '替补' }
];

export const scorerModes = ['计分', '技术统计', '阵容', '事件流'];

export const statActions = ['篮板', '助攻', '抢断', '盖帽', '失误'];
