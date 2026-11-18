import { nextSelection, phaseStepKey, targetable } from '@werewolf/client-core';
import type { PlayerView, RoomRules } from '@werewolf/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/ui';
import { CaptionsBar } from '../captions/CaptionsBar';
import { ChatPanel } from '../chat/ChatPanel';
import { VoiceBar } from '../voice/VoiceBar';
import { ActionPanel } from './ActionPanel';
import { EventLog } from './EventLog';
import { useNames } from './names';
import { PhaseHeader } from './PhaseHeader';
import { PlayerGrid } from './PlayerGrid';

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
  const phaseKey = phaseStepKey(view);
  const [selection, setSelection] = useState<{ key: string; ids: string[] }>({
    key: phaseKey,
    ids: [],
  });
  const selectedIds = selection.key === phaseKey ? selection.ids : [];
  const action = view.me?.pendingAction;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-4 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <PhaseHeader view={view} />
        <VoiceBar />
        <CaptionsBar />
        <PlayerGrid
          view={view}
          selectable={(id) => targetable(view, rules, id)}
          selectedIds={selectedIds}
          onSelect={(id) =>
            setSelection({ key: phaseKey, ids: nextSelection(action, selectedIds, id) })
          }
        />
        <ActionPanel
          gameId={gameId}
          view={view}
          selectedIds={selectedIds}
          clearSelection={() => setSelection({ key: phaseKey, ids: [] })}
        />
        {view.me?.partnerId || view.me?.cupidLinked ? (
          <Card className="text-sm" data-testid="lovers-card">
            {view.me.partnerId
              ? t('game.partner', { name: name(view.me.partnerId) })
              : view.me.cupidLinked
                ? t('game.couple', {
                    a: name(view.me.cupidLinked[0]),
                    b: name(view.me.cupidLinked[1]),
                  })
                : null}
          </Card>
        ) : null}
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
