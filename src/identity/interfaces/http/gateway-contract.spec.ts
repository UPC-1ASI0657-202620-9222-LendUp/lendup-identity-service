import 'reflect-metadata';
import { RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { FirebaseAuthGuard } from '../../infrastructure/firebase/firebase-auth.guard';
import { StudentsController } from './students.controller';
import { TermsController } from './terms.controller';
import { UniversitiesController } from './universities.controller';

/** Locks the public HTTP contract consumed by the LendUp API Gateway and Catalog. */
describe('Contratos de rutas para API Gateway', () => {
  const route = (controller: object, method: string) => {
    const fn = (controller as Record<string, unknown>)[method];
    return {
      path: Reflect.getMetadata(PATH_METADATA, fn as object),
      verb: Reflect.getMetadata(METHOD_METADATA, fn as object)
    };
  };

  it('mantiene rutas de estudiantes y el endpoint /me requerido por Catálogo', () => {
    expect(Reflect.getMetadata(PATH_METADATA, StudentsController)).toBe('api/v1/estudiantes');
    expect(route(StudentsController.prototype, 'registrar')).toEqual({ path: '/', verb: RequestMethod.POST });
    expect(route(StudentsController.prototype, 'me')).toEqual({ path: 'me', verb: RequestMethod.GET });
    expect(route(StudentsController.prototype, 'actualizar')).toEqual({ path: 'me', verb: RequestMethod.PUT });
    expect(route(StudentsController.prototype, 'aceptarTerminos')).toEqual({
      path: 'me/aceptacion-terminos', verb: RequestMethod.POST
    });
    expect(route(StudentsController.prototype, 'obtener')).toEqual({ path: ':id', verb: RequestMethod.GET });
    expect(Reflect.getMetadata(GUARDS_METADATA, StudentsController)).toContain(FirebaseAuthGuard);
  });

  it('mantiene las rutas públicas de universidades y términos', () => {
    expect(Reflect.getMetadata(PATH_METADATA, UniversitiesController)).toBe('api/v1/universidades');
    expect(route(UniversitiesController.prototype, 'listar')).toEqual({ path: '/', verb: RequestMethod.GET });
    expect(Reflect.getMetadata(PATH_METADATA, TermsController)).toBe('api/v1/documentos/terminos');
    expect(route(TermsController.prototype, 'obtener')).toEqual({ path: '/', verb: RequestMethod.GET });
  });
});
