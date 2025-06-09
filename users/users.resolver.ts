import { Resolver } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { BadRequestException, Inject } from '@nestjs/common';
import { Me, UserModel } from './users.model';
import { Pagination } from 'src/common/decorators/pagination.decorator';
import { QueryUserInput } from './input/query-users.input';
import { Filters } from 'src/common/decorators/filter.decorator';
import { Input } from 'src/common/decorators/input.decorator';
import { CREATE_USER_SCHEMA, CreateUserInput } from './input/create-user.input';
import { UpdateUserInput } from './input/update-user.input';
import { HttpValidationPipe } from 'src/common/pipes/validation.pipe';
import { Mutation, QueryList, QuerySingle } from 'src/common/decorators/resolvers.decorator';

@Resolver('Users')
export class UsersResolver {
  @Inject() usersService: UsersService;

  @QuerySingle(Me)
  async me() {
    const data = await this.usersService.getCurrentUser();
    return { data };
  }

  @QueryList(UserModel)
  async users(
    @Pagination() pagination: Pagination,
    @Filters() filters: QueryUserInput,
  ): ResolverReturnedType<UserModel[]> {
    const data = await this.usersService.findAll(filters, pagination);
    return {
      data,
      total : 10,
      message: 'Query users successfully',
    };
  }

  @QueryList(UserModel)
  async users2(
    @Pagination() pagination: Pagination,
    @Filters() filters: QueryUserInput,
  ): ResolverReturnedType<UserModel[]> {
    const data = await this.usersService.findAll(filters, pagination);
    return {
      data,
      total : 10,
      message: 'Query users successfully',
    };
  }

  @Mutation(UserModel)
  async createUser(
    @Input(new HttpValidationPipe(CREATE_USER_SCHEMA)) input: CreateUserInput,
  ): ResolverReturnedType<UserModel> {
    const data = await this.usersService.create(input);
    return {
      data,
      message: 'Create user successfully',
    };
  }

  @Mutation(UserModel)
  async updateUser(
    @Input() input: UpdateUserInput,
  ): ResolverReturnedType<UserModel> {
    const data = await this.usersService.update(input.id, input);
    return {
      data,
      message: 'Update user successfully',
    };
  }
}
