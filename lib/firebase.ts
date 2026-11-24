import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  initializeAuth,
} from "firebase/auth";
import { connectStorageEmulator, getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);
let authInstance: ReturnType<typeof getAuth> | null = null;
let storageEmulatorConnected = false;
export function getBrowserAuth() {
  if (!authInstance) {
    try {
      authInstance = initializeAuth(firebaseApp, {
        persistence: browserLocalPersistence,
      });
    } catch {
      authInstance = getAuth(firebaseApp);
    }
    const emulator = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL;
    if (emulator)
      connectAuthEmulator(authInstance, emulator, { disableWarnings: true });
  }
  return authInstance;
}

export function getBrowserStorage() {
  const storage = getStorage(firebaseApp);
  const emulator = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_URL;
  if (emulator && !storageEmulatorConnected) {
    const url = new URL(emulator);
    connectStorageEmulator(storage, url.hostname, Number(url.port || 9199));
    storageEmulatorConnected = true;
  }
  return storage;
}
