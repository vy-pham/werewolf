import { Module } from '@nestjs/common';
import { RoomPlayerResolver } from './room-player.resolver';

@Module({
  providers: [RoomPlayerResolver],
})
export class RoomPlayerModule {}
