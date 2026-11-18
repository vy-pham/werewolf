import { attempt } from '@werewolf/client-core';
import type { GameCommand, PlayerView } from '@werewolf/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { colors } from '@/components/theme';
import { Button, Card, Muted, styles, Title, Toggle } from '@/components/ui';
import { call } from '@/lib/client';
import { useNames } from './names';

interface Props {
  gameId: string;
  view: PlayerView;
  selectedId: string | null;
  clearSelection: () => void;
}

/**
 * What the viewer can do right now (`view.me.pendingAction`); the server validates everything.
 * testID encodes the state for automated tests: `action-panel-<ACTION>-<open|done>`.
 */
export function ActionPanel({ gameId, view, selectedId, clearSelection }: Props) {
  const { t } = useTranslation();
  const name = useNames();
  const [heal, setHeal] = useState(false);
  const me = view.me;
  const action = me?.pendingAction ?? null;

  const send = async (command: GameCommand) => {
    if (await attempt(t, () => call('game:action', { gameId, command }))) {
      clearSelection();
      setHeal(false);
    }
  };

  if (!me) return null;
  if (!action) {
    return (
      <Card testID="action-panel-none">
        <Muted>{me.alive ? t('action.waiting') : t('action.deadSpectator')}</Muted>
      </Card>
    );
  }
  const changeable = action === 'WOLF_VOTE' || action === 'DAY_VOTE';
  if (me.submitted && !changeable) {
    return (
      <Card testID={`action-panel-${action}-done`}>
        <Muted>{t('action.done')}</Muted>
      </Card>
    );
  }
  const target = selectedId ? name(selectedId) : null;

  return (
    <Card
      testID={`action-panel-${action}-${me.submitted ? 'done' : 'open'}`}
      style={{ borderColor: colors.moon }}
    >
      <Title>{t(`action.title.${action}`)}</Title>
      <Muted>{t(`action.help.${action}`)}</Muted>

      {action === 'END_TURN' ? (
        <Button
          testID="action-confirm"
          title={t('action.endTurn')}
          onPress={() => send({ type: 'END_TURN' })}
        />
      ) : action === 'WITCH_ACT' ? (
        <>
          <Text style={{ color: colors.text }}>
            {me.witch?.victimId
              ? t('action.witchVictim', { name: name(me.witch.victimId) })
              : t('action.witchNoVictim')}
          </Text>
          <Toggle
            label={t('action.witchHeal')}
            value={heal}
            disabled={!me.witch?.victimId || me.witch.healUsed}
            onChange={setHeal}
          />
          <Muted>
            {me.witch?.poisonUsed
              ? t('action.witchPoisonUsed')
              : target
                ? t('action.witchPoison', { name: target })
                : t('action.witchPickPoison')}
          </Muted>
          <View style={styles.row}>
            <Button
              testID="action-confirm"
              title={t('action.confirm')}
              onPress={() =>
                send({
                  type: 'WITCH_ACT',
                  heal,
                  poisonTargetId: me.witch?.poisonUsed ? null : selectedId,
                })
              }
            />
            <Button
              testID="action-skip"
              variant="secondary"
              title={t('action.skip')}
              onPress={() => send({ type: 'WITCH_ACT', heal: false, poisonTargetId: null })}
            />
          </View>
        </>
      ) : (
        <>
          {me.submitted ? (
            <Text style={{ color: colors.goodText }}>{t('action.changeHint')}</Text>
          ) : null}
          <Muted>{target ? t('action.selected', { name: target }) : t('action.pickTarget')}</Muted>
          <View style={styles.row}>
            <Button
              testID="action-confirm"
              title={t('action.confirm')}
              disabled={!selectedId}
              onPress={() => send({ type: action, targetId: selectedId } as GameCommand)}
            />
            <Button
              testID="action-skip"
              variant="secondary"
              title={t('action.skip')}
              onPress={() => send({ type: action, targetId: null } as GameCommand)}
            />
          </View>
        </>
      )}
    </Card>
  );
}
