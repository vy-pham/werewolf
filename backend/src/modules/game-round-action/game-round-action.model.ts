import { Field, ID, ObjectType } from '@nestjs/graphql';
import { GameRoundAction, Roles, GamePlayerStatus } from '@prisma/client';
import { GamePlayerModel } from '../game-player/game-player.model';

@ObjectType()
export class GameRoundActionModel
  implements Omit<GameRoundAction, 'targetId' | 'gameRoundId' | 'abilityId'>
{
  @Field(() => Boolean, { nullable: true })
  booleanResult: boolean;
  @Field(() => GamePlayerStatus, { nullable: true })
  statusResult: GamePlayerStatus;
  @Field(() => ID)
  id: number;
  @Field(() => GamePlayerModel)
  target: GamePlayerModel;
  @Field(() => Roles)
  turnOf: Roles;
}
