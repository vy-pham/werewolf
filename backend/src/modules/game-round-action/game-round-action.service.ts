import { InjectPrisma } from 'src/decorators/inject-prisma.decorator';

export class GameRoundActionService {
  @InjectPrisma() prisma: PrismaService;

  async createAction() {}
}
