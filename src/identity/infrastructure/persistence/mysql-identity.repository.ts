import {
  ConflictException, Inject, Injectable, NotFoundException
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { IdentityRepository, CrearEstudiante } from '../../application/identity.repository';
import {
  ActualizarPerfil, Perfil, Universidad, Usuario, EstadoVerificacion, RolUsuario
} from '../../domain/identity.model';
import { MYSQL_POOL } from './mysql.provider';

@Injectable()
export class MySqlIdentityRepository implements IdentityRepository {
  constructor(@Inject(MYSQL_POOL) private readonly pool: Pool) {}

  async buscarPorFirebaseUid(uid: string): Promise<Usuario | null> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT u.*, r.codigo AS rol_codigo FROM usuarios u JOIN roles r ON r.id=u.rol_id WHERE u.firebase_uid=?',
      [uid]
    );
    return rows[0] ? this.mapUsuario(rows[0]) : null;
  }

  async buscarUsuarioPorId(id: string): Promise<Usuario | null> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT u.*, r.codigo AS rol_codigo FROM usuarios u JOIN roles r ON r.id=u.rol_id WHERE u.id=?',
      [id]
    );
    return rows[0] ? this.mapUsuario(rows[0]) : null;
  }

  async buscarPerfilPorUsuario(usuarioId: string): Promise<Perfil | null> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT * FROM perfiles WHERE usuario_id=?', [usuarioId]
    );
    return rows[0] ? this.mapPerfil(rows[0]) : null;
  }

  async crearEstudiante(comando: CrearEstudiante): Promise<Usuario> {
    const tx = await this.pool.getConnection();
    const usuarioId = randomUUID();
    try {
      await tx.beginTransaction();
      const [roles] = await tx.execute<RowDataPacket[]>(
        'SELECT id FROM roles WHERE codigo=?', ['ESTUDIANTE']
      );
      if (!roles.length) throw new Error('No existe el rol de estudiante en MySQL');
      await tx.execute(
        'INSERT INTO usuarios (id, firebase_uid, correo_institucional, rol_id, estado_verificacion, verificado_en) VALUES (?,?,?,?,?,?)',
        [usuarioId, comando.firebaseUid, comando.correoInstitucional, roles[0].id,
          comando.emailVerified ? 'VERIFICADO' : 'NO_VERIFICADO',
          comando.emailVerified ? new Date() : null]
      );
      await tx.execute(
        'INSERT INTO perfiles (id, usuario_id, nombre, universidad, campus, carrera, ciclo, telefono, foto_url) VALUES (?,?,?,?,?,?,?,?,?)',
        [randomUUID(), usuarioId, comando.perfil.nombre, comando.universidadCodigo,
          comando.perfil.campus ?? '', comando.perfil.carrera,
          comando.perfil.ciclo, comando.perfil.telefono, comando.perfil.fotoUrl ?? null]
      );
      await tx.commit();
    } catch (error) {
      await tx.rollback();
      if ((error as { code?: string }).code === 'ER_DUP_ENTRY') {
        throw new ConflictException('El Firebase UID o correo ya se encuentra registrado');
      }
      throw error;
    } finally {
      tx.release();
    }
    const usuario = await this.buscarPorFirebaseUid(comando.firebaseUid);
    if (!usuario) throw new Error('No se pudo recuperar el usuario recién creado');
    return usuario;
  }

  async actualizarPerfil(usuarioId: string, cambios: ActualizarPerfil): Promise<Perfil> {
    // Lista cerrada de columnas editables: nunca se modifica universidad ni usuario_id.
    const columnas: Record<string, string> = {
      nombre: 'nombre',
      campus: 'campus',
      carrera: 'carrera',
      ciclo: 'ciclo',
      telefono: 'telefono',
      fotoUrl: 'foto_url'
    };
    const pares = Object.entries(cambios).filter(([clave, valor]) =>
      Object.hasOwn(columnas, clave) && valor !== undefined
    );
    if (pares.length) {
      const asignaciones = pares.map(([clave]) => columnas[clave] + '=?').join(', ');
      await this.pool.execute(
        'UPDATE perfiles SET ' + asignaciones + ' WHERE usuario_id=?',
        [...pares.map(([, valor]) => valor), usuarioId]
      );
    }
    const perfil = await this.buscarPerfilPorUsuario(usuarioId);
    if (!perfil) throw new NotFoundException('Perfil no encontrado');
    return perfil;
  }

  async marcarCorreoVerificado(usuarioId: string): Promise<void> {
    await this.pool.execute(
      "UPDATE usuarios SET estado_verificacion='VERIFICADO', verificado_en=COALESCE(verificado_en, UTC_TIMESTAMP(6)) WHERE id=?",
      [usuarioId]
    );
  }

  async solicitarVerificacion(usuarioId: string, referencia: string): Promise<void> {
    await this.pool.execute(
      "UPDATE usuarios SET estado_verificacion='PENDIENTE', verificacion_referencia=?, verificacion_solicitada_en=UTC_TIMESTAMP(6) WHERE id=? AND estado_verificacion <> 'VERIFICADO'",
      [referencia, usuarioId]
    );
  }

  async aceptarDocumentos(usuarioId: string, version: string): Promise<void> {
    await this.pool.execute(
      'UPDATE usuarios SET version_terminos_aceptada=?, version_descargo_aceptada=?, aceptados_en=UTC_TIMESTAMP(6) WHERE id=?',
      [version, version, usuarioId]
    );
  }

  async universidadPorDominio(dominio: string): Promise<Universidad | null> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT u.codigo, u.nombre, u.sigla, d.dominio FROM universidades u JOIN dominios_universidad d ON d.universidad_codigo=u.codigo WHERE u.activa=TRUE AND d.activo=TRUE AND d.dominio=?',
      [dominio]
    );
    if (!rows.length) return null;
    return {
      id: String(rows[0].codigo),
      name: String(rows[0].nombre),
      shortName: String(rows[0].sigla),
      emailDomains: [String(rows[0].dominio)]
    };
  }

  async listarUniversidades(): Promise<Universidad[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT u.codigo, u.nombre, u.sigla, d.dominio FROM universidades u JOIN dominios_universidad d ON d.universidad_codigo=u.codigo WHERE u.activa=TRUE AND d.activo=TRUE ORDER BY u.nombre,d.dominio'
    );
    const salida = new Map<string, Universidad>();
    for (const r of rows) {
      const id = String(r.codigo);
      let universidad = salida.get(id);
      if (!universidad) {
        universidad = { id, name: String(r.nombre), shortName: String(r.sigla), emailDomains: [] };
        salida.set(id, universidad);
      }
      universidad.emailDomains.push(String(r.dominio));
    }
    return [...salida.values()];
  }

  private mapUsuario(r: RowDataPacket): Usuario {
    return {
      id: String(r.id),
      firebaseUid: String(r.firebase_uid),
      correoInstitucional: String(r.correo_institucional),
      rol: String(r.rol_codigo) as RolUsuario,
      estadoVerificacion: String(r.estado_verificacion) as EstadoVerificacion,
      verificadoEn: r.verificado_en ?? null,
      versionTerminosAceptada: r.version_terminos_aceptada ?? null,
      versionDescargoAceptada: r.version_descargo_aceptada ?? null,
      aceptadosEn: r.aceptados_en ?? null
    };
  }

  private mapPerfil(r: RowDataPacket): Perfil {
    return {
      id: String(r.id),
      usuarioId: String(r.usuario_id),
      nombre: String(r.nombre),
      universidad: String(r.universidad),
      campus: String(r.campus),
      carrera: String(r.carrera),
      ciclo: Number(r.ciclo),
      telefono: String(r.telefono),
      fotoUrl: r.foto_url ?? null
    };
  }
}
