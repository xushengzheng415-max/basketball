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
      <View className='login-page__court login-page__court--left' />
      <View className='login-page__court login-page__court--right' />
      <View className='login-page__beam login-page__beam--one' />
      <View className='login-page__beam login-page__beam--two' />
      <View className='login-page__beam login-page__beam--three' />
      <View className='login-page__lights'>
        <Text />
        <Text />
        <Text />
      </View>

      <View className='login-page__hero'>
        <View className='login-page__mark'>
          <View className='login-page__speed login-page__speed--one' />
          <View className='login-page__speed login-page__speed--two' />
          <View className='login-page__bee'>
            <View className='login-page__wing login-page__wing--main' />
            <View className='login-page__wing login-page__wing--small' />
            <View className='login-page__body' />
            <View className='login-page__head' />
            <View className='login-page__tail' />
          </View>
          <View className='login-page__orbit login-page__orbit--white' />
          <View className='login-page__orbit login-page__orbit--orange' />
          <View className='login-page__ball'>
            <View className='login-page__ball-line login-page__ball-line--v' />
            <View className='login-page__ball-line login-page__ball-line--h' />
            <View className='login-page__ball-line login-page__ball-line--a' />
            <View className='login-page__ball-line login-page__ball-line--b' />
          </View>
          <Text className='login-page__spark login-page__spark--one'>*</Text>
          <Text className='login-page__spark login-page__spark--two'>*</Text>
          <Text className='login-page__spark login-page__spark--three'>*</Text>
        </View>

        <View className='login-page__title-wrap'>
          <Text className='login-page__name'>赛小蜂篮球</Text>
          <Text className='login-page__english'>BASKETBALL</Text>
          <Text className='login-page__slogan'>热爱上场 · 蜂行无畏</Text>
        </View>
      </View>

      <View className='login-page__panel'>
        <View className='login-page__panel-ball'>
          <View className='login-page__panel-ball-line login-page__panel-ball-line--v' />
          <View className='login-page__panel-ball-line login-page__panel-ball-line--a' />
        </View>

        <Button className='login-page__button login-page__button--primary' onClick={() => enterApp('wechat')}>
          <Text className='login-page__wechat'>●●</Text>
          <Text>微信一键登录</Text>
          <Text className='login-page__slash'>▰</Text>
        </Button>
        <Button className='login-page__button login-page__button--ghost' onClick={() => enterApp('guest')}>
          <Text className='login-page__guest-icon'>●</Text>
          <Text>游客体验</Text>
        </Button>

        <View className='login-page__agreement' onClick={() => setAgreed((value) => !value)}>
          <View className={agreed ? 'login-page__check login-page__check--active' : 'login-page__check'}>
            <Text>✓</Text>
          </View>
          <Text>登录即代表同意</Text>
          <Text className='login-page__link'>用户协议</Text>
          <Text>和</Text>
          <Text className='login-page__link'>隐私政策</Text>
        </View>
      </View>
    </View>
  );
}
