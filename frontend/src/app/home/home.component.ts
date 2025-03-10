import { Component, inject } from '@angular/core';
import { ButtonComponent } from '../shared/components/button/button.component';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../shared/components/modal/modal.component';
import { RoleService } from '../shared/services/role/role.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InputComponent } from '../shared/components/input/input.component';
import { RoomService } from '../shared/services/room/room.service';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { RoomType } from '../../graphql/types';

@Component({
  selector: 'app-home',
  imports: [
    ButtonComponent,
    CommonModule,
    ModalComponent,
    ReactiveFormsModule,
    FormsModule,
    InputComponent,
  ],
  templateUrl: './home.component.html',
  standalone: true,
})
export class HomeComponent {
  roomService = inject(RoomService);
  roleService = inject(RoleService);
  router = inject(Router);

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
    const { name, werewolfQuantity } = this.roomService.form.getRawValue();

    if (this.roomService.form.valid && name && werewolfQuantity) {
      this.roomService
        .createRoom$({
          name,
          type: RoomType.Support,
          werewolfQuantity,
        })
        .subscribe((succeed) => {
          if (succeed) {
            console.log({ succeed });
            this.router.navigateByUrl('/lobby');
          }
        });
    } else {
      this.roomService.form.markAllAsTouched();
    }
  }
}
