import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Room, RoomStatus, RoomType } from '@prisma/client';
import { RoomPlayerModel } from '../room-player/room-player.model';
import { RoomRoleModel } from '../room-role/room-role.model';
@ObjectType()
export class RoomModel implements Room {
  @Field(() => ID)
  id: number;
  @Field()
  name: string;
  @Field(() => RoomStatus)
  status: RoomStatus;

  @Field(() => [RoomPlayerModel])
  players: RoomPlayerModel[];

  @Field(() => [RoomRoleModel])
  rolesConfig: RoomRoleModel[];

  @Field(() => RoomType)
  type: RoomType;

  @Field(() => Number)
  werewolfQuantity: number;
}
