import { GAME_PLAYER_INCLUDE } from '../game-player/game-player.constant';

export const GAME_ROUND_ACTION_INCLUDE = {
  actor: {
    include: GAME_PLAYER_INCLUDE,
  },
  target: {
    include: GAME_PLAYER_INCLUDE,
  },
};
