import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { map, Observable } from 'rxjs';
import type { PaginationInput } from 'src/input/pagination.input';

@Injectable()
export class PaginationMapInterceptor implements NestInterceptor {
  @Inject() reflector: Reflector;
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = GqlExecutionContext.create(context);
    const { page, pageSize } = (ctx.getArgs().pagination || {}) as PaginationInput;

    return next
      .handle()
      .pipe(
        map(result => {
          if (result.data && result.total && Array.isArray(result.data) && typeof result.total === 'number') {
            return {
              data: result.data,
              pagination: {
                total: result.total,
                page: page || 1,
                pageSize: pageSize || Number.MAX_SAFE_INTEGER,
                cursorLeft: result.data[0]?.id || null,
                cursorRight: result.data[result.data.length - 1]?.id || null,
              }
            };
          }
          return result;
        })
      )
      ;
  }
}