import { ERROR_CODES, REPORT_REASONS, ROLE_IDS, SUPPORTED_LOCALES, TEAMS } from '@werewolf/shared';
import { describe, expect, it } from 'vitest';
import { resources } from './index';

const keysOf = (obj: object, prefix = ''): string[] =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keysOf(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );

describe('locales', () => {
  it('every supported locale has resources', () => {
    for (const l of SUPPORTED_LOCALES) expect(resources[l]).toBeDefined();
  });

  it('every locale has exactly the same keys as en', () => {
    const base = keysOf(resources.en.translation).sort();
    for (const l of SUPPORTED_LOCALES) {
      expect(keysOf(resources[l].translation).sort()).toEqual(base);
    }
  });

  it('every role, team, error code and report reason has a label', () => {
    const keys = new Set(keysOf(resources.en.translation));
    const wanted = [
      ...ROLE_IDS.map((r) => `roles.${r}`),
      ...TEAMS.map((t) => `teams.${t}`),
      ...TEAMS.map((t) => `log.winner.${t}`),
      ...ERROR_CODES.map((c) => `errors.${c}`),
      ...REPORT_REASONS.map((r) => `reports.reasons.${r}`),
    ];
    expect(wanted.filter((k) => !keys.has(k))).toEqual([]);
  });
});
