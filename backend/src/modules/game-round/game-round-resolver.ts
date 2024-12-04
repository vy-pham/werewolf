import { Resolver } from '@nestjs/graphql';
import { Mutation } from 'src/decorators/mutation.decorator';
import { GameRoundModel } from './game-round.model';
import { Input } from 'src/decorators/input.decorator';
import { CreateRoundInput } from './input/create-round.input';
import { Inject } from '@nestjs/common';
import { GameRoundService } from './game-round.service';

@Resolver()
export class GameRoundResolver {
  @Inject() gameRoundService: GameRoundService;
  @Mutation(GameRoundModel)
  async createRound(
    @Input() input: CreateRoundInput,
  ): ResolverReturnedType<GameRoundModel> {
    const data = await this.gameRoundService.createRound(input);
    return {
      data,
      message: 'Create new round successfully',
    };
  }
}
