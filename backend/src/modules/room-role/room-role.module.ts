import { Module } from '@nestjs/common';
import { RoomRoleResolver } from './room-role.resolver';

@Module({
  providers: [RoomRoleResolver],
})
export class RoomRoleModule {}
