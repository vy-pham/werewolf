import { inject } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { BehaviorSubject, of, switchMap } from 'rxjs';
import { FormBuilder, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import type {
  LoginMutation,
  LoginMutationVariables,
} from '../../../../__generated__/graphql';
import { LOGIN } from './header.queries';
import { STORAGE_KEY, StorageService } from '../../services/storage.service';
import { UserService } from '../../services/user/user.service';
export class HeaderService {
  toastr = inject(ToastrService);
  apollo = inject(Apollo);
  storageService = inject(StorageService);
  userService = inject(UserService);

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

  login() {
    if (this.form.valid) {
      const { username, password } = this.form.getRawValue();
      this.apollo
        .mutate<LoginMutation, LoginMutationVariables>({
          mutation: LOGIN,
          variables: {
            input: {
              username,
              password,
            },
          },
        })
        .pipe(
          switchMap(({ data }) => {
            if (!data) {
              this.toastr.error('Unknown error');
              return of(null);
            }
            const { login } = data;
            if (login.__typename === 'ErrorOutput') {
              this.toastr.error(login.message);
              return of(null);
            }
            if (login.__typename === 'UserToken_Mutation') {
              this.storageService.set(STORAGE_KEY.TOKEN, login.data.token);
              this.toastr.success(login.message);
              return this.userService.meQuery$;
            }
            return of(null);
          })
        )
        .subscribe();
    } else {
      this.form.markAllAsTouched();
    }
  }
}
