import { Module } from '@nestjs/common';
import { RoomPlayerResolver } from './room-player.resolver';
import { RoomPlayerService } from './room-player.service';

@Module({
  providers: [RoomPlayerResolver, RoomPlayerService],
})
export class RoomPlayerModule {}
