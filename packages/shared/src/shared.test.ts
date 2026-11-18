import { describe, expect, it } from 'vitest';
import { RoomSettingsPatchSchema } from './api';
import { parseLocaleTag, resolveLocale } from './locale';
import { defaultRoomSettings } from './settings';

describe('resolveLocale', () => {
  it('prefers a saved supported locale', () => {
    expect(resolveLocale('vi', [{ languageCode: 'en' }])).toBe('vi');
  });

  it('uses vi for Vietnamese language or VN region', () => {
    expect(resolveLocale(null, [parseLocaleTag('vi')])).toBe('vi');
    expect(resolveLocale(null, [parseLocaleTag('en-VN')])).toBe('vi');
  });

  it('falls back to en', () => {
    expect(resolveLocale(undefined, [parseLocaleTag('fr-FR')])).toBe('en');
    expect(resolveLocale('xx', [])).toBe('en');
  });
});

describe('defaultRoomSettings', () => {
  it('matches the defaults in docs/04-game-rules.md §0', () => {
    const s = defaultRoomSettings();
    expect(s.rules).toMatchObject({
      witchCanSelfHeal: true,
      guardCanSelfProtect: true,
      noKillFirstNight: false,
      revealRoleOnDeath: false,
      voteTieBreak: 'none',
      maxRevotes: 3,
    });
    expect(s.timers.speakingSeconds).toBe(30);
    expect(s.voice).toBe(true);
  });
});

describe('RoomSettingsPatchSchema', () => {
  it('does not fill in defaults for fields the patch did not mention', () => {
    expect(RoomSettingsPatchSchema.parse({ timers: { speakingSeconds: 10 } })).toEqual({
      timers: { speakingSeconds: 10 },
    });
    expect(RoomSettingsPatchSchema.parse({ rules: { revealRoleOnDeath: true } })).toEqual({
      rules: { revealRoleOnDeath: true },
    });
  });

  it('still validates values and rejects unknown keys', () => {
    expect(RoomSettingsPatchSchema.safeParse({ timers: { speakingSeconds: 1 } }).success).toBe(
      false,
    );
    expect(RoomSettingsPatchSchema.safeParse({ rules: { nope: true } }).success).toBe(false);
  });
});
