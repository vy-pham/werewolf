import { Field, ID, ObjectType } from '@nestjs/graphql';
import { type RoomRole } from '@prisma/client';
import { RoleModel } from '../roles/roles.model';

@ObjectType()
export class RoomRoleModel implements Omit<RoomRole, 'roomId' | 'roleId'> {
  @Field(() => ID)
  id: number;
  @Field(() => RoleModel)
  role: RoleModel;
}
