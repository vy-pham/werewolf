import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Room {
  @Field(() => ID)
  id: number;
}