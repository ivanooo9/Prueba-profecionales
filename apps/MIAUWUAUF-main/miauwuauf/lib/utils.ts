import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | number | undefined | null): string {
  if (date === undefined || date === null || date === "") return "—";

  if (typeof date === "string") {
    const trimmed = date.trim();
    const yMd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (yMd) {
      // Evita desfase por zona horaria en fechas "solo día".
      return `${yMd[3]}/${yMd[2]}/${yMd[1]}`;
    }
    const dmY = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
    if (dmY) {
      return `${dmY[1].padStart(2, "0")}/${dmY[2].padStart(2, "0")}/${dmY[3]}`;
    }
  }

  const d = new Date(date as string | Date | number);
  
  // If native parsing fails, return the original string if available
  if (isNaN(d.getTime())) {
    return typeof date === 'string' ? date : "—";
  }

  // DD/MM/YYYY (es-ES)
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** DD/MM/YYYY HH:MM (24h) */
export function formatDateTime(date: string | Date | number | undefined | null): string {
  if (date === undefined || date === null || date === "") return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return typeof date === "string" ? date : "—";
  const datePart = d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timePart = d.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${datePart} ${timePart}`;
}

export function formatSequentialId(
  sequence: number | undefined | null,
  fallbackId?: string | null,
  minDigits = 5,
): string {
  if (typeof sequence === "number" && Number.isFinite(sequence) && sequence > 0) {
    return `#${String(Math.trunc(sequence)).padStart(minDigits, "0")}`;
  }
  if (fallbackId) {
    return `#${fallbackId.slice(-8).toUpperCase()}`;
  }
  return "#---";
}

export function formatPrefixedSequence(
  prefix: string,
  sequence: number | undefined | null,
  fallbackId?: string | null,
  minDigits = 5,
): string {
  const cleanPrefix = (prefix || "ID").toUpperCase();
  if (typeof sequence === "number" && Number.isFinite(sequence) && sequence > 0) {
    return `${cleanPrefix}-${String(Math.trunc(sequence)).padStart(minDigits, "0")}`;
  }
  if (fallbackId) {
    return `${cleanPrefix}-${fallbackId.slice(-6).toUpperCase()}`;
  }
  return `${cleanPrefix}----`;
}

/**
 * Calcula la edad dinámica de una mascota desde su fecha de nacimiento.
 * Retorna algo como "2 años", "8 meses", "1 año y 3 meses", etc.
 * Si no hay fecha de nacimiento, devuelve el fallback (edad estática) o "—".
 */
export function calcularEdad(
  fechaNacimiento?: string | null,
  fallback?: string | null,
  especie?: string | null,
  raza?: string | null
): string {
  if (!fechaNacimiento) return fallback || "—";
  
  const nacimiento = new Date(fechaNacimiento);
  if (isNaN(nacimiento.getTime())) return fallback || "—";

  const ahora = new Date();
  let years = ahora.getFullYear() - nacimiento.getFullYear();
  let months = ahora.getMonth() - nacimiento.getMonth();

  // Ajustar si todavía no llegó el cumpleaños este año
  if (months < 0 || (months === 0 && ahora.getDate() < nacimiento.getDate())) {
    years--;
    months += 12;
  }

  if (years === 0 && months === 0) return "Recién nacido";
  
  let humanAgeStr = "";
  if (years === 0) {
    humanAgeStr = months === 1 ? "1 mes" : `${months} meses`;
  } else if (months === 0) {
    humanAgeStr = years === 1 ? "1 año" : `${years} años`;
  } else {
    const yearStr = years === 1 ? "1 año" : `${years} años`;
    const monthStr = months === 1 ? "1 mes" : `${months} meses`;
    humanAgeStr = `${yearStr} y ${monthStr}`;
  }

  // Cálculo de Edad en "Años de Mascota"
  const cleanEspecie = especie?.toLowerCase() || "";
  const cleanRaza = raza?.toLowerCase() || "";
  const esPerro = cleanEspecie.includes("perro") || cleanEspecie.includes("dog");
  const esGato = cleanEspecie.includes("gato") || cleanEspecie.includes("cat");

  if (esPerro) {
    // Determinar categoría de tamaño del perro por raza (estimación)
    let size: "small" | "medium" | "large" | "giant" = "medium";
    
    const smallBreeds = ["chihuahua", "yorkshire", "toy", "shih", "pug", "maltes", "pomerania", "dachshund", "teckel", "pequines", "bichon", "pinscher", "schnauzer min", "beagle"];
    const largeBreeds = ["labrador", "golden", "pastor", "rottweiler", "boxer", "doberman", "husky", "dalmata", "pitbull", "chow", "akita", "setter", "pointer", "pit bull"];
    const giantBreeds = ["danes", "bernardo", "mastin", "terranova", "lobero", "leonberger", "flandes", "gran danes"];

    if (giantBreeds.some(b => cleanRaza.includes(b))) size = "giant";
    else if (largeBreeds.some(b => cleanRaza.includes(b))) size = "large";
    else if (smallBreeds.some(b => cleanRaza.includes(b))) size = "small";

    let petYears = 0;
    
    // Los primeros 2 años son similares (~15 el primero, ~9 el segundo)
    if (years < 1) {
      petYears = (months / 12) * 15;
    } else if (years < 2) {
      petYears = 15 + (months / 12) * 9;
    } else {
      petYears = 24;
      // A partir del segundo año, varía por tamaño
      const remainingYears = (years - 2) + (months / 12);
      
      let multiplier = 5; // Medio por defecto
      if (size === "small") multiplier = 4;
      if (size === "large") multiplier = 7;
      if (size === "giant") multiplier = 9;
      
      petYears += remainingYears * multiplier;
    }
    
    return `${humanAgeStr} (${Math.round(petYears)} años mascota)`;
  }

  if (esGato) {
    let petYears = 0;
    if (years < 1) {
      petYears = (months / 12) * 15;
    } else if (years < 2) {
      petYears = 15 + (months / 12) * 9;
    } else {
      petYears = 24 + (years - 2 + months / 12) * 4;
    }
    return `${humanAgeStr} (${Math.round(petYears)} años mascota)`;
  }

  return humanAgeStr;
}
