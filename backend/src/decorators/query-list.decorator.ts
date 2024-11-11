import {
  createUnionType,
  Field,
  ObjectType,
  Query,
  type QueryOptions,
} from '@nestjs/graphql';
import { IS_GET_LIST } from './public.decorator';
import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ObjectTypes } from './object-type-with-status.decorator';
import { ErrorOutput } from 'src/input-output/error.output';

@ObjectType()
class PaginationData {
  @Field()
  total: number;
  @Field()
  page: number;
  @Field()
  pageSize: number;
  @Field({ nullable: true })
  cursorLeft?: number;
  @Field({ nullable: true })
  cursorRight?: number;
}

export const QueryList = (
  DataType: { new (...args: any[]): any },
  options?: QueryOptions,
) => {
  @ObjectTypes()
  class Type {
    @Field(() => [DataType])
    data: typeof DataType;
    @Field(() => PaginationData)
    pagination: PaginationData;
  }

  Object.defineProperty(Type, 'name', { value: `${DataType.name}_List` });

  const ResultUnion = createUnionType({
    name: `ResultUnion_${DataType.name}_List`,
    types: () => [Type, ErrorOutput],
    resolveType(value) {
      if (value.errors) return ErrorOutput;
      return Type;
    },
  });

  return applyDecorators(
    SetMetadata(IS_GET_LIST, true),
    Query(() => ResultUnion, options),
  );
};
