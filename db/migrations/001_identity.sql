-- Propiedad de datos exclusiva de Identidad. El esquema no replica tablas de Catálogo.
CREATE TABLE IF NOT EXISTS roles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  descripcion VARCHAR(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS universidades (
  codigo VARCHAR(30) NOT NULL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  sigla VARCHAR(30) NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS dominios_universidad (
  dominio VARCHAR(253) NOT NULL PRIMARY KEY,
  universidad_codigo VARCHAR(30) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_dominio_universidad FOREIGN KEY (universidad_codigo)
    REFERENCES universidades(codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS usuarios (
  id CHAR(36) NOT NULL PRIMARY KEY,
  firebase_uid VARCHAR(128) NOT NULL UNIQUE,
  correo_institucional VARCHAR(254) NOT NULL UNIQUE,
  rol_id CHAR(36) NOT NULL,
  estado_verificacion VARCHAR(20) NOT NULL DEFAULT 'NO_VERIFICADO',
  verificado_en DATETIME(6) NULL,
  verificacion_solicitada_en DATETIME(6) NULL,
  verificacion_referencia VARCHAR(255) NULL,
  version_terminos_aceptada VARCHAR(50) NULL,
  version_descargo_aceptada VARCHAR(50) NULL,
  aceptados_en DATETIME(6) NULL,
  creado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  actualizado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_usuario_rol FOREIGN KEY (rol_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS perfiles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  usuario_id CHAR(36) NOT NULL UNIQUE,
  nombre VARCHAR(150) NOT NULL,
  universidad VARCHAR(150) NOT NULL,
  campus VARCHAR(150) NOT NULL DEFAULT '',
  carrera VARCHAR(150) NOT NULL,
  ciclo SMALLINT NOT NULL,
  telefono VARCHAR(30) NOT NULL,
  foto_url TEXT NULL,
  creado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  actualizado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_perfil_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO roles (id,codigo,descripcion) VALUES
('00000000-0000-4000-8000-000000000001','ESTUDIANTE','Estudiante'),
('00000000-0000-4000-8000-000000000002','ADMINISTRADOR','Administrador');

INSERT IGNORE INTO universidades (codigo,nombre,sigla) VALUES
('UPC','Universidad Peruana de Ciencias Aplicadas','UPC'),
('PUCP','Pontificia Universidad Católica del Perú','PUCP'),
('ULIMA','Universidad de Lima','ULima'),
('UNI','Universidad Nacional de Ingeniería','UNI'),
('UNMSM','Universidad Nacional Mayor de San Marcos','UNMSM'),
('UTP','Universidad Tecnológica del Perú','UTP'),
('UPN','Universidad Privada del Norte','UPN'),
('USIL','Universidad San Ignacio de Loyola','USIL');

INSERT IGNORE INTO dominios_universidad (dominio,universidad_codigo) VALUES
('upc.edu.pe','UPC'),('pucp.edu.pe','PUCP'),('pucp.pe','PUCP'),
('aloe.ulima.edu.pe','ULIMA'),('ulima.edu.pe','ULIMA'),
('uni.pe','UNI'),('uni.edu.pe','UNI'),('unmsm.edu.pe','UNMSM'),
('utp.edu.pe','UTP'),('upn.pe','UPN'),('upn.edu.pe','UPN'),
('usil.pe','USIL'),('epg.usil.pe','USIL');
