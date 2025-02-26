import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export enum STORAGE_KEY {
  TOKEN = 'token',
}

export type Storage = {
  [STORAGE_KEY.TOKEN]: string | null;
};

@Injectable({ providedIn: 'root' })
export class StorageService {
  get data() {
    return this.data$.value;
  }
  set data(v: Storage) {
    this.data$.next(v);
  }
  data$ = new BehaviorSubject<Storage>({
    token: this.get(STORAGE_KEY.TOKEN),
  });

  get(key: STORAGE_KEY): Storage[typeof key] | null {
    const store = localStorage.getItem(key);
    if (store) {
      const data = JSON.parse(store);
      return data;
    }
    return null;
  }

  set(key: STORAGE_KEY, value: Storage[typeof key]) {
    this.data = { ...this.data, [key]: value };
    localStorage.setItem(key, JSON.stringify(value));
  }
}
