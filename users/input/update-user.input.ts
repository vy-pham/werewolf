import { Field, ID, InputType, OmitType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';
import { CreateUserInput } from './create-user.input';
import { NumberTransform } from 'src/common/decorators/transforms/number.transform';
@InputType()
export class UpdateUserInput extends OmitType(CreateUserInput, ['username']) {
  @NumberTransform()
  @Field(() => ID)
  id: number;
}