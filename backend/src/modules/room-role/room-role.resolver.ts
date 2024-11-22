import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { RoomRoleModel } from './room-role.model';
import { RoomModel } from '../rooms/rooms.model';

@Resolver(() => RoomModel)
export class RoomRoleResolver {
  @ResolveField(() => RoomRoleModel)
  async rolesConfig(@Parent() room: RoomModel) {
    console.log(1);

    return [];
  }
}
