import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { RoomPlayerModel } from './room-player.model';
import { RoomModel } from '../rooms/rooms.model';

@Resolver(() => RoomModel)
export class RoomPlayerResolver {
  @ResolveField(() => RoomPlayerModel)
  async players(@Parent() room: RoomModel) {
    console.log(2);

    return [];
  }
}
