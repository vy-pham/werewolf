import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { QueryUserInput } from './input/query-users.input';

@Injectable()
export class UsersService {
  constructor(private db: DatabaseService) {}

  getCurrentUser() {
    //Find current user base on the jwt
    return this.db.user.findUnique({ where: { id: 1 } });
  }

  create(dto: Prisma.UserCreateInput) {
    // This action adds a new user
    return this.db.user.create({ data: dto });
  }

  findAll({ username }: QueryUserInput, { skip, take }: Pagination) {
    // This action returns all users
    const where: Prisma.UserWhereInput = {};
    if (username) {
      where.username = username;
    }
    return this.db.user.findMany({
      where,
      skip, 
      take
    });
  }

  findOne(id: number) {
    // This action returns a #${id} user`
    return this.db.user.findUnique({ where: { id } });
  }

  update(id: number, dto: Prisma.UserUpdateInput) {
    // This action updates a #${id} user
    return this.db.user.update({
      where: { id },
      data: dto,
    });
  }

  remove(id: number) {
    // This action removes a #${id} user
    return this.db.user.delete({ where: { id } });
  }
}
