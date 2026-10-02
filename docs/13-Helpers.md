# 13 - Helpers y Funciones Auxiliares
**Proyecto:** Profesionales Ecuador V 2.0  
**Ubicación:** `src/lib/slug.ts`, `src/lib/bank-accounts.ts` y `src/server.ts`

---

## 1. Mapeo de Helpers y Utilidades

### 1.1 Generador de Slugs SEO (`src/lib/slug.ts`)
* **`generateSlug(text: string): string`**: Transforma cadenas de texto complejas (ej. `"1er Conversatorio Nacional Multidisciplinario"`) en slugs limpios (`"1er-conversatorio-nacional-multidisciplinario"`), convirtiendo a minúsculas, eliminando diacríticos/acentos y sustituyendo caracteres especiales por guiones.
* **`getUniqueSlug(model, title, currentId)`**: Garantiza la unicidad del slug en la base de datos realizando consultas de existencia contra Prisma ORM y agregando un sufijo numérico si el slug ya existe.

### 1.2 Formateador TitleCase (`src/server.ts`)
* **`toTitleCase(str: string): string`**: Convierte nombres propios y títulos a formato de letra capital en cada palabra (ej. `"JUAN PEREZ"` -> `"Juan Perez"`).

### 1.3 Auxiliares de Cuentas Bancarias (`src/lib/bank-accounts.ts`)
* **`getActiveBankAccounts()`**: Recupera las cuentas bancarias institucionales activas en el sistema (`BankAccount.isActive === true`).
* **`formatBankAccountLabel(account)`**: Genera etiquetas legibles para formularios y transferencias (ej. `"Banco Pichincha - Ahorros: 2200123456"`).
