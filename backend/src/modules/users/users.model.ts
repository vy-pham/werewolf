import { Field, ID, ObjectType, PickType } from '@nestjs/graphql';
import type { User } from '@prisma/client';
@ObjectType()
export class UserModel implements Omit<User, 'password'> {
  avatar: string;
  @Field(() => ID)
  id: number;
  @Field()
  username: string;
  @Field()
  email: string;
}

@ObjectType()
export class UserToken {
  @Field()
  token: string;
}

@ObjectType()
export class Me extends PickType(UserModel, ['id', 'username']) {}
