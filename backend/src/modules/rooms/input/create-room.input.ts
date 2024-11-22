import { Field, ID, InputType } from '@nestjs/graphql';
import { RoomType } from '@prisma/client';
@InputType()
export class CreateRoomInput {
  @Field()
  name: string;

  @Field(() => [ID])
  rolesConfig: string[];

  @Field(() => RoomType)
  type: RoomType;
}
