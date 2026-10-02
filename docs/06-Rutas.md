# 06 - Catálogo de Rutas y Endpoints HTTP
**Proyecto:** Profesionales Ecuador V 2.0  
**Módulos de Enrutamiento:** 9 Enrutadores Express en `src/routes/`

---

## 1. Módulo Público (`src/routes/public.routes.ts`)

| Método | Endpoint | Middleware | Descripción / Vista |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Público | Página principal / Home (`index.ejs`) |
| `GET` | `/login` | Público | Vista de inicio de sesión (`login.ejs`) |
| `POST` | `/login` | RateLimiter | Procesa autenticación de usuarios |
| `GET` | `/logout` | Sesión Activa | Destruye cookie JWT y revoca sesión |
| `GET` | `/directorio` | Público | Directorio público de profesionales (`directorio.ejs`) |
| `GET` | `/directorio/:slug` | Público | Perfil público de profesional (redirección slug amigable) |
| `GET` | `/conversatorios` | Público | Lista de eventos y conversatorios (`eventos.ejs`) |
| `GET` | `/conversatorios/:idOrSlug` | Público | Detalle de conversatorio (`conversatorio-detalle.ejs`) |
| `GET` | `/conversatorios/:convParam/ponentes/:spkParam` | Público | Detalle de ponente y tema (`ponente-detalle.ejs`) |
| `GET` | `/conversatorios/:convParam/ponentes/:spkParam/ponencia` | Público | Transmisión/video de ponencia (`ponencia-video.ejs`) |
| `POST` | `/conversatorios/:id/completar-ponencia` | Requiere Auth | Registra asistencia a ponencia e incrementa progreso |

---

## 2. Módulo de Administración (`src/routes/admin.routes.ts`)

| Método | Endpoint | Middleware | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin` | `requireAdmin` | Dashboard central de administración (`dashboard-admin.ejs`) |
| `POST` | `/admin/config` | `requireAdmin` | Actualiza SystemConfig global (colores, logotipos, etc.) |
| `GET` | `/admin/users` | `requireAdmin` | Lista de usuarios registrados |
| `POST` | `/admin/payment-requests/:id/approve` | `requireAdmin` | Aprueba solicitud de pago/transferencia bancaria |
| `POST` | `/admin/payment-requests/:id/reject` | `requireAdmin` | Rechaza solicitud de pago |
| `POST` | `/admin/invoices/issue` | `requireAdmin` | Genera y firma factura electrónica SRI |

---

## 3. Módulo de Profesionales (`src/routes/professional.routes.ts`)

| Método | Endpoint | Middleware | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/professional` | `requireProfessional` | Panel de control profesional (`dashboard-profesional.ejs`) |
| `POST` | `/professional/profile` | `requireProfessional` | Actualiza información del perfil (slogan, foto, banner) |
| `POST` | `/professional/products` | `requireProfessional` | Crea o edita servicios/productos ofertados |
| `GET` | `/professional/invoices` | `requireProfessional` | Historial de facturas electrónicas emitidas |

---

## 4. Módulo de Programa de Referidos / Afiliados (`src/routes/referral.routes.ts`)

| Método | Endpoint | Middleware | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/referral` | Requiere Auth | Dashboard de afiliado/referido (`dashboard-referido.ejs`) |
| `GET` | `/referral/wallet` | Requiere Auth | Billetera digital y historial de comisiones (`referido-billetera.ejs`) |
| `POST` | `/referral/withdraw` | Requiere Auth | Solicitud de retiro de fondos acumulados |

---

## 5. Módulo de Cursos y Aula Virtual (`src/routes/course.routes.ts`)

| Método | Endpoint | Middleware | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/courses` | Público | Catálogo de cursos disponibles (`cursos.ejs`) |
| `GET` | `/courses/:slug` | Público | Detalle informativo del curso (`curso-detalle.ejs`) |
| `GET` | `/courses/:slug/aula` | Requiere Enrolamiento | Aula virtual del estudiante (`curso-aula.ejs`) |

---

## 6. Módulo de Pagos PayPhone (`src/routes/payphone.routes.ts`)

| Método | Endpoint | Middleware | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/payphone/prepare` | Requiere Auth | Inicia transacción PayPhone y devuelve URL de pago |
| `POST` | `/payphone/confirm` | Callback / Webhook | Confirma pago PayPhone y activa membresía/certificado |
