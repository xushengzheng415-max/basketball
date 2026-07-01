import { View, Text } from '@tarojs/components';
import GameCard from '@/components/GameCard';
import { standings, todayGames } from '@/data/mock';
import './index.scss';

export default function TournamentPage() {
  return (
    <View className='page tournament'>
      <View className='tournament__summary'>
        <Text className='tournament__name'>赛小蜂暑期联赛 U12</Text>
        <Text className='tournament__meta'>8 支球队 · 2 个场地 · 24 场比赛</Text>
      </View>

      <Text className='section-title'>进行中与下一场</Text>
      {todayGames.slice(0, 2).map((game) => (
        <GameCard game={game} key={game.id} />
      ))}

      <Text className='section-title'>积分榜</Text>
      <View className='tournament__table card'>
        {standings.map((row, index) => (
          <View className='tournament__row' key={row.team}>
            <Text className='tournament__rank'>{index + 1}</Text>
            <Text className='tournament__team'>{row.team}</Text>
            <Text className='tournament__record'>{row.wins}胜 {row.losses}负</Text>
            <Text className='tournament__points'>{row.points}</Text>
          </View>
        ))}
      </View>

      <Text className='section-title'>运营提醒</Text>
      <View className='tournament__alerts'>
        <Text>蜂巢 2 号场 15:30 比赛阵容待确认</Text>
        <Text>U12 A 组第 6 轮赛果待审核</Text>
      </View>
    </View>
  );
}
