import { InjectPrisma } from 'src/decorators/inject-prisma.decorator';
import type { UpdateManyRoomPlayer } from './input/update-many-room-player.input';

export class RoomPlayerService {
  @InjectPrisma() prisma: PrismaService;
  async updateRoomPlayers({ data, roomId }: UpdateManyRoomPlayer) {
    return await this.prisma.$transaction(
      data.map(({ roleId, virtual, id }) => {
        return this.prisma.roomPlayer.upsert({
          where: { id, roomId },
          create: {
            roleId,
            virtual,
            roomId,
          },
          update: {
            roleId,
            virtual,
          },
          include: {
            role: true,
            user: true,
          },
        });
      }),
    );
  }
}
