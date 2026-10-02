import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const TEST_EMAIL = "profesional.test@example.com";
const TEST_SLUG = "dra-test";
const TEST_CEDULA = "1712345678";
const TEST_PHONE = "+593987654321";
const TEST_PASSWORD = "Test1234!";

async function main() {
  console.log("Seeding test professional…");

  const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

  const professionalRole = await prisma.role.upsert({
    where: { name: "PROFESSIONAL" },
    update: {},
    create: {
      name: "PROFESSIONAL",
      description: "Profesional prestador de servicios y emisor de facturas.",
    },
  });

  const user = await prisma.user.upsert({
    where: { email: TEST_EMAIL },
    update: {
      name: "Dra. Test Profesional",
      password: hashedPassword,
      roleId: professionalRole.id,
      status: "ACTIVE",
    },
    create: {
      email: TEST_EMAIL,
      password: hashedPassword,
      name: "Dra. Test Profesional",
      roleId: professionalRole.id,
      status: "ACTIVE",
      telefono: TEST_PHONE,
      ciudad: "Quito",
    },
  });
  console.log(`  ✓ User: ${user.email} (id=${user.id})`);

  const subscriptionEnds = new Date();
  subscriptionEnds.setFullYear(subscriptionEnds.getFullYear() + 1);

  const profile = await prisma.professionalProfile.upsert({
    where: { slug: TEST_SLUG },
    update: {
      userId: user.id,
      bio: "Médica general con 10 años de experiencia en atención primaria. Atención integral y personalizada.",
      slogan: "Tu salud, mi compromiso",
      provincia: "Pichincha",
      ciudad: "Quito",
      direccion: "Av. Amazonas N23-45 y Av. de la República",
      latitud: -0.1807,
      longitud: -78.4678,
      cedula: TEST_CEDULA,
      telefono: TEST_PHONE,
      tarifa: 30.0,
      callePrincipal: "Av. Amazonas",
      referencia: "Diagonal al Centro Comercial El Jardín",
      whatsapp: TEST_PHONE,
      status: "APROBADO",
      verified: true,
      planType: "PREMIUM",
      subscriptionEnds,
    },
    create: {
      userId: user.id,
      slug: TEST_SLUG,
      bio: "Médica general con 10 años de experiencia en atención primaria. Atención integral y personalizada.",
      slogan: "Tu salud, mi compromiso",
      provincia: "Pichincha",
      ciudad: "Quito",
      direccion: "Av. Amazonas N23-45 y Av. de la República",
      latitud: -0.1807,
      longitud: -78.4678,
      cedula: TEST_CEDULA,
      telefono: TEST_PHONE,
      tarifa: 30.0,
      callePrincipal: "Av. Amazonas",
      referencia: "Diagonal al Centro Comercial El Jardín",
      whatsapp: TEST_PHONE,
      status: "APROBADO",
      verified: true,
      planType: "PREMIUM",
      subscriptionEnds,
    },
  });
  console.log(`  ✓ Profile: ${profile.slug} (id=${profile.id})`);

  await prisma.professionalSchedule.deleteMany({ where: { profileId: profile.id } });
  const schedules = await prisma.professionalSchedule.createMany({
    data: [
      { profileId: profile.id, dia: "LUNES", horaInicio: "10:00", horaFin: "15:00" },
      { profileId: profile.id, dia: "MIERCOLES", horaInicio: "14:00", horaFin: "18:00" },
    ],
  });
  console.log(
    `  ✓ Schedules: LUNES 10:00-15:00, MIERCOLES 14:00-18:00 (${schedules.count} rows)`,
  );

  const profession = await prisma.profession.upsert({
    where: { nombre: "Salud y Medicina" },
    update: {},
    create: {
      nombre: "Salud y Medicina",
      descripcion: "Profesionales médicos, odontólogos y terapeutas especializados.",
      icono: "Activity",
      orden: 1,
    },
  });

  const specialty = await prisma.specialty.upsert({
    where: {
      professionId_nombre: { professionId: profession.id, nombre: "Medicina General" },
    },
    update: {},
    create: {
      professionId: profession.id,
      nombre: "Medicina General",
      descripcion: "Atención médica integral para pacientes de todas las edades.",
    },
  });

  await prisma.professionalProfileSpecialty.upsert({
    where: {
      profileId_specialtyId: { profileId: profile.id, specialtyId: specialty.id },
    },
    update: {},
    create: { profileId: profile.id, specialtyId: specialty.id },
  });
  console.log(`  ✓ Specialty linked: ${specialty.nombre}`);

  await prisma.professionalService.deleteMany({ where: { profileId: profile.id } });
  const services = await prisma.professionalService.createMany({
    data: [
      {
        profileId: profile.id,
        nombre: "Consulta general",
        descripcion: "Consulta médica general de 30 minutos.",
        precio: 30.0,
        estado: "ACTIVO",
      },
    ],
  });
  console.log(`  ✓ Service: Consulta general (${services.count} row)`);

  console.log("Done.");
  console.log(`   URL:   http://localhost:3000/directorio/${TEST_SLUG}`);
  console.log(`   Login: ${TEST_EMAIL} / ${TEST_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error("Error seeding test professional:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
