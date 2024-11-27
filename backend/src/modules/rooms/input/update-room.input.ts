import { Field, ID, InputType, OmitType } from '@nestjs/graphql';
import { CreateRoomInput } from './create-room.input';

@InputType()
export class UpdateRoomInput extends OmitType(CreateRoomInput, ['type']) {
  @Field(() => ID)
  id: string;
}
