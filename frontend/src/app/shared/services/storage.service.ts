import { Injectable } from '@angular/core';

export enum STORAGE_KEY {
  TOKEN = 'token',
}

export type Storage = {
  [STORAGE_KEY.TOKEN]: string;
};

@Injectable({ providedIn: 'root' })
export class StorageService {
  token: string = this.get(STORAGE_KEY.TOKEN);

  get(key: STORAGE_KEY): Storage[typeof key] {
    const data = JSON.parse(localStorage.getItem(key) || '');
    return data;
  }

  set(key: STORAGE_KEY, value: Storage[typeof key]) {
    this[key] = value;
    localStorage.setItem(key, JSON.stringify(value));
  }
}
