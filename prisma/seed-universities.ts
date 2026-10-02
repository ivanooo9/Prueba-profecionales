import { db } from '../src/lib/db';

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function run() {
  console.log("Seeding Ecuadorian Universities & Institutes...");

  const defaultUniversities = [
    { nombre: "Universidad Central del Ecuador", siglas: "UCE", tipo: "UNIVERSIDAD", provincia: "Pichincha", ciudad: "Quito", orden: 1 },
    { nombre: "Escuela Politécnica Nacional", siglas: "EPN", tipo: "UNIVERSIDAD", provincia: "Pichincha", ciudad: "Quito", orden: 2 },
    { nombre: "Universidad de las Fuerzas Armadas", siglas: "ESPE", tipo: "UNIVERSIDAD", provincia: "Pichincha", ciudad: "Sangolquí", orden: 3 },
    { nombre: "Universidad de Guayaquil", siglas: "UG", tipo: "UNIVERSIDAD", provincia: "Guayas", ciudad: "Guayaquil", orden: 4 },
    { nombre: "Escuela Superior Politécnica del Litoral", siglas: "ESPOL", tipo: "UNIVERSIDAD", provincia: "Guayas", ciudad: "Guayaquil", orden: 5 },
    { nombre: "Universidad San Francisco de Quito", siglas: "USFQ", tipo: "UNIVERSIDAD", provincia: "Pichincha", ciudad: "Quito", orden: 6 },
    { nombre: "Pontificia Universidad Católica del Ecuador", siglas: "PUCE", tipo: "UNIVERSIDAD", provincia: "Pichincha", ciudad: "Quito", orden: 7 },
    { nombre: "Universidad Técnica Particular de Loja", siglas: "UTPL", tipo: "UNIVERSIDAD", provincia: "Loja", ciudad: "Loja", orden: 8 },
    { nombre: "Universidad de Cuenca", siglas: "UCUENCA", tipo: "UNIVERSIDAD", provincia: "Azuay", ciudad: "Cuenca", orden: 9 },
    { nombre: "Universidad de las Américas", siglas: "UDLA", tipo: "UNIVERSIDAD", provincia: "Pichincha", ciudad: "Quito", orden: 10 },
    { nombre: "Instituto Superior Tecnológico Sucre", siglas: "IST Sucre", tipo: "INSTITUTO_SUPERIOR", provincia: "Pichincha", ciudad: "Quito", orden: 11 },
    { nombre: "Instituto Superior Tecnológico Guayaquil", siglas: "ISTG", tipo: "INSTITUTO_SUPERIOR", provincia: "Guayas", ciudad: "Guayaquil", orden: 12 },
    { nombre: "Instituto Superior Tecnológico Rumiñahui", siglas: "ISTER", tipo: "INSTITUTO_SUPERIOR", provincia: "Pichincha", ciudad: "Sangolquí", orden: 13 },
    { nombre: "Instituto Superior Tecnológico Yavirac", siglas: "Yavirac", tipo: "INSTITUTO_SUPERIOR", provincia: "Pichincha", ciudad: "Quito", orden: 14 }
  ];

  for (const uni of defaultUniversities) {
    await db.university.upsert({
      where: { nombre: uni.nombre },
      update: { siglas: uni.siglas, tipo: uni.tipo, provincia: uni.provincia, ciudad: uni.ciudad, orden: uni.orden },
      create: uni
    });
  }

  console.log("Universities seeded successfully!");

  console.log("Backfilling student profile slugs...");
  const studentProfiles = await db.studentProfile.findMany({
    include: { user: true }
  });

  for (const sp of studentProfiles) {
    if (!sp.slug) {
      let baseSlug = slugify(sp.user.name || "estudiante");
      let finalSlug = baseSlug;
      let counter = 1;
      while (await db.studentProfile.findFirst({ where: { slug: finalSlug, NOT: { id: sp.id } } })) {
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
      }
      await db.studentProfile.update({
        where: { id: sp.id },
        data: { slug: finalSlug }
      });
      console.log(`Updated StudentProfile #${sp.id} (${sp.user.name}) -> slug: ${finalSlug}`);
    }
  }

  console.log("All student profiles backfilled!");
}

run()
  .catch(err => {
    console.error("Error seeding universities:", err);
    process.exit(1);
  });
