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
  selectedId: string | null;
  clearSelection: () => void;
}

/** What the viewer can do right now (driven by `view.me.pendingAction`). The server validates. */
export function ActionPanel({ gameId, view, selectedId, clearSelection }: Props) {
  const { t } = useTranslation();
  const name = useNames();
  const [heal, setHeal] = useState(false);
  const me = view.me;
  const action = me?.pendingAction ?? null;

  const send = async (command: GameCommand) => {
    const ok = await attempt(t, () => call('game:action', { gameId, command }));
    if (ok) {
      clearSelection();
      setHeal(false);
    }
  };

  if (!me) return null;
  if (!action) {
    return (
      <Card data-testid="action-panel" data-action="">
        <p className="text-gray-400 text-sm">
          {me.alive ? t('action.waiting') : t('action.deadSpectator')}
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
          <div className="flex gap-2">
            <Button
              data-testid="action-confirm"
              disabled={!selectedId}
              onClick={() => send({ type: action, targetId: selectedId } as GameCommand)}
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
