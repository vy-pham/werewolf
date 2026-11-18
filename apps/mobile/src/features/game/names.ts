import { useGame } from '@werewolf/client-core';

/** userId → display name, from the room members. */
export function useNames(): (id: string | null | undefined) => string {
  const members = useGame((s) => s.room?.members);
  return (id) => members?.find((m) => m.userId === id)?.displayName ?? '?';
}
