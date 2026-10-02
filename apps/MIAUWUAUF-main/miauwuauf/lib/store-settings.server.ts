import "server-only";

import prisma from "@/lib/prisma";
import {
  DEFAULT_IVA_RATE,
  DEFAULT_STORE_TAX_SETTINGS,
  STORE_TAX_SECTION_ID,
  StoreTaxSettings,
  normalizeStoreTaxSettings,
  parseStoreTaxSettingsFromSection,
} from "@/lib/store-settings";

export async function getStoreIvaRate(): Promise<number> {
  const settings = await getStoreTaxSettings();
  return settings.taxEnabled ? settings.ivaRate : 0;
}

export async function getStoreTaxSettings(): Promise<StoreTaxSettings> {
  try {
    const section = await prisma.sectionContent.findUnique({
      where: { sectionId: STORE_TAX_SECTION_ID },
      select: { title: true, subtitle: true, updatedAt: true },
    });
    const parsed = parseStoreTaxSettingsFromSection(section);
    return {
      ...parsed,
      updatedAt: section?.updatedAt?.toISOString() ?? parsed.updatedAt,
    };
  } catch {
    return DEFAULT_STORE_TAX_SETTINGS;
  }
}

export async function saveStoreIvaRate(ivaRate: unknown): Promise<number> {
  const current = await getStoreTaxSettings();
  const next = normalizeStoreTaxSettings({ ...current, ivaRate: Number(ivaRate) });
  await saveStoreTaxSettings(next);
  return next.ivaRate;
}

export async function saveStoreTaxSettings(
  settingsInput: Partial<StoreTaxSettings>,
): Promise<StoreTaxSettings> {
  const normalized = normalizeStoreTaxSettings(settingsInput);
  const updated = await prisma.sectionContent.upsert({
    where: { sectionId: STORE_TAX_SECTION_ID },
    update: {
      badge: normalized.taxName,
      title: String(normalized.ivaRate),
      subtitle: JSON.stringify(normalized),
    },
    create: {
      sectionId: STORE_TAX_SECTION_ID,
      badge: normalized.taxName,
      title: String(normalized.ivaRate),
      subtitle: JSON.stringify(normalized),
    },
  });
  return {
    ...normalized,
    updatedAt: updated.updatedAt.toISOString(),
  };
}
