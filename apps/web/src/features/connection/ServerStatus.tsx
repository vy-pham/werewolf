import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { socket } from '../../lib/socket';

/** M0 smoke check: shows whether the Socket.IO connection to apps/server is up. */
export function ServerStatus() {
  const { t } = useTranslation();
  const [online, setOnline] = useState(socket.connected);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    socket.on('connect', up);
    socket.on('disconnect', down);
    socket.on('connect_error', down);
    socket.connect();
    return () => {
      socket.off('connect', up);
      socket.off('disconnect', down);
      socket.off('connect_error', down);
    };
  }, []);

  return (
    <p className="flex items-center gap-2 text-sm text-gray-400">
      <span className={`size-2 rounded-full ${online ? 'bg-green-500' : 'bg-red-500'}`} />
      {online ? t('status.serverOnline') : t('status.serverOffline')}
    </p>
  );
}
