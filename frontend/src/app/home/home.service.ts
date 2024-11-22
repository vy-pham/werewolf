import { inject } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { BehaviorSubject } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { RoomService } from '../shared/services/room/room.service';
import { Router } from '@angular/router';
import { RoleService } from '../shared/services/role/role.service';
export class HomeService {
  router = inject(Router);
  toastr = inject(ToastrService);
  apollo = inject(Apollo);
  roomService = inject(RoomService);
  roleService = inject(RoleService);

  get isShowModal() {
    return this.isShowModal$.getValue();
  }
  set isShowModal(value: boolean) {
    this.isShowModal$.next(value);
  }
  isShowModal$ = new BehaviorSubject(false);

  toggleModal() {
    this.isShowModal = !this.isShowModal;
  }

  createRoom() {
    const { maxPlayers, name, roles } = this.roomService.form.getRawValue();
    if (this.roomService.form.valid && maxPlayers && name) {
      this.roomService
        .createRoom$({
          maxPlayers: maxPlayers,
          name,
          roles: roles.map((role) => ({
            checked: role.checked,
            roleId: role.roleId,
          })),
        })
        .subscribe((succeed) => {
          if (succeed) {
            this.router.navigateByUrl('/lobby');
          }
        });
    } else {
      this.roomService.form.markAllAsTouched();
    }
  }
}
