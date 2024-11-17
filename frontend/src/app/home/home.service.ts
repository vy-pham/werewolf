import { inject } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { BehaviorSubject } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { FormBuilder, Validators, type FormArray } from '@angular/forms';
import { RoomService } from '../shared/services/room/room.service';
import { Router } from '@angular/router';
import { RoleService } from '../shared/services/role/role.service';
export class HomeService {
  router = inject(Router);
  toastr = inject(ToastrService);
  apollo = inject(Apollo);
  roomService = inject(RoomService);
  roleService = inject(RoleService);

  constructor() {
    this.roleService.roles$.subscribe(() => this.createRoleFormGroup());
  }
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

  formBuilder = new FormBuilder().nonNullable;
  form = this.formBuilder.group({
    name: ['', [Validators.required]],
    maxPlayers: [
      4,
      [Validators.required, Validators.min(4), Validators.max(40)],
    ],
    roles: this.formBuilder.array<{
      roleId: string;
      quantity: number;
      checked: boolean;
    }>([]),
  });

  createRoleFormGroup() {
    this.roleService.roles.map((r) => {
      const role = this.formBuilder.group({
        roleId: r.id,
        quantity: [1, [Validators.required, Validators.min(1)]],
        checked: [false],
      });
      this.roles.push(role);
    });
  }

  get roles(): FormArray {
    return this.form.get('roles') as FormArray;
  }

  createRoom() {
    const { maxPlayers, name, roles } = this.form.getRawValue();
    const selectedRoles = roles.filter((o) => o.checked);
    const totalRoles = selectedRoles.reduce(
      (pre, curr) => pre + curr.quantity,
      0
    );
    if (totalRoles !== maxPlayers) {
      this.form.controls.roles.setErrors({});
    }
    if (this.form.valid && maxPlayers && name) {
      this.roomService
        .createRoom$({ maxPlayers: maxPlayers, name, roles: roles })
        .subscribe((succeed) => {
          if (succeed) {
            this.router.navigateByUrl('/lobby');
          }
        });
    } else {
      this.form.markAllAsTouched();
    }
  }
}
