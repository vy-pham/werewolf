import { Field, ID, InputType } from '@nestjs/graphql';
import { NumberTransform } from 'src/decorators/transforms/number.transform';

@InputType()
export class CreateRoundInput {
  @NumberTransform()
  @Field(() => ID)
  gameId: number;
}
