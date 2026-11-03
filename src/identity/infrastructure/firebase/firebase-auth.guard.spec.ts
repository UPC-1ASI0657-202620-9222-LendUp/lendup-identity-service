import 'reflect-metadata';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { Auth } from 'firebase-admin/auth';
import { FirebaseAuthGuard } from './firebase-auth.guard';

describe('FirebaseAuthGuard', () => {
  const verifyIdToken = jest.fn();
  const guard = new FirebaseAuthGuard({ verifyIdToken } as unknown as Auth);
  const contexto = (authorization?: string) => {
    const request: any = { headers: { authorization } };
    return {
      request,
      context: {
        switchToHttp: () => ({ getRequest: () => request })
      } as unknown as ExecutionContext
    };
  };

  beforeEach(() => verifyIdToken.mockReset());

  it('rechaza solicitudes sin Bearer', async () => {
    await expect(guard.canActivate(contexto().context))
      .rejects.toBeInstanceOf(UnauthorizedException);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it('exige verificación de revocación y coloca identidad confiable', async () => {
    verifyIdToken.mockResolvedValue({
      uid: 'uid-1', email: 'alumna@upc.edu.pe', email_verified: true
    });
    const ctx = contexto('Bearer token-de-prueba');
    await expect(guard.canActivate(ctx.context)).resolves.toBe(true);
    expect(verifyIdToken).toHaveBeenCalledWith('token-de-prueba', true);
    expect(ctx.request.firebaseIdentity).toEqual({
      uid: 'uid-1', email: 'alumna@upc.edu.pe', emailVerified: true
    });
  });

  it('rechaza tokens revocados o inválidos', async () => {
    verifyIdToken.mockRejectedValue(new Error('revoked'));
    await expect(guard.canActivate(contexto('Bearer invalido').context))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });
});
