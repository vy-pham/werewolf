import type { PlayerView, RoomRules } from '@werewolf/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/ui';
import { ChatPanel } from '../chat/ChatPanel';
import { VoiceBar } from '../voice/VoiceBar';
import { ActionPanel } from './ActionPanel';
import { EventLog } from './EventLog';
import { useNames } from './names';
import { PhaseHeader } from './PhaseHeader';
import { PlayerGrid } from './PlayerGrid';

/**
 * Client-side hint of who can be targeted, so obviously invalid cards are disabled.
 * The engine on the server is the authority and rejects anything else.
 */
function targetable(view: PlayerView, rules: RoomRules | undefined, id: string): boolean {
  const me = view.me;
  const action = me?.pendingAction;
  if (!me || !action || action === 'END_TURN') return false;
  if (me.submitted && action !== 'WOLF_VOTE' && action !== 'DAY_VOTE') return false;
  const target = view.players.find((p) => p.id === id);
  if (!target?.alive) return false;
  const self = id === me.id;
  switch (action) {
    case 'WOLF_VOTE':
      return target.role !== 'werewolf';
    case 'GUARD_PROTECT':
      return (!self || rules?.guardCanSelfProtect !== false) && id !== me.guardLastTargetId;
    case 'DAY_VOTE':
      return !self && (!view.candidates || view.candidates.includes(id));
    case 'WITCH_ACT':
      return !self && !me.witch?.poisonUsed;
    default:
      return !self;
  }
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
  // A selection belongs to one phase step; a new phase or step starts with nothing selected.
  const phaseKey = `${view.round}-${view.phase.name}-${view.phase.step}-${view.phase.revote}`;
  const [selection, setSelection] = useState<{ key: string; id: string | null }>({
    key: phaseKey,
    id: null,
  });
  const selectedId = selection.key === phaseKey ? selection.id : null;
  const setSelectedId = (update: string | null | ((current: string | null) => string | null)) =>
    setSelection({
      key: phaseKey,
      id: typeof update === 'function' ? update(selectedId) : update,
    });

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-4 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <PhaseHeader view={view} />
        <VoiceBar />
        <PlayerGrid
          view={view}
          selectable={(id) => targetable(view, rules, id)}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId((current) => (current === id ? null : id))}
        />
        <ActionPanel
          gameId={gameId}
          view={view}
          selectedId={selectedId}
          clearSelection={() => setSelectedId(null)}
        />
        {view.me?.seerResults?.length ? (
          <Card className="space-y-1">
            <h3 className="font-semibold text-sm">{t('game.seerResults')}</h3>
            <ul className="text-sm">
              {view.me.seerResults.map((r) => (
                <li key={`${r.round}-${r.targetId}`}>
                  {t(r.isWolf ? 'log.seerWolf' : 'log.seerNotWolf', { name: name(r.targetId) })}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
      <div className="space-y-4">
        <ChatPanel />
        <EventLog />
      </div>
    </div>
  );
}
