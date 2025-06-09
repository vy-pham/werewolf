import { Field, InputType } from '@nestjs/graphql';
import { z } from 'zod';
@InputType()
export class CreateUserInput {
  @Field()
  username: string;

  @Field()
  email: string
}

export const CREATE_USER_SCHEMA = z.object({
  email: z.string().email(),
  username: z.string().min(1),
});
