import { describeEvent, phaseStepKey, targetable, useGame } from '@werewolf/client-core';
import type { PlayerView, RoomRules } from '@werewolf/shared';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, ScrollView, Text } from 'react-native';
import { colors } from '@/components/theme';
import { Card, Title } from '@/components/ui';
import { ChatPanel } from '@/features/chat/ChatPanel';
import { VoiceBar } from '@/features/voice/VoiceBar';
import { ActionPanel } from './ActionPanel';
import { useNames } from './names';
import { PhaseHeader } from './PhaseHeader';
import { PlayerGrid } from './PlayerGrid';

/** Keeps the screen on during a game (native only: the web wake-lock API throws on fast unmounts). */
function KeepAwake() {
  useKeepAwake();
  return null;
}

/** Buzz when it becomes this player's turn to act (FR-MISC-01). */
function useTurnHaptics(view: PlayerView) {
  // One buzz per phase step in which this player has something to do.
  const turnKey = view.me?.pendingAction && !view.me.submitted ? phaseStepKey(view) : null;
  useEffect(() => {
    if (turnKey && Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [turnKey]);
}

export function GameScreen({
  gameId,
  view,
  rules,
}: {
  gameId: string;
  view: PlayerView;
  rules: RoomRules | undefined;
}) {
  const { t } = useTranslation();
  const name = useNames();
  const events = useGame((s) => s.events);
  useTurnHaptics(view);

  // A selection belongs to one phase step.
  const key = phaseStepKey(view);
  const [selection, setSelection] = useState<{ key: string; id: string | null }>({ key, id: null });
  const selectedId = selection.key === key ? selection.id : null;

  const log = events
    .map((e) => ({ seq: e.seq, text: describeEvent(e, t, name) }))
    .filter((l): l is { seq: number; text: string } => l.text !== null)
    .slice(-20)
    .reverse();

  return (
    <ScrollView
      contentContainerStyle={{ padding: 12, gap: 12 }}
      keyboardShouldPersistTaps="handled"
    >
      {Platform.OS === 'web' ? null : <KeepAwake />}
      <PhaseHeader view={view} />
      <VoiceBar />
      <PlayerGrid
        view={view}
        selectable={(id) => targetable(view, rules, id)}
        selectedId={selectedId}
        onSelect={(id) => setSelection({ key, id: selectedId === id ? null : id })}
      />
      <ActionPanel
        gameId={gameId}
        view={view}
        selectedId={selectedId}
        clearSelection={() => setSelection({ key, id: null })}
      />
      {view.me?.seerResults?.length ? (
        <Card>
          <Title>{t('game.seerResults')}</Title>
          {view.me.seerResults.map((r) => (
            <Text key={`${r.round}-${r.targetId}`} style={{ color: colors.text }}>
              {t(r.isWolf ? 'log.seerWolf' : 'log.seerNotWolf', { name: name(r.targetId) })}
            </Text>
          ))}
        </Card>
      ) : null}
      <ChatPanel />
      <Card>
        <Title>{t('log.title')}</Title>
        {log.map((l) => (
          <Text key={l.seq} style={{ color: colors.muted }}>
            {l.text}
          </Text>
        ))}
      </Card>
    </ScrollView>
  );
}
