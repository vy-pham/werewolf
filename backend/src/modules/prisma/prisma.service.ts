import { BadRequestException, Injectable, type OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class BasePrismaService extends PrismaClient implements OnModuleInit {

  async onModuleInit() {
    await this.$connect();
  }

  withExtensions() {
    return this.$extends({
      model: {
        $allModels: {
          async findAndPagination<T>(
            this: T,
            args: Prisma.Args<T, 'findMany'>,
          ): Promise<{ data: any, total: number; }> {
            const context = Prisma.getExtensionContext(this) as any;
            const [data, total] = await Promise.all([
              context.findMany(args),
              context.count({ where: args.where })
            ]);

            return { data, total };
          },

          async exists<T>(
            this: T,
            where: Prisma.Args<T, 'findFirst'>['where'],
            {
              throwCase,
              message
            }: {
              throwCase?: 'IF_EXISTS' | 'IF_NOT_EXISTS';
              message?: string;
            }
          ) {
            const context = Prisma.getExtensionContext(this) as any;
            const data = await context.findFirst({ where, select: { id: 1 } });
            if (throwCase) {
              switch (throwCase) {
                case 'IF_EXISTS':
                  if (data) throw new BadRequestException(message || `${context.$name} with query ${JSON.stringify(where)} is existed`);
                  break;
                case 'IF_NOT_EXISTS':
                  if (!data) throw new BadRequestException(message || `${context.$name} with query ${JSON.stringify(where)} is not existed`);
                default:
                  break;
              }
            }
            return !!data;
          }
        }
      }
    });
  }

}