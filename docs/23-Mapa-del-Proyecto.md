# 23 - Mapa Integral del Proyecto y Matriz de Relaciones
**Proyecto:** Profesionales Ecuador V 2.0  
**Ámbito:** Matriz de dependencias y mapa relacional entre archivos del monolito.

---

## 1. Mapa Relacional del Monolito Modular

```mermaid
graph TD
    subgraph ConfigLayer ["Configuración & Infraestructura"]
        ENV[".env"]
        SERVER["src/server.ts"]
        DB_SINGLETON["src/lib/db.ts"]
        REDIS["src/lib/cache/"]
    end

    subgraph DomainLayer ["Lógica de Dominio / Servicios"]
        CERT_SVC["src/services/certificate-eligibility.service.ts"]
        COMM_SVC["src/services/commission.service.ts"]
        SALE_SVC["src/services/referral-sale.service.ts"]
        WALL_SVC["src/services/referral-wallet.service.ts"]
    end

    subgraph IntegrationLayer ["Adaptadores Integraciones"]
        SRI["src/lib/sri/"]
        PAYPHONE["src/lib/payphone.ts"]
        CLOUDINARY["src/lib/cloudinary.ts"]
        EMAIL["src/lib/email.ts"]
    end

    subgraph RouteLayer ["Módulos de Rutas Express"]
        R_PUB["src/routes/public.routes.ts"]
        R_ADM["src/routes/admin.routes.ts"]
        R_PROF["src/routes/professional.routes.ts"]
        R_REF["src/routes/referral.routes.ts"]
        R_CRS["src/routes/course.routes.ts"]
        R_PAY["src/routes/payphone.routes.ts"]
    end

    subgraph ViewLayer ["Presentación EJS (views/)"]
        V_INDEX["views/index.ejs"]
        V_PROF["views/perfil.ejs"]
        V_EVENT["views/conversatorio-detalle.ejs"]
        V_DASH["views/dashboard-admin.ejs"]
    end

    SERVER --> DB_SINGLETON
    SERVER --> REDIS
    SERVER --> RouteLayer
    RouteLayer --> DomainLayer
    RouteLayer --> IntegrationLayer
    RouteLayer --> ViewLayer
    DomainLayer --> DB_SINGLETON
```

---

## 2. Matriz Principales Archivos vs Módulos Consumidores

| Archivo Fuente | Rol / Responsabilidad | Módulos Consumidores |
| :--- | :--- | :--- |
| `src/lib/db.ts` | Conexión Singleton Prisma Client | Todos los enrutadores y servicios |
| `src/lib/auth.ts` | Autenticación JWT y Bcrypt | `server.ts`, `public.routes.ts`, `middlewares.ts` |
| `src/lib/middlewares.ts` | RBAC (requireAdmin, requireProfessional) | `admin.routes.ts`, `professional.routes.ts` |
| `src/services/referral-wallet.service.ts` | Billetera y saldos de promotores | `referral.routes.ts`, `admin-referral.routes.ts` |
| `src/lib/sri/xml-generator.ts` | Generador XML de comprobantes SRI | `admin.routes.ts`, `professional.routes.ts` |
| `src/lib/payphone.ts` | Integración API Pasarela PayPhone | `payphone.routes.ts`, `public.routes.ts` |
