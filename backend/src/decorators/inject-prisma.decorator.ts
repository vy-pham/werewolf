import { Inject } from '@nestjs/common';

export const PRISMA_TOKEN = 'PRISMA';

export const InjectPrisma = () => Inject(PRISMA_TOKEN);