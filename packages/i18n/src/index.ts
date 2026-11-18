import type { Locale } from '@werewolf/shared';
import en from './locales/en.json';
import vi from './locales/vi.json';

export type Messages = typeof en;

/** i18next-compatible resources. Adding a language = add a JSON file + an entry here + SUPPORTED_LOCALES. */
export const resources: Record<Locale, { translation: Messages }> = {
  en: { translation: en },
  vi: { translation: vi },
};

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  vi: 'Tiếng Việt',
};
