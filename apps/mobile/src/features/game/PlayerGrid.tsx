import { countVotes } from '@werewolf/client-core';
import type { PlayerView } from '@werewolf/shared';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { colors } from '@/components/theme';
import { Badge, styles } from '@/components/ui';
import { useVoice } from '@/lib/client';
import { useNames } from './names';

interface Props {
  view: PlayerView;
  selectable: (id: string) => boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function PlayerGrid({ view, selectable, selectedId, onSelect }: Props) {
  const { t } = useTranslation();
  const name = useNames();
  const speaking = useVoice((s) => s.speaking);
  const dayVotes = countVotes(view.dayVotes);
  const wolfVotes = countVotes(view.wolfVotes);

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {[...view.players]
        .sort((a, b) => a.seat - b.seat)
        .map((p) => {
          const canSelect = selectable(p.id);
          const selected = selectedId === p.id;
          const talking = speaking.includes(p.id);
          return (
            <Pressable
              key={p.id}
              testID={`player-card-${canSelect ? 'on' : 'off'}`}
              disabled={!canSelect}
              onPress={() => onSelect(p.id)}
              style={{
                width: '48%',
                padding: 10,
                gap: 4,
                borderRadius: 10,
                borderWidth: selected || talking || view.speakerId === p.id ? 2 : 1,
                borderColor: selected
                  ? colors.moon
                  : talking || view.speakerId === p.id
                    ? colors.speaking
                    : colors.border,
                backgroundColor: p.alive ? colors.card : 'rgba(0,0,0,0.3)',
                opacity: p.alive ? 1 : 0.6,
              }}
            >
              <View style={styles.row}>
                <Text style={{ color: colors.faint, fontSize: 12 }}>#{p.seat}</Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.text,
                    flexShrink: 1,
                    textDecorationLine: p.alive ? 'none' : 'line-through',
                  }}
                >
                  {name(p.id)}
                </Text>
                {p.id === view.me?.id ? (
                  <Text style={{ color: colors.muted, fontSize: 12 }}>({t('game.you')})</Text>
                ) : null}
                {view.speakerId === p.id || talking ? <Text>🎙️</Text> : null}
              </View>
              <View style={styles.row}>
                {p.role ? (
                  <Badge
                    tone={p.role === 'werewolf' ? 'bad' : 'neutral'}
                    label={t(`roles.${p.role}`)}
                  />
                ) : null}
                {!p.alive ? <Badge label={t('game.dead')} /> : null}
                {view.accusedId === p.id ? <Badge tone="bad" label={t('game.onTrial')} /> : null}
                {dayVotes[p.id] ? (
                  <Badge tone="moon" label={t('game.votes', { count: dayVotes[p.id] })} />
                ) : null}
                {wolfVotes[p.id] ? <Badge tone="bad" label={`🐺 × ${wolfVotes[p.id]}`} /> : null}
              </View>
            </Pressable>
          );
        })}
    </View>
  );
}
