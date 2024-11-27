import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Game, GameStatus } from '@prisma/client';
import { GamePlayerModel } from '../game-player/game-player.model';

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
}
