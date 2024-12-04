import { Field, ID, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { NumberTransform } from 'src/decorators/transforms/number.transform';

@InputType()
export class UpdateRoomPlayer {
  @NumberTransform()
  @Field(() => ID, { nullable: true })
  id?: number;

  @NumberTransform()
  @Field(() => ID)
  roleId: number;

  @Field()
  virtual: string;
}

@InputType()
export class UpdateManyRoomPlayer {
  @NumberTransform()
  @Field(() => ID)
  roomId: number;
  @Type(() => UpdateRoomPlayer)
  @ValidateNested({ each: true })
  @Field(() => [UpdateRoomPlayer])
  data: UpdateRoomPlayer[];
}
