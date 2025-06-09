import {
  createUnionType,
  Field,
  ObjectType,
  Query,
  type QueryOptions,
  Mutation as BaseMutation,
  InterfaceType,
  ObjectTypeOptions,
} from '@nestjs/graphql';
import { applyDecorators, HttpStatus, SetMetadata } from '@nestjs/common';
import { IS_GET_LIST } from './metadata.decorator';
import GraphQLJSON from 'graphql-type-json';

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
const hash: { [k: string]: any } = {};

const getDataTypeName = (
  dataType: { new (...args: any[]): any } | [{ new (...args: any[]): any }],
) => {
  if (Array.isArray(dataType)) {
    return dataType[0].name;
  } else {
    return dataType.name;
  }
};
@InterfaceType()
export abstract class BaseResponse {
  @Field(() => String)
  message: string;

  @Field(() => HttpStatus, { defaultValue: HttpStatus.OK })
  statusCode: HttpStatus;
}
export const ObjectTypes = (options?: ObjectTypeOptions) =>
  ObjectType({
    implements: () => [BaseResponse],
    ...options,
  });

@ObjectTypes()
export class ErrorOutput {
  @Field(() => GraphQLJSON)
  errors: JSON;
}

export const QueryList = (
  dataType: { new (...args: any[]): any } | [{ new (...args: any[]): any }],
  options?: QueryOptions,
) => {
  @ObjectTypes()
  class Type {
    @Field(() => [dataType])
    data: typeof dataType;
    @Field(() => PaginationData)
    pagination: PaginationData;
  }

  const dataTypeName = getDataTypeName(dataType);
  const typeName = `${dataTypeName}List`;
  Object.defineProperty(Type, 'name', { value: typeName });

  const unionName = `ResultUnion${typeName}`;
  if (hash[unionName]) {
    return applyDecorators(
      SetMetadata(IS_GET_LIST, true),
      Query(() => hash[unionName], options),
    );
    return Query(() => hash[unionName], options);
  } else {
    const ResultUnion = createUnionType({
      name: unionName,
      types: () => [Type, ErrorOutput],
      resolveType(value) {
        if (value.statusCode !== 200) return ErrorOutput;
        return Type;
      },
    });
    hash[unionName] = ResultUnion;
    return applyDecorators(
      SetMetadata(IS_GET_LIST, true),
      Query(() => ResultUnion, options),
    );
  }
};

export const QuerySingle = (
  dataType: { new (...args: any[]): any } | [{ new (...args: any[]): any }],
  options?: QueryOptions,
) => {
  @ObjectTypes()
  class Type {
    @Field(() => dataType, options)
    data: typeof dataType;
  }
  const dataTypeName = getDataTypeName(dataType);
  const typeName = `${dataTypeName}Single`;
  Object.defineProperty(Type, 'name', { value: typeName });

  const unionName = `ResultUnion${typeName}`;
  if (hash[unionName]) {
    return Query(() => hash[unionName], options);
  } else {
    const ResultUnion = createUnionType({
      name: unionName,
      types: () => [Type, ErrorOutput],
      resolveType(value) {
        if (value.statusCode !== 200) return ErrorOutput;
        return Type;
      },
    });
    hash[unionName] = ResultUnion;
    return Query(() => ResultUnion, options);
  }
};

export const Mutation = (
  dataType: { new (...args: any[]): any } | [{ new (...args: any[]): any }],
  options?: QueryOptions,
) => {
  @ObjectTypes()
  class Type {
    @Field(() => dataType, options)
    data: typeof dataType;
  }
  const dataTypeName = getDataTypeName(dataType);
  const typeName = `${dataTypeName}Mutation`;
  Object.defineProperty(Type, 'name', { value: typeName });
  const unionName = `ResultUnion${typeName}`;
  if (hash[unionName]) {
    return BaseMutation(() => hash[unionName], options);
  } else {
    const ResultUnion = createUnionType({
      name: unionName,
      types: () => [Type, ErrorOutput],
      resolveType(value) {
        if (value.statusCode !== 200) return ErrorOutput;
        return Type;
      },
    });
    hash[unionName] = ResultUnion;
    return BaseMutation(() => ResultUnion, options);
  }
};
