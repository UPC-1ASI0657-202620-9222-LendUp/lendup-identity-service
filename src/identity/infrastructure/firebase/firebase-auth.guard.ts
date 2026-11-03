import {
  CanActivate, ExecutionContext, Inject, Injectable, Logger, UnauthorizedException
} from '@nestjs/common';
import type { Auth } from 'firebase-admin/auth';
import type { Request } from 'express';
import { FirebaseIdentity } from '../../domain/identity.model';
import { FIREBASE_AUTH } from './firebase-auth.token';

export interface AuthenticatedRequest extends Request {
  firebaseIdentity?: FirebaseIdentity;
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);

  constructor(@Inject(FIREBASE_AUTH) private readonly auth: Auth) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    if (!header || !/^Bearer\s+\S+$/i.test(header)) {
      throw new UnauthorizedException('Se requiere token Bearer de Firebase');
    }
    const token = header.replace(/^Bearer\s+/i, '');
    try {
      const decoded = await this.auth.verifyIdToken(token, true);
      if (!decoded.uid || !decoded.email) throw new Error('Token sin UID o correo');
      request.firebaseIdentity = {
        uid: decoded.uid,
        email: decoded.email,
        emailVerified: decoded.email_verified === true
      };
      return true;
    } catch (error: unknown) {
      // Los errores del SDK incluyen códigos seguros para diagnóstico. No registrar
      // el token, los claims, la contraseña ni rutas a credenciales privadas.
      const code = typeof error === 'object' && error !== null &&
        'code' in error && typeof error.code === 'string'
        ? error.code : 'unknown-verification-error';
      this.logger.warn(`No se pudo verificar el token Firebase (código: ${code})`);
      throw new UnauthorizedException('Token Firebase inválido, revocado o expirado');
    }
  }
}
