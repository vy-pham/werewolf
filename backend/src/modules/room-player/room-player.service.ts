import { InjectPrisma } from 'src/decorators/inject-prisma.decorator';
import type { UpdateRoomPlayerInput } from './input/update-room-player.input';

export class RoomPlayerService {
  @InjectPrisma() prisma: PrismaService;
  async updateRoomPlayers({ roomId, virtualPlayers }: UpdateRoomPlayerInput) {
    await this.prisma.roomPlayer.deleteMany({
      where: { roomId: Number(roomId), virtual: { not: null } },
    });
    await this.prisma.roomPlayer.createMany({
      data: virtualPlayers.map((p) => ({
        roomId: Number(roomId),
        virtual: p,
      })),
    });
    return await this.prisma.roomPlayer.findMany({
      where: {
        roomId: Number(roomId),
      },
      include: {
        user: true,
      },
    });
  }
}
