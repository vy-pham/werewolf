export const PHASES = [
  'LOBBY',
  'ROLE_REVEAL',
  'NIGHT',
  'DAWN',
  'HUNTER_SHOT',
  'DISCUSSION',
  'VOTE',
  'DEFENSE',
  'EXECUTION',
  'GAME_OVER',
] as const;
export type PhaseName = (typeof PHASES)[number];

/** Communication channels shared by voice, text chat and captions (docs/04-game-rules.md §8). */
export const CHANNELS = ['lobby', 'main', 'wolves', 'dead'] as const;
export type Channel = (typeof CHANNELS)[number];
