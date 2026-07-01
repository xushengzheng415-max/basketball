import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Button, Text, View } from '@tarojs/components';
import './index.scss';

export default function LoginPage() {
  const [agreed, setAgreed] = useState(true);

  const enterApp = (mode: 'wechat' | 'guest') => {
    if (!agreed) {
      Taro.showToast({ title: '请先勾选用户协议', icon: 'none' });
      return;
    }

    Taro.setStorageSync('loginProfile', {
      mode,
      loggedAt: Date.now()
    });
    Taro.switchTab({ url: '/pages/home/index' });
  };

  return (
    <View className='page login-page'>
      <View className='login-page__honeycomb' />
      <View className='login-page__glow login-page__glow--top' />
      <View className='login-page__glow login-page__glow--bottom' />

      <View className='login-page__content'>
        <View className='login-page__brand'>
          <View className='login-page__badge'>
            <View className='login-page__speed login-page__speed--one' />
            <View className='login-page__speed login-page__speed--two' />
            <View className='login-page__bee'>
              <View className='login-page__wing login-page__wing--main' />
              <View className='login-page__wing login-page__wing--small' />
              <View className='login-page__body' />
              <View className='login-page__head' />
              <View className='login-page__tail' />
            </View>
            <View className='login-page__orbit' />
            <View className='login-page__ball'>
              <View className='login-page__ball-line login-page__ball-line--v' />
              <View className='login-page__ball-line login-page__ball-line--h' />
              <View className='login-page__ball-line login-page__ball-line--a' />
            </View>
            <Text className='login-page__spark login-page__spark--one'>*</Text>
            <Text className='login-page__spark login-page__spark--two'>*</Text>
          </View>

          <Text className='login-page__name'>赛小蜂篮球</Text>
          <Text className='login-page__english'>BASKETBALL</Text>
          <Text className='login-page__slogan'>赛事管理 · 球员数据 · 比赛计分</Text>
        </View>

        <View className='login-page__panel'>
          <Text className='login-page__panel-title'>欢迎回来</Text>
          <Text className='login-page__panel-desc'>登录后同步球队、赛事和计分记录。</Text>

          <Button className='login-page__button login-page__button--primary' onClick={() => enterApp('wechat')}>
            微信一键登录
          </Button>
          <Button className='login-page__button login-page__button--ghost' onClick={() => enterApp('guest')}>
            游客体验
          </Button>

          <View className='login-page__agreement' onClick={() => setAgreed((value) => !value)}>
            <View className={agreed ? 'login-page__check login-page__check--active' : 'login-page__check'}>
              <Text>✓</Text>
            </View>
            <Text>登录即代表同意用户协议和隐私政策</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
