import { HttpStatus } from '@nestjs/common';
import {
  ObjectType as BaseObjectType,
  Field,
  InterfaceType,
  type ObjectTypeOptions,
} from '@nestjs/graphql';

@InterfaceType()
export abstract class BaseResponse {
  @Field(() => String)
  message: string;

  @Field(() => HttpStatus, { defaultValue: HttpStatus.OK })
  statusCode: HttpStatus;
}
export const ObjectTypes = (options?: ObjectTypeOptions) =>
  BaseObjectType({
    implements: () => [BaseResponse],
    ...options,
  });
