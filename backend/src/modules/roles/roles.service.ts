import { InjectPrisma } from 'src/decorators/inject-prisma.decorator';

export class RoleService {
  @InjectPrisma() prisma: PrismaService;

  async getRoles() {
    return this.prisma.role.findMany();
  }
}
