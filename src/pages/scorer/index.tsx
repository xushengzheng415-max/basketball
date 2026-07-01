import { useState } from 'react';
import { View, Text, Button } from '@tarojs/components';
import { eventLog, liveGame } from '@/data/mock';
import './index.scss';

type Side = 'home' | 'away';

export default function ScorerPage() {
  const [homeScore, setHomeScore] = useState(liveGame.home.score);
  const [awayScore, setAwayScore] = useState(liveGame.away.score);
  const [events, setEvents] = useState(eventLog);

  const addScore = (side: Side, points: number) => {
    const teamName = side === 'home' ? liveGame.home.shortName : liveGame.away.shortName;
    if (side === 'home') {
      setHomeScore((score) => score + points);
    } else {
      setAwayScore((score) => score + points);
    }
    setEvents((current) => [`${liveGame.clock} ${teamName} 得分 +${points}`, ...current]);
  };

  return (
    <View className='page scorer'>
      <View className='scorer__header'>
        <View>
          <Text className='scorer__court'>{liveGame.court}</Text>
          <Text className='scorer__period'>{liveGame.period} · {liveGame.clock}</Text>
        </View>
        <Text className='scorer__live'>比赛中</Text>
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

      <View className='scorer__controls'>
        {(['home', 'away'] as Side[]).map((side) => (
          <View className='scorer__panel card' key={side}>
            <Text className='scorer__panel-title'>
              {side === 'home' ? liveGame.home.name : liveGame.away.name}
            </Text>
            <View className='scorer__buttons'>
              {[1, 2, 3].map((points) => (
                <Button className='scorer__button' key={points} onClick={() => addScore(side, points)}>
                  +{points}
                </Button>
              ))}
            </View>
            <View className='scorer__secondary'>
              <Button>犯规</Button>
              <Button>暂停</Button>
              <Button>换人</Button>
            </View>
          </View>
        ))}
      </View>

      <Text className='section-title'>事件流</Text>
      <View className='scorer__events card'>
        {events.map((event) => (
          <Text className='scorer__event' key={event}>{event}</Text>
        ))}
      </View>
    </View>
  );
}
