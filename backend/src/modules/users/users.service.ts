import { BadRequestException, Inject, Injectable, Scope } from '@nestjs/common';
import type { CreateUserInput } from './input/create-user.input';
import type { LoginUserInput } from './input/login-user.input';
import { JwtService } from '@nestjs/jwt';
import type { FiltersUserInput } from './input/filters-user.input';
import { Prisma } from '@prisma/client';
import { InjectPrisma } from 'src/decorators/inject-prisma.decorator';
import { compareSync, hashSync } from 'bcrypt';
@Injectable({ scope: Scope.REQUEST })
export class UserService {
  @Inject() jwtService: JwtService;
  @InjectPrisma() prisma: PrismaService;
  @Inject(TOKEN.USER) user: JWTPayload;
  async getCurrentUser() {
    const data = await this.prisma.user.findUnique({
      where: { id: this.user.id },
    });
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
        take,
      }),
      this.prisma.user.count({
        where,
      }),
    ]);
    return { data, total };
  }

  async createUser({ username, password }: CreateUserInput) {
    await this.prisma.user.exists({ username }, { throwCase: 'IF_EXISTS' });

    const data = await this.prisma.user.create({
      data: {
        username,
        password: hashSync(password, 10),
        email: '',
      },
    });

    return data;
  }

  async login({ username, password }: LoginUserInput) {
    let message = 'Login successfully';
    console.log(123);

    let user = await this.prisma.user.findUnique({
      where: { username },
    });
    if (!user) {
      message = 'Signup and login successfully';
      user = await this.createUser({ username, password });
    }
    const isCorrectPassword = compareSync(password, user.password);
    if (!isCorrectPassword) {
      throw new BadRequestException('Incorrect password');
    }
    const token = this.jwtService.sign(
      { id: user.id },
      { secret: global.Config.JWT_SECRET },
    );

    return {
      token,
      message,
    };
  }
}
