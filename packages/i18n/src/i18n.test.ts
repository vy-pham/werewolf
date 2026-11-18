import { SUPPORTED_LOCALES } from '@werewolf/shared';
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
});
