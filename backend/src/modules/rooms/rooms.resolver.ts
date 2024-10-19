import { Inject } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { RoomService } from './rooms.service';
import { Room } from './rooms.model';
@Resolver('Room')
export class RoomResolver {
  @Inject() roomService: RoomService;

  @Query(() => [Room])
  async rooms() {
    const rooms = await this.roomService.getRooms();
    return rooms;
  }
}