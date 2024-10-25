import { type ApolloDriverConfig, ApolloDriver } from '@nestjs/apollo';
import { Controller, Get, Inject, Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, REQUEST } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { JwtModule } from '@nestjs/jwt';
import type { Request } from 'express';
import { join } from 'path';
import { GlobalModule } from './modules/global/global.module';
import { RoomModule } from './modules/rooms/rooms.module';
import { UsersModule } from './modules/users/users.module';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { AuthGuard } from './guard/auth.guard';
import { PaginationMapInterceptor } from './interceptors/pagination-map.interceptor';

@Controller()
class AppController {
  @Inject(REQUEST) request: Request;
  @Get('')
  get() {
    console.log(this.request.headers);

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
      useClass: PaginationMapInterceptor
    }
  ],

  controllers: [AppController]
})
export class AppModule {

}
