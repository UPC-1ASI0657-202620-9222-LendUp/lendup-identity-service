import { Provider } from '@nestjs/common';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

import { FIREBASE_AUTH } from './firebase-auth.token';

export const FirebaseAuthProvider: Provider = {
  provide: FIREBASE_AUTH,
  useFactory: () => {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (!projectId) {
      throw new Error('FIREBASE_PROJECT_ID es obligatorio para iniciar Identidad');
    }
    const name = 'lendup-identidad';
    const app = getApps().find(value => value.name === name) ??
      initializeApp({ credential: applicationDefault(), projectId }, name);
    return getAuth(app);
  }
};
