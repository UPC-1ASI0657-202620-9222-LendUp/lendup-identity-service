import 'reflect-metadata';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { INTERNAL_SERVICES_KEY, InternalServiceGuard } from './internal-service.guard';

const RESERVATIONS = 'r'.repeat(48);
const PAYMENTS = 'p'.repeat(48);
const NOTIFICATIONS = 'n'.repeat(48);
const EVIDENCE = 'e'.repeat(48);
const before = {
  reservations: process.env.IDENTITY_RESERVATIONS_SERVICE_TOKEN,
  payments: process.env.IDENTITY_PAYMENTS_SERVICE_TOKEN,
  notifications: process.env.IDENTITY_NOTIFICATIONS_SERVICE_TOKEN,
  evidence: process.env.IDENTITY_EVIDENCE_SERVICE_TOKEN
};

function context(header: string | undefined, allowed: string[]): ExecutionContext {
  const handler = () => undefined;
  Reflect.defineMetadata(INTERNAL_SERVICES_KEY, allowed, handler);
  return {
    getHandler: () => handler,
    getClass: () => class Example {},
    switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: header } }) })
  } as unknown as ExecutionContext;
}

describe('InternalServiceGuard', () => {
  const guard = new InternalServiceGuard(new Reflector());
  beforeEach(() => {
    process.env.IDENTITY_RESERVATIONS_SERVICE_TOKEN = RESERVATIONS;
    process.env.IDENTITY_PAYMENTS_SERVICE_TOKEN = PAYMENTS;
    process.env.IDENTITY_NOTIFICATIONS_SERVICE_TOKEN = NOTIFICATIONS;
    process.env.IDENTITY_EVIDENCE_SERVICE_TOKEN = EVIDENCE;
  });
  afterAll(() => {
    for (const [key, value] of Object.entries(before)) {
      const name = key === 'reservations' ? 'IDENTITY_RESERVATIONS_SERVICE_TOKEN'
        : key === 'payments' ? 'IDENTITY_PAYMENTS_SERVICE_TOKEN'
          : key === 'notifications' ? 'IDENTITY_NOTIFICATIONS_SERVICE_TOKEN'
            : 'IDENTITY_EVIDENCE_SERVICE_TOKEN';
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  it('permite a Reservas consultar elegibilidad pero no correos', () => {
    expect(guard.canActivate(context('Bearer ' + RESERVATIONS, ['reservations']))).toBe(true);
    expect(() => guard.canActivate(context('Bearer ' + RESERVATIONS, ['notifications']))).toThrow(ForbiddenException);
  });

  it('permite correo solo con la credencial de Notificaciones', () => {
    expect(guard.canActivate(context('Bearer ' + NOTIFICATIONS, ['notifications']))).toBe(true);
    expect(() => guard.canActivate(context('Bearer ' + PAYMENTS, ['notifications']))).toThrow(ForbiddenException);
  });

  it('rechaza credenciales ausentes, inválidas o de menos de 32 caracteres', () => {
    expect(() => guard.canActivate(context(undefined, ['reservations']))).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context('Bearer incorrectly-signed', ['reservations']))).toThrow(UnauthorizedException);
    process.env.IDENTITY_RESERVATIONS_SERVICE_TOKEN = 'short';
    expect(() => guard.canActivate(context('Bearer short', ['reservations']))).toThrow(UnauthorizedException);
  });

  it('rechaza credenciales compartidas entre dos servicios', () => {
    process.env.IDENTITY_PAYMENTS_SERVICE_TOKEN = RESERVATIONS;
    expect(() => guard.canActivate(context('Bearer ' + RESERVATIONS, ['reservations']))).toThrow(UnauthorizedException);
  });

  it('permite a Evidencias resolver UID sin acceso a correo, contacto ni elegibilidad', () => {
    expect(guard.canActivate(context('Bearer ' + EVIDENCE, ['reservations', 'payments', 'notifications', 'evidence']))).toBe(true);
    for (const callers of [['notifications'], ['reservations']]) {
      expect(() => guard.canActivate(context('Bearer ' + EVIDENCE, callers))).toThrow(ForbiddenException);
    }
  });

  it('rechaza token de Evidencias ausente, corto o compartido', () => {
    delete process.env.IDENTITY_EVIDENCE_SERVICE_TOKEN;
    expect(() => guard.canActivate(context('Bearer ' + EVIDENCE, ['evidence']))).toThrow(UnauthorizedException);
    process.env.IDENTITY_EVIDENCE_SERVICE_TOKEN = 'short';
    expect(() => guard.canActivate(context('Bearer short', ['evidence']))).toThrow(UnauthorizedException);
    process.env.IDENTITY_EVIDENCE_SERVICE_TOKEN = PAYMENTS;
    expect(() => guard.canActivate(context('Bearer ' + PAYMENTS, ['payments', 'evidence']))).toThrow(UnauthorizedException);
  });

  it('restringe la consulta de rol al token exclusivo de Evidencias', () => {
    expect(guard.canActivate(context('Bearer ' + EVIDENCE, ['evidence']))).toBe(true);
    for (const token of [RESERVATIONS, PAYMENTS, NOTIFICATIONS]) {
      expect(() => guard.canActivate(context('Bearer ' + token, ['evidence']))).toThrow(ForbiddenException);
    }
    expect(() => guard.canActivate(context(undefined, ['evidence']))).toThrow(UnauthorizedException);
  });

  it('rechaza rutas internas sin declaración de permisos', () => {
    expect(() => guard.canActivate(context('Bearer ' + RESERVATIONS, []))).toThrow(ForbiddenException);
  });
});
