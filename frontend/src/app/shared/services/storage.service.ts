import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export enum STORAGE_KEY {
  TOKEN = 'token',
}

export type Storage = {
  [STORAGE_KEY.TOKEN]: string;
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

  get(key: STORAGE_KEY): Storage[typeof key] {
    const data = JSON.parse(localStorage.getItem(key) || '');
    return data;
  }

  set(key: STORAGE_KEY, value: Storage[typeof key]) {
    this.data = { ...this.data, [key]: value };
    localStorage.setItem(key, JSON.stringify(value));
  }
}
