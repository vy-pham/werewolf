import { Resolver } from '@nestjs/graphql';
import { RoleModel } from './roles.model';
import { Inject } from '@nestjs/common';
import { RoleService } from './roles.service';
import { QueryList } from 'src/decorators/query-list.decorator';

@Resolver()
export class RoleResolver {
  @Inject() roleService: RoleService;
  @QueryList(RoleModel)
  async roles() {
    const data = await this.roleService.getRoles();
    return { data };
  }
}
