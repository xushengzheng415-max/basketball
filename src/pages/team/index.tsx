import { useState } from 'react';
import { View, Text, Button, Input } from '@tarojs/components';
import './index.scss';

interface PlayerDraft {
  name: string;
  number: string;
}

export default function TeamPage() {
  const [draft, setDraft] = useState<PlayerDraft>({ name: '', number: '' });
  const [players, setPlayers] = useState<PlayerDraft[]>([]);

  const addPlayer = () => {
    if (!draft.name.trim()) return;
    setPlayers((list) => [...list, draft]);
    setDraft({ name: '', number: '' });
  };

  return (
    <View className='page team-simple'>
      <Text className='team-simple__title'>球员名单</Text>
      <Text className='team-simple__desc'>先把比赛要用的球员姓名和号码录进去。</Text>

      <View className='team-simple__form'>
        <Input value={draft.name} placeholder='球员姓名' onInput={(event) => setDraft({ ...draft, name: event.detail.value })} />
        <Input value={draft.number} placeholder='号码，例如：8' type='number' onInput={(event) => setDraft({ ...draft, number: event.detail.value })} />
        <Button onClick={addPlayer}>添加球员</Button>
      </View>

      <Text className='team-simple__section'>当前名单</Text>
      {players.length === 0 ? (
        <View className='team-simple__empty'>暂无球员</View>
      ) : players.map((player, index) => (
        <View className='team-simple__player' key={`${player.name}-${index}`}>
          <Text className='team-simple__number'>#{player.number || '--'}</Text>
          <Text>{player.name}</Text>
        </View>
      ))}
    </View>
  );
}
