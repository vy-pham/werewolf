import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Room,
  RoomStatus,
  RoomPlayer as RoomPlayerModel,
} from '@prisma/client';
import { UserModel } from '../users/users.model';
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

  @Field(() => [RoomPlayer])
  players: RoomPlayer[];
}

@ObjectType()
class RoomPlayer implements Omit<RoomPlayerModel, 'roomId' | 'userId'> {
  @Field(() => ID)
  id: number;
  @Field()
  isHost: boolean;
  @Field(() => UserModel)
  user: UserModel;
}
