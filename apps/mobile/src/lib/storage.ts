import { safeLocalStorage } from '@werewolf/client-core';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { StateStorage } from 'zustand/middleware';

/** Tokens live in the OS keychain / keystore on devices, localStorage on the web build. */
export const appStorage: StateStorage =
  Platform.OS === 'web'
    ? safeLocalStorage
    : {
        getItem: (key) => SecureStore.getItemAsync(key),
        setItem: (key, value) => SecureStore.setItemAsync(key, value),
        removeItem: (key) => SecureStore.deleteItemAsync(key),
      };
