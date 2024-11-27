import { Field, ID, InputType } from '@nestjs/graphql';
import { NumberTransform } from 'src/decorators/transforms/number.transform';

@InputType()
export class CreateGameInput {
  @NumberTransform()
  @Field(() => ID)
  roomId: number;
}
