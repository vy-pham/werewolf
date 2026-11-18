import type { GameCommand, PlayerView } from '@werewolf/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Toggle } from '../../components/ui';
import { attempt } from '../../lib/errors';
import { call } from '../../lib/socket';
import { useNames } from './names';

interface Props {
  gameId: string;
  view: PlayerView;
  /** Selected players (Cupid selects two, every other action one). */
  selectedIds: string[];
  clearSelection: () => void;
}

/** What the viewer can do right now (driven by `view.me.pendingAction`). The server validates. */
export function ActionPanel({ gameId, view, selectedIds, clearSelection }: Props) {
  const { t } = useTranslation();
  const name = useNames();
  const [heal, setHeal] = useState(false);
  const [infect, setInfect] = useState(false);
  const selectedId = selectedIds[0] ?? null;
  const me = view.me;
  const action = me?.pendingAction ?? null;

  const send = async (command: GameCommand) => {
    const ok = await attempt(t, () => call('game:action', { gameId, command }));
    if (ok) {
      clearSelection();
      setHeal(false);
    }
    return ok;
  };

  if (!me) return null;
  if (!action) {
    return (
      <Card data-testid="action-panel" data-action="">
        <p className="text-gray-400 text-sm">
          {!me.alive
            ? t('action.deadSpectator')
            : me.canVote === false && view.phase.name === 'VOTE'
              ? t('action.foolCannotVote')
              : t('action.waiting')}
        </p>
      </Card>
    );
  }

  // Wolves and day votes may change their choice; the other night actions are final.
  const changeable = action === 'WOLF_VOTE' || action === 'DAY_VOTE';
  if (me.submitted && !changeable) {
    return (
      <Card data-testid="action-panel" data-action={action} data-submitted="true">
        <p className="text-gray-300 text-sm">{t('action.done')}</p>
      </Card>
    );
  }

  const target = selectedId ? name(selectedId) : null;
  const pickHint = (
    <p className="text-gray-400 text-sm">
      {target ? t('action.selected', { name: target }) : t('action.pickTarget')}
    </p>
  );

  return (
    <Card
      className="space-y-3 border-moon/40"
      data-testid="action-panel"
      data-action={action}
      data-submitted={me.submitted}
    >
      <h3 className="font-semibold">{t(`action.title.${action}`)}</h3>
      <p className="text-gray-300 text-sm">{t(`action.help.${action}`)}</p>

      {action === 'END_TURN' ? (
        <Button data-testid="action-confirm" onClick={() => send({ type: 'END_TURN' })}>
          {t('action.endTurn')}
        </Button>
      ) : action === 'CUPID_LINK' ? (
        <>
          <p className="text-gray-400 text-sm">
            {selectedIds.length === 2
              ? t('action.cupidPair', {
                  a: name(selectedIds[0] ?? ''),
                  b: name(selectedIds[1] ?? ''),
                })
              : t('action.cupidPick')}
          </p>
          <div className="flex gap-2">
            <Button
              data-testid="action-confirm"
              disabled={selectedIds.length !== 2}
              onClick={() =>
                send({
                  type: 'CUPID_LINK',
                  targetIds: [selectedIds[0] ?? '', selectedIds[1] ?? ''],
                })
              }
            >
              {t('action.confirm')}
            </Button>
            <Button
              variant="secondary"
              data-testid="action-skip"
              onClick={() => send({ type: 'CUPID_LINK', targetIds: null })}
            >
              {t('action.skip')}
            </Button>
          </div>
        </>
      ) : action === 'WITCH_ACT' ? (
        <>
          <p className="text-sm">
            {me.witch?.victimId
              ? t('action.witchVictim', { name: name(me.witch.victimId) })
              : t('action.witchNoVictim')}
          </p>
          <Toggle
            label={t('action.witchHeal')}
            checked={heal}
            disabled={!me.witch?.victimId || me.witch.healUsed}
            onChange={setHeal}
          />
          <p className="text-gray-400 text-sm">
            {me.witch?.poisonUsed
              ? t('action.witchPoisonUsed')
              : target
                ? t('action.witchPoison', { name: target })
                : t('action.witchPickPoison')}
          </p>
          <div className="flex gap-2">
            <Button
              data-testid="action-confirm"
              onClick={() =>
                send({
                  type: 'WITCH_ACT',
                  heal,
                  poisonTargetId: me.witch?.poisonUsed ? null : selectedId,
                })
              }
            >
              {t('action.confirm')}
            </Button>
            <Button
              variant="secondary"
              data-testid="action-skip"
              onClick={() => send({ type: 'WITCH_ACT', heal: false, poisonTargetId: null })}
            >
              {t('action.skip')}
            </Button>
          </div>
        </>
      ) : (
        <>
          {me.submitted ? <p className="text-green-300 text-sm">{t('action.changeHint')}</p> : null}
          {pickHint}
          {action === 'WOLF_VOTE' && me.alpha ? (
            me.alpha.infectUsed ? (
              <p className="text-gray-400 text-xs">{t('action.alphaInfectUsed')}</p>
            ) : (
              <Toggle
                label={t('action.alphaInfect')}
                checked={infect}
                onChange={setInfect}
                testId="alpha-infect"
              />
            )
          ) : null}
          <div className="flex gap-2">
            <Button
              data-testid="action-confirm"
              disabled={!selectedId}
              onClick={() =>
                send(
                  (action === 'WOLF_VOTE' && me.alpha && !me.alpha.infectUsed
                    ? { type: action, targetId: selectedId, infect }
                    : { type: action, targetId: selectedId }) as GameCommand,
                )
              }
            >
              {t('action.confirm')}
            </Button>
            <Button
              variant="secondary"
              data-testid="action-skip"
              onClick={() => send({ type: action, targetId: null } as GameCommand)}
            >
              {t('action.skip')}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
