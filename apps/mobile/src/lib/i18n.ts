import { resources } from '@werewolf/i18n';
import { type Locale, resolveLocale } from '@werewolf/shared';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { updateMe } from './client';
import { appStorage } from './storage';

const STORAGE_KEY = 'werewolf-locale';

// Start with the device language, then switch to the saved choice once storage has answered.
void i18n.use(initReactI18next).init({
  resources,
  lng: resolveLocale(null, getLocales()),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

void Promise.resolve(appStorage.getItem(STORAGE_KEY)).then((saved) => {
  const locale = resolveLocale(saved, getLocales());
  if (locale !== i18n.language) void i18n.changeLanguage(locale);
});

export function setLocale(locale: Locale) {
  void i18n.changeLanguage(locale);
  void Promise.resolve(appStorage.setItem(STORAGE_KEY, locale)).catch(() => undefined);
  // The server uses it for captions in "same as app" mode.
  void updateMe({ locale }).catch(() => undefined);
}

export { i18n };
