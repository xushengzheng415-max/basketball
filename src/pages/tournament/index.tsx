import { useState } from 'react';
import { View, Text, Button, Input } from '@tarojs/components';
import './index.scss';

interface TournamentDraft {
  name: string;
  location: string;
  date: string;
}

export default function TournamentPage() {
  const [draft, setDraft] = useState<TournamentDraft>({ name: '', location: '', date: '' });
  const [created, setCreated] = useState<TournamentDraft[]>([]);

  const createTournament = () => {
    if (!draft.name.trim()) return;
    setCreated((list) => [draft, ...list]);
    setDraft({ name: '', location: '', date: '' });
  };

  return (
    <View className='page tournament-simple'>
      <Text className='tournament-simple__title'>创建赛事</Text>
      <Text className='tournament-simple__desc'>先记录赛事名称、地点和日期，后续再补赛程和分组。</Text>

      <View className='tournament-simple__form'>
        <Input value={draft.name} placeholder='赛事名称，例如：暑期篮球联赛' onInput={(event) => setDraft({ ...draft, name: event.detail.value })} />
        <Input value={draft.location} placeholder='比赛地点，例如：蜂巢 1 号场' onInput={(event) => setDraft({ ...draft, location: event.detail.value })} />
        <Input value={draft.date} placeholder='比赛日期，例如：2026-07-20' onInput={(event) => setDraft({ ...draft, date: event.detail.value })} />
        <Button onClick={createTournament}>保存赛事</Button>
      </View>

      <Text className='tournament-simple__section'>已创建赛事</Text>
      {created.length === 0 ? (
        <View className='tournament-simple__empty'>暂无赛事</View>
      ) : created.map((item) => (
        <View className='tournament-simple__item' key={`${item.name}-${item.date}`}>
          <Text>{item.name}</Text>
          <Text>{item.location || '未填写地点'} · {item.date || '未填写日期'}</Text>
        </View>
      ))}
    </View>
  );
}
