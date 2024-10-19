import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Me, User, UserToken } from './users.model';
import { Inject } from '@nestjs/common';
import { UserService } from './users.service';
import { CreateUserInput } from './input/create-user.input';
import { LoginUserInput } from './input/login-user.input';

@Resolver('User')
export class UserResolver {
  @Inject() userService: UserService;
  @Query(() => Me)
  async me() {
    const data = await this.userService.getCurrentUser();
    return data;
  }

  @Query(() => [User])
  async users() {
    const data = await this.userService.getUsers();
    return data;
  }

  @Mutation(() => UserToken)
  async login(
    @Args('input') input: LoginUserInput,
  ) {
    const token = await this.userService.login(input);
    return {
      token
    };
  }

  @Mutation(() => User)
  async createUser(
    @Args('input') input: CreateUserInput,
  ) {
    const data = await this.userService.createUser(input);
    return data;
  }
}