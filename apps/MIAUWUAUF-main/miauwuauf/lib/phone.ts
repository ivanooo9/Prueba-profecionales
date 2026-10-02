export function normalizeEcuadorPhone(rawValue?: string | null): string | undefined {
  if (typeof rawValue !== "string") return undefined;

  const trimmed = rawValue.trim();
  if (!trimmed) return undefined;

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return undefined;

  if (digits.startsWith("593")) {
    return digits;
  }

  if (digits.startsWith("0") && digits.length >= 10) {
    return `593${digits.slice(1)}`;
  }

  if (digits.length === 9) {
    return `593${digits}`;
  }

  return `593${digits}`;
}

export function normalizeEcuadorPhoneInput(rawValue?: string | null): string {
  if (typeof rawValue !== "string") return "";

  const digits = rawValue.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("593")) {
    return digits.slice(0, 12);
  }

  if (digits.startsWith("0")) {
    return `593${digits.slice(1, 10)}`;
  }

  return `593${digits.slice(0, 9)}`;
}

export function formatEcuadorPhoneDisplay(rawValue?: string | null): string {
  if (typeof rawValue !== "string") return "";

  const digits = rawValue.replace(/\D/g, "");
  if (!digits) return "";

  const normalized = normalizeEcuadorPhoneInput(digits);
  if (!normalized.startsWith("593")) return normalized;

  const local = normalized.slice(3);
  const part1 = local.slice(0, 2);
  const part2 = local.slice(2, 5);
  const part3 = local.slice(5, 9);

  const parts = [part1, part2, part3].filter(Boolean);
  return `+593${parts.length ? ` ${parts.join(" ")}` : ""}`;
}

export function ensureEcuadorPhoneInputPrefix(rawValue?: string | null): string {
  const normalized = normalizeEcuadorPhoneInput(rawValue);
  return normalized || "593";
}
