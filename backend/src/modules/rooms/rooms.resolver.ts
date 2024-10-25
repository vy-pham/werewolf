import { Inject } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { RoomService } from './rooms.service';
import { Room } from './rooms.model';
import { QueryList } from 'src/decorators/query-list.decorator';
@Resolver('Room')
export class RoomResolver {
  @Inject() roomService: RoomService;

  @QueryList(Room)
  async rooms() {
    const rooms = await this.roomService.getRooms();
    return rooms;
  }
}