import { Field, ID, ObjectType, PickType } from '@nestjs/graphql';
import type { User } from '@prisma/client';
@ObjectType()
export class UserModel implements Omit<User, 'password'> {
  @Field(() => ID!)
  id: number;
  @Field(() => String!)
  email: string;
  @Field(() => String)
  username: string | null;
}

@ObjectType()
export class Me extends PickType(UserModel, ['id', 'username', 'email']) {}
