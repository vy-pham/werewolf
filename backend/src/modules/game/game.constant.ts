import { GAME_ROUND_INCLUDE } from '../game-round/game-round.constant';
import { GAME_PLAYER_INCLUDE } from '../game-player/game-player.constant';

export const GAME_INCLUDE = {
  rounds: {
    include: GAME_ROUND_INCLUDE,
  },
  players: {
    include: GAME_PLAYER_INCLUDE,
  },
  abilities: {
    include: {
      ability: true,
    },
  },
};
