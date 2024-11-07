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
registerEnumType(HttpStatus, {
  name: 'HttpCode',
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
    GlobalModule,
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
export class AppModule {}
