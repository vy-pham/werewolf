import { Field, ID, InputType } from '@nestjs/graphql';
import { Roles } from '@prisma/client';
import { NumberTransform } from 'src/decorators/transforms/number.transform';

@InputType()
export class GameRoundActionInput {
  @Field(() => Roles)
  turnOf: Roles;
  @NumberTransform()
  @Field(() => ID)
  roundId: number;
  targetId;
}
