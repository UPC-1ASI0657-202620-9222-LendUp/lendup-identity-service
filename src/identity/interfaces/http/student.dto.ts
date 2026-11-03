import {
  IsEmail, IsInt, IsNotEmpty, IsOptional, IsString,
  IsUrl, Max, MaxLength, Min
} from 'class-validator';

export class RegistrarEstudianteDto {
  @IsEmail() @MaxLength(254)
  correo_institucional!: string;

  @IsString() @IsNotEmpty() @MaxLength(150)
  nombre!: string;

  @IsOptional() @IsString() @MaxLength(150)
  campus?: string;

  @IsString() @IsNotEmpty() @MaxLength(150)
  carrera!: string;

  @IsInt() @Min(1) @Max(20)
  ciclo!: number;

  @IsString() @IsNotEmpty() @MaxLength(30)
  telefono!: string;

  @IsOptional() @IsUrl({require_tld: true}) @MaxLength(2000)
  foto_url?: string;
}

export class ActualizarEstudianteDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(150)
  nombre?: string;

  @IsOptional() @IsString() @MaxLength(150)
  campus?: string;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(150)
  carrera?: string;

  @IsOptional() @IsInt() @Min(1) @Max(20)
  ciclo?: number;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(30)
  telefono?: string;

  @IsOptional() @IsUrl({require_tld: true}) @MaxLength(2000)
  foto_url?: string;
}

export class SolicitarVerificacionDto {
  @IsString() @IsNotEmpty() @MaxLength(255)
  verificacion_referencia!: string;
}

export class AceptarTerminosDto {
  @IsString() @IsNotEmpty()
  version_terminos_aceptada!: string;

  @IsString() @IsNotEmpty()
  version_descargo_aceptada!: string;
}
