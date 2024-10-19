import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class RoomService {
  @Inject() prisma: PrismaService;
  async getRooms() {
    const rooms = await this.prisma.room.findMany({

    });
    return rooms;
  }
}