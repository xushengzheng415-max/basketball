import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import './index.scss';

interface MatchResult {
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
  endedAt: string;
}

export default function HomePage() {
  const [result, setResult] = useState<MatchResult | null>(null);

  useDidShow(() => {
    const saved = Taro.getStorageSync<MatchResult | ''>('latestMatchResult');
    setResult(saved || null);
  });

  const startMatch = () => {
    Taro.navigateTo({ url: '/pages/scorer/index' });
  };

  return (
    <View className='page home-simple'>
      <View className='home-simple__hero'>
        <Text className='home-simple__brand'>赛小蜂篮球</Text>
        <Text className='home-simple__title'>快速开始一场比赛</Text>
        <Text className='home-simple__desc'>输入两支队伍，横屏计分，结束后自动生成赛果。</Text>
      </View>

      <View className='home-simple__primary' onClick={startMatch}><Text>进入比赛积分系统</Text></View>

      <View className='home-simple__result'>
        <Text className='home-simple__section'>最近赛果</Text>
        {result ? (
          <View className='home-simple__result-card'>
            <View className='home-simple__result-row'>
              <Text>{result.homeName}</Text>
              <Text className='home-simple__score'>{result.homeScore}</Text>
            </View>
            <View className='home-simple__result-row'>
              <Text>{result.awayName}</Text>
              <Text className='home-simple__score'>{result.awayScore}</Text>
            </View>
            <Text className='home-simple__time'>{result.endedAt}</Text>
          </View>
        ) : (
          <View className='home-simple__empty'>
            <Text>暂无赛果，先开始一场比赛吧。</Text>
          </View>
        )}
      </View>

      <View className='home-simple__shortcuts'>
        <View onClick={() => Taro.switchTab({ url: '/pages/tournament/index' })}>
          <Text className='home-simple__shortcut-title'>创建赛事</Text>
          <Text className='home-simple__shortcut-desc'>赛事名称、地点、时间</Text>
        </View>
        <View onClick={() => Taro.switchTab({ url: '/pages/team/index' })}>
          <Text className='home-simple__shortcut-title'>球员名单</Text>
          <Text className='home-simple__shortcut-desc'>添加球员与号码</Text>
        </View>
      </View>
    </View>
  );
}


