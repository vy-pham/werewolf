import { Module } from '@nestjs/common';
import { GameRoundActionResolver } from './game-round-action.resolver';
import { GameRoundActionService } from './game-round-action.service';

@Module({
  providers: [GameRoundActionResolver, GameRoundActionService],
})
export class GameRoundActionModule {}
