import { resources } from '@werewolf/i18n';
import { type Locale, parseLocaleTag, resolveLocale } from '@werewolf/shared';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { updateMe } from './client';

const STORAGE_KEY = 'locale';

function readSavedLocale(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setLocale(locale: Locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // storage unavailable (private mode) — the choice still applies for this session
  }
  void i18n.changeLanguage(locale);
  document.documentElement.lang = locale;
  // The server uses it for captions in "same as app" mode.
  void updateMe({ locale }).catch(() => undefined);
}

const initial = resolveLocale(readSavedLocale(), navigator.languages.map(parseLocaleTag));
document.documentElement.lang = initial;

void i18n.use(initReactI18next).init({
  resources,
  lng: initial,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export { i18n };
