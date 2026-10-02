import { db } from "../db";
import { hashPassword } from "../auth";

const DEFAULT_ADMIN = {
  email: "admin@profesionales.com",
  password: "Abm1nizt4Do@R",
  name: "Administrador General",
  roleName: "ADMIN",
  roleDescription: "Administrador con control absoluto del sistema.",
} as const;

export async function autoSyncDatabaseSequences(): Promise<void> {
  try {
    const tablesResult: any[] = await db.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND column_name = 'id' 
        AND data_type IN ('integer', 'bigint')
    `);

    for (const row of tablesResult) {
      const tableName = row.table_name;
      try {
        const res: any[] = await db.$queryRawUnsafe(`
          SELECT COALESCE(MAX(id), 0) as max_id FROM "${tableName}"
        `);
        const maxId = Number(res[0]?.max_id || 0);
        const seqRes: any[] = await db.$queryRawUnsafe(`
          SELECT pg_get_serial_sequence('"${tableName}"', 'id') as seq_name
        `);
        const seq = seqRes[0]?.seq_name;
        if (seq) {
          await db.$queryRawUnsafe(`
            SELECT setval('${seq}', ${maxId + 10}, true)
          `);
        }
      } catch (err: any) {
        // Skip tables without sequences
      }
    }
  } catch (seqErr) {
    // Ignore non-critical sequence sync warnings
  }
}

export async function cleanupOrphanProfiles(): Promise<void> {
  try {
    const nonProfUsersWithProfProfile = await db.user.findMany({
      where: {
        role: {
          name: { in: ["CLIENT", "CLIENTE", "STUDENT", "ESTUDIANTE", "ADMIN", "ADMINISTRADOR"] }
        },
        professionalProfile: { isNot: null }
      },
      select: { id: true, email: true, professionalProfile: { select: { id: true } } }
    });

    if (nonProfUsersWithProfProfile.length > 0) {
      console.log(`[Startup Cleanup] Limpiando ${nonProfUsersWithProfProfile.length} perfiles profesionales erróneos creados en usuarios no profesionales (ADMIN/CLIENT/STUDENT)...`);
      for (const u of nonProfUsersWithProfProfile) {
        if (u.professionalProfile) {
          await db.professionalProfile.delete({ where: { id: u.professionalProfile.id } }).catch(() => {});
        }
      }
    }
  } catch (err) {
    // Non-critical
  }
}

export async function cleanupProgrammedCertificates(): Promise<void> {
  try {
    const invalidCertificates = await db.certificate.findMany({
      where: {
        conversatorio: {
          estado: "PROGRAMADO"
        }
      },
      select: { id: true, codigo: true, conversatorio: { select: { titulo: true } } }
    });

    if (invalidCertificates.length > 0) {
      console.log(`[Startup Cleanup] Eliminando ${invalidCertificates.length} certificados emitidos erróneamente en conversatorios en estado PROGRAMADO...`);
      for (const cert of invalidCertificates) {
        await db.paymentRequest.deleteMany({ where: { certificateId: cert.id } }).catch(() => {});
        await db.certificate.delete({ where: { id: cert.id } }).catch(() => {});
      }
    }
  } catch (err) {
    // Non-critical
  }
}

export async function ensureDefaultAdminOnStartup(): Promise<void> {
  // Always run sequence sync, orphan profile cleanup, and programmed cert cleanup on server boot
  await autoSyncDatabaseSequences();
  await cleanupOrphanProfiles();
  await cleanupProgrammedCertificates();

  const adminRole = await db.role.upsert({
    where: { name: DEFAULT_ADMIN.roleName },
    update: {},
    create: {
      name: DEFAULT_ADMIN.roleName,
      description: DEFAULT_ADMIN.roleDescription,
    },
  });

  // Ensure system roles exist
  await db.role.upsert({
    where: { name: "REFERIDO" },
    update: {},
    create: { name: "REFERIDO", description: "Rol Comercial de Referido y Afiliado" },
  });

  await db.role.upsert({
    where: { name: "CLIENT" },
    update: {},
    create: { name: "CLIENT", description: "Cliente o Comprador de la Plataforma" },
  });

  await db.role.upsert({
    where: { name: "STUDENT" },
    update: {},
    create: { name: "STUDENT", description: "Estudiante Universitario o Tecnológico" },
  });

  const existingAdmin = await db.user.findFirst({
    where: {
      role: {
        name: DEFAULT_ADMIN.roleName,
      },
    },
    select: {
      id: true,
      email: true,
    },
  });

  if (existingAdmin) {
    console.log(
      `[Startup Bootstrap] Admin existente detectado (${existingAdmin.email}). No se crea admin por defecto.`,
    );
    return;
  }

  const existingDefaultAdminEmail = await db.user.findUnique({
    where: { email: DEFAULT_ADMIN.email },
    select: {
      id: true,
      email: true,
      role: {
        select: {
          name: true,
        },
      },
    },
  });

  if (existingDefaultAdminEmail) {
    console.warn(
      `[Startup Bootstrap] El email ${DEFAULT_ADMIN.email} ya pertenece a un usuario con rol ${existingDefaultAdminEmail.role.name}. Se omite la creación automática para evitar sobrescribir privilegios.`,
    );
    return;
  }

  const hashedPassword = await hashPassword(DEFAULT_ADMIN.password);

  await db.user.create({
    data: {
      email: DEFAULT_ADMIN.email,
      password: hashedPassword,
      name: DEFAULT_ADMIN.name,
      roleId: adminRole.id,
      status: "ACTIVE",
    },
  });

  console.log(
    `[Startup Bootstrap] Admin por defecto creado con email ${DEFAULT_ADMIN.email}.`,
  );
}
