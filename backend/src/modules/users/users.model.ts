import { Field, ID, ObjectType, PickType } from '@nestjs/graphql';

@ObjectType()
export class User {
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
export class Me extends PickType(User, ['id']) { }