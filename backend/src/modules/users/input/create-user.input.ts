import { Field, InputType } from '@nestjs/graphql';
import { IsString, MaxLength, MinLength } from 'class-validator';

@InputType()
export class CreateUserInput {
  @Field()
  @IsString()
  @MinLength(4)
  @MaxLength(12)
  username: string;

  @Field({ description: 'Password' })
  @IsString()
  @MinLength(6)
  @MaxLength(12)
  password: string;
}
