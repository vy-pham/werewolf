import { Field } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { ObjectTypes } from 'src/decorators/object-type-with-status.decorator';

@ObjectTypes()
export class ErrorOutput {
  @Field(() => GraphQLJSON)
  errors: JSON;

}
