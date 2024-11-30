import { Resolver } from '@nestjs/graphql';
import { Mutation } from 'src/decorators/mutation.decorator';
import { GamePlayerModel } from './game-player.model';
import { Input } from 'src/decorators/input.decorator';
import { UpdateManyGamePlayer } from './input/update-many-game-player.input';
import { Inject } from '@nestjs/common';
import { GamePlayerService } from './game-player.service';

@Resolver()
export class GamePlayerResolver {
  @Inject() gamePlayerService: GamePlayerService;

  @Mutation([GamePlayerModel])
  async updateManyGamePlayer(
    @Input()
    input: UpdateManyGamePlayer,
  ): ResolverReturnedType<GamePlayerModel[]> {
    const data = await this.gamePlayerService.updateManyGamePlayer(input);
    return {
      data,
      message: 'Update many game player successfully',
    };
  }
}
