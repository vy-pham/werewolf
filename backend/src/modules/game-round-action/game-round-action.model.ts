import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  GameRoundAction,
  GameRoundActionTargetStatus,
  Roles,
  type GamePlayerStatus,
} from '@prisma/client';
import { GamePlayerModel } from '../game-player/game-player.model';

@ObjectType()
export class GameRoundActionModel
  implements Omit<GameRoundAction, 'actorId' | 'targetId' | 'gameRoundId'>
{
  booleanResult: boolean;
  statusResult: GamePlayerStatus;
  @Field(() => ID)
  id: number;
  @Field(() => GamePlayerModel)
  actor: GamePlayerModel;
  @Field(() => GamePlayerModel)
  target: GamePlayerModel;
  @Field(() => GameRoundActionTargetStatus)
  targetStatus: GameRoundActionTargetStatus;
  @Field(() => Roles)
  turnOf: Roles;
}
