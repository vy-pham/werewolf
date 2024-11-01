import { Field, InputType } from '@nestjs/graphql';
import { Min } from 'class-validator';

@InputType()
export class CreateRoomInput {
  @Min(10)
  @Field()
  a: number;
}