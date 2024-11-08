import { Inject, Injectable } from '@nestjs/common';
import type { FilterRoomInput } from './input/filter-room.input';
import { InjectPrisma } from 'src/decorators/inject-prisma.decorator';
import type { CreateRoomInput } from './input/create-room.input';

@Injectable()
export class RoomService {
  @Inject(TOKEN.USER) user: JWTPayload;
  @InjectPrisma() prisma: PrismaService;
  async getRooms(filters: FilterRoomInput, pagination: Pagination) {
    const results = await this.prisma.room.findAndPagination({
      where: {},
      ...pagination,
    });
    return results;
  }

  async createRoom({ max_players, name }: CreateRoomInput) {
    const user = await this.prisma.user.findUnique({
      where: { id: this.user.id },
    });
    console.log('abc');
    await this.prisma.roomPlayer.exists(
      { user_id: this.user.id },
      {
        throwCase: 'IF_EXISTS',
        message: 'You cannot create room while you are in another room',
      },
    );

    const room = await this.prisma.room.create({
      data: {
        max_players,
        name,
        players: {
          createMany: {
            data: [
              {
                user_id: this.user.id,
                is_host: true,
              },
              ...new Array(max_players - 1)
                .fill(null)
                .map(() => ({ user_id: null })),
            ],
          },
        },
      },
    });
    return room;
  }
}
