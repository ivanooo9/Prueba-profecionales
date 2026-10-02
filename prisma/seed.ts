import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("Iniciando inicialización de la base de datos (Seeding)...");

  // 1. Crear Roles
  const adminRole = await db.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { name: "ADMIN", description: "Administrador con control absoluto del sistema." },
  });

  const professionalRole = await db.role.upsert({
    where: { name: "PROFESSIONAL" },
    update: {},
    create: { name: "PROFESSIONAL", description: "Profesional prestador de servicios y emisor de facturas." },
  });

  const clientRole = await db.role.upsert({
    where: { name: "CLIENT" },
    update: {},
    create: { name: "CLIENT", description: "Cliente registrado." },
  });

  console.log("Roles inicializados.");

  // 2. Crear Permisos
  const permissionsData = [
    { name: "manage_users", description: "Administrar usuarios, profesionales y permisos." },
    { name: "manage_content", description: "Administrar cursos, conversatorios, convenios y carrusel." },
    { name: "manage_billing", description: "Ver reportes financieros, recargas e historial." },
    { name: "manage_appointments", description: "Administrar citas y horarios." },
    { name: "emit_invoices", description: "Emitir facturas al SRI." },
  ];

  const dbPermissions = [];
  for (const perm of permissionsData) {
    const dbP = await db.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description },
      create: perm,
    });
    dbPermissions.push(dbP);
  }
  console.log("Permisos inicializados.");

  // 3. Asignar Permisos a Roles
  // ADMIN obtiene todos los permisos
  for (const p of dbPermissions) {
    await db.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: adminRole.id, permissionId: p.id },
      },
      update: {},
      create: { roleId: adminRole.id, permissionId: p.id },
    });
  }

  // PROFESSIONAL obtiene emit_invoices y manage_appointments
  const professionalPerms = dbPermissions.filter(p => ["emit_invoices", "manage_appointments"].includes(p.name));
  for (const p of professionalPerms) {
    await db.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: professionalRole.id, permissionId: p.id },
      },
      update: {},
      create: { roleId: professionalRole.id, permissionId: p.id },
    });
  }
  console.log("Relaciones Rol-Permiso inicializadas.");

  // 4. Crear Administrador por defecto
  const hashedAdminPassword = await bcrypt.hash("admin1234", 10);
  const defaultAdmin = await db.user.upsert({
    where: { email: "admin@profesionales.com" },
    update: {},
    create: {
      email: "admin@profesionales.com",
      password: hashedAdminPassword,
      name: "Administrador General",
      roleId: adminRole.id,
      status: "ACTIVE",
    },
  });
  console.log(`Usuario administrador creado: ${defaultAdmin.email} / admin1234`);

  // 5. Configuración del Sistema
  await db.systemConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      adminPassword: "admin1234",
      adminWhatsapp: "593999999999",
      bankAccounts: "Banco Pichincha - Ahorros: 2200123456 (Beneficiario: Profesionales Ecuador)\nBanco Guayaquil - Corriente: 10293847 (Beneficiario: Profesionales Ecuador)",
      defaultBalance: 5.0,
      systemName: "Profesionales Ecuador",
      loginTitle: "Profesionales Ecuador / LATAM",
      loginSubtitle: "El directorio profesional más grande de Ecuador y Latinoamérica.",
      metaDescription: "Directorio profesional, agendamiento de citas, educación continua y facturación electrónica.",
      freeInvoiceLimit: 5,
      premiumInvoiceLimit: 50
    },
  });
  console.log("Configuración del sistema inicializada.");

  // 5.1 Crear Planes de Facturación por defecto
  const defaultBillingPlans = [
    { nombre: "Plan Básico", descripcion: "Incluye 20 facturas electrónicas autorizadas.", precio: 15.00, invoiceLimit: 20, duracionDias: 30, duracionTipo: "MENSUAL" },
    { nombre: "Plan Gold", descripcion: "Incluye 50 facturas electrónicas autorizadas.", precio: 35.00, invoiceLimit: 50, duracionDias: 30, duracionTipo: "MENSUAL" },
    { nombre: "Plan Ilimitado", descripcion: "Facturación electrónica sin límites de emisión.", precio: 75.00, invoiceLimit: -1, duracionDias: 30, duracionTipo: "MENSUAL" }
  ];

  for (const bp of defaultBillingPlans) {
    await db.billingPlan.upsert({
      where: { nombre: bp.nombre },
      update: {},
      create: bp
    });
  }
  console.log("Planes de facturación SRI inicializados.");

  // 6. Profesiones y Especialidades por defecto
  const professionsData = [
    {
      nombre: "Salud y Medicina",
      descripcion: "Profesionales médicos, odontólogos y terapeutas especializados.",
      icono: "Activity",
      orden: 1,
      specialties: [
        "Medicina General",
        "Pediatría",
        "Ginecología y Obstetricia",
        "Cardiología",
        "Dermatología",
        "Oftalmología",
        "Traumatología y Ortopedia",
        "Odontología General",
        "Ortodoncia y Estética Dental",
        "Fisioterapia y Rehabilitación",
        "Nutrición y Dietética",
        "Psiquiatría",
        "Enfermería a Domicilio"
      ],
    },
    {
      nombre: "Derecho y Leyes",
      descripcion: "Asesoría legal, defensa jurídica y consultoría normativa.",
      icono: "Briefcase",
      orden: 2,
      specialties: [
        "Derecho Penal",
        "Derecho Civil y Familia",
        "Derecho Laboral",
        "Derecho Tributario y Societario",
        "Derecho Constitucional",
        "Derecho de Propiedad Intelectual",
        "Mediación y Resolución de Conflictos",
        "Notaría y Trámites Públicos"
      ],
    },
    {
      nombre: "Tecnología e Ingeniería",
      descripcion: "Desarrollo de software, infraestructura tecnológica e ingeniería aplicada.",
      icono: "Cpu",
      orden: 3,
      specialties: [
        "Desarrollo de Software / Apps",
        "Ciberseguridad y Redes",
        "Soporte Técnico de Computadoras",
        "Ingeniería Civil y Estructuras",
        "Ingeniería Eléctrica",
        "Ingeniería Mecánica",
        "Ingeniería Industrial y Procesos",
        "Ingeniería Ambiental y de Seguridad"
      ],
    },
    {
      nombre: "Psicología y Bienestar",
      descripcion: "Salud mental, consejería, terapia y desarrollo personal.",
      icono: "Heart",
      orden: 4,
      specialties: [
        "Psicología Clínica",
        "Psicología Infantil y Adolescentes",
        "Terapia de Pareja y Familiar",
        "Psicopedagogía y Aprendizaje",
        "Coaching de Vida / Personal",
        "Terapia del Lenguaje"
      ],
    },
    {
      nombre: "Finanzas y Contabilidad",
      descripcion: "Servicios de contabilidad, auditoría, impuestos y finanzas.",
      icono: "DollarSign",
      orden: 5,
      specialties: [
        "Contabilidad General (CPA)",
        "Auditoría Financiera y de Procesos",
        "Asesoría Tributaria y SRI",
        "Planificación Financiera y Costos",
        "Asesoría de Inversiones"
      ],
    },
    {
      nombre: "Construcción y Arquitectura",
      descripcion: "Diseño de espacios, planificación urbana y dirección de obra.",
      icono: "Home",
      orden: 6,
      specialties: [
        "Arquitectura de Interiores",
        "Planificación y Diseño Arquitectónico",
        "Diseño de Jardines y Paisajismo",
        "Renderizado y Modelado 3D",
        "Dirección y Fiscalización de Obra"
      ],
    },
    {
      nombre: "Marketing y Diseño",
      descripcion: "Diseño gráfico, publicidad, redes sociales y estrategia de marca.",
      icono: "Palette",
      orden: 7,
      specialties: [
        "Diseño Gráfico y Branding",
        "Marketing Digital y SEO",
        "Gestión de Redes Sociales (Community Manager)",
        "Fotografía y Video Profesional",
        "Redacción Creativa y Copywriting"
      ],
    },
    {
      nombre: "Educación y Capacitación",
      descripcion: "Docencia, nivelación académica, idiomas y formación continua.",
      icono: "BookOpen",
      orden: 8,
      specialties: [
        "Nivelación Escolar y Colegial",
        "Clases Particulares de Matemáticas/Física",
        "Enseñanza de Idioma Inglés",
        "Estimulación Temprana",
        "Tutoría Universitaria"
      ],
    },
    {
      nombre: "Oficios y Servicios Técnicos",
      descripcion: "Mantenimiento, instalaciones, reparaciones y soporte del hogar.",
      icono: "Wrench",
      orden: 9,
      specialties: [
        "Electricidad y Acometidas",
        "Plomería e Instalaciones Sanitarias",
        "Mecánica Automotriz",
        "Albañilería y Pintura de Interiores/Exteriores",
        "Carpintería y Mueblería a Medida",
        "Servicio de Cerrajería",
        "Mantenimiento de Aires Acondicionados",
        "Estética y Peluquería a Domicilio"
      ],
    }
  ];

  for (const prof of professionsData) {
    const dbProf = await db.profession.upsert({
      where: { nombre: prof.nombre },
      update: { descripcion: prof.descripcion, icono: prof.icono, orden: prof.orden },
      create: { nombre: prof.nombre, descripcion: prof.descripcion, icono: prof.icono, orden: prof.orden },
    });

    for (const spec of prof.specialties) {
      await db.specialty.upsert({
        where: {
          professionId_nombre: { professionId: dbProf.id, nombre: spec },
        },
        update: {},
        create: { professionId: dbProf.id, nombre: spec, descripcion: `Especialidad en ${spec}` },
      });
    }
  }
  console.log("Profesiones y especialidades inicializadas.");

  // 7. Páginas del CMS editable por defecto
  const defaultPages = [
    { slug: "inicio", titulo: "Inicio", contenido: "<h1>Bienvenidos a Profesionales Ecuador</h1><p>El directorio más grande del país.</p>" },
    { slug: "nosotros", titulo: "Nosotros", contenido: "<h1>Sobre Nosotros</h1><p>Conectamos a profesionales calificados con clientes que necesitan de sus servicios.</p>" },
    { slug: "contacto", titulo: "Contacto", contenido: "<h1>Contacto</h1><p>Escríbenos a soporte@profesionales.com</p>" },
    { slug: "faq", titulo: "Preguntas Frecuentes", contenido: "<h1>FAQ</h1><p>Respuestas a tus dudas más comunes.</p>" },
    { slug: "terminos", titulo: "Términos y Condiciones", contenido: "<h1>Términos de Servicio</h1><p>Términos legales de uso de la plataforma profesionales.ec</p>" },
    { slug: "privacidad", titulo: "Política de Privacidad", contenido: "<h1>Políticas de Privacidad</h1><p>Protección y uso de datos personales de nuestros usuarios.</p>" },
  ];

  for (const page of defaultPages) {
    await db.editablePage.upsert({
      where: { slug: page.slug },
      update: {},
      create: page,
    });
  }
  console.log("Páginas editables (CMS) inicializadas.");

  console.log("Seeding completado con éxito.");
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
