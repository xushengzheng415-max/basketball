import { View, Text } from '@tarojs/components';
import { playerLeaders, todayGames } from '@/data/mock';
import './index.scss';

export default function TeamPage() {
  return (
    <View className='page team'>
      <View className='team__profile'>
        <View>
          <Text className='team__badge'>黄</Text>
        </View>
        <View className='team__info'>
          <Text className='team__name'>赛小蜂黄队</Text>
          <Text className='team__meta'>U12 · 12 名球员 · 主教练 周晨</Text>
        </View>
      </View>

      <View className='team__stats'>
        <View>
          <Text className='team__stat-value'>5-1</Text>
          <Text className='team__stat-label'>战绩</Text>
        </View>
        <View>
          <Text className='team__stat-value'>62.4</Text>
          <Text className='team__stat-label'>场均得分</Text>
        </View>
        <View>
          <Text className='team__stat-value'>1</Text>
          <Text className='team__stat-label'>小组排名</Text>
        </View>
      </View>

      <Text className='section-title'>下一场</Text>
      <View className='team__next card'>
        <Text>{todayGames[0].court}</Text>
        <Text>{todayGames[0].home.name} vs {todayGames[0].away.name}</Text>
        <Text>{todayGames[0].period} · {todayGames[0].clock}</Text>
      </View>

      <Text className='section-title'>球员榜</Text>
      <View className='team__players card'>
        {playerLeaders.map((player) => (
          <View className='team__player' key={player.number}>
            <Text className='team__number'>#{player.number}</Text>
            <Text className='team__player-name'>{player.name}</Text>
            <Text>{player.points}分</Text>
            <Text>{player.rebounds}板</Text>
            <Text>{player.assists}助</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
