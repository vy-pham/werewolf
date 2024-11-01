import { Field, ID } from '@nestjs/graphql';
import { ObjectTypes } from 'src/decorators/object-type-with-status.decorator';

@ObjectTypes()
export class Room {
  @Field(() => ID)
  id: number;
}