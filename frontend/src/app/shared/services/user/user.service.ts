import { inject, Injectable } from '@angular/core';
import { GET_MY_USER } from './user.queries';
import { Apollo } from 'apollo-angular';
import { BehaviorSubject, map } from 'rxjs';
import { STORAGE_KEY, StorageService } from '../storage.service';
import type { MeQuery } from '../../../../graphql/queries';
import type { Me } from '../../../../graphql/types';

@Injectable({ providedIn: 'root' })
export class UserService {
  apollo = inject(Apollo);
  storageService = inject(StorageService);

  public get me() {
    return this.me$.value;
  }

  public set me(v: Me | null) {
    this.me$.next(v);
  }

  private me$ = new BehaviorSubject<Me | null>(null);

  constructor() {
    const jwt = this.storageService.data[STORAGE_KEY.TOKEN];
    if (jwt) {
      this.meQuery$.subscribe();
    }
  }

  meQuery$ = this.apollo.query<MeQuery>({ query: GET_MY_USER }).pipe(
    map(({ data }) => {
      if (data.me.__typename === 'Me_Single') {
        this.me;
        this.me = data.me.data;
      }
    })
  );
}
