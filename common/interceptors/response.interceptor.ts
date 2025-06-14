import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { map, Observable } from 'rxjs';
import { IS_GET_LIST } from '../decorators/metadata.decorator';

@Injectable()
export class PaginationMapInterceptor implements NestInterceptor {
  @Inject() reflector: Reflector;
  intercept(context: ExecutionContext, next: CallHandler) {
    if ((context as any).contextType === 'graphql') {
      const ctx = GqlExecutionContext.create(context);
      const { page, pageSize } = (ctx.getArgs().pagination || {}) as {
        page: number;
        pageSize: number;
      };
      const isList = this.reflector.getAllAndOverride<boolean>(IS_GET_LIST, [
        context.getHandler(),
        context.getClass(),
      ]);

      return next.handle().pipe(
        map((result) => {
          if (isList) {
            return {
              data: result.data,
              pagination: {
                total: result.total,
                page: page || 1,
                pageSize: pageSize || Number.MAX_SAFE_INTEGER,
                cursorLeft: result.data[0]?.id || null,
                cursorRight: result.data[result.data.length - 1]?.id || null,
              },
              message: result.message || 'Query successfully',
              statusCode: HttpStatus.OK,
            };
          }
          return {
            data: result.data,
            message: result.message || 'Execute Successfully',
            statusCode: HttpStatus.OK,
          };
        }),
      );
    }

    return next.handle();
  }
}
