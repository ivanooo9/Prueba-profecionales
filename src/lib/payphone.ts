import { randomUUID } from "crypto";
import { db } from "./db";
import { cachedFetch, cacheKeyFactory as cacheKey } from "./cache";

// =====================================================
// Tipos e interfaces
// =====================================================

export type PayPhoneItemType =
  | "COURSE"
  | "CERTIFICATE"
  | "MEMBERSHIP"
  | "CONVERSATORIO"
  | "PROMOTION"
  | "TOPUP"
  | "OTHER";

export interface PayPhoneConfig {
  token: string;
  storeId: string;
  taxRate: number; // Porcentaje (ej: 15)
  baseUrl: string;
}

interface PayPhonePrepareDiagnostics {
  responseUrl: string;
  storeId: string;
  tokenMasked: string;
  hasToken: boolean;
}

interface PayPhoneRequestLog {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

interface PayPhoneUpstreamResponseLog {
  status: number;
  statusText: string;
  contentType: string;
  location: string | null;
  bodyPreview: string;
}

export interface PreparePaymentInput {
  /** Base amount in DOLLOWARS (ej: 15.00). Siempre se convierte a centavos. */
  baseAmount: number;
  /** Si el item paga IVA/Tax. */
  hasTax: boolean;
  /** ID del usuario que realiza el pago. */
  userId: number;
  /** Nombre del usuario (para la referencia). */
  userName: string;
  /** Nombre del producto/evento (para la referencia). */
  productName: string;
  /** Tipo de item comprado. */
  itemType: PayPhoneItemType;
  /** ID del item comprado. */
  itemId: number;
  /** Metadatos adicionales a guardar (opcional). */
  metadata?: Record<string, unknown>;
}

export interface PayPhoneAmounts {
  amount: number; // total en centavos
  amountWithoutTax: number;
  amountWithTax: number;
  tax: number;
}

export interface PayPhonePrepareResponse {
  paymentId?: string | number;
  payWithPayPhone?: string;
  payWithCard?: string;
  // PayPhone a veces devuelve errores embebidos
  message?: string;
  errorCode?: number;
  errors?: string[];
}

export interface PreparePaymentResult {
  clientTransactionId: string;
  prepareResponse: PayPhonePrepareResponse;
  transaction: {
    id: number;
    status: string;
    statusCode: number | null;
    amount: number;
    reference: string;
  };
}

export interface PayPhoneConfirmResponse {
  message?: string;
  errorCode?: number;
  errors?: string[];
  // campos variables que PayPhone pueda devolver
  [key: string]: unknown;
}

export interface ConfirmPaymentResult {
  confirmResponse: PayPhoneConfirmResponse;
  transaction: {
    id: number;
    clientTransactionId: string;
    status: string;
    statusCode: number | null;
    amount: number;
  };
}

// =====================================================
// Utilidades internas
// =====================================================

/**
 * Lee SystemConfig (singleton id=1) y arma la configuración de PayPhone.
 * Fallback a process.env si algún campo no está configurado en DB.
 */
export async function getConfig(): Promise<PayPhoneConfig> {
  const config = await cachedFetch(cacheKey.systemConfig.singleton(), () =>
    db.systemConfig.findUnique({ where: { id: 1 } })
  );

  const token =
    config?.payphoneToken || process.env.PAYPHONE_TOKEN || "";
  const storeId =
    config?.payphoneStoreId || process.env.PAYPHONE_STORE_ID || "";
  const taxRate =
    config?.taxRate ?? Number(process.env.PAYPHONE_TAX_RATE ?? 0);
  const baseUrl = process.env.BASE_URL?.trim() || "";

  return { token, storeId, taxRate, baseUrl };
}

function isLocalhostUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function isLocalRuntime(): boolean {
  return (process.env.NODE_ENV || "development") !== "production";
}

function maskToken(token: string): string {
  if (!token) return "missing";
  if (token.length <= 8) return "***";
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

function maskSensitiveHeader(name: string, value: string): string {
  const normalizedName = name.toLowerCase();
  if (normalizedName === "authorization") {
    const [scheme, token] = value.split(" ");
    if (!token) return maskToken(value);
    return `${scheme} ${maskToken(token)}`;
  }

  if (normalizedName.includes("token")) {
    return maskToken(value);
  }

  return value;
}

function safeBodyPreview(value: string, maxLength: number = 500): string {
  if (!value) return "";
  return value.slice(0, maxLength);
}

function assertPrepareConfig(config: PayPhoneConfig): string {
  if (!config.token) throw new Error("PayPhone: token no configurado");
  if (!config.storeId) throw new Error("PayPhone: storeId no configurado");
  if (!config.baseUrl) {
    throw new Error(
      "PayPhone: BASE_URL no configurado. Configura la URL pública antes de preparar pagos."
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(config.baseUrl);
  } catch {
    throw new Error(
      "PayPhone: BASE_URL inválido. Debe ser una URL pública válida."
    );
  }

  if (!isLocalRuntime() && isLocalhostUrl(parsed.toString())) {
    throw new Error(
      "PayPhone: BASE_URL apunta a localhost/127.0.0.1 en un entorno no local. Configura la URL pública antes de preparar pagos."
    );
  }

  return parsed.toString().replace(/\/$/, "");
}

/**
 * Calcula los montos en centavos según si el item paga tax o no.
 * Reglas:
 *   hasTax=true:
 *     amountWithTax = round(baseAmount * 100)
 *     tax          = round(amountWithTax * (taxRate/100))
 *     amount       = amountWithTax + tax
 *     amountWithoutTax = 0
 *   hasTax=false:
 *     amountWithoutTax = round(baseAmount * 100)
 *     amount           = amountWithoutTax
 *     resto = 0
 */
export function calculateAmounts(
  baseAmount: number,
  hasTax: boolean,
  taxRate: number
): PayPhoneAmounts {
  if (hasTax) {
    const amountWithTax = Math.round(baseAmount * 100);
    const tax = Math.round((amountWithTax * taxRate) / 100);
    const amount = amountWithTax + tax;
    return {
      amount,
      amountWithoutTax: 0,
      amountWithTax,
      tax,
    };
  }

  const amountWithoutTax = Math.round(baseAmount * 100);
  return {
    amount: amountWithoutTax,
    amountWithoutTax,
    amountWithTax: 0,
    tax: 0,
  };
}

/**
 * Devuelve un timestamp compacto ASCII en zona America/Guayaquil.
 * Formato: YYYYMMDD-HHmm
 */
function compactEcuadorTimestamp(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const getPart = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return `${getPart("year")}${getPart("month")}${getPart("day")}-${getPart("hour")}${getPart("minute")}`;
}

function payPhoneReferencePrefix(itemType: PayPhoneItemType): string {
  const PREFIX_BY_ITEM_TYPE: Record<PayPhoneItemType, string> = {
    COURSE: "COURSE",
    CERTIFICATE: "CERT",
    MEMBERSHIP: "MEM",
    CONVERSATORIO: "CONV",
    PROMOTION: "PROMO",
    TOPUP: "TOPUP",
    OTHER: "OTHER",
  };

  return PREFIX_BY_ITEM_TYPE[itemType];
}

function buildPayPhoneReference(input: PreparePaymentInput, date: Date = new Date()): string {
  return `${payPhoneReferencePrefix(input.itemType)}-${input.itemId}-${compactEcuadorTimestamp(date)}`;
}

/**
 * Lanza un Error legible a partir de la respuesta de error de PayPhone.
 * PayPhone suele responder: { message, errorCode, errors: [...] }
 */
function throwPayPhoneError(
  payload: { message?: string; errorCode?: number; errors?: string[] },
  context: string
): never {
  const detail =
    payload.errors && payload.errors.length > 0
      ? payload.errors.join("; ")
      : payload.message || `Error desconocido en ${context}`;
  const code = payload.errorCode ? ` [code ${payload.errorCode}]` : "";
  throw new Error(`PayPhone ${context}: ${detail}${code}`);
}

// =====================================================
// API pública
// =====================================================

const PREPARE_URL = "https://pay.payphonetodoesposible.com/api/button/Prepare";
const CONFIRM_URL = "https://pay.payphonetodoesposible.com/api/button/V2/Confirm";

/**
 * Prepara un pago en PayPhone.
 * - Calcula montos en centavos
 * - Genera clientTransactionId (UUID v4)
 * - Guarda registro PENDING en DB
 * - Llama a la API Prepare de PayPhone
 * - Persiste el paymentId devuelto
 * - Devuelve la respuesta + clientTransactionId
 */
export async function preparePayment(
  input: PreparePaymentInput
): Promise<PreparePaymentResult> {
  const config = await getConfig();
  const { token, storeId, taxRate } = config;
  const normalizedBaseUrl = assertPrepareConfig(config);

  const amounts = calculateAmounts(
    input.baseAmount,
    input.hasTax,
    taxRate
  );

  const clientTransactionId = randomUUID();
  const reference = buildPayPhoneReference(input);
  const responseUrl = `${normalizedBaseUrl}/validar-pago-pp`;
  const diagnostics: PayPhonePrepareDiagnostics = {
    responseUrl,
    storeId,
    tokenMasked: maskToken(token),
    hasToken: Boolean(token),
  };

  // 1. Registrar transacción PENDING antes de llamar a la API
  const transaction = await db.payPhoneTransaction.create({
    data: {
      clientTransactionId,
      status: "PENDING",
      statusCode: 1,
      amount: amounts.amount,
      amountWithoutTax: amounts.amountWithoutTax,
      amountWithTax: amounts.amountWithTax,
      tax: amounts.tax,
      currency: "USD",
      reference,
      userId: input.userId,
      itemType: input.itemType,
      itemId: input.itemId,
      metadata: (input.metadata ?? null) as any,
    },
  });

  // 2. Llamar a Prepare
  const body = {
    clientTransactionId,
    reference,
    amount: amounts.amount,
    amountWithoutTax: amounts.amountWithoutTax,
    amountWithTax: amounts.amountWithTax,
    tax: amounts.tax,
    currency: "USD",
    storeId,
    responseUrl,
  };

  let prepareResponse: PayPhonePrepareResponse;
  try {
    const requestBodyJson = JSON.stringify(body);
    const requestHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    const requestLog: PayPhoneRequestLog = {
      method: "POST",
      url: PREPARE_URL,
      headers: Object.fromEntries(
        Object.entries(requestHeaders).map(([name, value]) => [
          name,
          maskSensitiveHeader(name, value),
        ])
      ),
      body: requestBodyJson,
    };
    console.error("PayPhone prepare outgoing request", {
      ...diagnostics,
      request: requestLog,
    });
    const res = await fetch(PREPARE_URL, {
      method: requestLog.method,
      headers: requestHeaders,
      body: requestBodyJson,
    });

    const responseText = await res.text();
    const upstreamResponseLog: PayPhoneUpstreamResponseLog = {
      status: res.status,
      statusText: res.statusText,
      contentType: res.headers.get("content-type") || "",
      location: res.headers.get("location"),
      bodyPreview: safeBodyPreview(responseText),
    };
    console.error("PayPhone prepare upstream response", {
      ...diagnostics,
      upstreamResponse: upstreamResponseLog,
    });

    prepareResponse = JSON.parse(responseText) as PayPhonePrepareResponse;

    if (!res.ok || prepareResponse.errorCode || prepareResponse.errors?.length) {
      console.error("PayPhone prepare upstream error", {
        ...diagnostics,
        upstreamStatus: res.status,
        upstreamStatusText: res.statusText,
        upstreamContentType: upstreamResponseLog.contentType,
        upstreamLocation: upstreamResponseLog.location,
        upstreamBodyPreview: upstreamResponseLog.bodyPreview,
        upstreamErrorCode: prepareResponse.errorCode,
        upstreamMessage: prepareResponse.message,
        upstreamErrors: prepareResponse.errors,
      });
      // Marcamos la transacción como CANCELLED por error de preparación
      await db.payPhoneTransaction.update({
        where: { id: transaction.id },
        data: { status: "CANCELLED", payphoneResponse: prepareResponse as any },
      });
      throwPayPhoneError(prepareResponse, "Prepare");
    }
  } catch (err) {
    console.error("PayPhone prepare failed", {
      ...diagnostics,
      error: err instanceof Error ? err.message : String(err),
    });
    // Re-lanzar errores lanzados arriba; si es error de red, lo envolvemos
    if (err instanceof Error && err.message.startsWith("PayPhone")) throw err;
    throw new Error(
      `PayPhone Prepare (red): ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // 3. Persistir el paymentId devuelto por PayPhone
  const paymentId =
    prepareResponse.paymentId !== undefined
      ? String(prepareResponse.paymentId)
      : null;

  const updated = await db.payPhoneTransaction.update({
    where: { id: transaction.id },
    data: { paymentId },
  });

  return {
    clientTransactionId,
    prepareResponse,
    transaction: {
      id: updated.id,
      status: updated.status,
      statusCode: updated.statusCode,
      amount: updated.amount,
      reference: updated.reference,
    },
  };
}

/**
 * Confirma (post-callback) un pago en PayPhone.
 * - Recibe el `id` y `clientTxId` que llegan desde el callback de PayPhone
 * - Busca la transacción en DB por clientTransactionId (debe existir)
 * - Llama a Confirm V2
 * - Actualiza status según statusCode: 3=APPROVED, 2=CANCELLED, otro=PENDING
 * - Devuelve la respuesta + el registro actualizado
 */
export async function confirmPayment(
  id: string | number,
  clientTxId: string
): Promise<ConfirmPaymentResult> {
  const { token } = await getConfig();
  if (!token) throw new Error("PayPhone: token no configurado");

  // 1. Buscar transacción
  const transaction = await db.payPhoneTransaction.findUnique({
    where: { clientTransactionId: clientTxId },
  });
  if (!transaction) {
    throw new Error(
      `PayPhone Confirm: transacción no encontrada para clientTxId=${clientTxId}`
    );
  }

  // 2. Llamar a Confirm V2
  let confirmResponse: PayPhoneConfirmResponse;
  try {
    const res = await fetch(CONFIRM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id, clientTxId }),
    });

    confirmResponse = (await res.json()) as PayPhoneConfirmResponse;

    if (!res.ok || confirmResponse.errorCode || confirmResponse.errors?.length) {
      // Persistimos la respuesta de error para diagnóstico
      await db.payPhoneTransaction.update({
        where: { id: transaction.id },
        data: { payphoneResponse: confirmResponse as any },
      });
      throwPayPhoneError(confirmResponse, "Confirm");
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("PayPhone")) throw err;
    throw new Error(
      `PayPhone Confirm (red): ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // 3. Mapear statusCode -> status
  const statusCode = (confirmResponse as any).statusCode as number | undefined;
  let status = "PENDING";
  if (statusCode === 3) status = "APPROVED";
  else if (statusCode === 2) status = "CANCELLED";

  const updated = await db.payPhoneTransaction.update({
    where: { id: transaction.id },
    data: {
      payphoneResponse: confirmResponse as any,
      statusCode: statusCode ?? null,
      status,
    },
  });

  return {
    confirmResponse,
    transaction: {
      id: updated.id,
      clientTransactionId: updated.clientTransactionId,
      status: updated.status,
      statusCode: updated.statusCode,
      amount: updated.amount,
    },
  };
}
