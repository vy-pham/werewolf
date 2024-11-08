import { Field, InputType } from '@nestjs/graphql';
import { Max, Min } from 'class-validator';

@InputType()
export class CreateRoomInput {
  @Min(4)
  @Max(40)
  @Field()
  maxPlayers: number;

  @Field()
  name: string;
}
