# 02 - Flujo General de Ejecución
**Proyecto:** Profesionales Ecuador V 2.0  
**Ámbito:** Ciclo de vida de peticiones HTTP, pipeline de middlewares y flujo cliente-servidor.

---

## 1. Ciclo de Vida de una Petición HTTP

Toda petición realizada al sistema pasa por una secuencia predefinida de procesamiento antes de emitir una respuesta.

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as Navegador / Usuario
    participant Helmet as Helmet / Security Header
    participant RateLimit as Rate Limiter
    participant CookieParser as Cookie Parser & Body
    participant AuthMW as Auth JWT Middleware
    participant SystemConfigMW as SystemConfig Middleware
    participant Router as Express Router (src/routes)
    participant Service as Service Layer / Prisma
    participant View as View Engine (EJS) / JSON

    Cliente->>Helmet: Petición HTTP GET/POST
    Helmet->>RateLimit: Encabezados de Seguridad
    RateLimit->>CookieParser: Evaluación de Rate Limit (/login, /api/auth/)
    CookieParser->>AuthMW: Parseo de Cookies y Body JSON/Form
    AuthMW->>AuthMW: Validación Token JWT (validateSessionToken)
    AuthMW->>SystemConfigMW: Inyección res.locals.user
    SystemConfigMW->>SystemConfigMW: Inyección res.locals.systemConfig (Redis Cached)
    SystemConfigMW->>Router: Petición Lista con Contexto
    Router->>Service: Invocación de Lógica de Negocio / Prisma ORM
    Service-->>Router: Datos Procesados
    alt Petición Web HTML
        Router->>View: Renderizado res.render("vista.ejs", data)
        View-->>Cliente: HTML + CSS + JS en línea
    else Petición API REST
        Router-->>Cliente: JSON res.json({ success: true, ... })
    end
```

---

## 2. Descripción Etapa por Etapa

### Etapa 1: Inserción de Encabezados de Seguridad (Helmet)
Express ejecuta `helmet({ contentSecurityPolicy: false })` para proteger contra ataques XSS, Clickjacking y MIME-sniffing, permitiendo la ejecución de scripts cliente necesarios en las plantillas EJS.

### Etapa 2: Control de Peticiones y Furia (Rate Limiting)
Rutas sensibles (`/login`, `/api/auth/`) pasan por `express-rate-limit`, restringiendo peticiones continuas (máximo 100 peticiones por ventana de 15 minutos por IP).

### Etapa 3: Autenticación y Contexto de Usuario (`src/server.ts`)
1. Se extrae el token JWT desde la cookie `token`.
2. Se ejecuta `validateSessionToken(token)` consultando las sesiones activas en la tabla `UserSession`.
3. Si la sesión es válida, se inyecta el objeto usuario en `req.user` y `res.locals.user`.
4. Si el usuario requiere configurar su perfil (`user.requireProfileSetup`), la petición es redirigida a `/profile-setup`.

### Etapa 4: Carga Global de Configuración del Sistema
El middleware inyecta `res.locals.systemConfig` consultando la base de datos a través de `cachedFetch(cacheKey.systemConfig.singleton(), ...)`, optimizando el rendimiento mediante caché en Redis.

### Etapa 5: Enrutamiento y Lógica
El enrutador (`public.routes.ts`, `admin.routes.ts`, `professional.routes.ts`, etc.) ejecuta las validaciones específicas, invoca a Prisma o a la capa de servicios (`src/services/`), y responde con la plantilla EJS compilada o una carga utilitaria JSON.
