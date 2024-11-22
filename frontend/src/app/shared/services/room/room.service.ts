import { inject, Injectable } from '@angular/core';
import type {
  CreateRoomMutation,
  CreateRoomMutationVariables,
  CurrentRoomQuery,
  UpdateRoomMutation,
  UpdateRoomMutationVariables,
} from '../../../../graphql/queries';
import { Apollo } from 'apollo-angular';
import { ToastrService } from 'ngx-toastr';
import {
  MUTATION_CREATE_ROOM,
  MUTATION_UPDATE_ROOM,
  QUERY_CURRENT_ROOM,
} from './room.queries';
import {
  Roles,
  type CreateRoomInput,
  type UpdateRoomInput,
} from '../../../../graphql/types';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import type { ExtractDataType } from '../../entities/utils.entities';
import {
  FormBuilder,
  Validators,
  type FormControl,
  type FormGroup,
} from '@angular/forms';
import { RoleService } from '../role/role.service';
interface IRoles {
  roleId: FormControl<string>;
  checked: FormControl<boolean>;
  enum: FormControl<Roles>;
}
@Injectable({ providedIn: 'root' })
export class RoomService {
  toastr = inject(ToastrService);
  apollo = inject(Apollo);
  roleService = inject(RoleService);
  constructor() {
    combineLatest([this.roleService.roles$, this.currentRoom$]).subscribe(
      ([roles, room]) => {
        if (room) {
          this.form.controls.name.setValue(room.name);
        }
        this.form.controls.rolesConfig.clear();
        roles.forEach((role) => {
          let checked = role.enum === Roles.Villager;
          const isHaveInRoom = room?.rolesConfig.find(
            (r) => r.role.enum === role.enum
          );

          if (isHaveInRoom) {
            checked = true;
          }
          const roleGroup = this.formBuilder.group({
            roleId: role.id,
            checked: this.formBuilder.control({
              value: role.enum === Roles.Villager || checked,
              disabled: false,
            }),
            enum: role.enum,
          });
          this.form.controls.rolesConfig.push(roleGroup);
        });
      }
    );
  }
  get currentRoom() {
    return this.currentRoom$.value;
  }
  set currentRoom(v: ExtractDataType<CreateRoomMutation['createRoom']> | null) {
    this.currentRoom$.next(v);
  }
  currentRoom$ = new BehaviorSubject<ExtractDataType<
    CreateRoomMutation['createRoom']
  > | null>(null);

  formBuilder = new FormBuilder().nonNullable;

  form = this.formBuilder.group({
    name: ['', [Validators.required]],
    rolesConfig: this.formBuilder.array<FormGroup<IRoles>>([]),
  });

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

  updateRoom$(input: UpdateRoomInput) {
    return this.apollo
      .mutate<UpdateRoomMutation, UpdateRoomMutationVariables>({
        mutation: MUTATION_UPDATE_ROOM,
        variables: {
          input: input,
        },
      })
      .pipe(
        map(({ data }) => {
          if (data?.updateRoom.__typename === 'RoomModel_Mutation') {
            this.toastr.success(data.updateRoom.message);
            this.currentRoom = data.updateRoom.data;
            return true;
          } else {
            this.toastr.error(data?.updateRoom.message || 'Unknown Error');
            return false;
          }
        })
      );
  }
}
