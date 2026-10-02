# 24 - Matriz de Dependencias (package.json)
**Proyecto:** Profesionales Ecuador V 2.0  
**Ámbito:** Análisis de librerías y dependencias de producción y desarrollo.

---

## 1. Dependencias de Producción (`dependencies`)

| Paquete | Versión | Propósito / Uso en el Monolito |
| :--- | :--- | :--- |
| `@prisma/client` | `^6.19.3` | ORM de acceso tipado a la base de datos relacional. |
| `express` | `^4.21.2` | Framework de servidor web HTTP principal. |
| `ejs` | `^3.1.10` | Motor de renderizado de plantillas HTML del lado del servidor. |
| `jsonwebtoken` | `^9.0.3` | Firma y verificación de tokens de autenticación JWT. |
| `bcryptjs` | `^3.0.3` | Algoritmo de hashing seguro de contraseñas de usuarios. |
| `helmet` | `^8.2.0` | Inserción de encabezados de seguridad HTTP. |
| `express-rate-limit` | `^8.5.2` | Middleware de limitación de tasa de peticiones (Rate Limiting). |
| `cookie-parser` | `^1.4.7` | Parseo de cookies HTTP enviadas por el navegador. |
| `ec-sri-invoice-signer` | `^1.7.5` | Firma digital PKCS#12 (`.p12`) de comprobantes XML para el SRI Ecuador. |
| `pdfkit` | `^0.18.0` | Generación dinámica de documentos RIDE PDF de facturación y certificados. |
| `pdf-parse` | `^2.4.5` | Extracción y lectura de contenido en archivos PDF. |
| `puppeteer` | `^25.3.0` | Renderizado headless en servidor para exportación de certificados. |
| `cloudinary` | `^2.10.0` | SDK oficial para subida y procesamiento de imágenes en Cloudinary. |
| `redis` | `^4.7.1` | Cliente de almacenamiento en caché en memoria Redis. |
| `resend` | `^6.14.0` | SDK oficial para envío de correos electrónicos transaccionales. |
| `socket.io` | `^4.8.3` | Servidor WebSocket para notificaciones en tiempo real. |
| `dotenv` | `^16.4.5` | Carga de variables de entorno desde archivo `.env`. |

---

## 2. Dependencias de Desarrollo (`devDependencies`)

| Paquete | Versión | Propósito |
| :--- | :--- | :--- |
| `typescript` | `^5` | Lenguaje TypeScript y compilador `tsc`. |
| `tsx` | `^4.19.2` | Ejecutor en tiempo real de TypeScript para desarrollo (`tsx watch`). |
| `prisma` | `^6.19.3` | CLI de migración, generación de cliente y administración Prisma. |
| `@types/express` | `^5.0.0` | Tipos TypeScript para Express. |
| `@types/node` | `^20` | Tipos TypeScript para runtime Node.js v20. |
