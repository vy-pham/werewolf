import { inject } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { GET_MY_USER } from './home.queries';
import { BehaviorSubject } from 'rxjs';

export class HomeService {
  apollo = inject(Apollo);
  get isShow() {
    return this.isShow$.getValue();
  }
  set isShow(value: boolean) {
    this.isShow$.next(value);
  }
  isShow$ = new BehaviorSubject(false);
  getUser() {
    this.apollo
      .watchQuery({
        query: GET_MY_USER,
      })
      .valueChanges
      .subscribe(({ data: { me } }) => {
      });
  }
}