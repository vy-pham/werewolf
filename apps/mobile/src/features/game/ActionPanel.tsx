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
  /** Selected players (Cupid selects two, every other action one). */
  selectedIds: string[];
  clearSelection: () => void;
}

/**
 * What the viewer can do right now (`view.me.pendingAction`); the server validates everything.
 * testID encodes the state for automated tests: `action-panel-<ACTION>-<open|done>`.
 */
export function ActionPanel({ gameId, view, selectedIds, clearSelection }: Props) {
  const { t } = useTranslation();
  const name = useNames();
  const [heal, setHeal] = useState(false);
  const [infect, setInfect] = useState(false);
  const selectedId = selectedIds[0] ?? null;
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
        <Muted>
          {!me.alive
            ? t('action.deadSpectator')
            : me.canVote === false && view.phase.name === 'VOTE'
              ? t('action.foolCannotVote')
              : t('action.waiting')}
        </Muted>
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
      ) : action === 'CUPID_LINK' ? (
        <>
          <Muted>
            {selectedIds.length === 2
              ? t('action.cupidPair', {
                  a: name(selectedIds[0] ?? ''),
                  b: name(selectedIds[1] ?? ''),
                })
              : t('action.cupidPick')}
          </Muted>
          <View style={styles.row}>
            <Button
              testID="action-confirm"
              title={t('action.confirm')}
              disabled={selectedIds.length !== 2}
              onPress={() =>
                send({
                  type: 'CUPID_LINK',
                  targetIds: [selectedIds[0] ?? '', selectedIds[1] ?? ''],
                })
              }
            />
            <Button
              testID="action-skip"
              variant="secondary"
              title={t('action.skip')}
              onPress={() => send({ type: 'CUPID_LINK', targetIds: null })}
            />
          </View>
        </>
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
          {action === 'WOLF_VOTE' && me.alpha ? (
            me.alpha.infectUsed ? (
              <Muted>{t('action.alphaInfectUsed')}</Muted>
            ) : (
              <Toggle label={t('action.alphaInfect')} value={infect} onChange={setInfect} />
            )
          ) : null}
          <View style={styles.row}>
            <Button
              testID="action-confirm"
              title={t('action.confirm')}
              disabled={!selectedId}
              onPress={() =>
                send(
                  (action === 'WOLF_VOTE' && me.alpha && !me.alpha.infectUsed
                    ? { type: action, targetId: selectedId, infect }
                    : { type: action, targetId: selectedId }) as GameCommand,
                )
              }
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
