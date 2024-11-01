import { Module, type Provider } from '@nestjs/common';
import { BasePrismaService } from './prisma.service';
import { PRISMA_TOKEN } from 'src/decorators/inject-prisma.decorator';

const providers: Provider[] = [
  {
    provide: PRISMA_TOKEN,
    useFactory() {
      return new BasePrismaService().withExtensions();
    },
  }
];

@Module({
  providers,
  exports: providers
})
export class PrismaModule { }