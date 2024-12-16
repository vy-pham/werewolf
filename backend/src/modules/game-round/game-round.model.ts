import { Field, ID, ObjectType } from '@nestjs/graphql';
import { GameRound, GameRoundTime } from '@prisma/client';
import { GameRoundActionModel } from '../game-round-action/game-round-action.model';

@ObjectType()
export class GameRoundModel implements Omit<GameRound, 'gameId'> {
  @Field(() => ID)
  id: number;

  @Field(() => GameRoundTime)
  time: GameRoundTime;
  @Field()
  sequence: number;

  @Field(() => [GameRoundActionModel])
  actions: GameRoundActionModel[];
}
