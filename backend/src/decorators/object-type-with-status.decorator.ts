import { HttpStatus } from '@nestjs/common';
import { ObjectType as BaseObjectType, Field, InterfaceType, type ObjectTypeOptions } from '@nestjs/graphql';

@InterfaceType()
export abstract class BaseResponse {
  @Field(() => String)
  message: string;

  @Field(() => Number, { defaultValue: HttpStatus.OK })
  statusCode: number;
}
export const ObjectTypes = (options?: ObjectTypeOptions) => BaseObjectType({
  implements: () => [BaseResponse],
  ...options
});