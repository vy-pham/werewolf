import { Module } from '@nestjs/common';
import { RoleService } from './roles.service';
import { RoleResolver } from './roles.resolver';

@Module({
  providers: [RoleService, RoleResolver],
})
export class RoleModule {}
