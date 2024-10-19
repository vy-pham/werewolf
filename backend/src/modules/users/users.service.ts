import { BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import type { CreateUserInput } from './input/create-user.input';
import type { LoginUserInput } from './input/login-user.input';
import { JwtService } from '@nestjs/jwt';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

export class UserService {
  @Inject() jwtService: JwtService;
  @Inject() prisma: PrismaService;
  @Inject(REQUEST) request: Request;
  async getCurrentUser() {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiaWF0IjoxNzI5NjAyMjQyfQ.XhKflHSg3-P5x4rtkjrKvFGyU_xYuJWyNREa4BBETvY';
    const data = this.jwtService.verify(token, { secret: '123123' });
    return data;
  }

  async getUsers() {
    const data = await this.prisma.user.findMany({
      where: {},
    });

    return data;
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
    return this.jwtService.sign({ id: data.id }, { secret: '123123' });
  }
}