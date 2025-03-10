import { InjectPrisma } from 'src/decorators/inject-prisma.decorator';
import type { CreateGameInput } from './input/create-game.input';
import { GameStatus, RoomStatus } from '@prisma/client';
import { Inject } from '@nestjs/common';
import { GAME_INCLUDE } from './game.constant';

export class GameService {
  @Inject(TOKEN.USER) user: JWTPayload;
  @InjectPrisma() prismaService: PrismaService;
  async createGame({ roomId }: CreateGameInput) {
    const room = await this.prismaService.room.findFirstOrThrow(
      { where: { id: roomId } },
      { throwCase: 'IF_NOT_EXISTS', message: `Room ${roomId} not found` },
    );

    await this.prismaService.game.findFirstOrThrow(
      {
        where: {
          roomId: room.id,
          status: { not: GameStatus.end },
        },
      },
      {
        throwCase: 'IF_EXISTS',
        message: 'You are already in another game',
      },
    );

    await this.prismaService.room.findFirstAndUpdate(
      {
        where: {
          id: roomId,
        },
      },
      {
        status: RoomStatus.playing,
      },
    );

    const roomPlayers = await this.prismaService.roomPlayer.findMany({
      where: { roomId: room.id, virtual: { not: null } },
    });

    const roleIds = roomPlayers.map((o) => o.roleId);

    const roomRoles = await this.prismaService.role.findMany({
      where: { id: { in: roleIds } },
      include: {
        abilities: true,
      },
    });

    const createGame = await this.prismaService.game.create({
      data: {
        roomId,
        status: GameStatus.playing,
        players: {
          createMany: {
            data: roomPlayers.map((player) => {
              return {
                userId: player.userId,
                virtual: player.virtual,
                roleId: player.roleId,
              };
            }),
          },
        },
        abilities: {
          createMany: {
            data: roomRoles
              .map((roomRole) => {
                return roomRole.abilities.map((ability) => {
                  return {
                    abilityId: ability.id,
                    totalUses: ability.totalUses,
                    usesThisRound: ability.usesPerRound,
                  };
                });
              })
              .flat(),
          },
        },
      },
      include: GAME_INCLUDE,
    });
    return createGame;
  }

  async getCurrentGame() {
    const findRoomPlayer = await this.prismaService.roomPlayer.findFirstOrThrow(
      {
        where: {
          userId: this.user.id,
        },
      },
      {
        throwCase: 'IF_NOT_EXISTS',
        message: 'You are not in any room',
      },
    );
    const game = await this.prismaService.game.findFirstOrThrow(
      {
        where: {
          roomId: findRoomPlayer.roomId,
          status: { not: GameStatus.end },
        },
        include: GAME_INCLUDE,
      },
      {
        throwCase: 'IF_NOT_EXISTS',
        message: 'You are not in any game',
      },
    );
    return game;
  }
}
