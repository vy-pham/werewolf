import { inject, Injectable } from '@angular/core';
import type { MeQuery } from '../../../../__generated__/graphql';
import { GET_MY_USER } from './user.queries';
import { Apollo } from 'apollo-angular';
import { BehaviorSubject, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserService {
  apollo = inject(Apollo);

  public get me() {
    return this.me$.value;
  }

  public set me(v: { id: string; username: string } | null) {
    this.me$.next(v);
  }

  me$ = new BehaviorSubject<{ id: string; username: string } | null>(null);

  meQuery$ = this.apollo.query<MeQuery>({ query: GET_MY_USER }).pipe(
    map(({ data }) => {
      if (data.me.__typename === 'Me_Single') {
        this.me = data.me.data;
      }
    })
  );
}
