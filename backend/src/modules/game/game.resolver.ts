import { Resolver } from '@nestjs/graphql';
import { Mutation } from 'src/decorators/mutation.decorator';
import { GameModel } from './game.model';
import { Input } from 'src/decorators/input.decorator';
import { CreateGameInput } from './input/create-game.input';
import { Inject } from '@nestjs/common';
import { GameService } from './game.service';
import { QuerySingle } from 'src/decorators/query-single.decorator';
@Resolver()
export class GameResolver {
  @Inject() gameService: GameService;
  @Mutation(GameModel)
  async createGame(
    @Input() input: CreateGameInput,
  ): ResolverReturnedType<GameModel> {
    const data = await this.gameService.createGame(input);
    return {
      data,
      message: 'Create game successfully',
    };
  }
  @QuerySingle(GameModel)
  async currentGame(): ResolverReturnedType<GameModel> {
    const data = await this.gameService.getCurrentGame();
    return {
      data,
      message: 'Find game successfully',
    };
  }
}
