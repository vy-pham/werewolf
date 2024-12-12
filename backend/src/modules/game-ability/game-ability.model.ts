import { Field, ID, ObjectType } from '@nestjs/graphql';
import { RoleAbilityModel } from '../role-ability/role-ability.model';
import type { GameAbility } from '@prisma/client';

@ObjectType()
export class GameAbilityModel implements GameAbility {
  @Field(() => ID)
  id: number;
  @Field(() => ID)
  gameId: number;
  @Field(() => ID)
  abilityId: number;
  @Field(() => RoleAbilityModel)
  ability: RoleAbilityModel;
  @Field(() => Number)
  totalUses: number;
  @Field(() => Number)
  usesThisRound: number;
}
