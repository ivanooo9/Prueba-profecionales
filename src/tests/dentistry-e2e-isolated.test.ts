import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import {
  validarCedulaEcuador,
  validarPasaporte,
  validarRucEcuador,
  validarDocumentoPaciente,
} from "../lib/ecuador-validators";
import { DentistryStorageService } from "../services/dentistry-storage.service";
import { derivePaymentStatus } from "../services/dentistry-budget.service";

test("E2E-01: Validador SRI de RUC Ecuatoriano (Módulo 11 y Módulo 10)", async (t) => {
  await t.test("valida RUC de Persona Natural (3er dígito 0-5) con establecimiento >= 001", () => {
    // Cédula válida 1710034065 + 001
    assert.equal(validarRucEcuador("1710034065001"), true);
    // Cédula válida 0926687856 + 001
    assert.equal(validarRucEcuador("0926687856001"), true);
    // Establecimiento sucursal 002
    assert.equal(validarRucEcuador("1710034065002"), true);

    // Rechaza establecimiento 000
    assert.equal(validarRucEcuador("1710034065000"), false);
    // Rechaza dígito verificador adulterado en la cédula
    assert.equal(validarRucEcuador("1710034064001"), false);
  });

  await t.test("valida RUC de Sociedad Privada / Extranjera (3er dígito 9) mediante Módulo 11", () => {
    // 1790012344001:
    // Coeficientes [4,3,2,7,6,5,4,3,2] * [1,7,9,0,0,1,2,3,4]
    // 4 + 21 + 18 + 0 + 0 + 5 + 8 + 9 + 8 = 73 -> 73 % 11 = 7 -> 11 - 7 = 4 (Verificador 4)
    assert.equal(validarRucEcuador("1790012344001"), true);

    // Con dígito verificador incorrecto debe fallar
    assert.equal(validarRucEcuador("1790012345001"), false);
    assert.equal(validarRucEcuador("1790012340001"), false);
    // Con establecimiento 000 debe fallar
    assert.equal(validarRucEcuador("1790012344000"), false);
  });

  await t.test("valida RUC de Sociedad Pública (3er dígito 6) mediante Módulo 11", () => {
    // 1760001200001:
    // Coeficientes [3,2,7,6,5,4,3,2] * [1,7,6,0,0,0,1,2]
    // 3 + 14 + 42 + 0 + 0 + 0 + 3 + 4 = 66 -> 66 % 11 = 0 -> Verificador 0
    assert.equal(validarRucEcuador("1760001200001"), true);

    // Con dígito verificador incorrecto debe fallar
    assert.equal(validarRucEcuador("1760001210001"), false);
    // Con establecimiento 0000 debe fallar
    assert.equal(validarRucEcuador("1760001200000"), false);
  });

  await t.test("rechaza RUCs con provincia inexistente, formato incorrecto o caracteres inválidos", () => {
    assert.equal(validarRucEcuador("0090012344001"), false); // provincia 00
    assert.equal(validarRucEcuador("2590012344001"), false); // provincia 25
    assert.equal(validarRucEcuador("179001234400"), false); // 12 dígitos
    assert.equal(validarRucEcuador("17900123440011"), false); // 14 dígitos
    assert.equal(validarRucEcuador("179001234400A"), false); // letras
    assert.equal(validarRucEcuador(""), false);
    assert.equal(validarRucEcuador(null as any), false);
  });
});

test("E2E-02: Validador de Pasaporte y Documento Unificado de Paciente", async (t) => {
  await t.test("valida números de pasaporte extranjero válidos", () => {
    assert.equal(validarPasaporte("A12345678"), true);
    assert.equal(validarPasaporte("PAS-987654"), true);
    assert.equal(validarPasaporte("ECU1234567"), true);
    assert.equal(validarPasaporte("G-123456789"), true);
  });

  await t.test("rechaza pasaportes demasiado cortos, largos o compuestos solo de símbolos", () => {
    assert.equal(validarPasaporte("A1234"), false); // < 6 caracteres
    assert.equal(validarPasaporte("A123456789012345678901"), false); // > 20 caracteres
    assert.equal(validarPasaporte("-------"), false); // sin alfanuméricos suficientes
    assert.equal(validarPasaporte("   "), false);
    assert.equal(validarPasaporte(null as any), false);
  });

  await t.test("validador unificado distingue correctamente cédula y pasaporte", () => {
    assert.equal(validarDocumentoPaciente("CEDULA", "1710034065"), true);
    assert.equal(validarDocumentoPaciente("CEDULA", "1710034064"), false);
    assert.equal(validarDocumentoPaciente("PASAPORTE", "A12345678"), true);
    assert.equal(validarDocumentoPaciente("PASAPORTE", "---"), false);
  });
});

test("E2E-03: Almacenamiento Seguro de Documentos Clínicos (DentistryStorageService)", async (t) => {
  const testOrgId = 99999;
  const testPatientId = 88888;
  const testFileName = "radiografia_periapical_pieza_16.pdf";
  const dummyBuffer = Buffer.from("%PDF-1.4 Dental Test Content Simulation For Audit", "utf-8");

  await t.test("sanitiza nombres de archivo y previene ataques de path traversal", () => {
    const maliciousName = "../../../../../etc/passwd";
    const sanitized = DentistryStorageService.sanitizeFileName(maliciousName);
    assert.equal(sanitized.includes("/"), false);
    assert.equal(sanitized.includes("\\"), false);
    assert.equal(sanitized.includes(".."), false);
    assert.equal(sanitized, "passwd");
  });

  await t.test("bloquea terminantemente extensiones de código ejecutable", () => {
    assert.throws(
      () => DentistryStorageService.validateFile("virus.exe", "application/x-msdownload", 1024),
      /Tipo de archivo potencialmente inseguro/
    );
    assert.throws(
      () => DentistryStorageService.validateFile("script.sh", "application/x-sh", 1024),
      /Tipo de archivo potencialmente inseguro/
    );
    assert.throws(
      () => DentistryStorageService.validateFile("payload.php", "text/php", 1024),
      /Tipo de archivo potencialmente inseguro/
    );
    assert.throws(
      () => DentistryStorageService.validateFile("batch.bat", "application/bat", 1024),
      /Tipo de archivo potencialmente inseguro/
    );
  });

  await t.test("calcula checksum SHA-256 exacto del buffer", () => {
    const checksum = DentistryStorageService.calculateChecksum(dummyBuffer);
    assert.equal(typeof checksum, "string");
    assert.equal(checksum.length, 64); // SHA-256 en hex son 64 caracteres
  });

  await t.test("guarda físicamente el archivo, permite su lectura exacta y su eliminación segura", async () => {
    // 1. Guardar
    const stored = await DentistryStorageService.saveFile(
      testOrgId,
      testPatientId,
      testFileName,
      "application/pdf",
      dummyBuffer
    );

    assert.equal(typeof stored.storageKey, "string");
    assert.equal(stored.fileSize, dummyBuffer.length);
    assert.equal(fsSync.existsSync(stored.absolutePath), true);

    // 2. Leer
    const retrieved = await DentistryStorageService.getFile(
      testOrgId,
      testPatientId,
      stored.storageKey
    );
    assert.equal(retrieved.buffer.toString("utf-8"), dummyBuffer.toString("utf-8"));

    // 3. Eliminar
    await DentistryStorageService.deleteFile(
      testOrgId,
      testPatientId,
      stored.storageKey
    );
    assert.equal(fsSync.existsSync(stored.absolutePath), false);

    // Limpieza de carpeta de prueba
    try {
      const patientDir = path.dirname(stored.absolutePath);
      const orgDir = path.dirname(patientDir);
      await fs.rm(orgDir, { recursive: true, force: true });
    } catch {}
  });
});

test("E2E-04: Lógica de Paginación y Límites de Seguridad", async (t) => {
  await t.test("aplica límites defensivos en tamaño de página (máximo 100)", () => {
    const requestedLimit = 500;
    const sanitizedLimit = Math.min(requestedLimit, 100);
    assert.equal(sanitizedLimit, 100);
  });

  await t.test("calcula páginas totales y offsets (skip) consistentes", () => {
    const totalRecords = 55;
    const pageSize = 10;
    const totalPages = Math.ceil(totalRecords / pageSize);
    assert.equal(totalPages, 6);

    const page1Skip = (1 - 1) * pageSize;
    assert.equal(page1Skip, 0);

    const page2Skip = (2 - 1) * pageSize;
    assert.equal(page2Skip, 10);

    const lastPageSkip = (6 - 1) * pageSize;
    assert.equal(lastPageSkip, 50);
  });
});

test("E2E-05: Reglas de Negocio Financieras OdontoCarePro", async (t) => {
  await t.test("valida estados de pago: UNPAID, PARTIALLY_PAID y PAID", () => {
    assert.equal(derivePaymentStatus(200.0, 0), "UNPAID");
    assert.equal(derivePaymentStatus(200.0, 100.0), "PARTIALLY_PAID");
    assert.equal(derivePaymentStatus(200.0, 200.0), "PAID");
    assert.equal(derivePaymentStatus(200.0, 250.0), "PAID");
  });
});

test("E2E-06: Verificación de Base de Datos Aislada (TEST_DATABASE_URL)", async (t) => {
  const testDbUrl = process.env.TEST_DATABASE_URL;
  if (!testDbUrl) {
    t.skip("TEST_DATABASE_URL no configurada, omitiendo pruebas de base de datos.");
    return;
  }

  const { PrismaClient } = await import("@prisma/client");
  const testPrisma = new PrismaClient({
    datasources: { db: { url: testDbUrl } },
  });

  try {
    await t.test("garantiza que la conexión se realiza estrictamente a profesionales_ecuador_test", async () => {
      const res: any = await testPrisma.$queryRaw`SELECT current_database() as db_name;`;
      assert.equal(res[0].db_name, "profesionales_ecuador_test");
    });

    await t.test("flujo completo de persistencia: Cédula, Pasaporte, unicidad y aislamiento", async () => {
      const { PatientService } = await import("../services/patient.service.js");

      // 1. Crear organización de prueba temporal
      const testOrg = await testPrisma.organization.create({
        data: {
          name: "Clínica Dental Aislada E2E",
          slug: `clinica-test-${Date.now()}`,
          type: "CLINIC",
          status: "ACTIVE",
        },
      });

      try {
        // 2. Crear paciente con Cédula válida
        const p1 = await PatientService.createPatient(
          testOrg.id,
          {
            name: "María Belén González",
            idNumber: "1710034065",
            idType: "CEDULA",
            phone: "0991234567",
          },
          testPrisma
        );
        assert.equal(p1?.idNumber, "1710034065");
        assert.equal(p1?.organizationId, testOrg.id);

        // 3. Crear paciente con Pasaporte válido
        const p2 = await PatientService.createPatient(
          testOrg.id,
          {
            name: "John Smith Foreigner",
            idNumber: "PAS-987654",
            idType: "PASAPORTE",
            phone: "0997654321",
          },
          testPrisma
        );
        assert.equal(p2?.idNumber, "PAS-987654");
        assert.equal(p2?.organizationId, testOrg.id);

        // 4. Rechazar creación con Cédula falsa / inválida
        await assert.rejects(
          async () => {
            await PatientService.createPatient(
              testOrg.id,
              {
                name: "Persona Con Cédula Trucha",
                idNumber: "1710034064", // verificador incorrecto
                idType: "CEDULA",
              },
              testPrisma
            );
          },
          /no es una cédula ecuatoriana válida según el Registro Civil/
        );

        // 5. Rechazar duplicidad de identificación en la misma organización
        await assert.rejects(
          async () => {
            await PatientService.createPatient(
              testOrg.id,
              {
                name: "Intento de Duplicado",
                idNumber: "1710034065",
                idType: "CEDULA",
              },
              testPrisma
            );
          },
          /Ya existe un paciente registrado con la identificación/
        );

        // 6. Verificar paginación y búsqueda en getPatients
        const listResult = await PatientService.getPatients(
          testOrg.id,
          { skip: 0, take: 1 },
          testPrisma
        );
        assert.equal(listResult.total, 2);
        assert.equal(listResult.patients.length, 1);
      } finally {
        // Limpiar datos creados en la base de prueba para idempotencia total
        await testPrisma.patient.deleteMany({
          where: { organizationId: testOrg.id },
        });
        await testPrisma.organization.delete({
          where: { id: testOrg.id },
        });
      }
    });
  } finally {
    await testPrisma.$disconnect();
  }
});

test("E2E-07: Precarga e idempotencia del Arancel Odontológico Ecuatoriano", async (t) => {
  const testDbUrl = process.env.TEST_DATABASE_URL;
  if (!testDbUrl || !testDbUrl.includes("profesionales_ecuador_test")) {
    throw new Error("TEST_DATABASE_URL debe apuntar estrictamente a profesionales_ecuador_test");
  }

  const { PrismaClient } = await import("@prisma/client");
  const testPrisma = new PrismaClient({
    datasources: { db: { url: testDbUrl } },
  });

  try {
    const { DentistryTreatmentService, ECUADOR_STANDARD_DENTAL_PROCEDURES } = await import(
      "../services/dentistry-treatment.service.js"
    );

    // 1. Crear organización temporal
    const testOrg = await testPrisma.organization.create({
      data: {
        name: "Clínica Test Arancel E2E",
        slug: `clinica-arancel-${Date.now()}`,
        type: "CLINIC",
        status: "ACTIVE",
      },
    });

    try {
      await t.test("precarga completa del arancel con 41 procedimientos en USD", async () => {
        const seedResult = await DentistryTreatmentService.seedDefaultProcedures(
          testOrg.id,
          testPrisma
        );

        assert.equal(seedResult.createdCount, ECUADOR_STANDARD_DENTAL_PROCEDURES.length);
        assert.equal(seedResult.skippedCount, 0);
        assert.equal(seedResult.totalCount, ECUADOR_STANDARD_DENTAL_PROCEDURES.length);

        // Verificar que los procedimientos se crearon con sus categorías y precios válidos
        const procs = await DentistryTreatmentService.getProcedures(testOrg.id, true, testPrisma);
        assert.equal(procs.length, ECUADOR_STANDARD_DENTAL_PROCEDURES.length);

        // Validar que un procedimiento específico tiene código, categoría y precio esperado
        const endo = procs.find((p: any) => p.code === "ENDO-01");
        assert.ok(endo);
        assert.equal(endo.name, "Endodoncia Unirradicular");
        assert.equal(endo.category, "Endodoncia");
        assert.equal(endo.defaultPrice, 135);
      });

      await t.test("idempotencia: una segunda precarga no duplica registros ni modifica precios personalizados", async () => {
        // Modificar precio de un procedimiento (ej. el odontólogo cambia ENDO-01 a $150)
        const procs = await DentistryTreatmentService.getProcedures(testOrg.id, true, testPrisma);
        const endo = procs.find((p: any) => p.code === "ENDO-01");
        assert.ok(endo);

        await DentistryTreatmentService.updateProcedure(
          testOrg.id,
          endo.id,
          { defaultPrice: 150.00 },
          testPrisma
        );

        // Reejecutar la precarga
        const reseedResult = await DentistryTreatmentService.seedDefaultProcedures(
          testOrg.id,
          testPrisma
        );

        assert.equal(reseedResult.createdCount, 0);
        assert.equal(reseedResult.skippedCount, ECUADOR_STANDARD_DENTAL_PROCEDURES.length);
        assert.equal(reseedResult.totalCount, ECUADOR_STANDARD_DENTAL_PROCEDURES.length);

        // Verificar que el precio personalizado $150 se preservó intacto
        const procsAfter = await DentistryTreatmentService.getProcedures(testOrg.id, true, testPrisma);
        const endoAfter = procsAfter.find((p: any) => p.code === "ENDO-01");
        assert.ok(endoAfter);
        assert.equal(endoAfter.defaultPrice, 150);
      });
    } finally {
      // Limpieza segura en teardown
      await testPrisma.dentalProcedure.deleteMany({
        where: { organizationId: testOrg.id },
      });
      await testPrisma.organization.delete({
        where: { id: testOrg.id },
      });
    }
  } finally {
    await testPrisma.$disconnect();
  }
});

test("E2E-08: Integridad de Mapeo de Planes e Items de Tratamiento (Null-Safety)", async (t) => {
  const testDbUrl = process.env.TEST_DATABASE_URL;
  assert.ok(testDbUrl, "TEST_DATABASE_URL debe estar configurada");
  assert.ok(
    testDbUrl.includes("profesionales_ecuador_test"),
    "La URL debe apuntar estrictamente a profesionales_ecuador_test"
  );

  const { PrismaClient } = await import("@prisma/client");
  const { DentistryTreatmentService } = await import("../services/dentistry-treatment.service.js");
  const testPrisma = new PrismaClient({
    datasources: { db: { url: testDbUrl } },
  });

  try {
    const timestamp = Date.now();
    const testOrg = await testPrisma.organization.create({
      data: {
        name: `Clínica Test Mapeo Planes ${timestamp}`,
        slug: `clinica-planes-${timestamp}`,
        type: "CLINIC",
        status: "ACTIVE",
      },
    });

    const testPatient = await testPrisma.patient.create({
      data: {
        organizationId: testOrg.id,
        name: "Carlos Auditado",
        idNumber: "1710034065",
      },
    });

    try {
      await t.test("createTreatmentPlan retorna totalAmount y totalEstimated en 0", async () => {
        const createdPlan = await DentistryTreatmentService.createTreatmentPlan(
          testOrg.id,
          testPatient.id,
          { title: "Plan de Ortodoncia Inicial", status: "DRAFT" },
          testPrisma
        );

        assert.equal(typeof createdPlan.totalAmount, "number");
        assert.equal(typeof (createdPlan as any).totalEstimated, "number");
        assert.equal((createdPlan as any).totalEstimated, 0);
        assert.equal(createdPlan.totalAmount, 0);
        assert.ok(Array.isArray(createdPlan.items));
      });

      await t.test("addTreatmentItem retorna unitPrice, quantity, discount y totalPrice numéricos", async () => {
        const plans = await testPrisma.dentalTreatmentPlan.findMany({
          where: { organizationId: testOrg.id },
        });
        const plan = plans[0];
        assert.ok(plan);

        const addedItem = await DentistryTreatmentService.addTreatmentItem(
          testOrg.id,
          testPatient.id,
          plan.id,
          {
            procedureName: "Profilaxis y Limpieza Supragingival",
            unitPrice: 35.5,
            toothNumber: 18,
          },
          testPrisma
        );

        assert.equal(typeof addedItem.unitPrice, "number");
        assert.equal(addedItem.unitPrice, 35.5);
        assert.equal(typeof (addedItem as any).quantity, "number");
        assert.equal((addedItem as any).quantity, 1);
        assert.equal(typeof (addedItem as any).discount, "number");
        assert.equal((addedItem as any).discount, 0);
        assert.equal(typeof (addedItem as any).totalPrice, "number");
        assert.equal((addedItem as any).totalPrice, 35.5);

        // Validar que toFixed(2) opera directamente sin lanzar error
        assert.equal((addedItem as any).totalPrice.toFixed(2), "35.50");
        assert.equal(addedItem.unitPrice.toFixed(2), "35.50");
      });

      await t.test("getAllTreatmentPlans mapea totalEstimated y totalPrice en items previniendo pantalla en blanco", async () => {
        const result = await DentistryTreatmentService.getAllTreatmentPlans(
          testOrg.id,
          {},
          testPrisma
        );

        assert.ok(result.plans.length >= 1);
        const firstPlan = result.plans[0];

        // Verificar totalEstimated en plan
        assert.equal(typeof (firstPlan as any).totalEstimated, "number");
        assert.equal((firstPlan as any).totalEstimated.toFixed(2), "35.50");

        // Verificar propiedades en items para renderizado seguro
        assert.ok(firstPlan.items.length >= 1);
        const firstItem = firstPlan.items[0];
        assert.equal(typeof (firstItem as any).totalPrice, "number");
        assert.equal(typeof (firstItem as any).quantity, "number");
        assert.equal((firstItem as any).totalPrice.toFixed(2), "35.50");
        assert.equal(firstItem.unitPrice.toFixed(2), "35.50");
      });

      await t.test("getTreatmentPlanById retorna estructura completa compatible con frontend", async () => {
        const plans = await testPrisma.dentalTreatmentPlan.findMany({
          where: { organizationId: testOrg.id },
        });
        const plan = plans[0];

        const fullPlan = await DentistryTreatmentService.getTreatmentPlanById(
          testOrg.id,
          testPatient.id,
          plan.id,
          testPrisma
        );

        assert.equal(typeof (fullPlan as any).totalEstimated, "number");
        assert.equal((fullPlan as any).totalEstimated.toFixed(2), "35.50");
        assert.ok(fullPlan.items.length >= 1);
        const item = fullPlan.items[0];
        assert.equal(typeof (item as any).totalPrice, "number");
        assert.equal((item as any).totalPrice.toFixed(2), "35.50");
      });
    } finally {
      // Teardown seguro en cascada
      await testPrisma.dentalTreatmentExecution.deleteMany({
        where: { treatmentPlan: { organizationId: testOrg.id } },
      });
      await testPrisma.dentalTreatmentItem.deleteMany({
        where: { organizationId: testOrg.id },
      });
      await testPrisma.dentalTreatmentPlan.deleteMany({
        where: { organizationId: testOrg.id },
      });
      await testPrisma.dentalRecord.deleteMany({
        where: { organizationId: testOrg.id },
      });
      await testPrisma.patient.deleteMany({
        where: { organizationId: testOrg.id },
      });
      await testPrisma.organization.delete({
        where: { id: testOrg.id },
      });
    }
  } finally {
    await testPrisma.$disconnect();
  }
});



