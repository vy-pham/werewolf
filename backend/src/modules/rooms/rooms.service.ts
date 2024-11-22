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

  async createRoom({ maxPlayers, name, rolesConfig }: CreateRoomInput) {
    const user = await this.prisma.user.findUnique({
      where: { id: this.user.id },
    });

    const roomPlayer = await this.prisma.roomPlayer.findUnique({
      where: { userId: user.id },
    });

    if (roomPlayer) {
      await this.prisma.roomPlayer.delete({
        where: { id: roomPlayer.id },
      });
      if (roomPlayer.isHost) {
        const newHost = await this.prisma.roomPlayer.findFirstAndUpdate(
          {
            where: { roomId: roomPlayer.roomId },
          },
          {
            isHost: true,
          },
        );
        if (!newHost) {
          await this.prisma.room.delete({
            where: { id: roomPlayer.roomId },
          });
        }
      }
    }

    const room = await this.prisma.room.create({
      data: {
        maxPlayers,
        name,
        players: {
          createMany: {
            data: [
              {
                userId: user.id,
                isHost: true,
              },
            ],
          },
        },
        rolesConfig: {
          createMany: {
            data: rolesConfig.map((o) => ({
              roleId: Number(o),
            })),
          },
        },
      },
      include: {
        players: {
          include: {
            user: true,
          },
        },
        rolesConfig: {
          include: {
            role: true,
          },
        },
      },
    });

    return room;
  }

  async getCurrentRoom() {
    return await this.prisma.room.findFirst({
      where: {
        players: {
          some: {
            userId: this.user.id,
          },
        },
      },
      include: {
        players: {
          include: {
            user: true,
          },
        },
        rolesConfig: {
          include: {
            role: true,
          },
        },
      },
    });
  }
}
