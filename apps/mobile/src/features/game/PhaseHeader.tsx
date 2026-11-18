import { phaseTitleKey, secondsLeft } from '@werewolf/client-core';
import type { PlayerView } from '@werewolf/shared';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { colors } from '@/components/theme';
import { Badge, Card, Muted } from '@/components/ui';
import { useNames } from './names';

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function PhaseHeader({ view }: { view: PlayerView }) {
  const { t } = useTranslation();
  const name = useNames();
  const now = useNow();
  const phase = view.phase.name;

  let detail: string | null = null;
  if (phase === 'DISCUSSION' && view.speakerId) {
    detail = t('game.speaking', {
      name: name(view.speakerId),
      turn: view.phase.step,
      total: view.speakerOrder?.length ?? 0,
    });
  } else if (phase === 'VOTE' && view.phase.revote > 0) {
    detail = t('game.revote', { count: view.phase.revote });
  } else if ((phase === 'DEFENSE' || phase === 'EXECUTION') && view.accusedId) {
    detail = t('game.accused', { name: name(view.accusedId) });
  } else if (phase === 'HUNTER_SHOT' && view.hunterId) {
    detail = t('game.hunterShooting', { name: name(view.hunterId) });
  }

  return (
    <Card testID={`phase-${phase}`} style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Muted>{t('game.round', { count: view.round })}</Muted>
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>
          {t(phaseTitleKey(view))}
        </Text>
        {detail ? <Text style={{ color: colors.muted }}>{detail}</Text> : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        {phase !== 'GAME_OVER' ? (
          <Text style={{ color: colors.moon, fontSize: 28, fontVariant: ['tabular-nums'] }}>
            {secondsLeft(view.phase.endsAt, now)}s
          </Text>
        ) : null}
        {view.me ? (
          <View testID={`my-role-${view.me.role}`}>
            <Badge
              tone={view.me.team === 'wolves' ? 'bad' : 'good'}
              label={t(`roles.${view.me.role}`)}
            />
          </View>
        ) : null}
        {view.me && !view.me.alive ? <Muted>{t('game.youAreDead')}</Muted> : null}
      </View>
    </Card>
  );
}
