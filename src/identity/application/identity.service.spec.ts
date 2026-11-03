import 'reflect-metadata';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { IdentityRepository } from './identity.repository';
import { FirebaseIdentity, Usuario, Perfil } from '../domain/identity.model';

const estudiante: FirebaseIdentity = {
  uid: 'firebase-uid-123',
  email: 'estudiante@upc.edu.pe',
  emailVerified: true
};
const usuario: Usuario = {
  id: '11111111-1111-4111-8111-111111111111',
  firebaseUid: estudiante.uid,
  correoInstitucional: estudiante.email,
  rol: 'ESTUDIANTE',
  estadoVerificacion: 'NO_VERIFICADO',
  verificadoEn: null,
  versionTerminosAceptada: null,
  versionDescargoAceptada: null,
  aceptadosEn: null
};
const perfil: Perfil = {
  id: '22222222-2222-4222-8222-222222222222',
  usuarioId: usuario.id,
  nombre: 'Ana',
  universidad: 'UPC',
  campus: 'Monterrico',
  carrera: 'Ingeniería',
  ciclo: 5,
  telefono: '999999999',
  fotoUrl: null
};

function preparar() {
  const repository: jest.Mocked<IdentityRepository> = {
    buscarPorFirebaseUid: jest.fn().mockResolvedValue(null),
    buscarUsuarioPorId: jest.fn().mockResolvedValue(null),
    buscarPerfilPorUsuario: jest.fn().mockResolvedValue(perfil),
    crearEstudiante: jest.fn().mockResolvedValue(usuario),
    actualizarPerfil: jest.fn().mockResolvedValue(perfil),
    marcarCorreoVerificado: jest.fn().mockResolvedValue(undefined),
    solicitarVerificacion: jest.fn().mockResolvedValue(undefined),
    aceptarDocumentos: jest.fn().mockResolvedValue(undefined),
    universidadPorDominio: jest.fn().mockResolvedValue({
      id: 'UPC', shortName: 'UPC', name: 'Universidad Peruana de Ciencias Aplicadas',
      emailDomains: ['upc.edu.pe']
    }),
    listarUniversidades: jest.fn().mockResolvedValue([])
  };
  return { repository, service: new IdentityService(repository) };
}

describe('IdentityService', () => {
  it('registra al estudiante con UID del token y universidad del dominio', async () => {
    const { repository, service } = preparar();
    await service.registrar(estudiante, {
      correo_institucional: 'ESTUDIANTE@UPC.EDU.PE',
      nombre: 'Ana', campus: 'Monterrico', carrera: 'Ingeniería',
      ciclo: 5, telefono: '999999999', fotoUrl: null
    });
    expect(repository.crearEstudiante).toHaveBeenCalledWith(
      expect.objectContaining({
        firebaseUid: estudiante.uid,
        correoInstitucional: 'estudiante@upc.edu.pe',
        universidadCodigo: 'UPC',
        emailVerified: true
      })
    );
  });

  it('rechaza un correo distinto al del token', async () => {
    const { service, repository } = preparar();
    await expect(service.registrar(estudiante, {
      correo_institucional: 'otra@upc.edu.pe',
      nombre: 'Ana', campus: '', carrera: 'Ingeniería',
      ciclo: 5, telefono: '999999999', fotoUrl: null
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.crearEstudiante).not.toHaveBeenCalled();
  });

  it('rechaza dominios institucionales no reconocidos', async () => {
    const { service, repository } = preparar();
    repository.universidadPorDominio.mockResolvedValue(null);
    await expect(service.registrar({ ...estudiante, email: 'ana@example.com' }, {
      correo_institucional: 'ana@example.com', nombre: 'Ana', campus: '',
      carrera: 'Ingeniería', ciclo: 5, telefono: '999999999', fotoUrl: null
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('impide registrar dos veces un mismo Firebase UID', async () => {
    const { service, repository } = preparar();
    repository.buscarPorFirebaseUid.mockResolvedValue(usuario);
    await expect(service.registrar(estudiante, {
      correo_institucional: estudiante.email, nombre: 'Ana', campus: '',
      carrera: 'Ingeniería', ciclo: 5, telefono: '999999999', fotoUrl: null
    })).rejects.toBeInstanceOf(ConflictException);
  });

  it('devuelve usuario.id como UUID interno que espera Catálogo', async () => {
    const { service, repository } = preparar();
    repository.buscarPorFirebaseUid.mockResolvedValue({ ...usuario });
    const resultado = await service.me(estudiante);
    expect(resultado.usuario.id).toBe(usuario.id);
    expect(resultado.perfil.usuario_id).toBe(usuario.id);
    expect(repository.marcarCorreoVerificado).toHaveBeenCalledWith(usuario.id);
  });

  it('no permite consultar el perfil sin estar registrado', async () => {
    const { service } = preparar();
    await expect(service.me(estudiante)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('no asigna matrícula verificada por enviar una referencia manual', async () => {
    const { service, repository } = preparar();
    repository.buscarPorFirebaseUid.mockResolvedValue({ ...usuario });
    const resultado = await service.solicitarMiVerificacion(
      { ...estudiante, emailVerified: false }, 'referencia-123'
    );
    expect(resultado.estado_verificacion).toBe('PENDIENTE');
    expect(repository.solicitarVerificacion).toHaveBeenCalledWith(usuario.id, 'referencia-123');
  });

  it('rechaza aceptar versiones antiguas de términos', async () => {
    const { service, repository } = preparar();
    await expect(service.aceptarTerminos(estudiante, {
      version_terminos_aceptada: '2025',
      version_descargo_aceptada: '2025'
    })).rejects.toBeInstanceOf(ConflictException);
    expect(repository.aceptarDocumentos).not.toHaveBeenCalled();
  });
});
