import { Resolver } from '@nestjs/graphql';
import { Mutation } from 'src/decorators/mutation.decorator';
import { RoomPlayerModel } from './room-player.model';
import { Input } from 'src/decorators/input.decorator';
import { Inject } from '@nestjs/common';
import { RoomPlayerService } from './room-player.service';
import { UpdateManyRoomPlayer } from './input/update-many-room-player.input';

@Resolver()
export class RoomPlayerResolver {
  @Inject() roomPlayerService: RoomPlayerService;

  @Mutation([RoomPlayerModel])
  async updateManyRoomPlayer(
    @Input() input: UpdateManyRoomPlayer,
  ): Promise<{ data: RoomPlayerModel[]; message: string }> {
    const data = await this.roomPlayerService.updateRoomPlayers(input);
    return {
      data,
      message: 'Update Room player successfully',
    };
  }
}
