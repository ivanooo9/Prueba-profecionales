# 04 - Arquitectura del Backend
**Proyecto:** Profesionales Ecuador V 2.0  
**Tecnología Principal:** Node.js, Express.js v4, TypeScript v5

---

## 1. Servidor Principal (`src/server.ts`)

El archivo `src/server.ts` es el núcleo de inicialización del backend monolítico. Configura el servidor HTTP, el servidor WebSocket con Socket.IO y registra la secuencia de middlewares globales.

```typescript
// Estructura simplificada del flujo de arranque en src/server.ts
import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Seguridad Helmet
app.use(helmet({ contentSecurityPolicy: false }));

// Middlewares de parseo de cuerpo de petición
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../public")));

// Motor de vistas EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

// Registro de Middleware de Autenticación de Sesión JWT
app.use(async (req, res, next) => { ... });

// Registro de Rutas
app.use("/", publicRoutes);
app.use("/admin", adminRoutes);
app.use("/admin/referrals", adminReferralRoutes);
app.use("/professional", professionalRoutes);
app.use("/client", clientRoutes);
app.use("/referral", referralRoutes);
app.use("/courses", courseRoutes);
app.use("/videos", videoRoutes);
app.use("/payphone", payphoneRoutes);
```

---

## 2. Compilación y Entorno Runtime

* **Desarrollo:** `npm run dev` utiliza `tsx watch src/server.ts`, ofreciendo hot-reloading directo sobre TypeScript sin necesidad de compilación intermedia previa.
* **Producción:** `npm run build` invoca `prisma generate && tsc`, transpilando el código TypeScript de `src/` al directorio `dist/` en JavaScript nativo ES2022. La ejecución se realiza mediante `npm start` (`tsx src/server.ts`) o `node dist/server.js`.
* **Manejo de Errores Runtime:** Captura global de excepciones no controladas mediante bloques `try/catch` en controladores y middlewares de respuesta con páginas de error personalizadas (`views/preview-error.ejs`).
