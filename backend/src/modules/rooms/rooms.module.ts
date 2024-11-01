import { Module } from '@nestjs/common';
import { RoomResolver } from './rooms.resolver';
import { RoomService } from './rooms.service';
import { PrismaClient, Prisma } from '@prisma/client';

@Module({
  providers: [RoomService, RoomResolver, {
    provide: 'prisma',
    useValue: new PrismaClient().$extends({
      model: {
        $allModels: {
          async exists<T>(
            this: T,
            where: Prisma.Args<T, 'findFirst'>['where']
          ): Promise<boolean> {
            // Get the current model at runtime
            const context = Prisma.getExtensionContext(this);

            const result = await (context as any).findFirst({ where });
            return result !== null;
          },
        },
      },
    })


  }],
})
export class RoomModule { }


export const prisma = new PrismaClient().$extends({
  model: {
    $allModels: {
      async exists<T>(
        this: T,
        where: Prisma.Args<T, 'findFirst'>['where']
      ): Promise<boolean> {
        // Get the current model at runtime
        const context = Prisma.getExtensionContext(this);

        const result = await (context as any).findFirst({ where });
        return result !== null;
      },
    },
  },
});