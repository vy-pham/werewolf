import { InjectPrisma } from 'src/decorators/inject-prisma.decorator';
import { UpdateManyGamePlayer } from './input/update-many-game-player.input';
import { GAME_PLAYER_INCLUDE } from './game-player.constant';

export class GamePlayerService {
  @InjectPrisma() prisma: PrismaService;
  async updateManyGamePlayer(input: UpdateManyGamePlayer) {
    const data = await this.prisma.$transaction(
      input.data.map(({ id, roleId }) => {
        return this.prisma.gamePlayer.update({
          where: { id },
          data: { roleId },
          include: GAME_PLAYER_INCLUDE,
        });
      }),
    );

    return data;
  }
}
