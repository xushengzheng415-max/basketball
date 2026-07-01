import { View, Text } from '@tarojs/components';
import { playerLeaders } from '@/data/mock';
import './index.scss';

const teamStats = [
  { label: '投篮命中率', home: '48%', away: '43%' },
  { label: '篮板', home: '32', away: '28' },
  { label: '助攻', home: '14', away: '11' },
  { label: '失误', home: '8', away: '10' }
];

export default function StatsPage() {
  return (
    <View className='page stats'>
      <View className='stats__header'>
        <Text className='stats__title'>赛小蜂黄队 vs 海岸少年队</Text>
        <Text className='stats__subtitle'>Q3 06:24 · 实时技术统计</Text>
      </View>

      <Text className='section-title'>球队对比</Text>
      <View className='stats__compare card'>
        {teamStats.map((item) => (
          <View className='stats__row' key={item.label}>
            <Text>{item.home}</Text>
            <Text className='stats__label'>{item.label}</Text>
            <Text>{item.away}</Text>
          </View>
        ))}
      </View>

      <Text className='section-title'>球员表现</Text>
      <View className='stats__leaders'>
        {playerLeaders.map((player) => (
          <View className='stats__leader card' key={player.number}>
            <Text className='stats__leader-name'>#{player.number} {player.name}</Text>
            <View className='stats__leader-grid'>
              <Text>{player.points} 分</Text>
              <Text>{player.rebounds} 篮板</Text>
              <Text>{player.assists} 助攻</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
