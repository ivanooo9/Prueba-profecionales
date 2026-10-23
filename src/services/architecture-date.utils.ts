/**
 * Utilidades centralizadas para fechas y horas en el módulo de Arquitectura.
 * Distingue explícitamente entre:
 * 1. Fecha de calendario (Date-only: "YYYY-MM-DD")
 * 2. Instante temporal / Timestamp con hora ("YYYY-MM-DDTHH:mm:ss.sssZ" o Date)
 * 3. Intervalos semiabiertos [start, nextDayStart) para filtros de calendario
 */

/**
 * Valida si un string corresponde exactamente al formato YYYY-MM-DD y es una fecha válida en el calendario.
 */
export function isValidDateOnlyString(dateStr: string): boolean {
  if (typeof dateStr !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Validar límites por mes y años bisiestos
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth;
}

/**
 * Valida y normaliza un string de hora en formato HH:mm (24h).
 */
export function normalizeTimeString(timeStr?: string): string {
  if (!timeStr || typeof timeStr !== "string") return "10:00";
  const trimmed = timeStr.trim();
  const match = /^([01]?\d|2[0-3]):([0-5]\d)/.exec(trimmed);
  if (!match) return "10:00";
  const hours = match[1].padStart(2, "0");
  const minutes = match[2];
  return `${hours}:${minutes}`;
}

/**
 * Convierte una fecha de calendario o Date al inicio de ese día UTC (00:00:00.000Z).
 */
export function getStartOfDayUTC(dateInput: string | Date): Date {
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) throw new Error("Fecha inválida.");
    return dateInput;
  }

  const str = String(dateInput).trim();
  if (isValidDateOnlyString(str)) {
    return new Date(`${str}T00:00:00.000Z`);
  }

  const parsed = new Date(str);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Formato de fecha de inicio inválido: "${dateInput}".`);
  }
  return parsed;
}

/**
 * Obtiene el inicio del día siguiente (00:00:00.000Z) para usar en intervalos semiabiertos:
 * [gte: getStartOfDayUTC(start), lt: getNextDayStartUTC(end)]
 * Ejemplo: Para endDate = "2026-10-31", retorna "2026-11-01T00:00:00.000Z".
 */
export function getNextDayStartUTC(dateInput: string | Date): Date {
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) throw new Error("Fecha inválida.");
    // Añadir 1 día exacto
    return new Date(dateInput.getTime() + 24 * 60 * 60 * 1000);
  }

  const str = String(dateInput).trim();
  if (isValidDateOnlyString(str)) {
    const [y, m, d] = str.split("-").map((num) => parseInt(num, 10));
    // Date.UTC con día + 1 avanza de mes/año de forma segura y exacta
    return new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0, 0));
  }

  const parsed = new Date(str);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Formato de fecha de fin inválido: "${dateInput}".`);
  }
  return new Date(parsed.getTime() + 24 * 60 * 60 * 1000);
}

/**
 * Normaliza y construye la fecha y hora de una reunión (ArchitectureMeeting).
 * Garantiza que date ("YYYY-MM-DD") y time ("HH:mm") se almacenen de forma determinista y sin drift.
 */
export function parseMeetingDateTime(
  date?: string | Date,
  time?: string,
  scheduledAt?: string | Date
): Date {
  if (scheduledAt !== undefined && scheduledAt !== null && scheduledAt !== "") {
    if (scheduledAt instanceof Date) {
      if (isNaN(scheduledAt.getTime())) {
        throw new Error("Formato de fecha u hora de reunión inválido.");
      }
      return scheduledAt;
    }

    const str = String(scheduledAt).trim();
    if (isValidDateOnlyString(str)) {
      const timeStr = normalizeTimeString(time);
      return new Date(`${str}T${timeStr}:00.000Z`);
    }

    // Si viene como formato ISO completo o simplificado
    const parsed = new Date(str);
    if (isNaN(parsed.getTime())) {
      throw new Error("Formato de fecha u hora de reunión inválido.");
    }
    return parsed;
  }

  if (date !== undefined && date !== null && date !== "") {
    let dateStr = "";
    if (date instanceof Date) {
      if (isNaN(date.getTime())) throw new Error("Formato de fecha inválido.");
      dateStr = date.toISOString().slice(0, 10);
    } else {
      dateStr = String(date).trim().slice(0, 10);
    }

    if (!isValidDateOnlyString(dateStr)) {
      throw new Error("Formato de fecha inválido. Se espera YYYY-MM-DD.");
    }

    const timeStr = normalizeTimeString(time);
    const combined = new Date(`${dateStr}T${timeStr}:00.000Z`);
    if (isNaN(combined.getTime())) {
      throw new Error("Formato de fecha u hora de reunión inválido.");
    }
    return combined;
  }

  throw new Error("La fecha y hora de la reunión son obligatorias.");
}

/**
 * Formatea un Date a string de calendario "YYYY-MM-DD".
 */
export function formatDateOnly(d: Date | string | null | undefined): string {
  if (!d) return "";
  if (typeof d === "string") {
    if (isValidDateOnlyString(d)) return d;
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    return "";
  }
  if (d instanceof Date && !isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return "";
}

/**
 * Formatea un Date a string de hora "HH:mm".
 */
export function formatTimeOnly(d: Date | string | null | undefined): string {
  if (!d) return "";
  if (typeof d === "string") {
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(11, 16);
    return "";
  }
  if (d instanceof Date && !isNaN(d.getTime())) {
    return d.toISOString().slice(11, 16);
  }
  return "";
}
