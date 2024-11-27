import { type ApolloDriverConfig, ApolloDriver } from '@nestjs/apollo';
import { Controller, Get, HttpStatus, Inject, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, REQUEST } from '@nestjs/core';
import { GraphQLModule, registerEnumType } from '@nestjs/graphql';
import { JwtModule } from '@nestjs/jwt';
import type { Request } from 'express';
import { join } from 'path';
import { GlobalModule } from './modules/global/global.module';
import { RoomModule } from './modules/rooms/rooms.module';
import { UsersModule } from './modules/users/users.module';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { AuthGuard } from './guard/auth.guard';
import { PaginationMapInterceptor } from './interceptors/response.interceptor';
import { HttpExceptionFilter } from './interceptors/exception.interceptor';
import GraphQLJSON from 'graphql-type-json';
import {
  GamePlayerStatus,
  GameRoundActionTargetStatus,
  GameStatus,
  Roles,
  RoleSide,
  RoomStatus,
  RoomType,
  Status,
} from '@prisma/client';
import { InjectPrisma } from './decorators/inject-prisma.decorator';
import { ROLES } from './roles';
import { RoleModule } from './modules/roles/roles.module';
import { RoomPlayerModule } from './modules/room-player/room-player.module';
import { RoomRoleModule } from './modules/room-role/room-role.module';
import { GameModule } from './modules/game/game.module';
import { GamePlayerModule } from './modules/game-player/game-player.module';
import { GameRoundModule } from './modules/game-round/game-round.module';
import { GameRoundActionModule } from './modules/game-round-action/game-round-action.module';
registerEnumType(HttpStatus, { name: 'HttpCode' });
registerEnumType(RoomStatus, { name: 'RoomStatus' });
registerEnumType(Status, { name: 'Status' });
registerEnumType(RoomType, { name: 'RoomType' });
registerEnumType(Roles, { name: 'Roles' });
registerEnumType(RoleSide, { name: 'RoleSide' });
registerEnumType(GameStatus, { name: 'GameStatus' });
registerEnumType(GamePlayerStatus, { name: 'GamePlayerStatus' });
registerEnumType(GameRoundActionTargetStatus, {
  name: 'GameRoundActionTargetStatus',
});

@Controller()
class AppController {
  @Inject(REQUEST) request: Request;
  @Get('')
  get() {
    return 'ABC';
  }
}

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: false,
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
      resolvers: { JSON: GraphQLJSON },
    }),
    JwtModule,
    UsersModule,
    RoomModule,
    RoleModule,
    RoomPlayerModule,
    RoomRoleModule,
    GlobalModule,
    GameModule,
    GamePlayerModule,
    GameRoundModule,
    GameRoundActionModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: PaginationMapInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],

  controllers: [AppController],
})
export class AppModule {
  @InjectPrisma() prisma: PrismaService;
  async onModuleInit() {
    ROLES.map(async (role) => {
      const findRole = await this.prisma.role.findFirst({
        where: { enum: role.enum },
      });
      if (findRole) {
        this.prisma.role.update({
          where: { id: findRole.id },
          data: role,
        });
      } else {
        await this.prisma.role.create({ data: role });
      }
    });
  }
}
