import { attempt } from '@werewolf/client-core';
import { presetFor } from '@werewolf/game-engine';
import {
  type PhaseTimers,
  ROLE_IDS,
  type RoleCounts,
  type RoomRules,
  type RoomSettingsPatch,
  type RoomView,
} from '@werewolf/shared';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { colors } from '@/components/theme';
import { Button, Card, Muted, styles, Title, Toggle } from '@/components/ui';
import { call } from '@/lib/client';

const BOOLEAN_RULES = [
  'witchCanSelfHeal',
  'guardCanSelfProtect',
  'noKillFirstNight',
  'revealRoleOnDeath',
] as const satisfies readonly (keyof RoomRules)[];

/** Timers the host can change, with the step used by the − / + buttons. */
const TIMERS = [
  ['speakingSeconds', 5],
  ['voteSeconds', 5],
  ['nightActionSeconds', 5],
  ['defenseSeconds', 5],
] as const satisfies readonly (readonly [keyof PhaseTimers, number])[];

/** Host-editable room settings; read-only for everyone else. Same rules as the web app. */
export function SettingsPanel({ room, editable }: { room: RoomView; editable: boolean }) {
  const { t } = useTranslation();
  const { rules, timers } = room.settings;
  const update = (patch: RoomSettingsPatch) => attempt(t, () => call('room:updateSettings', patch));
  const roles: RoleCounts = room.autoRoles
    ? presetFor(Math.max(room.members.length, 6))
    : room.settings.roles;

  return (
    <Card>
      <Title>{t('settings.title')}</Title>
      {BOOLEAN_RULES.map((key) => (
        <Toggle
          key={key}
          label={t(`settings.rule.${key}`)}
          value={rules[key]}
          disabled={!editable}
          onChange={(value) => update({ rules: { [key]: value } })}
        />
      ))}
      <Toggle
        label={t('settings.rule.revote', { count: rules.maxRevotes })}
        value={rules.voteTieBreak === 'revote'}
        disabled={!editable}
        onChange={(value) => update({ rules: { voteTieBreak: value ? 'revote' : 'none' } })}
      />

      <Muted>{t('settings.media')}</Muted>
      <Toggle
        label={t('settings.voice')}
        value={room.settings.voice}
        disabled={!editable}
        onChange={(value) => update({ voice: value })}
      />
      <Toggle
        label={t('settings.captions')}
        value={room.settings.captions}
        disabled={!editable || !room.settings.voice}
        onChange={(value) => update({ captions: value })}
      />
      <Text style={{ color: colors.faint, fontSize: 12 }}>{t('settings.captionsHint')}</Text>

      <Muted>{t('settings.timers')}</Muted>
      {TIMERS.map(([key, step]) => (
        <View key={key} style={[styles.row, { justifyContent: 'space-between' }]}>
          <Text style={{ color: colors.text, flex: 1 }}>{t(`settings.timer.${key}`)}</Text>
          {editable ? (
            <Button
              variant="ghost"
              testID={`timer-${key}-dec`}
              title="−"
              onPress={() => update({ timers: { [key]: timers[key] - step } })}
            />
          ) : null}
          <Text
            testID={`timer-${key}`}
            style={{ color: colors.moon, width: 36, textAlign: 'center' }}
          >
            {timers[key]}
          </Text>
          {editable ? (
            <Button
              variant="ghost"
              testID={`timer-${key}-inc`}
              title="+"
              onPress={() => update({ timers: { [key]: timers[key] + step } })}
            />
          ) : null}
        </View>
      ))}

      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <Muted>
          {t('settings.roles', { count: Object.values(roles).reduce((a, b) => a + (b ?? 0), 0) })}
        </Muted>
        {editable ? (
          <Button
            variant="ghost"
            title={room.autoRoles ? t('settings.customizeRoles') : t('settings.usePreset')}
            onPress={() =>
              room.autoRoles ? update({ roles }) : update({ autoRoles: true, roles: {} })
            }
          />
        ) : null}
      </View>
      {room.autoRoles ? <Muted>{t('settings.presetHint')}</Muted> : null}
      {ROLE_IDS.map((role) => (
        <View key={role} style={[styles.row, { justifyContent: 'space-between' }]}>
          <Text style={{ color: colors.text, flex: 1 }}>{t(`roles.${role}`)}</Text>
          {editable && !room.autoRoles ? (
            <Button
              variant="ghost"
              title="−"
              onPress={() =>
                update({ roles: { ...roles, [role]: Math.max(0, (roles[role] ?? 0) - 1) } })
              }
            />
          ) : null}
          <Text style={{ color: colors.text, width: 24, textAlign: 'center' }}>
            {roles[role] ?? 0}
          </Text>
          {editable && !room.autoRoles ? (
            <Button
              variant="ghost"
              title="+"
              onPress={() => update({ roles: { ...roles, [role]: (roles[role] ?? 0) + 1 } })}
            />
          ) : null}
        </View>
      ))}
    </Card>
  );
}
