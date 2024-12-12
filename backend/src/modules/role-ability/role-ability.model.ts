import { Field, ID, ObjectType } from '@nestjs/graphql';
import type { RoleAbility } from '@prisma/client';

@ObjectType()
export class RoleAbilityModel implements Omit<RoleAbility, 'applyStatus'> {
  @Field(() => ID)
  id: number;
  @Field(() => String)
  name: string;
  @Field(() => ID)
  roleId: number;
  @Field()
  description: string;
  @Field()
  totalUses: number;
  @Field()
  usesPerRound: number;
}
