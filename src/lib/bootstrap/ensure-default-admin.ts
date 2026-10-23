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
      `[Startup Bootstrap] Admin existente detectado (${existingAdmin.email}). No se crea admin por defecto.`
    );
    return;
  }

  // FAIL-CLOSED IN PRODUCTION: Do NOT create any admin with static/default credentials
  if (process.env.NODE_ENV === "production") {
    console.log(
      "[Startup Bootstrap] Entorno de producción detectado sin usuario ADMIN. Creación automática con credenciales estáticas omitida por seguridad (FAIL-CLOSED). Use 'npm run provision:admin' para provisionar el administrador inicial de forma explícita."
    );
    return;
  }

  // En desarrollo local: solo crear si no está deshabilitado explícitamente
  if (process.env.ALLOW_DEFAULT_DEV_ADMIN === "false") {
    console.log(
      "[Startup Bootstrap] Creación de admin de desarrollo deshabilitada (ALLOW_DEFAULT_DEV_ADMIN=false)."
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
      `[Startup Bootstrap] El email ${DEFAULT_ADMIN.email} ya pertenece a un usuario con rol ${existingDefaultAdminEmail.role.name}. Se omite la creación automática para evitar sobrescribir privilegios.`
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
    `[Startup Bootstrap] Admin de desarrollo local inicializado con email ${DEFAULT_ADMIN.email}.`
  );
}

export interface ProvisionAdminInput {
  email?: string;
  password?: string;
  name?: string;
}

export interface ProvisionAdminResult {
  success: boolean;
  alreadyExisted?: boolean;
  userId?: number;
  email?: string;
  message: string;
}

/**
 * Provisionamiento explícito y seguro del administrador inicial.
 * No utiliza credenciales estáticas. Requiere contraseña segura vía variable de entorno o argumento.
 */
export async function provisionInitialAdmin(
  input?: ProvisionAdminInput
): Promise<ProvisionAdminResult> {
  const email = (input?.email || process.env.INITIAL_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "").trim();
  const password = (input?.password || process.env.INITIAL_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "").trim();
  const name = (input?.name || process.env.INITIAL_ADMIN_NAME || process.env.ADMIN_NAME || "Administrador Inicial").trim();

  if (!email) {
    throw new Error("PROVISION_ERROR: Se requiere 'INITIAL_ADMIN_EMAIL' o especificar un email válido.");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("PROVISION_ERROR: El formato del email es inválido.");
  }

  if (!password) {
    throw new Error("PROVISION_ERROR: Se requiere 'INITIAL_ADMIN_PASSWORD' o especificar una contraseña.");
  }

  if (password.length < 8) {
    throw new Error("PROVISION_ERROR: La contraseña debe tener al menos 8 caracteres.");
  }

  // Ensure ADMIN role exists
  const adminRole = await db.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: {
      name: "ADMIN",
      description: "Administrador con control absoluto del sistema.",
    },
  });

  // Check if user with this email already exists
  const existingUser = await db.user.findUnique({
    where: { email },
    include: { role: true },
  });

  if (existingUser) {
    if (existingUser.role?.name === "ADMIN") {
      return {
        success: true,
        alreadyExisted: true,
        userId: existingUser.id,
        email: existingUser.email,
        message: `El usuario '${email}' ya existe como Administrador (ID: ${existingUser.id}). No se aplicaron modificaciones.`,
      };
    }
    throw new Error(`PROVISION_ERROR: El email '${email}' ya pertenece a un usuario con rol '${existingUser.role?.name || "desconocido"}'.`);
  }

  const hashedPassword = await hashPassword(password);

  const newUser = await db.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      roleId: adminRole.id,
      status: "ACTIVE",
    },
  });

  return {
    success: true,
    alreadyExisted: false,
    userId: newUser.id,
    email: newUser.email,
    message: `Administrador '${email}' provisionado exitosamente (ID: ${newUser.id}).`,
  };
}

export async function runStartupMaintenance(): Promise<void> {
  await autoSyncDatabaseSequences();
  await cleanupOrphanProfiles();
  await cleanupProgrammedCertificates();
}
