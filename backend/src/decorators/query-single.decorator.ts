import { createUnionType, Field, Query, type QueryOptions } from '@nestjs/graphql';
import { ObjectTypes } from './object-type-with-status.decorator';
import { ErrorOutput } from 'src/input-output/error.output';

export const QuerySingle = (DataType: { new(...args: any[]): any; }, options?: QueryOptions) => {
  @ObjectTypes()
  class Type {
    @Field(() => DataType)
    data: typeof DataType;
  }
  Object.defineProperty(Type, 'name', { value: `${DataType.name}_Single` });
  const ResultUnion = createUnionType({
    name: `ResultUnion_${DataType.name}_Single`,
    types: () => [Type, ErrorOutput],
    resolveType(value) {
      if (value.statusCode !== 200) return ErrorOutput;
      return Type;
    }
  });
  return Query(() => ResultUnion, options);
};