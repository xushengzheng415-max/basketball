import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Button, Input } from '@tarojs/components';
import './index.scss';

type Side = 'home' | 'away';

export default function ScorerPage() {
  const [homeName, setHomeName] = useState('主队');
  const [awayName, setAwayName] = useState('客队');
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [started, setStarted] = useState(false);
  const [events, setEvents] = useState<string[]>([]);

  const resetMatch = () => {
    setHomeScore(0);
    setAwayScore(0);
    setEvents([]);
    setStarted(false);
  };

  const addScore = (side: Side, points: number) => {
    const team = side === 'home' ? homeName : awayName;
    if (side === 'home') {
      setHomeScore((value) => value + points);
    } else {
      setAwayScore((value) => value + points);
    }
    setEvents((list) => [`${team} +${points}`, ...list]);
  };

  const undo = () => {
    const [latest, ...rest] = events;
    if (!latest) return;
    const match = latest.match(/(.+) \+(\d)$/);
    if (match) {
      const [, team, rawPoints] = match;
      const points = Number(rawPoints);
      if (team === homeName) setHomeScore((value) => Math.max(0, value - points));
      if (team === awayName) setAwayScore((value) => Math.max(0, value - points));
    }
    setEvents(rest);
  };

  const finishMatch = () => {
    const result = {
      homeName,
      awayName,
      homeScore,
      awayScore,
      endedAt: new Date().toLocaleString()
    };
    Taro.setStorageSync('latestMatchResult', result);
    Taro.showToast({ title: '赛果已生成', icon: 'success' });
    resetMatch();
    setTimeout(() => Taro.switchTab({ url: '/pages/home/index' }), 500);
  };

  if (!started) {
    return (
      <View className='scorer-setup'>
        <Text className='scorer-setup__title'>创建一场比赛</Text>
        <Text className='scorer-setup__desc'>输入两支队伍名称，然后进入横屏计分盘。</Text>

        <View className='scorer-setup__form'>
          <Text>队伍 A</Text>
          <Input value={homeName} placeholder='请输入主队名称' onInput={(event) => setHomeName(event.detail.value)} />
          <Text>队伍 B</Text>
          <Input value={awayName} placeholder='请输入客队名称' onInput={(event) => setAwayName(event.detail.value)} />
        </View>

        <Button className='scorer-setup__start' onClick={() => setStarted(true)}>开始计分</Button>
      </View>
    );
  }

  return (
    <View className='scoreboard-landscape'>
      <View className='scoreboard-landscape__top'>
        <Text>赛小蜂篮球计分盘</Text>
        <Button onClick={finishMatch}>结束比赛</Button>
      </View>

      <View className='scoreboard-landscape__main'>
        <View className='scoreboard-landscape__team'>
          <Text className='scoreboard-landscape__name'>{homeName}</Text>
          <Text className='scoreboard-landscape__score'>{homeScore}</Text>
          <View className='scoreboard-landscape__buttons'>
            {[1, 2, 3].map((points) => (
              <Button key={points} onClick={() => addScore('home', points)}>+{points}</Button>
            ))}
          </View>
        </View>

        <View className='scoreboard-landscape__center'>
          <Text className='scoreboard-landscape__vs'>VS</Text>
          <Button className='scoreboard-landscape__undo' onClick={undo}>撤销</Button>
          <Button className='scoreboard-landscape__reset' onClick={resetMatch}>重开</Button>
        </View>

        <View className='scoreboard-landscape__team'>
          <Text className='scoreboard-landscape__name'>{awayName}</Text>
          <Text className='scoreboard-landscape__score'>{awayScore}</Text>
          <View className='scoreboard-landscape__buttons'>
            {[1, 2, 3].map((points) => (
              <Button key={points} onClick={() => addScore('away', points)}>+{points}</Button>
            ))}
          </View>
        </View>
      </View>

      <View className='scoreboard-landscape__events'>
        <Text>最近记录</Text>
        <Text>{events[0] || '暂无得分记录'}</Text>
      </View>
    </View>
  );
}
