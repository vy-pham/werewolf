import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Args, GqlExecutionContext } from '@nestjs/graphql';
import { validateOrReject } from 'class-validator';
export const Filters = (filterDefine: Function & { new(...args: any[]): any; }) => {
  return createParamDecorator(
    async (_: unknown, context: ExecutionContext) => {
      const ctx = GqlExecutionContext.create(context);
      const filters = ctx.getArgs().filters || {};
      try {
        await validateOrReject(Object.assign(new filterDefine(), filters));
      } catch (error) {
        throw new BadRequestException(error);
      }

      return filters;
    },
    [
      Args(
        { name: 'filters', type: () => filterDefine, nullable: true },
      ),
    ]
  )();
};