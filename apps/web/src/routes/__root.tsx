import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Toaster } from '../components/Toaster';
import { Button, cn } from '../components/ui';
import { LanguageSwitcher } from '../features/i18n/LanguageSwitcher';
import { logout } from '../lib/api';
import { socket } from '../lib/socket';
import { useGame } from '../stores/game';
import { useSession } from '../stores/session';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
});

function RootLayout() {
  const { t } = useTranslation();
  const user = useSession((s) => s.user);
  const connected = useGame((s) => s.connected);

  const signOut = async () => {
    socket.disconnect();
    useGame.getState().leaveRoom();
    await logout();
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center gap-3 border-white/10 border-b px-4 py-3">
        <Link to="/" className="font-bold text-moon">
          🐺 {t('app.name')}
        </Link>
        <span className="flex-1" />
        {user ? (
          <span className="flex items-center gap-2 text-gray-300 text-sm">
            <span
              title={connected ? t('status.serverOnline') : t('status.serverOffline')}
              className={cn('size-2 rounded-full', connected ? 'bg-green-500' : 'bg-gray-500')}
            />
            <span data-testid="current-user">{user.displayName}</span>
            <Button variant="ghost" className="px-2 py-1" onClick={signOut}>
              {t('auth.signOut')}
            </Button>
          </span>
        ) : null}
        <LanguageSwitcher />
      </header>
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}
