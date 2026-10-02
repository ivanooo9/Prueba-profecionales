# Documentación Técnica Oficial: Profesionales Ecuador V 2.0
**Arquitectura de Software:** Monolito Modular (Modular Monolith)  
**Entorno Runtime:** Node.js / Express / TypeScript / EJS / Prisma ORM / PostgreSQL-SQLite / Redis / Socket.IO  
**Fecha de Emisión:** 26 de Julio, 2026  
**Estado:** Documentación Definitiva de Sistema

---

## 1. Visión General del Proyecto

**Profesionales Ecuador V 2.0** es una plataforma web integral que opera bajo una arquitectura de **Monolito Modular**. Proporciona servicios SaaS de directorio profesional, agenda de citas, educación continua (cursos, ponencias y conversatorios con certificación), sistema de afiliados/referidos con comisiones y billetera digital, emisor de facturación electrónica con firma XML autorizada por el SRI (Servicio de Rentas Internas de Ecuador), y procesamiento de pagos con PayPhone.

### Principios Arquitectónicos
* **Unidad de Despliegue Única:** Todo el código fuente del sistema reside en un único repositorio y ejecuta en una sola instancia de servidor Node.js/Express.
* **Persistencia Compartida:** Acceso unificado a la base de datos relacional a través del ORM Prisma Client.
* **Seguridad Centralizada:** Autenticación por JSON Web Tokens (JWT) almacenados en cookies HTTP-only con control de acceso basado en roles (RBAC).

---

## 2. Mapa Completo de Documentos (/docs)

| N° | Documento | Descripción / Ámbito |
| :--- | :--- | :--- |
| 01 | [01-Arquitectura-General.md](file:///c:/Users/Usuario%20iTC/Documents/PROYECTOS%202026/PROFESIONALES%20ECUADOR%20V%202.0/docs/01-Arquitectura-General.md) | Principios de Monolito Modular, capas, fronteras y runtime |
| 02 | [02-Flujo-General.md](file:///c:/Users/Usuario%20iTC/Documents/PROYECTOS%202026/PROFESIONALES%20ECUADOR%20V%202.0/docs/02-Flujo-General.md) | Ciclo de vida completo de solicitudes HTTP y middleware pipeline |
| 03 | [03-Estructura-del-Proyecto.md](file:///c:/Users/Usuario%20iTC/Documents/PROYECTOS%202026/PROFESIONALES%20ECUADOR%20V%202.0/docs/03-Estructura-del-Proyecto.md) | Desglose jerárquico de carpetas, responsabilidades y módulos |
| 04 | [04-Backend.md](file:///c:/Users/Usuario%20iTC/Documents/PROYECTOS%202026/PROFESIONALES%20ECUADOR%20V%202.0/docs/04-Backend.md) | Servidor Express (`server.ts`), configuración TypeScript y Bootstrap |
| 05 | [05-Frontend.md](file:///c:/Users/Usuario%20iTC/Documents/PROYECTOS%202026/PROFESIONALES%20ECUADOR%20V%202.0/docs/05-Frontend.md) | Arquitectura EJS, Tailwind CSS CDN, interactividad JS cliente |
| 06 | [06-Rutas.md](file:///c:/Users/Usuario%20iTC/Documents/PROYECTOS%202026/PROFESIONALES%20ECUADOR%20V%202.0/docs/06-Rutas.md) | Catálogo completo de endpoints HTTP REST y renderizados |
| 07 | [07-Controladores.md](file:///c:/Users/Usuario%20iTC/Documents/PROYECTOS%202026/PROFESIONALES%20ECUADOR%20V%202.0/docs/07-Controladores.md) | Handlers de peticiones HTTP, validaciones y respuestas |
| 08 | [08-Servicios.md](file:///c:/Users/Usuario%20iTC/Documents/PROYECTOS%202026/PROFESIONALES%20ECUADOR%20V%202.0/docs/08-Servicios.md) | Servicios de lógica de negocio (Certificados, Billetera, Referidos) |
| 09 | [09-Modelos.md](file:///c:/Users/Usuario%20iTC/Documents/PROYECTOS%202026/PROFESIONALES%20ECUADOR%20V%202.0/docs/09-Modelos.md) | Modelos Prisma, campos, relaciones, restricciones e índices |
| 10 | [10-Componentes.md](file:///c:/Users/Usuario%20iTC/Documents/PROYECTOS%202026/PROFESIONALES%20ECUADOR%20V%202.0/docs/10-Componentes.md) | Vistas EJS principales, layouts y parciales reutilizables |
| 11 | [11-Hooks.md](file:///c:/Users/Usuario%20iTC/Documents/PROYECTOS%202026/PROFESIONALES%20ECUADOR%20V%202.0/docs/11-Hooks.md) | Eventos en tiempo real mediante Socket.IO y listeners |
| 12 | [12-Middlewares.md](file:///c:/Users/Usuario%20iTC/Documents/PROYECTOS%202026/PROFESIONALES%20ECUADOR%20V%202.0/docs/12-Middlewares.md) | Middlewares de autenticación, autorización y rate limiting |
| 13 | [13-Helpers.md](file:///c:/Users/Usuario%20iTC/Documents/PROYECTOS%202026/PROFESIONALES%20ECUADOR%20V%202.0/docs/13-Helpers.md) | Utilidades de formateo, generador de Slugs, toTitleCase |
| 14 | [14-Utilidades.md](file:///c:/Users/Usuario%20iTC/Documents/PROYECTOS%202026/PROFESIONALES%20ECUADOR%20V%202.0/docs/14-Utilidades.md) | Clientes Redis, Cloudinary, Resend Email y WebSocket |
| 15 | [15-Base-de-Datos.md](file:///c:/Users/Usuario%20iTC/Documents/PROYECTOS%202026/PROFESIONALES%20ECUADOR%20V%202.0/docs/15-Base-de-Datos.md) | Motor relacional, migraciones Prisma, conexión unificada |
| 16 | [16-Autenticacion.md](file:///c:/Users/Usuario%20iTC/Documents/PROYECTOS%202026/PROFESIONALES%20ECUADOR%20V%202.0/docs/16-Autenticacion.md) | Flujo JWT, almacenamiento de hash Bcrypt y cookies de sesión |
| 17 | [17-Permisos.md](file:///c:/Users/Usuario%20iTC/Documents/PROYECTOS%202026/PROFESIONALES%20ECUADOR%20V%202.0/docs/17-Permisos.md) | Sistema RBAC (ADMIN, PROFESSIONAL, CLIENT, REFERRAL) |
| 18 | [18-Configuraciones.md](file:///c:/Users/Usuario%20iTC/Documents/PROYECTOS%202026/PROFESIONALES%20ECUADOR%20V%202.0/docs/18-Configuraciones.md) | SystemConfig persistente en base de datos, Helmet y Express |
| 19 | [19-Variables-Entorno.md](file:///c:/Users/Usuario%20iTC/Documents/PROYECTOS%202026/PROFESIONALES%20ECUADOR%20V%202.0/docs/19-Variables-Entorno.md) | Diccionario exhaustivo de variables de entorno (.env) |
| 20 | [20-Integraciones.md](file:///c:/Users/Usuario%20iTC/Documents/PROYECTOS%202026/PROFESIONALES%20ECUADOR%20V%202.0/docs/20-Integraciones.md) | Pasarela PayPhone, Firma Electrónica SRI, Cloudinary |
| 21 | [21-Flujos-de-Negocio.md](file:///c:/Users/Usuario%20iTC/Documents/PROYECTOS%202026/PROFESIONALES%20ECUADOR%20V%202.0/docs/21-Flujos-de-Negocio.md) | Casos de uso end-to-end (Certificados, Referidos, Facturación) |
| 22 | [22-Procesos-Automaticos.md](file:///c:/Users/Usuario%20iTC/Documents/PROYECTOS%202026/PROFESIONALES%20ECUADOR%20V%202.0/docs/22-Procesos-Automaticos.md) | Bootstrap, verificación de suscripciones, invalidador de caché |
| 23 | [23-Mapa-del-Proyecto.md](file:///c:/Users/Usuario%20iTC/Documents/PROYECTOS%202026/PROFESIONALES%20ECUADOR%20V%202.0/docs/23-Mapa-del-Proyecto.md) | Matriz completa de dependencias y mapa jerárquico de archivos |
| 24 | [24-Dependencias.md](file:///c:/Users/Usuario%20iTC/Documents/PROYECTOS%202026/PROFESIONALES%20ECUADOR%20V%202.0/docs/24-Dependencias.md) | Análisis de paquetes npm `dependencies` y `devDependencies` |
| 25 | [25-Analisis-Tecnico.md](file:///c:/Users/Usuario%20iTC/Documents/PROYECTOS%202026/PROFESIONALES%20ECUADOR%20V%202.0/docs/25-Analisis-Tecnico.md) | Diagnóstico técnico, deuda técnica, fortalezas y recomendaciones |

---

## 3. Reglas de Gobernanza para Mantener la Documentación Sincronizada

1. **Obligatoriedad de Documentación:** Todo cambio introducido en código fuente o base de datos en el futuro debe actualizar inmediatamente el documento correspondiente en `/docs`.
2. **Sin Fragmentación:** No deben crearse archivos de documentación fuera de la carpeta `/docs`.
3. **Trazabilidad:** Cada archivo documentado debe incluir su ruta completa dentro del repositorio (`src/...`, `views/...`).
