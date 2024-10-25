import { Field, ObjectType, Query } from '@nestjs/graphql';
import { IsGetList } from './public.decorator';
import { applyDecorators } from '@nestjs/common';

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

export const QueryList = (DataType: { new(...args: any[]): any; }) => {
  @ObjectType()
  class Type {
    @Field(() => [DataType])
    data: typeof DataType;
    @Field(() => PaginationData)
    pagination: PaginationData;
  }
  Object.defineProperty(Type, 'name', { value: `${DataType.name}_List` });
  applyDecorators(IsGetList());
  return Query(() => Type);
};