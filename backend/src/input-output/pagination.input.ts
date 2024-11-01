import { Field, InputType } from '@nestjs/graphql';
import { IsNumber, IsOptional, Min } from 'class-validator';

@InputType()
export class PaginationInput {
  @Field({ defaultValue: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @Field({ defaultValue: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  pageSize?: number;
}