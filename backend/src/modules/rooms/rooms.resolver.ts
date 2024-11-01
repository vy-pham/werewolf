import { Inject } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { RoomService } from './rooms.service';
import { Room } from './rooms.model';
import { QueryList } from 'src/decorators/query-list.decorator';
import { Filters } from 'src/decorators/filter.decorator';
import { Pagination } from 'src/decorators/pagination.decorator';
import { FilterRoomInput } from './input/filter-room.input';
import { Input } from 'src/decorators/input.decorator';
import { CreateRoomInput } from './input/create-room.input';
import { Mutation } from 'src/decorators/mutation.decorator';
@Resolver('Room')
export class RoomResolver {
  @Inject() roomService: RoomService;

  @QueryList(Room)
  async rooms(
    @Pagination() pagination: Pagination,
    @Filters() filters: FilterRoomInput

  ) {
    const results = await this.roomService.getRooms(filters, pagination);
    return { ...results, message: 'Get rooms successfully' };
  }

  @Mutation(Room)
  async createRoom(
    @Input() data: CreateRoomInput
  ) {
    return {};
  }
}