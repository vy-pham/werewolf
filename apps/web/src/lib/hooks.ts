import { useEffect, useState } from 'react';

/** Seconds left until `endsAt` (ms epoch), updated 4×/s. */
export function useCountdown(endsAt: number | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  if (!endsAt) return 0;
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}
