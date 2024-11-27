import { Field, ID, ObjectType } from '@nestjs/graphql';
import { GamePlayerStatus, type GamePlayer } from '@prisma/client';
import { RoleModel } from '../roles/roles.model';

@ObjectType()
export class GamePlayerModel
  implements Omit<GamePlayer, 'gameId' | 'userId' | 'roleId' | 'virtual'>
{
  @Field(() => ID)
  id: number;
  @Field(() => String, { nullable: true })
  virtual?: string;

  @Field(() => RoleModel, { nullable: true })
  role?: RoleModel;

  @Field(() => GamePlayerStatus)
  status: GamePlayerStatus;
}
