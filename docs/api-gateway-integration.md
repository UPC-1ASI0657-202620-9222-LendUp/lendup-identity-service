# Integración de Identidad con LendUp API Gateway

Referencia del Gateway revisada: `UPC-1ASI0657-202620-9222-LendUp/lendup-api-gateway` (rama `main`, 2026-11-03). Identidad ya implementa estos endpoints: **no deben renombrarse ni reescribirse**.

## Rutas que el Gateway debe enviar a Identidad
| Método | Ruta externa (sin reescritura) | Autenticación |
| --- | --- | --- |
| POST | `/api/v1/estudiantes` | Firebase Bearer |
| GET / PUT | `/api/v1/estudiantes/me` | Firebase Bearer |
| POST | `/api/v1/estudiantes/me/verificacion` | Firebase Bearer |
| POST | `/api/v1/estudiantes/me/aceptacion-terminos` | Firebase Bearer |
| GET | `/api/v1/estudiantes/{id}` | Firebase Bearer |
| GET | `/api/v1/universidades` | Público |
| GET | `/api/v1/documentos/terminos` | Público |

En `application.yml` del Gateway añadir una ruta hacia `IDENTITY_SERVICE_URL` (sin añadir `/api/v1` a la URL base), para:
- `Path=/api/v1/estudiantes,/api/v1/estudiantes/**,/api/v1/universidades,/api/v1/universidades/**,/api/v1/documentos/terminos`
- **Orden obligatorio**: la ruta `/api/v1/estudiantes/{id}/reputacion` debe permanecer **antes** de la ruta general de Identidad; la ruta de Identidad debe preceder a la ruta comodín del monolito `/api/v1/**`.
- Para migración gradual, usar `${IDENTITY_SERVICE_URL:${MONOLITH_URL:http://localhost:8080}}`; si se configura la variable, usar URL real y **no dejarla vacía**.

El Gateway debe reenviar sin modificaciones `Authorization: Bearer <Firebase-ID-token>`, cuerpo y query string. El propio servicio sigue validando Firebase; no se confía en `X-User-Id` o en el Gateway para autenticar. `GET /api/v1/estudiantes/me` devuelve `{ usuario: { id: UUID }, perfil: { ... } }`, necesario para Catálogo.

## Puertos: ordenador local frente a AWS

El Gateway usa los puertos locales 8081 (Reservas) y 8082 (Pagos). Identidad también utiliza **8081 por defecto** y Catálogo **8082**, por lo que no pueden coexistir en un único host sin remapeo.

Ejemplo de ejecución local sin Docker para la API de Identidad, manteniendo el MySQL de Identidad en el puerto 3309:

```powershell
# En el repositorio de Identidad, tras configurar .env y Firebase:
$env:PORT = "8085"
npm run start:dev
# En el .env del Gateway:
# IDENTITY_SERVICE_URL=http://host.docker.internal:8085
```

Si se ejecuta la imagen Docker, mantener `PORT=8081` dentro y publicar `-p 8085:8081`. Catálogo puede exponerse en 8084 y configurar `CATALOG_SERVICE_URL=http://host.docker.internal:8084` en el Gateway local.

En AWS/ECS, el puerto de cada contenedor puede seguir en `8081`; usar el **DNS privado de esa tarea/servicio** (Cloud Map o ALB interno) en `IDENTITY_SERVICE_URL`. El Gateway no necesita conectarse a MySQL ni acceder a credenciales Firebase Admin.

## Comprobaciones posteriores al despliegue

1. `GET /api/v1/universidades` a través del Gateway retorna un listado real de Identidad (comprueba MySQL).
2. `GET /api/v1/documentos/terminos` retorna el documento.
3. `GET /api/v1/estudiantes/me` sin token responde 401 desde Identidad; con Firebase válido y usuario registrado devuelve `usuario.id`.
4. `GET /api/v1/estudiantes/{id}/reputacion` sigue alcanzando Reputación o su fallback, **no** Identidad.
5. Crear una publicación autenticada desde el Gateway: Catálogo valida token y resuelve su UUID consultando Identidad mediante su URL interna propia.

El pipeline valida los metadatos de rutas y el servicio con dobles; estas comprobaciones de red reales deben completarse en el entorno AWS.
