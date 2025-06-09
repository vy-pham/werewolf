import { Field, InputType } from "@nestjs/graphql";
import { IsOptional, IsString } from "class-validator";

@InputType()
export class QueryUserInput {
  @Field()
  @IsString()
  @IsOptional()
  username?: string;
}