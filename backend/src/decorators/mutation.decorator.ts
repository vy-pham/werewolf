import { createUnionType, Field, type QueryOptions } from '@nestjs/graphql';
import { ObjectTypes } from './object-type-with-status.decorator';
import { Mutation as BaseMutation } from '@nestjs/graphql';
import { ErrorOutput } from 'src/input-output/error.output';

const hash: { [k: string]: any } = {};

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
  if (hash[`ResultUnion_${DataType.name}_Mutation`]) {
    return BaseMutation(
      () => hash[`ResultUnion_${DataType.name}_Mutation`],
      options,
    );
  } else {
    const ResultUnion = createUnionType({
      name: `ResultUnion_${DataType.name}_Mutation`,
      types: () => [Type, ErrorOutput],
      resolveType(value) {
        if (value.statusCode !== 200) return ErrorOutput;
        return Type;
      },
    });
    hash[`ResultUnion_${DataType.name}_Mutation`] = ResultUnion;
    return BaseMutation(() => ResultUnion, options);
  }
};
