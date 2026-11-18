export const SUPPORTED_LOCALES = ['en', 'vi'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export interface DeviceLocale {
  languageCode?: string | null;
  regionCode?: string | null;
}

const isSupported = (value: string): value is Locale =>
  (SUPPORTED_LOCALES as readonly string[]).includes(value);

/**
 * Pick the UI language: saved choice → device/browser locales → `en`.
 * Vietnamese language or Vietnam region → `vi`.
 */
export function resolveLocale(
  saved: string | null | undefined,
  deviceLocales: readonly DeviceLocale[],
): Locale {
  if (saved && isSupported(saved)) return saved;
  for (const l of deviceLocales) {
    const lang = l.languageCode?.toLowerCase();
    if (lang === 'vi' || l.regionCode?.toUpperCase() === 'VN') return 'vi';
    if (lang && isSupported(lang)) return lang;
  }
  return DEFAULT_LOCALE;
}

/** Parse BCP-47 tags such as `vi-VN` or `en-US` (e.g. from `navigator.languages`). */
export function parseLocaleTag(tag: string): DeviceLocale {
  const [lang = '', region] = tag.split(/[-_]/);
  return { languageCode: lang.toLowerCase(), regionCode: region ? region.toUpperCase() : null };
}
