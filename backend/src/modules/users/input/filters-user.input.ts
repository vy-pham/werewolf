import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString } from 'class-validator';

@InputType()
export class FiltersUserInput {
  @Field()
  @IsString()
  @IsOptional()
  username?: string;
}