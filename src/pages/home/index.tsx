import Taro from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import GameCard from '@/components/GameCard';
import { homeMetrics, operationAlerts, todayGames } from '@/data/mock';
import './index.scss';

const quickActions = [
  { label: '进入计分台', path: '/pages/scorer/index', tone: 'primary' },
  { label: '查看赛事', path: '/pages/tournament/index', tone: 'dark' },
  { label: '球队数据', path: '/pages/team/index', tone: 'light' }
];

export default function HomePage() {
  return (
    <View className='page home'>
      <View className='home__hero'>
        <View>
          <Text className='home__eyebrow'>赛小蜂篮球 · 运营工作台</Text>
          <Text className='home__title'>今日比赛中心</Text>
          <Text className='home__subtitle'>计分、赛程、球队和数据一站处理</Text>
        </View>
        <Text className='home__live-badge'>3 场直播</Text>
      </View>

      <View className='home__metrics'>
        {homeMetrics.map((metric) => (
          <View className='home__metric card' key={metric.label}>
            <Text className='home__metric-value'>{metric.value}</Text>
            <Text className='home__metric-label'>{metric.label}</Text>
            <Text className='home__metric-hint'>{metric.hint}</Text>
          </View>
        ))}
      </View>

      <View className='home__actions'>
        {quickActions.map((action) => (
          <View
            className={`home__action home__action--${action.tone}`}
            key={action.label}
            onClick={() => Taro.switchTab({ url: action.path })}
          >
            <Text>{action.label}</Text>
          </View>
        ))}
      </View>

      <Text className='section-title'>运营提醒</Text>
      <View className='home__alerts'>
        {operationAlerts.map((alert) => (
          <View className={`home__alert home__alert--${alert.level}`} key={alert.title}>
            <View>
              <Text className='home__alert-title'>{alert.title}</Text>
              <Text className='home__alert-action'>{alert.action}</Text>
            </View>
            <Text className='home__alert-arrow'>›</Text>
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
