import { Module } from '@nestjs/common';
import { RoomResolver } from './rooms.resolver';
import { RoomService } from './rooms.service';
import { PrismaService } from 'src/prisma.service';

@Module({
  providers: [RoomService, RoomResolver, PrismaService],
})
export class RoomModule { }