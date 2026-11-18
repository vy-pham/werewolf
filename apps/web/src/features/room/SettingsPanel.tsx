import { presetFor, totalRoles } from '@werewolf/game-engine';
import {
  type PhaseTimers,
  ROLE_IDS,
  type RoleCounts,
  type RoomRules,
  type RoomSettingsPatch,
  type RoomView,
} from '@werewolf/shared';
import { useTranslation } from 'react-i18next';
import { Button, Card, Input, Toggle } from '../../components/ui';
import { attempt } from '../../lib/errors';
import { call } from '../../lib/socket';

const BOOLEAN_RULES = [
  'witchCanSelfHeal',
  'guardCanSelfProtect',
  'noKillFirstNight',
  'revealRoleOnDeath',
] as const satisfies readonly (keyof RoomRules)[];

const EDITABLE_TIMERS = [
  'speakingSeconds',
  'voteSeconds',
  'nightActionSeconds',
  'defenseSeconds',
] as const satisfies readonly (keyof PhaseTimers)[];

/** Host-editable room settings (docs/04-game-rules.md §0). Read-only for everyone else. */
export function SettingsPanel({ room, editable }: { room: RoomView; editable: boolean }) {
  const { t } = useTranslation();
  const { rules, timers } = room.settings;
  const update = (patch: RoomSettingsPatch) => attempt(t, () => call('room:updateSettings', patch));

  const roles: RoleCounts = room.autoRoles
    ? presetFor(Math.max(room.members.length, 6))
    : room.settings.roles;
  const setRoleCount = (role: (typeof ROLE_IDS)[number], delta: number) =>
    update({ roles: { ...roles, [role]: Math.max(0, (roles[role] ?? 0) + delta) } });

  return (
    <Card className="space-y-4">
      <h2 className="font-semibold">{t('settings.title')}</h2>

      <section className="space-y-1">
        <h3 className="text-gray-400 text-xs uppercase">{t('settings.rules')}</h3>
        {BOOLEAN_RULES.map((key) => (
          <Toggle
            key={key}
            label={t(`settings.rule.${key}`)}
            checked={rules[key]}
            disabled={!editable}
            onChange={(value) => update({ rules: { [key]: value } })}
          />
        ))}
        <Toggle
          label={t('settings.rule.revote', { count: rules.maxRevotes })}
          checked={rules.voteTieBreak === 'revote'}
          disabled={!editable}
          onChange={(value) => update({ rules: { voteTieBreak: value ? 'revote' : 'none' } })}
        />
      </section>

      <section className="grid grid-cols-2 gap-3">
        <h3 className="col-span-2 text-gray-400 text-xs uppercase">{t('settings.timers')}</h3>
        {EDITABLE_TIMERS.map((key) => (
          <div key={key} className="space-y-1 text-sm">
            <label htmlFor={`timer-${key}`} className="text-gray-300">
              {t(`settings.timer.${key}`)}
            </label>
            <Input
              id={`timer-${key}`}
              type="number"
              data-testid={`timer-${key}`}
              defaultValue={timers[key]}
              key={`${key}-${timers[key]}`}
              disabled={!editable}
              onBlur={(e) => {
                const value = Number(e.target.value);
                if (value !== timers[key]) void update({ timers: { [key]: value } });
              }}
            />
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-gray-400 text-xs uppercase">
            {t('settings.roles', { count: totalRoles(roles) })}
          </h3>
          {editable ? (
            <Button
              variant="ghost"
              className="px-2 py-0.5 text-xs"
              onClick={() =>
                room.autoRoles ? update({ roles }) : update({ autoRoles: true, roles: {} })
              }
            >
              {room.autoRoles ? t('settings.customizeRoles') : t('settings.usePreset')}
            </Button>
          ) : null}
        </div>
        {room.autoRoles ? (
          <p className="text-gray-400 text-xs">{t('settings.presetHint')}</p>
        ) : null}
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ROLE_IDS.map((role) => (
            <li
              key={role}
              className="flex items-center gap-2 rounded bg-black/20 px-2 py-1 text-sm"
            >
              <span className="flex-1">{t(`roles.${role}`)}</span>
              {editable && !room.autoRoles ? (
                <Button
                  variant="ghost"
                  className="px-1 py-0"
                  onClick={() => setRoleCount(role, -1)}
                >
                  −
                </Button>
              ) : null}
              <span className="w-4 text-center">{roles[role] ?? 0}</span>
              {editable && !room.autoRoles ? (
                <Button variant="ghost" className="px-1 py-0" onClick={() => setRoleCount(role, 1)}>
                  +
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </Card>
  );
}
