export type RolUsuario = 'ESTUDIANTE' | 'ADMINISTRADOR';
export type EstadoVerificacion = 'NO_VERIFICADO' | 'PENDIENTE' | 'VERIFICADO';

export interface FirebaseIdentity {
  uid: string;
  email: string;
  emailVerified: boolean;
}

export interface Usuario {
  id: string;
  firebaseUid: string;
  correoInstitucional: string;
  rol: RolUsuario;
  estadoVerificacion: EstadoVerificacion;
  verificadoEn: Date | null;
  versionTerminosAceptada: string | null;
  versionDescargoAceptada: string | null;
  aceptadosEn: Date | null;
}

export interface Perfil {
  id: string;
  usuarioId: string;
  nombre: string;
  universidad: string;
  campus: string;
  carrera: string;
  ciclo: number;
  telefono: string;
  fotoUrl: string | null;
}

export type CrearPerfil = Omit<Perfil, 'id' | 'usuarioId' | 'universidad'>;
export type ActualizarPerfil = Partial<Omit<CrearPerfil, 'campus'>> & { campus?: string };

export interface Universidad {
  id: string;
  shortName: string;
  name: string;
  emailDomains: string[];
}

export function normalizarCorreo(correo: string): string {
  return correo.trim().toLowerCase();
}

export function dominioDeCorreo(correo: string): string | null {
  const normalizado = normalizarCorreo(correo);
  const partes = normalizado.split('@');
  if (partes.length !== 2 || !partes[0] || !partes[1] || /\s/.test(normalizado)) {
    return null;
  }
  return partes[1];
}
