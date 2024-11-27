import { Field, ID, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class UpdateRoomPlayerInput {
  @Field(() => ID)
  roomId: string;

  @Field(() => [String])
  @IsNotEmpty()
  @IsString({ each: true })
  virtualPlayers: string[];
}
