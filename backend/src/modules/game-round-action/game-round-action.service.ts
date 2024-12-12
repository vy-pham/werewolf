import { InjectPrisma } from 'src/decorators/inject-prisma.decorator';
import type { GameRoundActionInput } from './input/game-round-action.input';
import { GamePlayerStatus, GameRoundTime, Roles } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { GAME_ROUND_ACTION_INCLUDE } from './game-round-action.constant';

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
    targetId,
    abilityId,
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

    const playerAbility = await this.prisma.gameAbility.findFirstOrThrow(
      {
        where: {
          gameId: round.gameId,
          abilityId,
          totalUses: { not: 0 },
          usesThisRound: { not: 0 },
        },
        include: {
          ability: true,
        },
      },
      {
        throwCase: 'IF_NOT_EXISTS',
      },
    );

    let targetStatus: GamePlayerStatus | undefined;
    let booleanResult: boolean | undefined;
    switch (turnOf) {
      case Roles.witch:
      case Roles.werewolf:
      case Roles.villager:
      case Roles.guard:
        targetStatus = GamePlayerStatus.guarded;
        break;
      case Roles.seer:
        booleanResult = await this.prisma.gamePlayer.exists({
          id: targetId,
          role: {
            enum: Roles.werewolf,
          },
        });
        break;
      default:
        break;
    }
    if (targetStatus && targetId) {
      await this.prisma.gamePlayer.findFirstAndUpdate(
        {
          where: {
            id: targetId,
          },
        },
        {
          status: targetStatus,
        },
        {
          isThrow: true,
        },
      );
    }

    await this.prisma.gameAbility.findFirstAndUpdate(
      {
        where: { id: playerAbility.id },
      },
      {
        totalUses: playerAbility.totalUses - 1,
        usesThisRound: playerAbility.usesThisRound - 1,
      },
    );

    return await this.prisma.gameRoundAction.create({
      data: {
        turnOf,
        gameRoundId: roundId,
        targetId,
        statusResult: targetStatus,
        booleanResult,
        abilityId,
      },
      include: GAME_ROUND_ACTION_INCLUDE,
    });
  }
}
