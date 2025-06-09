import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { Args, GqlExecutionContext } from '@nestjs/graphql';
import { validateOrReject } from 'class-validator';

import { Field, InputType } from '@nestjs/graphql';
import { z } from 'zod';
import { HttpValidationPipe } from '../pipes/validation.pipe';

@InputType()
export class PaginationInput {
  @Field({ defaultValue: 1 })
  page?: number;

  @Field({ defaultValue: 10 })
  pageSize?: number;
}

export const PAGINATION_SCHEMA = z.object({
  page: z.number().min(1).optional(),
  pageSize: z.number().min(1).optional(),
});

export const Pagination = createParamDecorator(
  async (_: unknown, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context);
    const { page, pageSize } = (ctx.getArgs().pagination ||
      {}) as PaginationInput;

    const pipe = new HttpValidationPipe(PAGINATION_SCHEMA);
    pipe.transform(
      { page, pageSize },
      {
        type: 'body',
        metatype: Object,
      },
    );
    let skip = 0;
    let limit = pageSize || Number.MAX_SAFE_INTEGER;
    if (page && pageSize) {
      skip = (page - 1) * pageSize;
    }
    return { skip, limit };
  },
  [Args({ name: 'pagination', type: () => PaginationInput, nullable: true })],
);
