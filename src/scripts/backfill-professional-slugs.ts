import "dotenv/config";
import { Prisma } from "@prisma/client";

import { db } from "../lib/db";

function generateSlug(text: string): string {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

async function getAvailableProfessionalSlug(baseText: string, excludeId: number): Promise<string> {
  const baseSlug = generateSlug(baseText) || "profesional";
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await db.professionalProfile.findFirst({
      where: {
        slug,
        NOT: { id: excludeId }
      },
      select: { id: true }
    });

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

async function main(): Promise<void> {
  const profiles = await db.professionalProfile.findMany({
    where: {
      OR: [{ slug: null }, { slug: "" }]
    },
    select: {
      id: true,
      slug: true,
      user: { select: { name: true } }
    },
    orderBy: { id: "asc" }
  });

  if (profiles.length === 0) {
    console.log("No hay perfiles profesionales pendientes de backfill de slug.");
    return;
  }

  let updated = 0;

  for (const profile of profiles) {
    const baseText = profile.user.name.trim() || "profesional";

    for (let attempt = 0; attempt < 3; attempt++) {
      const slug = await getAvailableProfessionalSlug(baseText, profile.id);

      try {
        const result = await db.professionalProfile.updateMany({
          where: {
            id: profile.id,
            OR: [{ slug: null }, { slug: "" }]
          },
          data: { slug }
        });

        if (result.count > 0) {
          updated++;
          console.log(`Perfil ${profile.id}: ${slug}`);
        }
        break;
      } catch (error: unknown) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002" &&
          attempt < 2
        ) {
          continue;
        }

        throw error;
      }
    }
  }

  console.log(`Backfill completado. Perfiles actualizados: ${updated}/${profiles.length}.`);
}

main()
  .catch((error: unknown) => {
    console.error("Error ejecutando backfill de slugs profesionales:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
