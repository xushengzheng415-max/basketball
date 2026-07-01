import { useState } from 'react';
import { View, Text, Button } from '@tarojs/components';
import { activeLineup, eventLog, liveGame, scorerModes, statActions } from '@/data/mock';
import './index.scss';

type Side = 'home' | 'away';

const sideLabel: Record<Side, string> = {
  home: '主队',
  away: '客队'
};

export default function ScorerPage() {
  const [homeScore, setHomeScore] = useState(liveGame.home.score);
  const [awayScore, setAwayScore] = useState(liveGame.away.score);
  const [events, setEvents] = useState(eventLog);
  const [mode, setMode] = useState('计分');

  const addScore = (side: Side, points: number) => {
    const teamName = side === 'home' ? liveGame.home.shortName : liveGame.away.shortName;
    if (side === 'home') {
      setHomeScore((score) => score + points);
    } else {
      setAwayScore((score) => score + points);
    }
    setEvents((current) => [`${liveGame.clock} ${teamName} 得分 +${points}`, ...current]);
  };

  const addEvent = (label: string) => {
    setEvents((current) => [`${liveGame.clock} ${label}`, ...current]);
  };

  const undoLast = () => {
    setEvents((current) => current.slice(1));
  };

  return (
    <View className='page scorer'>
      <View className='scorer__header'>
        <View>
          <Text className='scorer__court'>{liveGame.court}</Text>
          <Text className='scorer__period'>{liveGame.period} · {liveGame.clock}</Text>
        </View>
        <View className='scorer__sync'>
          <Text className='scorer__live'>比赛中</Text>
          <Text className='scorer__sync-text'>已同步</Text>
        </View>
      </View>

      <View className='scorer__board'>
        <View className='scorer__team'>
          <Text className='scorer__team-name'>{liveGame.home.shortName}</Text>
          <Text className='scorer__score'>{homeScore}</Text>
          <Text className='scorer__meta'>犯规 {liveGame.home.fouls} · 暂停 {liveGame.home.timeouts}</Text>
        </View>
        <Text className='scorer__divider'>:</Text>
        <View className='scorer__team scorer__team--right'>
          <Text className='scorer__team-name'>{liveGame.away.shortName}</Text>
          <Text className='scorer__score'>{awayScore}</Text>
          <Text className='scorer__meta'>犯规 {liveGame.away.fouls} · 暂停 {liveGame.away.timeouts}</Text>
        </View>
      </View>

      <View className='scorer__modes'>
        {scorerModes.map((item) => (
          <Text
            className={`scorer__mode ${mode === item ? 'scorer__mode--active' : ''}`}
            key={item}
            onClick={() => setMode(item)}
          >
            {item}
          </Text>
        ))}
      </View>

      <View className='scorer__lineup card'>
        <View className='scorer__lineup-head'>
          <Text>场上阵容</Text>
          <Text>球员 / 犯规 / 得分</Text>
        </View>
        <View className='scorer__lineup-list'>
          {activeLineup.map((player) => (
            <View className='scorer__player' key={player.number}>
              <Text className='scorer__player-number'>#{player.number}</Text>
              <Text className='scorer__player-name'>{player.name}</Text>
              <Text>{player.fouls}犯</Text>
              <Text>{player.points}分</Text>
              <Text className={`scorer__player-status ${player.status === '场上' ? 'scorer__player-status--active' : ''}`}>
                {player.status}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View className='scorer__controls'>
        {(['home', 'away'] as Side[]).map((side) => (
          <View className='scorer__panel card' key={side}>
            <View className='scorer__panel-head'>
              <Text className='scorer__panel-kicker'>{sideLabel[side]}</Text>
              <Text className='scorer__panel-title'>
                {side === 'home' ? liveGame.home.name : liveGame.away.name}
              </Text>
            </View>
            <View className='scorer__buttons'>
              {[1, 2, 3].map((points) => (
                <Button className='scorer__button' key={points} onClick={() => addScore(side, points)}>
                  +{points}
                </Button>
              ))}
            </View>
            <View className='scorer__secondary'>
              <Button onClick={() => addEvent(`${sideLabel[side]} 犯规`)}>犯规</Button>
              <Button onClick={() => addEvent(`${sideLabel[side]} 暂停`)}>暂停</Button>
              <Button onClick={() => addEvent(`${sideLabel[side]} 换人`)}>换人</Button>
            </View>
          </View>
        ))}
      </View>

      <Text className='section-title'>技术统计快捷键</Text>
      <View className='scorer__stats card'>
        {statActions.map((action) => (
          <Button key={action} onClick={() => addEvent(action)}>{action}</Button>
        ))}
      </View>

      <View className='scorer__event-head'>
        <Text className='section-title'>事件流</Text>
        <Button className='scorer__undo' onClick={undoLast}>撤销上一条</Button>
      </View>
      <View className='scorer__events card'>
        {events.map((event) => (
          <Text className='scorer__event' key={event}>{event}</Text>
        ))}
      </View>

      <View className='scorer__bottom-bar'>
        <Button onClick={() => addEvent('比赛暂停')}>暂停计时</Button>
        <Button onClick={() => addEvent('进入下一节')}>下一节</Button>
        <Button className='scorer__finish' onClick={() => addEvent('结束比赛待确认')}>结束比赛</Button>
      </View>
    </View>
  );
}
