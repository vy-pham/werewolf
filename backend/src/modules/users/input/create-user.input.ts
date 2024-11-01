import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

@InputType()
export class CreateUserInput {
  @Field()
  @IsEmail({}, { message: 'Invalid Email' })
  email: string;

  @Field({ description: 'Password' })
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  password: string;

}