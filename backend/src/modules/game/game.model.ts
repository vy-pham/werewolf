import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Game, GameStatus } from '@prisma/client';
import { GamePlayerModel } from '../game-player/game-player.model';
import { GameRoundModel } from '../game-round/game-round.model';
import { GameAbilityModel } from '../game-ability/game-ability.model';

@ObjectType()
export class GameModel implements Game {
  @Field(() => ID)
  id: number;
  @Field()
  roomId: number;
  @Field(() => [GamePlayerModel])
  players: GamePlayerModel[];
  @Field(() => GameStatus)
  status: GameStatus;
  @Field(() => [GameRoundModel])
  rounds: GameRoundModel[];
  @Field(() => [GameAbilityModel])
  abilities: GameAbilityModel[];
}
