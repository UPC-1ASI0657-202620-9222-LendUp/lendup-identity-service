import {
  ActualizarPerfil, CrearPerfil, Perfil, Universidad, Usuario
} from '../domain/identity.model';

export const IDENTITY_REPOSITORY = Symbol('IDENTITY_REPOSITORY');

export interface CrearEstudiante {
  firebaseUid: string;
  correoInstitucional: string;
  universidadCodigo: string;
  perfil: CrearPerfil;
  emailVerified: boolean;
}

export interface IdentityRepository {
  buscarPorFirebaseUid(uid: string): Promise<Usuario | null>;
  buscarUsuarioPorId(id: string): Promise<Usuario | null>;
  buscarPerfilPorUsuario(id: string): Promise<Perfil | null>;
  crearEstudiante(comando: CrearEstudiante): Promise<Usuario>;
  actualizarPerfil(usuarioId: string, cambios: ActualizarPerfil): Promise<Perfil>;
  marcarCorreoVerificado(usuarioId: string): Promise<void>;
  solicitarVerificacion(usuarioId: string, referencia: string): Promise<void>;
  aceptarDocumentos(usuarioId: string, version: string): Promise<void>;
  universidadPorDominio(dominio: string): Promise<Universidad | null>;
  listarUniversidades(): Promise<Universidad[]>;
}
