import { Module } from '@nestjs/common';
import { UserResolver } from './users.resolver';
import { PrismaService } from 'src/prisma.service';
import { UserService } from './users.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [JwtModule],
  providers: [UserResolver, PrismaService, UserService,]
})
export class UsersModule { }