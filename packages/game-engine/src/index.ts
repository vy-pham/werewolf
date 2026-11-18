// Pure, deterministic rules engine. No I/O here — see docs/03-technical-design.md §4.
//
//   createGame(input, ctx)              → deal roles, start ROLE_REVEAL
//   dispatch(state, input, ctx)         → apply a player command or a phase timeout
//   projectFor(state, viewerId)         → the only view of a game that may be sent to a client
//   voicePermissions(state, viewerId)   → voice / chat / caption channel access
//
// Every function returns new data; callers persist `state` and route `events` by `audience`.
export { type CreateGameInput, createGame } from './create';
export { dispatch } from './dispatch';
export { currentSpeaker } from './phases';
export { expectedCommand, projectFor } from './projection';
export { createRng, pick, type Rng, shuffle } from './rng';
export * from './role-set';
export {
  canVote,
  isWolf,
  mixedCouple,
  normalize,
  partnerOf,
  startingRole,
  teamOf,
} from './state';
export type * from './types';
export { canSend, voicePermissions } from './voice';
export * from './winner';
