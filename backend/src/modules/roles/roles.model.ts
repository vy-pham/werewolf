import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Roles, RoleSide, Status, type Role } from '@prisma/client';

@ObjectType()
export class RoleModel implements Role {
  @Field()
  name: string;
  @Field(() => ID)
  id: number;
  @Field()
  description: string;
  @Field()
  point: number;
  @Field(() => Roles)
  enum: Roles;
  @Field(() => RoleSide)
  side: RoleSide;
  @Field(() => Status)
  status: Status;
}
