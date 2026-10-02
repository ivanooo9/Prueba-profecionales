# 19 - Variables de Entorno
**Proyecto:** Profesionales Ecuador V 2.0  
**Ubicación:** `.env` y `.env.example`

---

## 1. Diccionario Completo de Variables de Entorno

| Variable | Tipo | Obligatorio | Descripción / Valor por Defecto |
| :--- | :--- | :--- | :--- |
| `PORT` | Number | No | Puerto de escucha del servidor HTTP (Defecto: `3000`). |
| `NODE_ENV` | String | Sí | Entorno de ejecución (`development`, `production`, `test`). |
| `DATABASE_URL` | String | Sí | Cadena de conexión relacional PostgreSQL / SQLite (ej: `postgresql://user:pass@localhost:5432/profesionales_ecuador?schema=public`). |
| `JWT_SECRET` | String | Sí | Clave secreta criptográfica utilizada para firmar y verificar tokens de sesión JWT. |
| `REDIS_URL` | String | No | URL de conexión a la instancia de Redis Cache (ej: `redis://localhost:6379`). |
| `CLOUDINARY_CLOUD_NAME` | String | No | Nombre del Cloud en Cloudinary para subida de medios. |
| `CLOUDINARY_API_KEY` | String | No | Clave de API de Cloudinary. |
| `CLOUDINARY_API_SECRET` | String | No | Secreto de API de Cloudinary. |
| `RESEND_API_KEY` | String | No | Clave de API de Resend para correo electrónico transaccional. |
| `RESEND_FROM_EMAIL` | String | No | Dirección del remitente de correos (ej: `notificaciones@profesionales.ec`). |
| `PAYPHONE_TOKEN` | String | No | Token / API Key de PayPhone para procesamiento de cobros. |
| `PAYPHONE_STORE_ID` | String | No | Identificador de tienda (StoreId) registrado en PayPhone. |
| `SRI_ENVIRONMENT` | Number | No | Ambiente de pruebas (1) o producción (2) para comprobantes SRI. |
