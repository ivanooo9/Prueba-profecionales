export const STORE_TAX_SECTION_ID = "store-tax-settings";
export const DEFAULT_IVA_RATE = 15;
export const DEFAULT_TAX_NAME = "IVA";
export const DEFAULT_SURCHARGE_RATE = 0;

export type StoreTaxSettings = {
  ivaRate: number;
  taxName: string;
  taxEnabled: boolean;
  surchargeRate: number;
  surchargeEnabled: boolean;
  updatedAt?: string;
  updatedByName?: string;
};

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(",", ".").trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function normalizeIvaRate(value: unknown): number {
  const parsed = toFiniteNumber(value);
  if (parsed == null) return DEFAULT_IVA_RATE;
  const clamped = Math.max(0, Math.min(100, parsed));
  return Math.round(clamped);
}

export function normalizePercentRate(value: unknown, fallback = 0): number {
  const parsed = toFiniteNumber(value);
  if (parsed == null) return fallback;
  const clamped = Math.max(0, Math.min(100, parsed));
  return Math.round(clamped * 100) / 100;
}

function normalizeTaxName(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_TAX_NAME;
  const trimmed = value.trim();
  return trimmed || DEFAULT_TAX_NAME;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeOptionalDate(value: unknown): string | undefined {
  if (value == null) return undefined;
  const raw =
    value instanceof Date
      ? value.toISOString()
      : typeof value === "string"
        ? value
        : undefined;
  if (!raw) return undefined;
  const ts = new Date(raw).getTime();
  if (Number.isNaN(ts)) return undefined;
  return new Date(ts).toISOString();
}

function normalizeBool(value: unknown, fallback = true): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "si", "sí", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  return fallback;
}

export const DEFAULT_STORE_TAX_SETTINGS: StoreTaxSettings = {
  ivaRate: DEFAULT_IVA_RATE,
  taxName: DEFAULT_TAX_NAME,
  taxEnabled: true,
  surchargeRate: DEFAULT_SURCHARGE_RATE,
  surchargeEnabled: false,
};

function expandShortHex(hex: string): string {
  if (hex.length === 4 && hex.startsWith("#")) {
    const r = hex[1];
    const g = hex[2];
    const b = hex[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return hex.toLowerCase();
}

export function normalizeHexColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const s = value.trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s)) {
    return expandShortHex(s);
  }
  return fallback;
}

export function normalizeStoreTaxSettings(
  input: Partial<StoreTaxSettings> | null | undefined,
): StoreTaxSettings {
  return {
    ivaRate: normalizeIvaRate(input?.ivaRate),
    taxName: normalizeTaxName(input?.taxName),
    taxEnabled: normalizeBool(input?.taxEnabled, true),
    surchargeRate: normalizePercentRate(input?.surchargeRate, DEFAULT_SURCHARGE_RATE),
    surchargeEnabled: normalizeBool(input?.surchargeEnabled, false),
    updatedAt: normalizeOptionalDate(input?.updatedAt),
    updatedByName: normalizeOptionalString(input?.updatedByName),
  };
}

export function parseStoreTaxSettingsFromSection(section: {
  title?: string | null;
  subtitle?: string | null;
} | null | undefined): StoreTaxSettings {
  if (!section) return DEFAULT_STORE_TAX_SETTINGS;

  const fromTitle = toFiniteNumber(section.title);
  if (fromTitle != null && !section.subtitle) {
    return {
      ...DEFAULT_STORE_TAX_SETTINGS,
      ivaRate: normalizeIvaRate(fromTitle),
    };
  }

  if (section.subtitle) {
    try {
      const parsed = JSON.parse(section.subtitle) as unknown;
      const raw =
        typeof parsed === "object" && parsed !== null
          ? (parsed as Partial<StoreTaxSettings>)
          : {};
      const fallbackIva = fromTitle != null ? normalizeIvaRate(fromTitle) : DEFAULT_IVA_RATE;
      const normalized = normalizeStoreTaxSettings({
        ...DEFAULT_STORE_TAX_SETTINGS,
        ivaRate: fallbackIva,
        ...raw,
      });
      if (normalized.taxEnabled === false) {
        normalized.ivaRate = normalizeIvaRate(normalized.ivaRate);
      }
      return normalized;
    } catch {
      // ignore malformed legacy payloads
    }
  }

  if (fromTitle != null) {
    return {
      ...DEFAULT_STORE_TAX_SETTINGS,
      ivaRate: normalizeIvaRate(fromTitle),
    };
  }

  return DEFAULT_STORE_TAX_SETTINGS;
}

export function formatIvaPercent(ivaRate: number): string {
  const normalized = normalizeIvaRate(ivaRate);
  return Number.isInteger(normalized)
    ? normalized.toFixed(0)
    : normalized.toFixed(2).replace(/\.?0+$/, "");
}

export function buildIvaLabel(ivaRate: number, taxName = DEFAULT_TAX_NAME): string {
  return `${normalizeTaxName(taxName)} (${formatIvaPercent(ivaRate)}%)`;
}

export function parseIvaRateFromSection(section: {
  title?: string | null;
  subtitle?: string | null;
} | null | undefined): number {
  return parseStoreTaxSettingsFromSection(section).ivaRate;
}
