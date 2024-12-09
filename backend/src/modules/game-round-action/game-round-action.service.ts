import { InjectPrisma } from 'src/decorators/inject-prisma.decorator';
import type { GameRoundActionInput } from './input/game-round-action.input';
import { GameRoundTime, Roles } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

export class GameRoundActionService {
  @InjectPrisma() prisma: PrismaService;
  nightOrdered = [
    Roles.guard,
    Roles.werewolf,
    Roles.seer,
    Roles.witch,
    Roles.hunter,
  ];
  dayOrdered = [Roles.villager];
  async createAction({
    roundId,
    turnOf,
    actorId,
    targetId,
  }: GameRoundActionInput) {
    const round = await this.prisma.gameRound.findFirstOrThrow(
      {
        where: { id: roundId },
      },
      { throwCase: 'IF_NOT_EXISTS', message: `Round ${roundId} not found` },
    );

    let currentTurn: Roles = this.nightOrdered[0];
    if (round.time === GameRoundTime.day) currentTurn = this.dayOrdered[0];

    const lastAction = await this.prisma.gameRoundAction.findFirst({
      where: { gameRoundId: round.id },
      orderBy: { id: 'desc' },
    });
    if (lastAction) {
      const lastActionRole = lastAction.turnOf;
      switch (round.time) {
        case GameRoundTime.day: {
          const index = this.dayOrdered.findIndex((o) => o === lastActionRole);
          if (index !== -1) currentTurn = this.dayOrdered[index + 1];
          break;
        }
        case GameRoundTime.night: {
          const index = this.nightOrdered.findIndex(
            (o) => o === lastActionRole,
          );
          if (index !== -1) currentTurn = this.nightOrdered[index + 1];
          break;
        }
        default:
          break;
      }
    }
    if (currentTurn !== turnOf) {
      throw new BadRequestException('No pending role for this round');
    }
  }
}
