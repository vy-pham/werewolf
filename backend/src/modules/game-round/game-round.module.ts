import { Module } from '@nestjs/common';
import { GameRoundResolver } from './game-round-resolver';
import { GameRoundService } from './game-round.service';

@Module({
  providers: [GameRoundResolver, GameRoundService],
})
export class GameRoundModule {}
