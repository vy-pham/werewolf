import { Inject } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { RoomService } from './rooms.service';
import { RoomModel } from './rooms.model';
import { QueryList } from 'src/decorators/query-list.decorator';
import { Filters } from 'src/decorators/filter.decorator';
import { Pagination } from 'src/decorators/pagination.decorator';
import { FilterRoomInput } from './input/filter-room.input';
import { Input } from 'src/decorators/input.decorator';
import { CreateRoomInput } from './input/create-room.input';
import { Mutation } from 'src/decorators/mutation.decorator';
import { QuerySingle } from 'src/decorators/query-single.decorator';
@Resolver('Room')
export class RoomResolver {
  @Inject() roomService: RoomService;

  @QueryList(RoomModel)
  async rooms(
    @Pagination() pagination: Pagination,
    @Filters() filters: FilterRoomInput,
  ) {
    const results = await this.roomService.getRooms(filters, pagination);
    return { ...results, message: 'Get rooms successfully' };
  }

  @QuerySingle(RoomModel, { nullable: true })
  async currentRoom(): Promise<{ data: RoomModel }> {
    const data = await this.roomService.getCurrentRoom();
    return {
      data,
    };
  }

  @Mutation(RoomModel)
  async createRoom(
    @Input() input: CreateRoomInput,
  ): Promise<{ data: RoomModel; message: string }> {
    const data = await this.roomService.createRoom(input);
    return { data, message: 'Create room successfully' };
  }
}
