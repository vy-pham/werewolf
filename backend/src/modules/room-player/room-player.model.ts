import { Field, ID, ObjectType } from '@nestjs/graphql';
import { RoomPlayer } from '@prisma/client';
import { UserModel } from '../users/users.model';

@ObjectType()
export class RoomPlayerModel implements Omit<RoomPlayer, 'roomId' | 'userId'> {
  @Field(() => ID)
  id: number;
  @Field()
  isHost: boolean;
  @Field(() => UserModel, { nullable: true })
  user: UserModel | null;
  @Field(() => String, { nullable: true })
  virtual: string | null;
}
