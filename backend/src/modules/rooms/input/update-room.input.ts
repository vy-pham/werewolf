import { Field, ID, InputType } from '@nestjs/graphql';
import { CreateRoomInput } from './create-room.input';

@InputType()
export class UpdateRoomInput extends CreateRoomInput {
  @Field(() => ID)
  id: string;
}
