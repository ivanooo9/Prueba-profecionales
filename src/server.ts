import express, { Request, Response, NextFunction } from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import path from "path";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { db } from "./lib/db";
import { validateSessionToken } from "./lib/auth";
import { setupSocketIO } from "./lib/socket";
import { ensureDefaultAdminOnStartup } from "./lib/bootstrap/ensure-default-admin";
import { cachedFetch, cacheKeyFactory as cacheKey, closeRedis } from "./lib/cache";
import { LegalReminderProcessorService } from "./services/legal-reminder-processor.service";

// Load environment variables
dotenv.config();

import { toTitleCase } from "./lib/utils";
export { toTitleCase };

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Helmet Security Headers Configuration
// We maintain Helmet's protections against MIME-sniffing, Clickjacking, and Referrer leakage while keeping EJS inline script compatibility.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xFrameOptions: { action: "sameorigin" }
  })
);

// 2. Request Body Limit (50MB to support large base64-encoded images in forms)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../public")));

// 3. Brute Force Protection (Rate Limiting)
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: "Demasiadas peticiones desde esta IP. Por favor intente de nuevo en 15 minutos."
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false // Disable the `X-RateLimit-*` headers
});

// Apply rate limiter specifically to authentication endpoints
app.use("/login", authRateLimiter);
app.use("/api/auth/", authRateLimiter);

// Express configurations
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

// 4. JWT Auth Middleware
app.use(async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.token;
  res.locals.user = null;
  (req as any).user = null;
  res.locals.isImpersonating = req.cookies.is_impersonating === "true";
  res.locals.impersonatorAdminName = req.cookies.impersonator_admin_name || "Administrador";

  if (token) {
    try {
      const user = await validateSessionToken(token);

      if (user) {
        (req as any).user = user;
        res.locals.user = user;

        if (
          user.requireProfileSetup &&
          req.path !== "/profile-setup" &&
          req.path !== "/logout" &&
          !req.path.startsWith("/api/") &&
          !req.path.includes(".")
        ) {
          return res.redirect("/profile-setup");
        }
      }
    } catch (error) {
      console.error("Error in auth middleware:", error);
    }
  }
  next();
});

// 5. Global System Config Middleware
  app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const systemConfig = await cachedFetch(cacheKey.systemConfig.singleton(), async () => {
      let config = await db.systemConfig.findFirst();
      if (!config) {
        config = await db.systemConfig.create({
          data: {
            id: 1,
            adminPassword: "admin1234",
            adminWhatsapp: "593999999999",
            bankAccounts: "Banco Pichincha - Ahorros: 2200123456 (Beneficiario: Profesionales Ecuador)\nBanco Guayaquil - Corriente: 10293847 (Beneficiario: Profesionales Ecuador)",
            defaultBalance: 5.0,
            systemName: "Profesionales Ecuador",
            loginTitle: "Profesionales Ecuador / LATAM",
            loginSubtitle: "El directorio profesional más grande de Ecuador y Latinoamérica.",
            primaryColor: "#0A3C84",
            secondaryColor: "#0a66c2",
            fontFamily: "Outfit",
            headingFontFamily: "Outfit"
          }
        });
      }
      return config;
    });
    res.locals.systemConfig = systemConfig;
  } catch (error) {
    console.error("Error loading global systemConfig:", error);
    res.locals.systemConfig = {
      systemName: "Profesionales Ecuador",
      primaryColor: "#0A3C84",
      secondaryColor: "#0a66c2",
      fontFamily: "Outfit",
      headingFontFamily: "Outfit"
    };
  }

  // Fetch FAQs for the footer dynamically
  let footerFaqs = {
    prof: [
      { q: "¿Qué es Profesionales.ec?", a: "Es una plataforma digital diseñada para conectar profesionales de diversas áreas con potenciales clientes y empresas en todo el Ecuador." },
      { q: "¿Registro?", a: "Puedes registrarte haciendo clic en el botón 'Registrarse' en la parte superior derecha, completando tu perfil y subiendo tus datos de contacto." },
      { q: "¿Costo?", a: "El registro básico de perfil es gratuito. También ofrecemos planes premium y servicios adicionales de visibilidad y agendamiento de citas." }
    ],
    eventos: [
      { q: "¿Conversatorios?", a: "Son conferencias y charlas científicas dictadas por profesionales expertos para capacitar y compartir conocimiento de alta calidad." },
      { q: "¿Inscripción?", a: "Busca el conversatorio en la sección de Educación, selecciona 'Inscribirse' y realiza el pago con tarjeta o transferencia bancaria." },
      { q: "¿Certificado?", a: "Sí, todos nuestros conversatorios y cursos otorgan un certificado de participación con código QR de verificación único." }
    ]
  };
  
  try {
    const faqPage = await cachedFetch(cacheKey.editablePage.bySlug("faq"), () =>
      db.editablePage.findUnique({ where: { slug: "faq" } })
    );
    if (faqPage && faqPage.contenido) {
      const parsed = JSON.parse(faqPage.contenido);
      if (parsed.prof && parsed.eventos) {
        footerFaqs = parsed;
      }
    }
  } catch (e) {
    // Keep default
  }
  res.locals.footerFaqs = footerFaqs;

  next();
});

// 6. Router Registration
import publicRouter from "./routes/public.routes";
import clientRouter from "./routes/client.routes";
import professionalRouter from "./routes/professional.routes";
import adminRouter, { ensureDefaultCarousels, ensureDefaultTemplates } from "./routes/admin.routes";
import courseRouter from "./routes/course.routes";
import payphoneRouter from "./routes/payphone.routes";
import videoRouter from "./routes/video.routes";
import bunnyRouter from "./routes/bunny.routes";
import studentRouter from "./routes/student.routes";
import { referralRouter } from "./routes/referral.routes";
import { adminReferralRouter } from "./routes/admin-referral.routes";
import professionalIdRouter from "./routes/professional-id.routes";
import organizationRouter from "./routes/organization.routes";
import professionalModuleRouter from "./routes/professional-module.routes";
import medicineRouter from "./routes/medicine.routes";
import dentistryRouter from "./routes/dentistry.routes";
import legalRouter from "./routes/legal.routes";
import architectureRouter from "./routes/architecture.routes";
import { academicRouter } from "./routes/academic.routes";

app.use(publicRouter);
app.use(clientRouter);
app.use(professionalRouter);
app.use(adminRouter);
app.use(courseRouter);
app.use(payphoneRouter);
app.use(videoRouter);
app.use(bunnyRouter);
app.use(adminReferralRouter);
app.use(referralRouter);
app.use(professionalIdRouter);
app.use(organizationRouter);
app.use(professionalModuleRouter);
app.use(medicineRouter);
app.use(dentistryRouter);
app.use(legalRouter);
app.use(architectureRouter);
app.use(academicRouter);
app.use("/student", studentRouter);

// 7. Error Handling Middleware (Prevents server from crashing under unhandled route runtime errors)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled server exception:", err);
  res.status(500).render("pagina-cms", {
    title: "Error 500",
    activePage: "error",
    page: {
      titulo: "Error Interno del Servidor (500)",
      contenido: `<div class="p-6 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl text-center flex flex-col items-center gap-4">
                    <i class="fa-solid fa-circle-exclamation text-3xl text-rose-500"></i>
                    <p class="font-extrabold text-sm">Ha ocurrido un problema inesperado en el servidor.</p>
                    <p class="text-xs text-slate-500">${err?.message || 'Error desconocido'}</p>
                    <a href="/" class="mt-2 text-xs bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-6 rounded-full transition">Volver al Inicio</a>
                  </div>`,
      updatedAt: new Date()
    }
  });
});

// Create HTTP Server for Socket.io
const server = http.createServer(app);
const io = new SocketIOServer(server);

// Share io with Express routers
app.set("io", io);

// Setup targeted socket rooms and session authentication
setupSocketIO(io);

let reminderInterval: NodeJS.Timeout | null = null;

async function startServer() {
  try {
    await ensureDefaultAdminOnStartup();
  } catch (error) {
    console.error("Error ensuring default admin on startup:", error);
    process.exit(1);
  }

  server.listen(PORT, async () => {
    console.log(`[Monolith Server] running securely in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
    try {
      await ensureDefaultCarousels();
      await ensureDefaultTemplates();
    } catch (error) {
      console.error("Error seeding default data on startup:", error);
    }

    // Intervalo ligero in-process para materializar recordatorios vencidos
    if (process.env.NODE_ENV !== "test") {
      reminderInterval = setInterval(async () => {
        try {
          await LegalReminderProcessorService.processDueLegalReminders(new Date(), undefined, io);
        } catch (err) {
          console.error("[LegalReminderProcessor] Error en verificación de recordatorios:", err);
        }
      }, 60000);
    }
  });
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  console.log(`[Monolith Server] received ${signal}, shutting down...`);
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
  }
  try {
    await closeRedis();
  } catch (error) {
    console.warn("Error closing Redis during shutdown:", error);
  }

  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

void startServer();
