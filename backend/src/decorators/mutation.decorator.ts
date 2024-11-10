import { createUnionType, Field, type QueryOptions } from '@nestjs/graphql';
import { ObjectTypes } from './object-type-with-status.decorator';
import { Mutation as BaseMutation } from '@nestjs/graphql';
import { ErrorOutput } from 'src/input-output/error.output';

export const Mutation = (
  DataType: { new (...args: any[]): any },
  options?: QueryOptions,
) => {
  @ObjectTypes()
  class Type {
    @Field(() => DataType, options)
    data: typeof DataType;
  }
  Object.defineProperty(Type, 'name', { value: `${DataType.name}_Mutation` });

  const ResultUnion = createUnionType({
    name: `ResultUnion_${DataType.name}_Mutation`,
    types: () => [Type, ErrorOutput],
    resolveType(value) {
      if (value.statusCode !== 200) return ErrorOutput;
      return Type;
    },
  });
  return BaseMutation(() => ResultUnion, options);
};
