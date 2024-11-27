import { InjectPrisma } from 'src/decorators/inject-prisma.decorator';
import type { CreateGameInput } from './input/create-game.input';

export class GameService {
  @InjectPrisma() prismaService: PrismaService;
  async createGame({ roomId }: CreateGameInput) {
    const room = await this.prismaService.room.findFirstOrThrow(
      { where: { id: roomId } },
      { throwCase: 'IF_NOT_EXISTS', message: `Room ${roomId} not found` },
    );
    const roomPlayers = await this.prismaService.roomPlayer.findMany({
      where: { roomId },
    });

    const createGame = await this.prismaService.game.create({
      data: {
        roomId,
        players: {
          createMany: {
            data: roomPlayers.map((player) => {
              return {
                userId: player.userId,
                virtual: player.virtual,
              };
            }),
          },
        },
      },
      include: {
        players: {
          include: {
            role: true,
          },
        },
      },
    });
    return createGame;
  }
}
