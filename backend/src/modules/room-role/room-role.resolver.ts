import { Resolver } from '@nestjs/graphql';
import { RoomModel } from '../rooms/rooms.model';

@Resolver(() => RoomModel)
export class RoomRoleResolver {}
