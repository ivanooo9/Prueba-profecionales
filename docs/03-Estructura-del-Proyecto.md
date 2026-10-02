# 03 - Estructura del Proyecto
**Proyecto:** Profesionales Ecuador V 2.0  
**Organización de Archivos y Responsabilidades del Monolito Modular**

---

## 1. Árbol Directoriado Principal

```
PROFESIONALES ECUADOR V 2.0/
├── docs/                        # Documentación técnica oficial del proyecto
├── prisma/                      # Esquema de base de datos relacional y migraciones
│   ├── migrations/              # Historial de migraciones SQL
│   ├── schema.prisma            # Modelos de entidad relacionales y configuraciones ORM
│   ├── seed.ts                  # Semilla inicial de datos para desarrollo/producción
│   └── seed-test-professional.ts# Semilla de profesionales de prueba
├── public/                      # Recursos estáticos servidos públicamente
│   ├── css/                     # Estilos CSS personalizados (custom-video-player.css)
│   ├── js/                      # Scripts ejecutables en navegador (custom-video-player.js)
│   └── img/                     # Favicons, imágenes fijas y assets gráficos
├── src/                         # Código fuente TypeScript (Backend & Lógica de Negocio)
│   ├── components/              # Definiciones o utilidades auxiliares
│   ├── lib/                     # Librerías de infraestructura, adaptadores e integraciones
│   │   ├── bootstrap/           # Lógica de arranque (creación automática de usuario admin)
│   │   ├── cache/               # Adaptador Redis y factoría de llaves de caché
│   │   ├── email/               # Plantillas e integración de envío de correo (Resend)
│   │   ├── sri/                 # Emisor y firmante XML de facturación electrónica SRI
│   │   ├── api.ts               # Cliente API genérico
│   │   ├── auth.ts              # Lógica de tokens JWT, cookies y hash Bcrypt
│   │   ├── bank-accounts.ts     # Gestión de cuentas bancarias institucionales
│   │   ├── cloudinary.ts        # Adaptador de subida de imágenes a Cloudinary
│   │   ├── db.ts                # Singleton del cliente Prisma (PrismaClient)
│   │   ├── email.ts             # Servicio simplificado de envío de correos
│   │   ├── middlewares.ts       # Middlewares de control de acceso basados en roles (RBAC)
│   │   ├── payphone.ts          # Integración de la pasarela de pagos PayPhone API
│   │   ├── referral-email.ts    # Envíos de correos para el programa de referidos
│   │   ├── slug.ts              # Generador y validador de slugs amigables para SEO
│   │   ├── socket.ts            # Servidor e integración WebSockets en tiempo real
│   │   └── video.ts             # Utilidades de renderizado y resolución de videos
│   ├── routes/                  # Capa de Enrutamiento (9 módulos de rutas Express)
│   │   ├── admin-referral.routes.ts   # Rutas de administración del programa de referidos
│   │   ├── admin.routes.ts            # Rutas del panel de administración central
│   │   ├── client.routes.ts           # Rutas del dashboard de cliente
│   │   ├── course.routes.ts           # Rutas de gestión de cursos y aulas virtuales
│   │   ├── payphone.routes.ts         # Endpoints de callbacks y cobros PayPhone
│   │   ├── professional.routes.ts     # Rutas del panel de profesional
│   │   ├── public.routes.ts           # Rutas públicas (inicio, directorio, login, conversatorios)
│   │   ├── referral.routes.ts         # Rutas de la billetera y panel del afiliado/referido
│   │   └── video.routes.ts            # Rutas de streaming y reproductor de video
│   ├── scripts/                 # Scripts utilitarios (backfill de slugs, mantenimiento)
│   ├── services/                # Servicios de Dominio / Lógica de Negocio Avanzada
│   │   ├── certificate-eligibility.service.ts # Lógica de elegibilidad para certificados de asistencia
│   │   ├── commission.service.ts              # Lógica de cálculo e imputación de comisiones
│   │   ├── referral-sale.service.ts           # Gestión de ventas con código de referido
│   │   └── referral-wallet.service.ts         # Lógica de billetera digital y saldo de referidos
│   ├── tests/                   # Pruebas automatizadas (sesiones, autenticación)
│   └── server.ts                # Punto de entrada principal (Express Server Setup)
├── views/                       # Capa de Presentación (37 plantillas EJS)
│   ├── partials/                # Parciales reutilizables (head, header, footer, modales)
│   └── *.ejs                    # Vistas completas de páginas y dashboards
├── .env                         # Variables de entorno locales
├── Dockerfile                   # Definición de contenedor Docker de producción
├── package.json                 # Manifest de dependencias npm y scripts del proyecto
└── tsconfig.json                # Configuración del compilador de TypeScript
```

---

## 2. Descripción de Módulos Fundamentales

* **`src/server.ts`**: Inicializa la aplicación Express, establece middlewares de seguridad (Helmet, Rate Limiter, CookieParser, BodyParsers), arranca Socket.IO y registra las 9 rutas del sistema.
* **`src/routes/`**: Divide la API y vistas navegables en módulos de negocio bien delimitados por rol y funcionalidad.
* **`src/services/`**: Encapsula la lógica compleja de cálculo de comisiones multinivel/referidos, elegibilidad de certificación de eventos, y transacciones de billetera.
* **`views/`**: Renderiza las interfaces del usuario para clientes, profesionales, referidos y administradores usando EJS y Tailwind CSS.
