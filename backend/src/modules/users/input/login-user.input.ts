import { InputType, PickType } from '@nestjs/graphql';
import { CreateUserInput } from './create-user.input';
@InputType()
export class LoginUserInput extends PickType(CreateUserInput, [
  'username',
  'password',
]) {}
