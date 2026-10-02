import { Decimal } from "@prisma/client/runtime/library";

const DATE_MARKER = "$date";
const DECIMAL_MARKER = "$decimal";

interface DateMarker {
  $date: string;
}

interface DecimalMarker {
  $decimal: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDateMarker(value: unknown): value is DateMarker {
  return isRecord(value) && Object.keys(value).length === 1 && typeof value[DATE_MARKER] === "string";
}

function isDecimalMarker(value: unknown): value is DecimalMarker {
  return isRecord(value) && Object.keys(value).length === 1 && typeof value[DECIMAL_MARKER] === "string";
}

function transformForSerialization(value: unknown): unknown {
  if (value instanceof Date) {
    return { [DATE_MARKER]: value.toISOString() };
  }

  if (value instanceof Decimal) {
    return { [DECIMAL_MARKER]: value.toString() };
  }

  if (Array.isArray(value)) {
    return value.map((item) => transformForSerialization(item));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, transformForSerialization(item)])
    );
  }

  return value;
}

function transformForDeserialization(value: unknown): unknown {
  if (isDateMarker(value)) {
    return new Date(value[DATE_MARKER]);
  }

  if (isDecimalMarker(value)) {
    return new Decimal(value[DECIMAL_MARKER]);
  }

  if (Array.isArray(value)) {
    return value.map((item) => transformForDeserialization(item));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, transformForDeserialization(item)])
    );
  }

  return value;
}

export function serialize<T>(value: T): string {
  return JSON.stringify(transformForSerialization(value));
}

export function deserialize<T>(raw: string): T {
  return transformForDeserialization(JSON.parse(raw)) as T;
}
