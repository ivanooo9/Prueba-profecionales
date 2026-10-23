# Deployment Plan — Profesionales Ecuador Core

## Alcance y estado

Esta guía prepara una futura demostración del Core Express como servicio Node persistente, separado del frontend Vite publicado en Vercel. No se ha desplegado nada, no se creó una base externa y no se ejecutaron migraciones, seeds ni rutinas de mantenimiento.

Arquitectura verificada en el repositorio:

- El contenedor usa `node:22-bookworm`, compila `src/` a `dist/` y arranca mediante `entrypoint.deploy.sh` con `node dist/server.js`.
- Express y Socket.IO comparten `http.createServer(app)`; `/health` responde sin consultar PostgreSQL.
- En producción se omiten aprovisionamiento y mantenimiento de inicio. El entrypoint seguro no corre Prisma, seeds ni backfills.
- El Core tiene rutas EJS además de API. El frontend Vercel `apps/Profesores` es un cliente separado.

## 1. Requisitos previos

- Elegir un solo proveedor para el servicio Docker persistente: Render Web Service o Railway Service.
- Tener un proyecto Vercel existente para el vertical que se demostrará y confirmar su Root Directory, build command y output directory en el panel.
- Decidir el dominio frontend/API antes de configurar cookies. Se recomienda un dominio personalizado para el frontend y un subdominio para la API, ambos bajo el mismo sitio registrable.
- Crear un proyecto PostgreSQL de demostración vacío, separado de cualquier base local o productiva.
- Crear una política de backups y definir quién podrá acceder a variables secretas y a la base demo.
- Revisar el contenido de `prisma/migrations/` antes de aplicar migraciones. Esta guía no asume que la historia de migraciones se haya probado contra una base externa.
- Acordar un mecanismo de aprovisionamiento administrativo que no publique la cuenta/contraseña predeterminada codificada en el script actual. La base vacía no tendrá usuarios ni roles por el arranque de producción.

No importar ni copiar `DATABASE_URL`, datos, usuarios ni credenciales del entorno local. El archivo `.env.production.example` es una plantilla documental y usa únicamente placeholders.

## 2. Configuración del backend

Crear un servicio Docker persistente desde la raíz del repositorio:

- Dockerfile: `Dockerfile`.
- Contexto/Root Directory: raíz del repositorio.
- Health check: `GET /health`.
- Puerto: usar el `PORT` que inyecte la plataforma; el contenedor conserva `3000` como valor predeterminado.
- Comando de inicio: el `CMD` de la imagen es `node dist/server.js`; no reemplazar el entrypoint seguro por `entrypoint.sh`.
- Mantener una sola instancia para la demostración mientras `LegalReminderProcessorService` siga ejecutándose cada minuto dentro de cada proceso.
- No configurar una release command automática para migraciones hasta aprobar expresamente el SQL y el destino de la base.

La imagen validada incluye `dist`, `public`, `views`, `prisma`, Prisma Client y el CLI, dependencias de Node, bibliotecas de sistema usadas por Chromium/Puppeteer, y el browser descargado en `/app/.cache/puppeteer`. Corre con el usuario `node`. `.dockerignore` excluye `.env` y `.env.*`, por lo que los valores deben inyectarse desde el panel del proveedor.

El servicio usa almacenamiento local para documentos de Arquitectura y Legal si no se definen `ARCHITECTURE_STORAGE_DIR` o `LEGAL_STORAGE_DIR`. El filesystem efímero del contenedor no es almacenamiento duradero: antes de usar esas funciones en producción, configurar un volumen persistente montado en la ruta elegida (ej. `/app/storage/legal`) o no usar cargas de esos módulos durante la demo.

## 3. Configuración de PostgreSQL

1. Crear una instancia/base llamada para demostración, nueva y vacía, sin restaurar una copia local.
2. Crear credenciales exclusivas para la aplicación, con permisos limitados a su propia base/esquema. No reutilizar contraseñas de otros entornos.
3. Usar la URL privada/interna del proveedor si el servicio y PostgreSQL están en la misma red privada. Si la conexión es pública, exigir TLS según lo indicado por el proveedor y proteger la lista de IPs/redes autorizadas.
4. Guardar la URL solo como variable secreta `DATABASE_URL` del backend. Codificar caracteres reservados de usuario/contraseña dentro de la URL.
5. Revisar manualmente los SQL versionados en `prisma/migrations/`. Verificar que el estado del esquema de destino sea realmente vacío y confirmar la base seleccionada antes de ejecutar comandos.
6. Después de esa revisión, consultar estado con `npx prisma migrate status` apuntando explícitamente a la base demo. Para una base nueva y vacía, aplicar únicamente las migraciones versionadas con `npm run db:migrate:deploy` en una operación manual/one-off aprobada.
7. Si el estado o la migración falla, detenerse y diagnosticar el error. No ejecutar `prisma db push`, `db:push`, `prisma:migrate` ni `db:setup`; no aceptar `--accept-data-loss` ni crear un baseline improvisado.
8. Guardar una copia de seguridad antes de cualquier cambio posterior de esquema y verificar que la restauración sea posible.

El entrypoint de Docker no ejecuta migraciones. `db:migrate:deploy` es independiente y no se ejecuta aquí.

### Aprovisionamiento de la primera cuenta

Al estar en producción, el Core no ejecuta las rutinas automáticas que crean roles, administrador, carruseles o plantillas. Una base recién migrada no queda lista para login por sí sola.

El script actual asociado a `provision:defaults` incluye credenciales administrativas predeterminadas; no ejecutarlo en un servicio accesible por Internet tal como está. Antes de pruebas de autenticación, aprobar un procedimiento controlado para crear un administrador con secreto único, crear los roles requeridos y preparar el contenido demo sin importar seeds locales. No introducir cuentas compartidas en este documento ni en variables públicas.

## 4. Variables de entorno

Usar `.env.production.example` como inventario sin secretos reales. Configurar las variables en el panel del backend como runtime variables, salvo las identificadas como build-time.

| Variable | Tipo | Estado/uso |
|---|---|---|
| `NODE_ENV` | Runtime | Obligatoria: `production`. Activa el camino de arranque sin aprovisionamiento local. |
| `PORT` | Runtime | La plataforma lo inyecta; la imagen usa `3000` si no existe. No fijar un puerto incompatible con el proveedor. |
| `DATABASE_URL` | Runtime secreta | Obligatoria para Prisma y requerida por `entrypoint.deploy.sh`. Base PostgreSQL demo aislada. |
| `JWT_SECRET` | Runtime secreta | Obligatoria. Generar un valor aleatorio exclusivo, largo y diferente por entorno. |
| `JWT_REFRESH_SECRET` | Runtime secreta | Obligatoria y distinta de `JWT_SECRET`. |
| `FRONTEND_URL` | Runtime | Origen exacto principal permitido por CORS, sin ruta final. Ejemplo para el sitio actual: `https://prueba-profecionales.vercel.app`. |
| `FRONTEND_URLS` | Runtime | Opcional: lista de orígenes adicionales explícitos separados por comas. No admite comodines. |
| `TRUST_PROXY_HOPS` | Runtime | Opcional; default de producción: `1`. Confirmar la cantidad real de proxies confiables. |
| `AUTH_COOKIE_SAME_SITE` | Runtime | Opcional; default `lax`. Usar `none` solo para despliegue realmente cross-site y siempre con HTTPS. |
| `BASE_URL` | Runtime | Necesaria para enlaces, emails, certificados y callbacks generados por el Core. Debe ser la URL pública canónica del Core/API. |
| `APP_URL` | Runtime | Opcional; un controlador la usa como alternativa de `BASE_URL`. Mantenerlas coherentes. |
| `REDIS_URL` | Runtime secreta | Opcional. Sin Redis el caché usa directamente la base; configurarlo solo con instancia y URL protegidas. |
| `ENCRYPTION_KEY` | Runtime secreta | Recomendada si se cifran valores. Mantenerla estable; rotarla sin un plan puede impedir descifrar datos existentes. |
| `ARCHITECTURE_STORAGE_DIR` | Runtime | Opcional. Si se usa, apuntar a un volumen persistente del proveedor. |
| `LEGAL_STORAGE_DIR` | Runtime | Opcional. Si se usa, apuntar a un volumen persistente montado para expedientes jurídicos. |
| `SUPPORT_EMAIL` | Runtime | Opcional; correo de soporte mostrado en algunas vistas y mensajes. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Runtime secretas/parcial | Opcionales si se usa Cloudinary; el secreto/API key no debe exponerse al cliente. |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME` | Runtime | Opcionales para correo vía Resend. API key secreta. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` | Runtime | Alternativa opcional SMTP; credenciales secretas. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_ACCESS_TOKEN` | Runtime | Opcionales para integración Gmail/Google; secretos/tokens solo en el panel del proveedor. |
| `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REDIRECT_URI`, `GMAIL_REFRESH_TOKEN`, `GMAIL_ACCESS_TOKEN`, `GMAIL_USER`, `SENDER_NAME` | Runtime | Alias/ajustes opcionales de email; no configurar si no se habilita la integración. Tokens y secretos son confidenciales. |
| `PAYPHONE_TOKEN`, `PAYPHONE_STORE_ID`, `PAYPHONE_TAX_RATE` | Runtime | Opcionales para pagos. Empezar en credenciales/ambiente de pruebas del proveedor y no habilitar transacciones reales para una demo pública. |
| `BUNNY_STREAM_LIBRARY_ID`, `BUNNY_STREAM_API_KEY` | Runtime | Opcionales para video. API key secreta. |

No configurar `PRISMA_DB_PUSH` ni `BACKFILL_PROFESSIONAL_SLUGS` para el entrypoint de despliegue: el entrypoint no ejecuta esas operaciones. Tampoco usar los scripts `db:push`, `prisma:migrate` o `db:setup` para desplegar.

### Build-time frente a runtime

- Backend: `npm run build` genera Prisma Client y TypeScript `dist`; el servicio recibe sus secretos al iniciar. `DATABASE_URL` se necesita para ejecutar Prisma Client en runtime y para migraciones explícitas, no se incorpora al bundle de Vite.
- Frontend Vite en Vercel: `VITE_API_BASE_URL` se lee al compilar el vertical y queda incorporada en el bundle. Es pública, nunca debe contener secretos. Para proxy same-origin puede permanecer vacía; para llamadas directas apunta al origen API. Cambiarla requiere un nuevo build del frontend.
- `FRONTEND_URL` es runtime del backend y no sustituye `VITE_API_BASE_URL`.

## 5. Configuración de Vercel

Para el vertical publicado `Profesores`:

- Confirmar manualmente que el Root Directory del proyecto es `apps/Profesores`, el build command es `npm run build` y el output directory es `dist`. Los ajustes actuales del panel no están versionados en este repositorio.
- Configurar `VITE_API_BASE_URL` según la arquitectura elegida y volver a compilar después de cambiarlo.
- No usar el proxy de Vite en producción; `server.proxy` solo aplica al servidor de desarrollo.
- No introducir claves de base, JWT, Redis, pago, correo o proveedores en Vercel si el bundle cliente no las necesita.
- La página Vercel actual es `https://prueba-profecionales.vercel.app`. Un dominio personalizado puede cambiar el comportamiento de cookies cross-site y debe considerarse antes de elegir `SameSite`.

## 6. Arquitectura de dominios, cookies y CORS

El backend ya permite únicamente los orígenes exactos declarados en `FRONTEND_URL`/`FRONTEND_URLS`, refleja el origen permitido y habilita credenciales. Socket.IO comparte la allowlist. No usar `*` ni dominios comodín `*.vercel.app`. Las cookies son host-only (sin `Domain`), `HttpOnly`, `Secure` en producción y `SameSite` configurable.

### A. Vercel como proxy `/api` hacia el backend

- El navegador solicita `/api/...` al mismo origen Vercel; el cliente puede usar `VITE_API_BASE_URL` vacío. En apariencia es same-origin y normalmente se simplifican CORS y cookies `SameSite=Lax`.
- Se necesita configurar rewrites/proxy de forma explícita y confirmar que se preserven `Cookie`, `Set-Cookie`, métodos, query, headers y respuestas de autenticación.
- Si se necesita Socket.IO a través del proxy, también hay que enrutar `/socket.io/*` y validar tanto WebSocket upgrade como polling. No asumir que un rewrite HTTP garantiza compatibilidad Socket.IO ni persistencia de conexión. No hay clientes Socket.IO en los verticales Vite revisados; los parciales EJS del Core conectan al mismo host del Core.
- El Core debe permitir el origen Vercel en `FRONTEND_URL` para preflights/proxy que transmitan `Origin`.
- Añade una capa de enrutamiento y diagnósticos en Vercel; la ruta proxy y cookies deben probarse después de configurarla.

### B. Vercel con llamadas directas al dominio API

- Configurar `VITE_API_BASE_URL` con el origen API. Los clientes existentes ya usan `credentials: include`; el backend debe permitir el origen exacto por `FRONTEND_URL` y responder preflight con credenciales.
- Recomendación: usar un dominio personalizado para Vercel, por ejemplo `demo.example.com`, y API en `api.example.com`. Son orígenes distintos pero mismo sitio registrable bajo HTTPS; la cookie host-only se guarda para el host API, y `SameSite=Lax` normalmente conserva el comportamiento same-site sin `Domain=.example.com`.
- Si se conserva `prueba-profecionales.vercel.app` y se llama a un dominio de Render/Railway, son sitios diferentes. Se necesitaría `AUTH_COOKIE_SAME_SITE=none` y `Secure`; políticas del navegador contra cookies de terceros pueden bloquear la sesión. No usar `Domain=.vercel.app`.
- Socket.IO directo debe conectar al origen API con el origen exacto autorizado. Si un cliente cross-origin lo usa, verificar configuración de credenciales del cliente; no está en el alcance cambiar verticales.
- HTTPS es obligatorio en ambos extremos. Los callbacks/enlaces generados por el Core dependen de `BASE_URL`, que debe apuntar a la URL pública correcta.

**Elección recomendada para la demo:** alternativa B con dominio personalizado frontend/API bajo el mismo dominio registrable, `SameSite=Lax`, cookie host-only y CORS exacto. Si no se dispone de dominio propio y se conserva el host `vercel.app`, probar el flujo en navegadores reales antes de considerar confiable la autenticación cross-site.

## 7. Pruebas de autenticación

Después de provisionar explícitamente la base y una cuenta demo controlada:

1. `GET /health` devuelve `200` y JSON `{"status":"ok","service":"profesionales-core"}` sin depender de PostgreSQL.
2. `GET /api/auth/me` sin cookie devuelve `401` JSON; una ruta API inexistente devuelve `404` JSON.
3. Login correcto devuelve `Set-Cookie` con `HttpOnly`, `Secure` en HTTPS y `SameSite` acorde al dominio; no aparece JWT en localStorage.
4. Con la cookie, `/api/auth/me` devuelve la identidad de la sesión. Logout revoca la sesión y borra la cookie con atributos compatibles; repetir `/api/auth/me` debe fallar con `401`.
5. Probar token expirado/revocado, credenciales inválidas, CORS desde el origen permitido y rechazo de un origen no incluido.
6. Confirmar preflight `OPTIONS` y el flujo con `credentials: include` en el navegador.

No usar las contraseñas de demo local ni exponer una cuenta administrativa conocida.

## 8. Pruebas de aislamiento entre organizaciones

Usar dos organizaciones y usuarios de prueba distintos dentro de la base demo, no datos reales:

- Usuario A puede operar dentro de organización A si su membresía está activa.
- A no puede leer, editar ni borrar datos de organización B cambiando `organizationId`/ruta; esperar `403` o el rechazo definido por la API.
- Membresía inactiva, organización suspendida, módulo no habilitado y rol organizacional insuficiente deben denegarse.
- Probar el acceso de administrador global de forma separada y documentar qué rutas permiten la excepción.
- Verificar con logs/respuestas que IDs, documentos, citas, expedientes y notificaciones de B no se filtran a A.

La base demo y las cuentas/organizaciones necesarias deben prepararse mediante un procedimiento de aprovisionamiento autorizado; no ejecutar los seeds locales como parte del despliegue.

## 9. Verificación de Socket.IO

- Probar CORS con origen permitido y no permitido usando polling y WebSocket upgrade cuando el camino de dominios lo permita.
- Un visitante puede establecer la conexión pública, pero no se une a salas privadas.
- Una sesión válida entra solo a `user_<su_id>` y `role_<su_rol>`; solicitudes para otro usuario o rol no agregan al socket a esa sala.
- Token inválido/revocado presentado en el handshake debe rechazar la conexión.
- Verificar recepción de eventos existentes `referral:sale_approved`, `referral:withdrawal_updated`, `admin:new_sale`, `admin:new_withdrawal` y `legal_notification` con identidades/roles correctos.
- Mantener una sola réplica durante la demo salvo que se agregue coordinación de scheduler y adapter Socket.IO compatible con múltiples instancias.

## 10. Rollback

1. Guardar el identificador/revisión de la imagen actualmente publicada y los valores de configuración (sin copiar secretos a tickets o repositorios).
2. Ante fallo de aplicación, volver manualmente a la imagen/revisión previa y comprobar `/health`, autenticación y logs.
3. Tratar el esquema como cambio independiente: las migraciones de Prisma no se revierten por volver atrás el contenedor. Mantener migraciones compatibles hacia atrás y respaldar PostgreSQL antes de aplicarlas.
4. Si una migración impide operar, detener escrituras y elegir entre una migración correctiva hacia delante o restauración aprobada del backup. Restaurar puede perder cambios posteriores a ese backup; no ejecutar rollback destructivo automáticamente.
5. No usar `db push --accept-data-loss` como recuperación.

## Acciones manuales pendientes en paneles

- Render/Railway: crear el servicio desde Dockerfile en la raíz, asignar dominio, confirmar HTTPS y `PORT`, añadir variables runtime secretas, configurar `/health`, decidir una sola réplica y montar volumen persistente si se usará almacenamiento local de Arquitectura.
- PostgreSQL del proveedor: crear base demo vacía, usuario exclusivo, TLS/red, backups y guardar su URL como `DATABASE_URL`; revisar migraciones y ejecutar `npm run db:migrate:deploy` manualmente solo después de aprobar el destino y el SQL.
- Vercel: confirmar Root Directory `apps/Profesores`, build `npm run build`, output `dist`; decidir dominio y proxy/API directa, configurar `VITE_API_BASE_URL` como variable de build y publicar manualmente cuando se autorice.
- DNS: configurar dominios frontend/API si se elige B same-site con dominio personalizado; verificar certificados HTTPS.
- Cuentas: aprobar y ejecutar por separado el aprovisionamiento seguro de roles, administrador y datos demo. No ejecutar el actual `provision:defaults` sin resolver primero su credencial predeterminada.

No se ha iniciado ninguno de estos pasos manuales.
