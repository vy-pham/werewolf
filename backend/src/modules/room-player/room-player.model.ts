import { Field, ID, ObjectType } from '@nestjs/graphql';
import { RoomPlayer } from '@prisma/client';
import { UserModel } from '../users/users.model';
import { RoleModel } from '../roles/roles.model';

@ObjectType()
export class RoomPlayerModel
  implements Omit<RoomPlayer, 'roomId' | 'userId' | 'roleId'>
{
  @Field(() => ID)
  id: number;
  @Field()
  isHost: boolean;
  @Field(() => UserModel, { nullable: true })
  user: UserModel | null;
  @Field(() => String, { nullable: true })
  virtual: string | null;
  @Field(() => RoleModel, { nullable: true })
  role?: RoleModel;
}
