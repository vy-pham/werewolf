import { inject } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { BehaviorSubject } from 'rxjs';
import { FormBuilder, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
export class HomeService {
  toastr = inject(ToastrService);
  apollo = inject(Apollo);
  get isShowModal() {
    return this.isShowModal$.getValue();
  }
  set isShowModal(value: boolean) {
    this.isShowModal$.next(value);
  }
  isShowModal$ = new BehaviorSubject(false);

  formBuilder = new FormBuilder().nonNullable;
  form = this.formBuilder.group({
    username: [
      '',
      [Validators.required, Validators.minLength(4), Validators.maxLength(12)],
    ],
    password: [
      '',
      [Validators.required, Validators.minLength(6), Validators.maxLength(12)],
    ],
  });
}
