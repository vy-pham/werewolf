import { Module } from '@nestjs/common';
import { GamePlayerResolver } from './game-player.resolver';
import { GamePlayerService } from './game-player.service';

@Module({
  providers: [GamePlayerResolver, GamePlayerService],
})
export class GamePlayerModule {}
