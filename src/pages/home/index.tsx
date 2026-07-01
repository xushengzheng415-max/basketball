import Taro from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import GameCard from '@/components/GameCard';
import { todayGames } from '@/data/mock';
import './index.scss';

const quickActions = [
  { label: '进入计分台', path: '/pages/scorer/index' },
  { label: '查看赛事', path: '/pages/tournament/index' },
  { label: '球队数据', path: '/pages/team/index' }
];

export default function HomePage() {
  return (
    <View className='page home'>
      <View className='home__hero'>
        <Text className='home__eyebrow'>赛小蜂篮球</Text>
        <Text className='home__title'>今日比赛中心</Text>
        <Text className='home__subtitle'>计分、赛程、球队和数据一站处理</Text>
      </View>

      <View className='home__actions'>
        {quickActions.map((action) => (
          <View
            className='home__action'
            key={action.label}
            onClick={() => Taro.switchTab({ url: action.path })}
          >
            <Text>{action.label}</Text>
          </View>
        ))}
      </View>

      <Text className='section-title'>今日赛程</Text>
      <View>
        {todayGames.map((game) => (
          <GameCard game={game} key={game.id} />
        ))}
      </View>
    </View>
  );
}
