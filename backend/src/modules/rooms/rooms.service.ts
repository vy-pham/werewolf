import { Injectable } from '@nestjs/common';
import type { FilterRoomInput } from './input/filter-room.input';
import { InjectPrisma } from 'src/decorators/inject-prisma.decorator';

@Injectable()
export class RoomService {
  @InjectPrisma() prisma: PrismaService;
  async getRooms(filters: FilterRoomInput, pagination: Pagination) {

    const results = await this.prisma.room.findAndPagination({
      where: {},
      ...pagination,
    });
    return results;
  }
}