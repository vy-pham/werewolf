import { Field, ID, ObjectType } from '@nestjs/graphql';
import { GameRound, GameRoundTime } from '@prisma/client';

@ObjectType()
export class GameRoundModel implements Omit<GameRound, 'gameId'> {
  @Field(() => ID)
  id: number;

  @Field(() => GameRoundTime)
  time: GameRoundTime;
  @Field()
  sequence: number;
}
