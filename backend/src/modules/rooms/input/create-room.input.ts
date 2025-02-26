import { Field, InputType } from '@nestjs/graphql';
import { RoomType } from '@prisma/client';
@InputType()
export class CreateRoomInput {
  @Field()
  name: string;

  @Field(() => RoomType)
  type: RoomType;

  @Field(() => Number)
  werewolfQuantity: number;
}
