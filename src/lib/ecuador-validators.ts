/**
 * Valida una cédula de identidad ecuatoriana utilizando el algoritmo oficial de Módulo 10 del Registro Civil.
 * @param cedula Cadena numérica de 10 dígitos.
 * @returns boolean true si la cédula es válida según las reglas del Registro Civil del Ecuador.
 */
export function validarCedulaEcuador(cedula: string): boolean {
  if (!cedula || typeof cedula !== "string") return false;
  const clean = cedula.trim();
  if (clean.length !== 10 || !/^\d{10}$/.test(clean)) return false;

  const provincia = parseInt(clean.substring(0, 2), 10);
  // Las 24 provincias del Ecuador van del 01 al 24; código 30 reservado para casos especiales
  if (!((provincia >= 1 && provincia <= 24) || provincia === 30)) {
    return false;
  }

  const tercerDigito = parseInt(clean.charAt(2), 10);
  // Para personas naturales ecuatorianas el tercer dígito es menor a 6 (0 a 5)
  if (tercerDigito < 0 || tercerDigito >= 6) {
    return false;
  }

  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;

  for (let i = 0; i < 9; i++) {
    let valor = parseInt(clean.charAt(i), 10) * coeficientes[i];
    if (valor >= 10) {
      valor -= 9;
    }
    suma += valor;
  }

  const digitoVerificadorCalculado = (10 - (suma % 10)) % 10;
  const digitoVerificadorReal = parseInt(clean.charAt(9), 10);

  return digitoVerificadorCalculado === digitoVerificadorReal;
}

export const validateEcuadorianId = validarCedulaEcuador;

/**
 * Valida un número de pasaporte extranjero.
 * Regla: cadena alfanumérica de 6 a 20 caracteres (permitiendo guiones opcionales),
 * conteniendo al menos un carácter alfanumérico.
 */
export function validarPasaporte(pasaporte: string): boolean {
  if (!pasaporte || typeof pasaporte !== "string") return false;
  const clean = pasaporte.trim().toUpperCase();
  if (clean.length < 6 || clean.length > 20) return false;
  // Solo letras, dígitos y guiones opcionales
  if (!/^[A-Z0-9-]+$/.test(clean)) return false;
  // Debe tener al menos 3 caracteres alfanuméricos válidos
  const alnumCount = (clean.match(/[A-Z0-9]/g) || []).length;
  return alnumCount >= 3;
}

/**
 * Valida un RUC (Registro Único de Contribuyentes) de Ecuador según especificaciones oficiales del SRI.
 * Soporta:
 * 1. Persona Natural (3er dígito 0-5): Cédula base + establecimiento >= 001.
 * 2. Sociedad Privada o Extranjera (3er dígito 9): Módulo 11 con coeficientes [4,3,2,7,6,5,4,3,2] + establecimiento >= 001.
 * 3. Sociedad Pública (3er dígito 6): Módulo 11 con coeficientes [3,2,7,6,5,4,3,2] + establecimiento >= 0001.
 */
export function validarRucEcuador(ruc: string): boolean {
  if (!ruc || typeof ruc !== "string") return false;
  const clean = ruc.trim();
  if (clean.length !== 13 || !/^\d{13}$/.test(clean)) return false;

  const provincia = parseInt(clean.substring(0, 2), 10);
  if (!((provincia >= 1 && provincia <= 24) || provincia === 30)) {
    return false;
  }

  const tercerDigito = parseInt(clean.charAt(2), 10);

  // 1. Persona Natural (0 a 5)
  if (tercerDigito >= 0 && tercerDigito <= 5) {
    const cedula = clean.substring(0, 10);
    if (!validarCedulaEcuador(cedula)) return false;
    const establecimiento = parseInt(clean.substring(10, 13), 10);
    return establecimiento >= 1;
  }

  // 2. Sociedad Privada y Extranjeros sin cédula (9)
  if (tercerDigito === 9) {
    const establecimiento = parseInt(clean.substring(10, 13), 10);
    if (establecimiento < 1) return false;

    const coeficientes = [4, 3, 2, 7, 6, 5, 4, 3, 2];
    let suma = 0;
    for (let i = 0; i < 9; i++) {
      suma += parseInt(clean.charAt(i), 10) * coeficientes[i];
    }

    const residuo = suma % 11;
    const digitoVerificador = residuo === 0 ? 0 : 11 - residuo;
    return digitoVerificador === parseInt(clean.charAt(9), 10);
  }

  // 3. Sociedad Pública (6)
  if (tercerDigito === 6) {
    const establecimiento = parseInt(clean.substring(9, 13), 10);
    if (establecimiento < 1) return false;

    const coeficientes = [3, 2, 7, 6, 5, 4, 3, 2];
    let suma = 0;
    for (let i = 0; i < 8; i++) {
      suma += parseInt(clean.charAt(i), 10) * coeficientes[i];
    }

    const residuo = suma % 11;
    const digitoVerificador = residuo === 0 ? 0 : 11 - residuo;
    return digitoVerificador === parseInt(clean.charAt(8), 10);
  }

  return false;
}

export type TipoDocumentoPaciente = 'CEDULA' | 'PASAPORTE';

export interface ResultadoValidacionDocumento {
  isValid: boolean;
  error?: string;
  normalized?: string;
  tipo?: TipoDocumentoPaciente;
}

/**
 * Validador con diagnóstico estructurado para documentos de identidad de pacientes.
 * No asume que 10 dígitos es automáticamente cédula si el tipo declarado es pasaporte.
 */
export function validarDocumentoIdentidad(
  tipo: TipoDocumentoPaciente | string | null | undefined,
  valor: string | null | undefined
): ResultadoValidacionDocumento {
  if (!valor || typeof valor !== "string" || valor.trim() === "") {
    return {
      isValid: false,
      error: "El número de identificación no puede estar vacío.",
    };
  }

  const clean = valor.trim();

  // Si el tipo no es especificado explícitamente, determinamos con precaución
  if (!tipo) {
    if (/[A-Za-z-]/.test(clean)) {
      const validPass = validarPasaporte(clean);
      return {
        isValid: validPass,
        error: validPass ? undefined : "El número de pasaporte debe contener entre 6 y 20 caracteres alfanuméricos válidos.",
        normalized: clean.toUpperCase(),
        tipo: 'PASAPORTE',
      };
    }
    if (/^\d{10}$/.test(clean)) {
      if (validarCedulaEcuador(clean)) {
        return {
          isValid: true,
          normalized: clean,
          tipo: 'CEDULA',
        };
      }
      return {
        isValid: false,
        error: "La identificación de 10 dígitos no cumple con el algoritmo Módulo 10 del Registro Civil del Ecuador.",
      };
    }
    return {
      isValid: false,
      error: "Tipo de documento no especificado y formato numérico irreconocible como cédula o pasaporte.",
    };
  }

  const tipoNormalizado = String(tipo).toUpperCase().trim();

  if (tipoNormalizado === 'CEDULA') {
    if (!/^\d+$/.test(clean)) {
      return {
        isValid: false,
        error: "La cédula ecuatoriana debe contener únicamente dígitos numéricos (0-9).",
        tipo: 'CEDULA',
      };
    }
    if (clean.length !== 10) {
      return {
        isValid: false,
        error: `La cédula ecuatoriana debe tener exactamente 10 dígitos (se recibieron ${clean.length}).`,
        tipo: 'CEDULA',
      };
    }
    const esValida = validarCedulaEcuador(clean);
    return {
      isValid: esValida,
      error: esValida
        ? undefined
        : "La identificación de 10 dígitos proporcionada no es una cédula ecuatoriana válida según el Registro Civil (cédula inválida según el Registro Civil: provincia o dígito verificador incorrecto).",
      normalized: clean,
      tipo: 'CEDULA',
    };
  }

  if (tipoNormalizado === 'PASAPORTE') {
    const normalizado = clean.toUpperCase();
    const esValido = validarPasaporte(normalizado);
    return {
      isValid: esValido,
      error: esValido
        ? undefined
        : "El número de pasaporte proporcionado no es válido (debe contener entre 6 y 20 caracteres alfanuméricos).",
      normalized: normalizado,
      tipo: 'PASAPORTE',
    };
  }

  return {
    isValid: false,
    error: `Tipo de documento '${tipo}' no soportado para pacientes. Tipos permitidos: CEDULA, PASAPORTE.`,
  };
}

/**
 * Validador unificado para documentos de identidad de pacientes.
 */
export function validarDocumentoPaciente(
  tipo: TipoDocumentoPaciente | string,
  valor: string
): boolean {
  return validarDocumentoIdentidad(tipo, valor).isValid;
}



