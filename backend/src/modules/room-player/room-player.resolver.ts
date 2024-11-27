import { Resolver } from '@nestjs/graphql';
import { Mutation } from 'src/decorators/mutation.decorator';
import { RoomPlayerModel } from './room-player.model';
import { Input } from 'src/decorators/input.decorator';
import { UpdateRoomPlayerInput } from './input/update-room-player.input';
import { Inject } from '@nestjs/common';
import { RoomPlayerService } from './room-player.service';

@Resolver()
export class RoomPlayerResolver {
  @Inject() roomPlayerService: RoomPlayerService;

  @Mutation([RoomPlayerModel])
  async updateRoomPlayer(
    @Input() input: UpdateRoomPlayerInput,
  ): Promise<{ data: RoomPlayerModel[]; message: string }> {
    const data = await this.roomPlayerService.updateRoomPlayers(input);
    return {
      data,
      message: 'Update Room player successfully',
    };
  }
}
