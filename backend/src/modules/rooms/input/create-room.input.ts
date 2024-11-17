import { Field, ID, InputType } from '@nestjs/graphql';
import { Max, Min } from 'class-validator';

@InputType()
class RoleInput {
  @Field(() => ID)
  roleId: number;
  @Field()
  quantity: number;
  @Field()
  checked: boolean;
}
@InputType()
export class CreateRoomInput {
  @Min(4)
  @Max(40)
  @Field()
  maxPlayers: number;

  @Field()
  name: string;

  @Field(() => [RoleInput])
  roles: RoleInput[];
}
