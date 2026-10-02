# 22 - Procesos Automáticos y Tareas de Background
**Proyecto:** Profesionales Ecuador V 2.0  
**Ámbito:** Bootstrap de inicio, expiración de sesiones y mantenimiento de caché.

---

## 1. Mapeo de Procesos de Fondo y Bootstrap

### 1.1 Bootstrap de Administrador por Defecto (`src/lib/bootstrap/ensure-default-admin.ts`)
* **Momento de Ejecución:** Al arrancar el servidor HTTP Express en `src/server.ts`.
* **Comportamiento:**
  1. Verifica la existencia de un usuario con rol `ADMIN` en la base de datos.
  2. Si no existe ningún usuario administrador, crea automáticamente el rol `ADMIN` y el usuario admin principal utilizando la contraseña configurada en `SystemConfig` o variables de entorno, garantizando el acceso inicial a la plataforma.

### 1.2 Limpieza y Expiración de Sesiones (`src/lib/auth.ts`)
* **Comportamiento:** Las consultas a `UserSession` evalúan dinámicamente si `expiresAt < new Date()` o `revokedAt !== null`. Las sesiones caducadas son ignoradas por el middleware de autenticación y pueden ser purgadas mediante scripts de mantenimiento.

### 1.3 Invalidation and Cache Freshness (`src/lib/cache/`)
* **Comportamiento:** Cuando un administrador actualiza los datos del sistema (`POST /admin/config`) o se crean profesiones, se ejecuta la eliminación de la clave correspondiente en Redis (`redisClient.del(cacheKey)`), forzando a que la siguiente petición lea los datos frescos desde la base de datos relacional.
