import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ServerStatus } from '../features/connection/ServerStatus';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="font-bold text-4xl text-moon">{t('app.name')}</h1>
      <p className="text-gray-300">{t('app.tagline')}</p>
      <button
        type="button"
        disabled
        className="w-full rounded-lg bg-blood px-4 py-3 font-semibold text-white disabled:opacity-60"
      >
        {t('auth.playAsGuest')}
      </button>
      <ServerStatus />
    </section>
  );
}
