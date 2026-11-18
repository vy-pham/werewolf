import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { LoginCard } from '../features/auth/LoginCard';
import { LobbyHome } from '../features/lobby/LobbyHome';
import { useSession } from '../stores/session';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  const { t } = useTranslation();
  const user = useSession((s) => s.user);
  if (user) return <LobbyHome />;
  return (
    <section className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="font-bold text-4xl text-moon">{t('app.name')}</h1>
      <p className="text-gray-300">{t('app.tagline')}</p>
      <LoginCard />
    </section>
  );
}
