import { inject } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { BehaviorSubject, of, switchMap } from 'rxjs';
import { FormBuilder, Validators } from '@angular/forms';
import { GET_MY_USER, LOGIN } from './home.queries';
import {
  type LoginMutation,
  type LoginMutationVariables,
  type MeQuery,
} from '../../__generated__/graphql';
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
  getMe$ = this.apollo.query<MeQuery>({ query: GET_MY_USER });

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
              localStorage.setItem('token', login.data.token);
              this.toastr.success(login.message);
              return this.getMe$;
            }
            return of(null);
          })
        )
        .subscribe((data) => {
          if (!data) return;
        });
    } else {
      this.form.markAllAsTouched();
    }
  }
}
