import { InjectPrisma } from 'src/decorators/inject-prisma.decorator';
import type { CreateRoundInput } from './input/create-round.input';
import { GameRoundTime } from '@prisma/client';
import { GAME_ROUND_INCLUDE } from './game-round.constant';

export class GameRoundService {
  @InjectPrisma() prisma: PrismaService;
  async createRound({ gameId }: CreateRoundInput) {
    const lastRound = await this.prisma.gameRound.findFirst({
      where: { gameId },
      orderBy: {
        id: 'desc',
      },
    });
    const createData = {
      sequence: 1,
      time: GameRoundTime.night,
      gameId,
    };
    if (lastRound) {
      switch (lastRound.time) {
        case GameRoundTime.night:
          createData.time = GameRoundTime.night;
          break;
        case GameRoundTime.day:
          createData.time = GameRoundTime.night;
          createData.sequence = createData.sequence + 1;
          break;
      }
    }

    const data = await this.prisma.gameRound.create({
      data: createData,
      include: GAME_ROUND_INCLUDE,
    });
    return data;
  }
}
