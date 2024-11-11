import { Args, Resolver } from '@nestjs/graphql';
import { Me, UserModel, UserToken } from './users.model';
import { Inject } from '@nestjs/common';
import { UserService } from './users.service';
import { CreateUserInput } from './input/create-user.input';
import { LoginUserInput } from './input/login-user.input';
import { Pagination } from 'src/decorators/pagination.decorator';
import { Filters } from 'src/decorators/filter.decorator';
import { FiltersUserInput } from './input/filters-user.input';
import { QueryList } from 'src/decorators/query-list.decorator';
import { Mutation } from 'src/decorators/mutation.decorator';
import { Input } from 'src/decorators/input.decorator';
import { IsPublic } from 'src/decorators/public.decorator';
import { QuerySingle } from 'src/decorators/query-single.decorator';

@Resolver('User')
export class UserResolver {
  @Inject() userService: UserService;

  @QuerySingle(Me)
  async me() {
    const data = await this.userService.getCurrentUser();
    return { data };
  }

  @QueryList(UserModel)
  async users(
    @Pagination() pagination: Pagination,
    @Filters() filters?: FiltersUserInput,
  ) {
    const { data, total } = await this.userService.getUsers(
      filters || {},
      pagination,
    );
    return { data, total };
  }

  @IsPublic()
  @Mutation(UserToken)
  async login(@Args('input') input: LoginUserInput) {
    const { token, message } = await this.userService.login(input);
    return {
      data: { token },
      message,
    };
  }

  @Mutation(UserModel)
  async createUser(@Input() input: CreateUserInput) {
    const data = await this.userService.createUser(input);
    return data;
  }
}
