import { Field, ID, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { NumberTransform } from 'src/decorators/transforms/number.transform';

@InputType()
export class UpdateGamePlayer {
  @NumberTransform()
  @Field(() => ID)
  id: number;

  @NumberTransform()
  @Field(() => ID)
  roleId: number;
}

@InputType()
export class UpdateManyGamePlayer {
  @ValidateNested()
  @Type(() => UpdateGamePlayer)
  @Field(() => [UpdateGamePlayer])
  data: UpdateGamePlayer[];
}
