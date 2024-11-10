import { Field, ID, ObjectType, PickType } from '@nestjs/graphql';
import type { User as UserModel } from '@prisma/client';
@ObjectType()
export class User implements Omit<UserModel, 'password'> {
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
export class Me extends PickType(User, ['id', 'username']) {}
