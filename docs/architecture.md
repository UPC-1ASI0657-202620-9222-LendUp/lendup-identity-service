# Arquitectura — Identidad

**Bounded Context:** Identidad (DDD). Cada microservicio controla su persistencia; Catálogo solo recibe UUID internos por contrato HTTP.

- `domain`: usuario, perfil, estados y reglas invariantes; sin dependencias de NestJS.
- `application`: casos de uso de registro, consulta, actualización, verificación y aceptación de documentos; puertos de repositorio.
- `infrastructure`: adaptadores MySQL, Firebase Admin y documentos.
- `interfaces/http`: rutas REST, DTOs validados y aplicación de guards.
- `db/migrations`: esquema propio, catálogo de universidades y roles.

**Fronteras de seguridad:** Firebase UID proviene exclusivamente de un ID token verificado, nunca del JSON o los encabezados arbitrarios. La asignación de roles administrativos queda fuera del registro público; la autorización por rol también debe validarse en Gateway. El correo institucional se compara con el del token y con la lista exacta de dominios habilitados.

**Dependencias:** Firebase Authentication valida credenciales; MySQL almacena los perfiles. No se comparte base de datos con Catálogo.

**Contratos:** `GET /api/v1/estudiantes/me` conserva `usuario.id` como UUID interno de Identidad para el cliente HTTP del servicio Catálogo.
