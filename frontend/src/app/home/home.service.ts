import { inject } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { BehaviorSubject } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { FormBuilder, Validators } from '@angular/forms';
import { RoomService } from '../shared/services/room/room.service';
import { Router } from '@angular/router';
export class HomeService {
  router = inject(Router);
  toastr = inject(ToastrService);
  apollo = inject(Apollo);
  roomService = inject(RoomService);
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
  });

  createRoom() {
    const { maxPlayers, name } = this.form.value;
    if (this.form.valid && maxPlayers && name) {
      this.roomService
        .createRoom$({ maxPlayers: Number(maxPlayers), name })
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
