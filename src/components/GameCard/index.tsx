import { View, Text } from '@tarojs/components';
import type { LiveGame } from '@/data/mock';
import './index.scss';

const statusText = {
  live: '比赛中',
  ready: '待开赛',
  done: '已结束'
};

interface Props {
  game: LiveGame;
}

export default function GameCard({ game }: Props) {
  return (
    <View className='game-card card'>
      <View className='game-card__top'>
        <Text className={`game-card__status game-card__status--${game.status}`}>
          {statusText[game.status]}
        </Text>
        <Text className='game-card__court'>{game.court}</Text>
      </View>
      <View className='game-card__score'>
        <View className='game-card__team'>
          <Text className='game-card__name'>{game.home.shortName}</Text>
          <Text className='game-card__points'>{game.home.score}</Text>
        </View>
        <View className='game-card__meta'>
          <Text>{game.period}</Text>
          <Text>{game.clock}</Text>
        </View>
        <View className='game-card__team game-card__team--right'>
          <Text className='game-card__name'>{game.away.shortName}</Text>
          <Text className='game-card__points'>{game.away.score}</Text>
        </View>
      </View>
      <Text className='game-card__event'>{game.lastEvent}</Text>
    </View>
  );
}
