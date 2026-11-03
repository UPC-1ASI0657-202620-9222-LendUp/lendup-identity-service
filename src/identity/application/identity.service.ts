import {
  BadRequestException, ConflictException, ForbiddenException,
  Inject, Injectable, NotFoundException
} from '@nestjs/common';
import {
  ActualizarPerfil, CrearPerfil, dominioDeCorreo, FirebaseIdentity, normalizarCorreo,
  Perfil, Usuario
} from '../domain/identity.model';
import { IDENTITY_REPOSITORY, IdentityRepository } from './identity.repository';

export interface RegistrarEstudianteInput extends CrearPerfil {
  correo_institucional: string;
}

export interface AceptacionInput {
  version_terminos_aceptada: string;
  version_descargo_aceptada: string;
}

@Injectable()
export class IdentityService {
  constructor(@Inject(IDENTITY_REPOSITORY) private readonly repository: IdentityRepository) {}

  async registrar(principal: FirebaseIdentity, input: RegistrarEstudianteInput) {
    const correo = normalizarCorreo(input.correo_institucional);
    if (normalizarCorreo(principal.email) !== correo) {
      throw new BadRequestException('El correo debe coincidir con el de Firebase');
    }
    const dominio = dominioDeCorreo(correo);
    if (!dominio) throw new BadRequestException('Correo institucional inválido');
    const universidad = await this.repository.universidadPorDominio(dominio);
    if (!universidad) throw new BadRequestException('Dominio universitario no reconocido');

    if (await this.repository.buscarPorFirebaseUid(principal.uid)) {
      throw new ConflictException('El usuario ya está registrado');
    }
    const { correo_institucional: _, ...perfil } = input;
    const usuario = await this.repository.crearEstudiante({
      firebaseUid: principal.uid,
      correoInstitucional: correo,
      universidadCodigo: universidad.id,
      emailVerified: principal.emailVerified,
      perfil: { ...perfil, campus: perfil.campus ?? '', fotoUrl: perfil.fotoUrl ?? null }
    });
    return this.formatearUsuario(usuario);
  }

  async me(principal: FirebaseIdentity) {
    const usuario = await this.exigirUsuario(principal);
    if (principal.emailVerified && usuario.estadoVerificacion !== 'VERIFICADO') {
      await this.repository.marcarCorreoVerificado(usuario.id);
      usuario.estadoVerificacion = 'VERIFICADO';
      usuario.verificadoEn = new Date();
    }
    const perfil = await this.repository.buscarPerfilPorUsuario(usuario.id);
    if (!perfil) throw new NotFoundException('Perfil no encontrado');
    return { usuario: this.formatearUsuario(usuario), perfil: this.formatearPerfil(perfil) };
  }

  async actualizarMiPerfil(principal: FirebaseIdentity, cambios: ActualizarPerfil) {
    const usuario = await this.exigirUsuario(principal);
    const perfil = await this.repository.actualizarPerfil(usuario.id, cambios);
    return this.formatearPerfil(perfil);
  }

  async solicitarMiVerificacion(principal: FirebaseIdentity, referencia: string) {
    const usuario = await this.exigirUsuario(principal);
    if (usuario.estadoVerificacion !== 'VERIFICADO') {
      await this.repository.solicitarVerificacion(usuario.id, referencia);
      usuario.estadoVerificacion = 'PENDIENTE';
    }
    return this.formatearUsuario(usuario);
  }

  async aceptarTerminos(principal: FirebaseIdentity, input: AceptacionInput) {
    const versionVigente = process.env.TERMS_VERSION || '2026-10-04';
    if (input.version_terminos_aceptada !== versionVigente ||
        input.version_descargo_aceptada !== versionVigente) {
      throw new ConflictException('La versión de términos o descargo no está vigente');
    }
    const usuario = await this.exigirUsuario(principal);
    await this.repository.aceptarDocumentos(usuario.id, versionVigente);
    usuario.versionTerminosAceptada = versionVigente;
    usuario.versionDescargoAceptada = versionVigente;
    usuario.aceptadosEn = new Date();
    return this.formatearUsuario(usuario);
  }

  async buscarPerfilPublico(principal: FirebaseIdentity, id: string) {
    const actual = await this.exigirUsuario(principal);
    if (!principal.emailVerified || actual.estadoVerificacion !== 'VERIFICADO') {
      throw new ForbiddenException('Se requiere correo institucional verificado');
    }
    const usuario = await this.repository.buscarUsuarioPorId(id);
    if (!usuario) throw new NotFoundException('Estudiante no encontrado');
    const perfil = await this.repository.buscarPerfilPorUsuario(id);
    if (!perfil) throw new NotFoundException('Perfil no encontrado');
    return {
      id: usuario.id,
      estado_verificacion: usuario.estadoVerificacion,
      nombre: perfil.nombre,
      universidad: perfil.universidad,
      campus: perfil.campus,
      carrera: perfil.carrera,
      ciclo: perfil.ciclo,
      foto_url: perfil.fotoUrl
    };
  }

  async universidades() {
    return this.repository.listarUniversidades();
  }

  private async exigirUsuario(principal: FirebaseIdentity): Promise<Usuario> {
    const usuario = await this.repository.buscarPorFirebaseUid(principal.uid);
    if (!usuario) throw new ForbiddenException('Debe registrar su perfil en LendUp');
    if (normalizarCorreo(usuario.correoInstitucional) !== normalizarCorreo(principal.email)) {
      throw new ForbiddenException('El correo actual no coincide con la identidad registrada');
    }
    return usuario;
  }

  private formatearUsuario(usuario: Usuario) {
    return {
      id: usuario.id,
      correo_institucional: usuario.correoInstitucional,
      rol: usuario.rol,
      estado_verificacion: usuario.estadoVerificacion,
      verificado_en: usuario.verificadoEn,
      version_terminos_aceptada: usuario.versionTerminosAceptada,
      version_descargo_aceptada: usuario.versionDescargoAceptada,
      aceptados_en: usuario.aceptadosEn
    };
  }

  private formatearPerfil(perfil: Perfil) {
    return {
      id: perfil.id,
      usuario_id: perfil.usuarioId,
      nombre: perfil.nombre,
      universidad: perfil.universidad,
      campus: perfil.campus,
      carrera: perfil.carrera,
      ciclo: perfil.ciclo,
      telefono: perfil.telefono,
      foto_url: perfil.fotoUrl
    };
  }
}
