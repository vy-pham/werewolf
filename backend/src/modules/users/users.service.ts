import { BadRequestException, Inject, Injectable, Scope } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import type { CreateUserInput } from './input/create-user.input';
import type { LoginUserInput } from './input/login-user.input';
import { JwtService } from '@nestjs/jwt';
import type { FiltersUserInput } from './input/filters-user.input';
import { Prisma } from '@prisma/client';
@Injectable({ scope: Scope.REQUEST })
export class UserService {
  @Inject() jwtService: JwtService;
  @Inject() prisma: PrismaService;

  async getCurrentUser() {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiaWF0IjoxNzI5NjAyMjQyfQ.XhKflHSg3-P5x4rtkjrKvFGyU_xYuJWyNREa4BBETvY';
    const data = this.jwtService.verify(token, { secret: global.Config.JWT_SECRET });
    return data;
  }

  async getUsers({ username }: FiltersUserInput, { skip, take }: Pagination) {
    const where: Prisma.UserWhereInput = {};
    if (username) {
      where.username = { contains: username };
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take
      }),
      this.prisma.user.count({
        where
      })
    ]);
    return { data, total };
  }

  async createUser({ email, password }: CreateUserInput) {
    const data = await this.prisma.user.create({
      data: {
        email,
        password,
        username: `${Date.now()}`
      }
    });

    return data;
  }

  async login({ email, password }: LoginUserInput) {
    const data = await this.prisma.user.findUnique({
      where: { email, password }
    });
    if (!data) {
      throw new BadRequestException('Email or password incorrect');
    }
    return this.jwtService.sign({ id: data.id }, { secret: global.Config.JWT_SECRET });
  }
}