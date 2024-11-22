import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Room, RoomStatus, RoomPlayer, type RoomRole } from '@prisma/client';
import { UserModel } from '../users/users.model';
import { RoleModel } from '../roles/roles.model';
@ObjectType()
export class RoomModel implements Room {
  @Field(() => ID)
  id: number;
  @Field()
  name: string;
  @Field()
  maxPlayers: number;
  @Field(() => RoomStatus)
  status: RoomStatus;

  @Field(() => [RoomPlayerModel])
  players: RoomPlayer[];

  @Field(() => [RoomRoleModel])
  rolesConfig: RoomRoleModel[];
}

@ObjectType()
class RoomPlayerModel implements Omit<RoomPlayer, 'roomId' | 'userId'> {
  @Field(() => ID)
  id: number;
  @Field()
  isHost: boolean;
  @Field(() => UserModel)
  user: UserModel;
}

@ObjectType()
class RoomRoleModel implements Omit<RoomRole, 'roomId' | 'roleId'> {
  @Field(() => ID)
  id: number;
  @Field(() => RoleModel)
  role: RoleModel;
}
