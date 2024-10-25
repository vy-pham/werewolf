import { Global, Module } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';

const provideUser = {
  provide: TOKEN.USER,
  useFactory({ req }: { req: Request; }) {
    return req.user;
  },
  inject: [REQUEST]
};

@Global()
@Module({
  providers: [
    provideUser
  ],
  exports: [
    provideUser
  ]
})
export class GlobalModule { }