# 14 - Utilidades de Infraestructura y Servicios Externos
**Proyecto:** Profesionales Ecuador V 2.0  
**Ubicación:** `src/lib/cache/`, `src/lib/cloudinary.ts`, `src/lib/email.ts`

---

## 1. Adaptadores e Integraciones de Infraestructura

### 1.1 Adaptador Redis y Caché (`src/lib/cache/`)
* **`cachedFetch<T>(key: string, fetchFn: () => Promise<T>, ttlSeconds?: number): Promise<T>`**:
  Patrón de lectura transparente Cache-Aside. Intenta recuperar la clave desde la instancia de Redis (`redisClient.get(key)`). Si existe, la parsea y retorna en milisegundos. Si no existe en Redis o la conexión falla, ejecuta la función de consulta a la base de datos `fetchFn()`, guarda el resultado en Redis con el tiempo de vida (TTL) indicado, y retorna los datos sin interrumpir el flujo del usuario.
* **`cacheKeyFactory`**: Genera claves estandarizadas e inmutables para el almacenamiento en Redis (`systemConfig:singleton`, `profession:all`, `conversatorio:detail:${id}`).

### 1.2 Adaptador Cloudinary (`src/lib/cloudinary.ts`)
* **`uploadBase64ToCloudinary(base64Data, folder)`**: Convierte cadenas de imagen en codificación Base64 (fotografías de perfil, banners, comprobantes de pago) y las carga directamente a la cuenta corporativa de Cloudinary, retornando la URL segura `https://res.cloudinary.com/...` y el `public_id`.

### 1.3 Adaptador de Correos Resend (`src/lib/email.ts` y `src/lib/referral-email.ts`)
* **`emailService.sendEmail({ to, subject, html })`**: Envía correos electrónicos transaccionales (confirmación de registro, restablecimiento de contraseña, emisión de factura SRI, notificación de comisión ganada) utilizando la API REST de Resend.
