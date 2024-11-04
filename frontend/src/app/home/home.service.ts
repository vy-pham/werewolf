import { inject } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { BehaviorSubject } from 'rxjs';
import { FormBuilder, Validators } from '@angular/forms';
export class HomeService {
  apollo = inject(Apollo);
  get isShow() {
    return this.isShow$.getValue();
  }
  set isShow(value: boolean) {
    this.isShow$.next(value);
  }
  isShow$ = new BehaviorSubject(false);

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
    console.log(this.form.controls.username.errors);

    // this.apollo
    //   .mutate<CreateUserMutation, CreateUserMutationVariables>({
    //     mutation: MUTATION_CREATE_USER,
    //   })
    //   .subscribe(({ data }) => {
    //     if (!data) return;
    //     const { createUser } = data;
    //     if (createUser.__typename === 'ErrorOutput') {
    //     } else {
    //       const {} = createUser;
    //     }
    //   });
  }
}
