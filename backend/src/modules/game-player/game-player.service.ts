import { InjectPrisma } from 'src/decorators/inject-prisma.decorator';
import { UpdateManyGamePlayer } from './input/update-many-game-player.input';

export class GamePlayerService {
  @InjectPrisma() prisma: PrismaService;
  async updateManyGamePlayer(input: UpdateManyGamePlayer) {
    const data = await this.prisma.$transaction(
      input.data.map(({ id, roleId }) => {
        return this.prisma.gamePlayer.update({
          where: { id },
          data: { roleId },
          include: {
            role: true,
          },
        });
      }),
    );

    return data;
  }
}
