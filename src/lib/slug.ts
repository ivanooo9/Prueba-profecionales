import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

/**
 * Generates a clean, URL-friendly slug from string input.
 */
export function generateSlug(text: string): string {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD") // Split accented characters into base letter + diacritic
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics (accents)
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars except -
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start
    .replace(/-+$/, ""); // Trim - from end
}

/**
 * Returns a unique slug for a given table model. If the slug already exists,
 * it appends a sequential number (e.g. "terry-mendieta-1") until a unique slug is found.
 */
export async function getUniqueSlug(
  model: "professionalProfile" | "studentProfile" | "curso" | "conversatorio" | "article" | "conversatorioSpeaker",
  baseText: string,
  excludeId?: number
): Promise<string> {
  const baseSlug = generateSlug(baseText) || "profile";
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await (db[model] as any).findFirst({
      where: {
        slug,
        ...(excludeId ? { NOT: { id: excludeId } } : {})
      }
    });

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}
