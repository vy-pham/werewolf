import { Global, Module } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { PrismaModule } from '../prisma/prisma.module';

const provideUser = {
  provide: TOKEN.USER,
  useFactory({ req }: { req: Request; }) {
    return req.user;
  },
  inject: [REQUEST]
};

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    provideUser
  ],
  exports: [
    provideUser,
    PrismaModule
  ]
})
export class GlobalModule { }