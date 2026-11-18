import { LOCALE_NAMES } from '@werewolf/i18n';
import { type Locale, SUPPORTED_LOCALES } from '@werewolf/shared';
import { useTranslation } from 'react-i18next';
import { setLocale } from '../../lib/i18n';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  return (
    <label className="flex items-center gap-2 text-sm text-gray-300">
      <span className="sr-only">{t('common.language')}</span>
      <select
        value={i18n.language}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="rounded-md border border-white/20 bg-transparent px-2 py-1"
      >
        {SUPPORTED_LOCALES.map((l) => (
          <option key={l} value={l} className="text-black">
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
