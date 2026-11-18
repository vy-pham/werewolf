import { resources } from '@werewolf/i18n';
import { type Locale, resolveLocale } from '@werewolf/shared';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// TODO(M5): persist the user's choice (expo-secure-store / profile) and pass it as `saved`.
const initial = resolveLocale(null, getLocales());

void i18n.use(initReactI18next).init({
  resources,
  lng: initial,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export function setLocale(locale: Locale) {
  void i18n.changeLanguage(locale);
}

export { i18n };
