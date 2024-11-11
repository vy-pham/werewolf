import { inject, Injectable } from '@angular/core';
import type {
  CreateRoomMutation,
  CreateRoomMutationVariables,
  CurrentRoomQuery,
} from '../../../../graphql/queries';
import { Apollo } from 'apollo-angular';
import { ToastrService } from 'ngx-toastr';
import { MUTATION_CREATE_ROOM, QUERY_CURRENT_ROOM } from './room.queries';
import type { CreateRoomInput } from '../../../../graphql/types';
import { BehaviorSubject, map } from 'rxjs';
import type { ExtractDataType } from '../../entities/utils.entities';

@Injectable({ providedIn: 'root' })
export class RoomService {
  toastr = inject(ToastrService);
  apollo = inject(Apollo);

  get currentRoom() {
    return this.currentRoom$.value;
  }
  set currentRoom(v: ExtractDataType<CreateRoomMutation['createRoom']> | null) {
    this.currentRoom$.next(v);
  }
  currentRoom$ = new BehaviorSubject<ExtractDataType<
    CreateRoomMutation['createRoom']
  > | null>(null);

  getCurrentRoom$ = this.apollo
    .query<CurrentRoomQuery>({
      query: QUERY_CURRENT_ROOM,
      fetchPolicy: 'no-cache',
    })
    .pipe(
      map(({ data }) => {
        if (data.currentRoom?.__typename === 'RoomModel_Single') {
          this.currentRoom = data.currentRoom.data || null;
        } else {
          this.currentRoom = null;
        }
        return this.currentRoom;
      })
    );

  createRoom$(input: CreateRoomInput) {
    return this.apollo
      .mutate<CreateRoomMutation, CreateRoomMutationVariables>({
        mutation: MUTATION_CREATE_ROOM,
        variables: {
          input: input,
        },
      })
      .pipe(
        map(({ data }) => {
          if (data?.createRoom.__typename === 'RoomModel_Mutation') {
            this.toastr.success(data.createRoom.message);
            this.currentRoom = data.createRoom.data;
            return true;
          } else {
            this.toastr.error(data?.createRoom.message || 'Unknown Error');
            return false;
          }
        })
      );
  }
}
