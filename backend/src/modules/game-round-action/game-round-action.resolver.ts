import { Resolver } from '@nestjs/graphql';
import { Mutation } from 'src/decorators/mutation.decorator';
import { GameRoundActionModel } from './game-round-action.model';
import { Input } from 'src/decorators/input.decorator';
import { GameRoundActionInput } from './input/game-round-action.input';
import { GameRoundActionService } from './game-round-action.service';
import { Inject } from '@nestjs/common';

@Resolver()
export class GameRoundActionResolver {
  @Inject() gameRoundActionService: GameRoundActionService;
  @Mutation(GameRoundActionModel)
  async createGameRoundAction(
    @Input() input: GameRoundActionInput,
  ): Promise<ResolverReturnedType<GameRoundActionModel>> {
    const data = await this.gameRoundActionService.createAction(input);
    return {
      data,
      message: 'Success',
    };
  }
}
