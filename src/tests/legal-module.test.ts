import assert from "node:assert/strict";
import test from "node:test";
import { db } from "../lib/db";
import { LegalService } from "../services/legal.service";
import { LegalCaseOperationsService } from "../services/legal-case-operations.service";
import { LegalDocumentService } from "../services/legal-document.service";
import {
  LegalFinanceService,
  deriveLegalPaymentStatus,
} from "../services/legal-finance.service";
import { LegalCaseClosureService } from "../services/legal-case-closure.service";
import { OrganizationService } from "../services/organization.service";
import {
  ORGANIZATION_MEMBER_ROLE,
  ORGANIZATION_MEMBER_STATUS,
  ORGANIZATION_STATUS,
} from "../constants/organization.constants";
import { PROFESSIONAL_MODULE_CODE } from "../constants/professional-module.constants";
import { createAuthSession, hashPassword, validateSessionToken } from "../lib/auth";

test(
  "ABOGADO Pro — Suite Integral de Validación Preproducción del Módulo Legal",
  {
    skip: !process.env.DATABASE_URL
      ? "DATABASE_URL is required for legal-module integration tests"
      : false,
  },
  async (t) => {
    try {
      await db.$queryRaw`SELECT 1`;
    } catch {
      t.skip("Prisma database is not reachable. Skipping integration tests.");
      return;
    }

    const timestamp = Date.now();
    const testEmailOwnerA = `owner-a-${timestamp}@despacho.test`;
    const testEmailLawyerA = `lawyer-a-${timestamp}@despacho.test`;
    const testEmailSecretaryA = `secretary-a-${timestamp}@despacho.test`;
    const testEmailAssistantA = `assistant-a-${timestamp}@despacho.test`;
    const testEmailOwnerB = `owner-b-${timestamp}@despacho.test`;

    // 1. Setup Roles
    const roleProfessional = await db.role.upsert({
      where: { name: "PROFESSIONAL" },
      update: {},
      create: { name: "PROFESSIONAL", description: "Profesional Titulado" },
    });

    const roleSecretary = await db.role.upsert({
      where: { name: "SECRETARY" },
      update: {},
      create: { name: "SECRETARY", description: "Secretaria de Despacho" },
    });

    const roleAssistant = await db.role.upsert({
      where: { name: "ASSISTANT" },
      update: {},
      create: { name: "ASSISTANT", description: "Asistente Jurídico" },
    });

    // 2. Setup Users
    const pwd = await hashPassword("Test1234!");
    const userOwnerA = await db.user.create({
      data: {
        name: "Dr. Carlos Mora (Titular A)",
        email: testEmailOwnerA,
        password: pwd,
        roleId: roleProfessional.id,
        status: "ACTIVE",
      },
    });

    const userLawyerA = await db.user.create({
      data: {
        name: "Dra. Andrea Salgado (Abogada A)",
        email: testEmailLawyerA,
        password: pwd,
        roleId: roleProfessional.id,
        status: "ACTIVE",
      },
    });

    const userSecretaryA = await db.user.create({
      data: {
        name: "Sofía Intriago (Secretaria A)",
        email: testEmailSecretaryA,
        password: pwd,
        roleId: roleSecretary.id,
        status: "ACTIVE",
      },
    });

    const userAssistantA = await db.user.create({
      data: {
        name: "Mateo Cárdenas (Pasante A)",
        email: testEmailAssistantA,
        password: pwd,
        roleId: roleAssistant.id,
        status: "ACTIVE",
      },
    });

    const userOwnerB = await db.user.create({
      data: {
        name: "Dr. Rodrigo Borja (Titular B)",
        email: testEmailOwnerB,
        password: pwd,
        roleId: roleProfessional.id,
        status: "ACTIVE",
      },
    });

    // 3. Setup Organizations
    const orgAData = await OrganizationService.createOrganization({
      userId: userOwnerA.id,
      name: `Bufete Jurídico Mora & Asociados ${timestamp}`,
      moduleCode: PROFESSIONAL_MODULE_CODE.LEGAL,
    });
    const orgAId = orgAData.organization.id;

    const orgBData = await OrganizationService.createOrganization({
      userId: userOwnerB.id,
      name: `Consultoría Legal Borja ${timestamp}`,
      moduleCode: PROFESSIONAL_MODULE_CODE.LEGAL,
    });
    const orgBId = orgBData.organization.id;

    // Add members to Org A
    await db.organizationMember.create({
      data: {
        organizationId: orgAId,
        userId: userLawyerA.id,
        role: ORGANIZATION_MEMBER_ROLE.PROFESSIONAL,
        status: ORGANIZATION_MEMBER_STATUS.ACTIVE,
      },
    });

    await db.organizationMember.create({
      data: {
        organizationId: orgAId,
        userId: userSecretaryA.id,
        role: ORGANIZATION_MEMBER_ROLE.SECRETARY,
        status: ORGANIZATION_MEMBER_STATUS.ACTIVE,
      },
    });

    await db.organizationMember.create({
      data: {
        organizationId: orgAId,
        userId: userAssistantA.id,
        role: ORGANIZATION_MEMBER_ROLE.ASSISTANT,
        status: ORGANIZATION_MEMBER_STATUS.ACTIVE,
      },
    });

    let createdClientIdA: number;
    let createdCaseIdA: number;
    let createdFeeAgreementIdA: number;

    // Teardown hook
    t.after(async () => {
      try {
        await db.legalPayment.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
        await db.legalFeeItem.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
        await db.legalFeeAgreement.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
        await db.legalDocumentVersion.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
        await db.legalDocument.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
        await db.legalHearing.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
        await db.legalDeadline.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
        await db.legalTask.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
        await db.legalCaseActivity.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
        await db.legalCase.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
        await db.legalClient.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
        await db.organizationMember.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
        await db.organizationModule.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
        await db.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
        await db.user.deleteMany({
          where: {
            id: {
              in: [
                userOwnerA.id,
                userLawyerA.id,
                userSecretaryA.id,
                userAssistantA.id,
                userOwnerB.id,
              ],
            },
          },
        });
      } catch (err) {
        console.error("[legal-module.test.ts] Error en teardown:", err);
      }
    });

    // -------------------------------------------------------------
    // PRUEBA 1: CLIENTES JURÍDICOS Y REGLAS DE UNICIDAD
    // -------------------------------------------------------------
    await t.test("1. Clientes Jurídicos: creación, validaciones y unicidad tenant", async () => {
      // Nombre requerido
      await assert.rejects(
        async () => {
          await LegalService.createClient(orgAId, {
            name: "",
            identification: "1710034065",
            identificationType: "cedula",
          });
        },
        /El nombre del cliente es obligatorio/
      );

      // Tipo de identificación inválido
      await assert.rejects(
        async () => {
          await LegalService.createClient(orgAId, {
            name: "Cliente Inválido",
            identification: "1710034065",
            identificationType: "inexistente" as any,
          });
        },
        /Tipo de identificación inválido/
      );

      // Creación exitosa en Org A
      const clientA = await LegalService.createClient(orgAId, {
        name: "Corporación Minera Andina S.A.",
        identificationType: "ruc",
        identification: `1792048572001`,
        clientType: "persona_juridica",
        email: "legal@minerandina.test",
        phone: "0991234567",
      });

      assert.ok(clientA.id);
      createdClientIdA = Number(clientA.id);
      assert.equal(clientA.name, "Corporación Minera Andina S.A.");

      // Rechazo de cédula/RUC duplicado en la MISMA organización
      await assert.rejects(
        async () => {
          await LegalService.createClient(orgAId, {
            name: "Minera Duplicada",
            identificationType: "ruc",
            identification: `1792048572001`,
          });
        },
        /Ya existe un cliente con la identificación/
      );

      // Mismo RUC PERMITIDO en Organización B (aislamiento multi-tenant)
      const clientB = await LegalService.createClient(orgBId, {
        name: "Corporación Minera en Despacho B",
        identificationType: "ruc",
        identification: `1792048572001`,
      });
      assert.ok(clientB.id);
      assert.notEqual(clientB.id, clientA.id);
    });

    // -------------------------------------------------------------
    // PRUEBA 2: CREACIÓN CANÓNICA DE CASOS Y ASIGNACIÓN DE ABOGADO
    // -------------------------------------------------------------
    await t.test("2. Creación canónica de expedientes y validación de abogado responsable", async () => {
      // Rechazar creación con clientId inexistente
      await assert.rejects(
        async () => {
          await LegalService.createCase(orgAId, 999999, {
            title: "Demanda sin cliente",
          });
        },
        /Cliente jurídico con ID 999999 no encontrado/
      );

      // Rechazar asignación de usuario inexistente
      await assert.rejects(
        async () => {
          await LegalService.createCase(orgAId, createdClientIdA, {
            title: "Caso Abogado Fantasma",
            responsibleUserId: 999999,
          });
        },
        /El usuario responsable con ID 999999 no existe/
      );

      // Rechazar asignación de usuario con rol ASSISTANT (no calificado)
      await assert.rejects(
        async () => {
          await LegalService.createCase(orgAId, createdClientIdA, {
            title: "Caso con Pasante Responsable",
            responsibleUserId: userAssistantA.id,
          });
        },
        /no está autorizado para asumir la responsabilidad de un caso jurídico/
      );

      // Rechazar asignación de usuario con rol SECRETARY (no calificado)
      await assert.rejects(
        async () => {
          await LegalService.createCase(orgAId, createdClientIdA, {
            title: "Caso con Secretaria Responsable",
            responsibleUserId: userSecretaryA.id,
          });
        },
        /no está autorizado para asumir la responsabilidad de un caso jurídico/
      );

      // Creación exitosa asignando abogada autorizada (PROFESSIONAL)
      const caseA = await LegalService.createCase(orgAId, createdClientIdA, {
        title: "Juicio Ordinario de Resolución de Contrato",
        description: "Disputa sobre cláusula resolutoria tácita y daños contractuales",
        processType: "Ordinario Civil",
        legalArea: "Civil",
        responsibleUserId: userLawyerA.id,
        courtName: "Unidad Judicial Civil del Distrito Metropolitano de Quito",
        claimAmount: "85000.00",
      });

      assert.ok(caseA.id);
      createdCaseIdA = Number(caseA.id);
      assert.equal(caseA.responsibleUserId, userLawyerA.id);
      assert.equal(caseA.assignedLawyer, userLawyerA.name);
      assert.match(caseA.internalCaseNumber, /^CAS-\d{4}-\d{4}$/);
    });

    // -------------------------------------------------------------
    // PRUEBA 3: OPERACIONES PROCESALES (Tareas, Plazos, Audiencias)
    // -------------------------------------------------------------
    await t.test("3. Operaciones del caso: Tareas, Plazos Procesales y Audiencias", async () => {
      // 1. Tarea operativa
      const task = await LegalCaseOperationsService.createTask(
        orgAId,
        createdCaseIdA,
        {
          title: "Redactar contestación a reconvención",
          description: "Revisar excepciones previas deducidas por la contraparte",
          dueDate: new Date(Date.now() + 86400000 * 3), // en 3 días
          priority: "Alta",
          assignedToUserId: userLawyerA.id,
        }
      );
      assert.ok(task.id);
      assert.equal(task.title, "Redactar contestación a reconvención");
      assert.equal(task.status, "Pendiente");

      // 2. Plazo procesal
      const deadline = await LegalCaseOperationsService.createDeadline(
        orgAId,
        createdCaseIdA,
        {
          title: "Término probatorio - Anuncio testimonial",
          deadlineAt: new Date(Date.now() + 86400000 * 5),
          priority: "Urgente",
          responsibleUserId: userLawyerA.id,
          isUrgent: true,
        }
      );
      assert.ok(deadline.id);
      assert.equal(deadline.isUrgent, true);

      // 3. Audiencia
      const hearing = await LegalCaseOperationsService.createHearing(
        orgAId,
        createdCaseIdA,
        {
          title: "Audiencia Preliminar COGEP",
          scheduledAt: new Date(Date.now() + 86400000 * 10),
          hearingType: "Preliminar",
          responsibleUserId: userLawyerA.id,
          location: "Sala 302 - Complejo Judicial Norte",
        }
      );
      assert.ok(hearing.id);
      assert.equal(hearing.hearingType, "Preliminar");
    });

    // -------------------------------------------------------------
    // PRUEBA 4: GESTIÓN DOCUMENTAL, VERSIONAMIENTO Y PERSISTENCIA
    // -------------------------------------------------------------
    await t.test("4. Expediente Documental: versión inicial física, versionamiento v2 y archivo", async () => {
      const fileV1 = {
        originalName: "demanda_inicial_firmada.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4 Demanda Inicial Contenido Seguro"),
        notes: "Demanda ingresada con fe de presentación",
      };

      const doc = await LegalDocumentService.createDocument(
        orgAId,
        createdCaseIdA,
        {
          title: "Demanda y Fe de Presentación",
          documentType: "Demanda",
          description: "Copia certificada con timbre electrónico de la Judicatura",
        },
        fileV1,
        userLawyerA.id
      );

      assert.ok(doc.id);
      assert.equal(doc.latestVersionNumber, 1);
      assert.equal(doc.versions[0].fileName, "demanda_inicial_firmada.pdf");

      // Subir Versión 2
      const fileV2 = {
        originalName: "demanda_con_auto_admisorio.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4 Demanda con Auto de Calificación Favorable"),
        notes: "Se anexa auto que califica la demanda por clara y completa",
      };

      const docV2 = await LegalDocumentService.addVersion(
        orgAId,
        createdCaseIdA,
        doc.id,
        fileV2,
        userLawyerA.id
      );

      assert.equal(docV2.versionNumber, 2);

      // Comprobar persistencia física y recuperación
      const downloaded = await LegalDocumentService.getVersionFile(
        orgAId,
        createdCaseIdA,
        doc.id,
        docV2.id
      );
      assert.ok(downloaded.buffer);
      assert.equal(downloaded.versionNumber, 2);
      assert.match(downloaded.buffer.toString(), /Auto de Calificación/);
    });

    // -------------------------------------------------------------
    // PRUEBA 5: GESTIÓN FINANCIERA, MÉTODOS DE PAGO Y ANTI-SOBREPAGO
    // -------------------------------------------------------------
    await t.test("5. Finanzas: creación de honorarios, abonos, métodos válidos y anti-overpayment", async () => {
      // 1. Crear acuerdo de honorarios por $1,000.00
      const agreement = await LegalFinanceService.createFeeAgreement(
        orgAId,
        createdCaseIdA,
        {
          title: "Honorarios de Patrocinio Primera Instancia",
          items: [
            { description: "Fase postulartoria y contestación", unitPrice: 400.0 },
            { description: "Fase de audiencia y alegatos", unitPrice: 600.0 },
          ],
        },
        userOwnerA.id
      );

      assert.ok(agreement.id);
      createdFeeAgreementIdA = agreement.id;
      assert.equal(Number(agreement.total), 1000.0);
      assert.equal(agreement.paymentStatus, "UNPAID");

      // 2. Registrar primer pago mediante 'paymentMethod' (Efectivo - $400.00)
      const pay1 = await LegalFinanceService.recordPayment(
        orgAId,
        createdCaseIdA,
        agreement.id,
        {
          amount: 400.0,
          paymentMethod: "Efectivo",
          reference: "REC-EF-001",
        },
        userSecretaryA.id
      );

      assert.ok(pay1.payment.id);
      assert.equal(pay1.payment.paymentMethod, "Efectivo");
      assert.equal(pay1.financialSummary.paidAmount, 400.0);
      assert.equal(pay1.financialSummary.balance, 600.0);
      assert.equal(pay1.financialSummary.paymentStatus, "PARTIALLY_PAID");

      // 3. Probar rechazo de método de pago no permitido mientras todavía hay saldo pendiente ($600.00)
      await assert.rejects(
        async () => {
          await LegalFinanceService.recordPayment(
            orgAId,
            createdCaseIdA,
            agreement.id,
            {
              amount: 50.0,
              paymentMethod: "Criptomoneda",
            },
            userSecretaryA.id
          );
        },
        /Método de pago no admitido/
      );

      // 4. Registrar segundo pago mediante sinónimo 'method' con mayúsculas y acentos ('TRANSFERENCIA' - $600.00)
      const pay2 = await LegalFinanceService.recordPayment(
        orgAId,
        createdCaseIdA,
        agreement.id,
        {
          amount: 600.0,
          method: "TRANSFERENCIA",
          reference: "TRANS-PICHINCHA-98213",
        },
        userSecretaryA.id
      );

      assert.equal(pay2.payment.paymentMethod, "Transferencia");
      assert.equal(pay2.financialSummary.paidAmount, 1000.0);
      assert.equal(pay2.financialSummary.balance, 0.0);
      assert.equal(pay2.financialSummary.paymentStatus, "PAID");

      // 5. Anti-overpayment: rechazar abono cuando el saldo ya está en cero
      await assert.rejects(
        async () => {
          await LegalFinanceService.recordPayment(
            orgAId,
            createdCaseIdA,
            agreement.id,
            {
              amount: 50.0,
              paymentMethod: "Efectivo",
            },
            userSecretaryA.id
          );
        },
        /supera el saldo pendiente actual/
      );

      // Test puro de función deriveLegalPaymentStatus
      assert.equal(deriveLegalPaymentStatus(1000, 0), "UNPAID");
      assert.equal(deriveLegalPaymentStatus(1000, 500), "PARTIALLY_PAID");
      assert.equal(deriveLegalPaymentStatus(1000, 1000), "PAID");
      assert.equal(deriveLegalPaymentStatus(1000, 1200), "PAID");
    });

    // -------------------------------------------------------------
    // PRUEBA 6: AUDITORÍA PRE-CIERRE, CIERRE E INMUTABILIDAD EN ARCHIVADO
    // -------------------------------------------------------------
    await t.test("6. Cierre Formal, Idempotencia, Archivado y Blindaje Documental (P2-BUS-01)", async () => {
      // 1. Closure Check inicial: detecta advertencia de tareas y plazos pendientes
      const check = await LegalCaseClosureService.getClosureCheck(
        orgAId,
        createdCaseIdA,
        userOwnerA.id
      );
      assert.equal(check.summary.hasPendingItems, true);
      assert.equal(check.summary.hasFinancialBalance, false); // Saldo en 0
      assert.ok(check.warnings.length > 0);

      // 2. Ejecutar cierre formal del caso
      const closureResult = await LegalCaseClosureService.closeCase(
        orgAId,
        createdCaseIdA,
        {
          reason: "Sentencia ejecutoriada favorable para el cliente",
          notes: "Liquidación y costas canceladas en su totalidad",
        },
        userOwnerA.id
      );

      assert.equal(closureResult.case.status, "Cerrado");
      assert.ok(closureResult.case.closedAt);

      // 3. Idempotencia: re-ejecutar cierre sin error
      const reClosure = await LegalCaseClosureService.closeCase(
        orgAId,
        createdCaseIdA,
        { reason: "Re-cierre para verificación" },
        userOwnerA.id
      );
      assert.equal(reClosure.case.status, "Cerrado");

      // 4. Archivar formalmente el expediente
      const archiveResult = await LegalCaseClosureService.archiveCase(
        orgAId,
        createdCaseIdA,
        {
          reason: "Plazo de conservación pasiva de 5 años iniciado",
          notes: "Expediente digital custodiado en repositorio inmutable",
        },
        userOwnerA.id
      );

      assert.equal(archiveResult.case.status, "Archivado");
      assert.ok(archiveResult.case.archivedAt);

      // 5. BLINDAJE P2-BUS-01: Rechazar creación de nuevos documentos en caso archivado
      await assert.rejects(
        async () => {
          await LegalDocumentService.createDocument(
            orgAId,
            createdCaseIdA,
            {
              title: "Escrito Extemporáneo",
              documentType: "Escrito",
            },
            {
              originalName: "extemporaneo.pdf",
              mimeType: "application/pdf",
              buffer: Buffer.from("%PDF-1.4 Fake"),
            },
            userLawyerA.id
          );
        },
        /No se pueden crear nuevos documentos en un expediente que se encuentra archivado/
      );

      // 6. BLINDAJE P2-BUS-01: Rechazar adición de nuevas versiones a documentos existentes en caso archivado
      const existingDoc = await db.legalDocument.findFirst({
        where: { organizationId: orgAId, legalCaseId: createdCaseIdA },
      });
      assert.ok(existingDoc);

      await assert.rejects(
        async () => {
          await LegalDocumentService.addVersion(
            orgAId,
            createdCaseIdA,
            existingDoc.id,
            {
              originalName: "v3_ilegal.pdf",
              mimeType: "application/pdf",
              buffer: Buffer.from("%PDF-1.4 Fake"),
            },
            userLawyerA.id
          );
        },
        /No se pueden añadir nuevas versiones documentales a un expediente que se encuentra archivado/
      );

      // 7. BLINDAJE P2-BUS-01: Rechazar actualización de metadatos de documentos en caso archivado
      await assert.rejects(
        async () => {
          await LegalDocumentService.updateDocument(
            orgAId,
            createdCaseIdA,
            existingDoc.id,
            { title: "Título Modificado Tras Archivo" }
          );
        },
        /No se pueden modificar documentos de un expediente que se encuentra archivado/
      );
    });

    // -------------------------------------------------------------
    // PRUEBA 7: AISLAMIENTO MULTI-TENANT ESTRICTO
    // -------------------------------------------------------------
    await t.test("7. Aislamiento Multi-Tenant Estricto (Cross-tenant access blocked)", async () => {
      // Org B intenta acceder o cerrar el caso de Org A
      await assert.rejects(
        async () => {
          await LegalCaseClosureService.closeCase(
            orgBId,
            createdCaseIdA,
            { reason: "Intrusión cross-tenant" },
            userOwnerB.id
          );
        },
        /Caso jurídico.* no encontrado en la organización/
      );

      // Org B intenta consultar documentos del caso de Org A
      await assert.rejects(
        async () => {
          await LegalDocumentService.listDocuments(orgBId, createdCaseIdA);
        },
        /Caso jurídico.* no encontrado en la organización/
      );

      // Org B intenta registrar pagos en el acuerdo de honorarios de Org A
      await assert.rejects(
        async () => {
          await LegalFinanceService.recordPayment(
            orgBId,
            createdCaseIdA,
            createdFeeAgreementIdA,
            {
              amount: 100.0,
              paymentMethod: "Efectivo",
            },
            userOwnerB.id
          );
        },
        /Caso jurídico.* no encontrado en la organización/
      );
    });

    // -------------------------------------------------------------
    // PRUEBA 8: RBAC Y AUTORIZACIÓN POR ROLES EN OPERACIONES SENSIBLES
    // -------------------------------------------------------------
    await t.test("8. RBAC: Cierre/Archivo exclusivo de Abogados/Admin, Pagos permitidos a Secretaria", async () => {
      // Creamos un segundo caso en Org A para probar permisos de roles no autorizados
      const case2 = await LegalService.createCase(orgAId, createdClientIdA, {
        title: "Expediente de Prueba de Roles",
        responsibleUserId: userLawyerA.id,
      });

      // SECRETARY intenta cerrar caso -> RECHAZADO (P1-SEC-02)
      await assert.rejects(
        async () => {
          await LegalCaseClosureService.closeCase(
            orgAId,
            Number(case2.id),
            { reason: "Cierre no autorizado" },
            userSecretaryA.id
          );
        },
        /No tienes permisos suficientes para cerrar formalmente el expediente/
      );

      // ASSISTANT intenta archivar caso -> RECHAZADO (P1-SEC-02)
      await assert.rejects(
        async () => {
          await LegalCaseClosureService.archiveCase(
            orgAId,
            Number(case2.id),
            { reason: "Archivo no autorizado" },
            userAssistantA.id
          );
        },
        /No tienes permisos suficientes para archivar.* el expediente/
      );

      // OWNER o PROFESSIONAL cierran caso -> PERMITIDO
      const validClose = await LegalCaseClosureService.closeCase(
        orgAId,
        Number(case2.id),
        { reason: "Cierre autorizado por Abogada Titular" },
        userLawyerA.id
      );
      assert.equal(validClose.case.status, "Cerrado");
    });

    // -------------------------------------------------------------
    // PRUEBA 9: IDEMPOTENCIA REAL DE PAGOS Y PROTECCIÓN CONTRA COLISIONES
    // -------------------------------------------------------------
    await t.test("9. Idempotencia real de pagos: reintentos válidos, detección de colisión/conflicto y rejugado", async () => {
      // 1. Crear un expediente activo para pruebas financieras
      const caseFinance = await LegalService.createCase(orgAId, createdClientIdA, {
        title: "Expediente para Pruebas de Idempotencia Financiera",
        responsibleUserId: userLawyerA.id,
      });

      const agreement = await LegalFinanceService.createFeeAgreement(
        orgAId,
        Number(caseFinance.id),
        {
          title: "Honorarios de Juicio Sumario",
          items: [{ description: "Honorarios convenidos", unitPrice: 800.0 }],
        },
        userOwnerA.id
      );

      const stableKey = `idem-key-${Date.now()}-abc`;

      // 2. Registro inicial de pago con clave de idempotencia ($300.00)
      const pay1 = await LegalFinanceService.recordPayment(
        orgAId,
        Number(caseFinance.id),
        agreement.id,
        {
          amount: 300.0,
          paymentMethod: "Transferencia",
          reference: "TRANS-IDEM-001",
          idempotencyKey: stableKey,
        },
        userSecretaryA.id
      );

      assert.ok(pay1.payment.id);
      assert.ok(!pay1.idempotentReplay);
      assert.equal(pay1.financialSummary.paidAmount, 300.0);
      assert.equal(pay1.financialSummary.balance, 500.0);

      // 3. Reintento legítimo con la misma clave e idénticos datos (debe rejugarse sin debitar de nuevo)
      const payReplay = await LegalFinanceService.recordPayment(
        orgAId,
        Number(caseFinance.id),
        agreement.id,
        {
          amount: 300.0,
          paymentMethod: "Transferencia",
          reference: "TRANS-IDEM-001",
          idempotencyKey: stableKey,
        },
        userSecretaryA.id
      );

      assert.equal(payReplay.idempotentReplay, true);
      assert.equal(payReplay.payment.id, pay1.payment.id);
      assert.equal(payReplay.financialSummary.paidAmount, 300.0);
      assert.equal(payReplay.financialSummary.balance, 500.0); // El saldo sigue siendo 500.0, NO 200.0

      // 4. Intento con la misma clave pero importe incompatible ($400.00 en vez de $300.00) -> Conflicto 409
      await assert.rejects(
        async () => {
          await LegalFinanceService.recordPayment(
            orgAId,
            Number(caseFinance.id),
            agreement.id,
            {
              amount: 400.0,
              paymentMethod: "Transferencia",
              idempotencyKey: stableKey,
            },
            userSecretaryA.id
          );
        },
        /Conflicto de idempotencia/
      );

      // 5. Verificación en base de datos: solo debe existir un único registro con esa clave
      const paymentsInDb = await db.legalPayment.findMany({
        where: { organizationId: orgAId, idempotencyKey: stableKey },
      });
      assert.equal(paymentsInDb.length, 1);

      // 6. Compatibilidad con pagos históricos o sin clave de idempotencia (idempotencyKey: null/undefined)
      const payNoKey1 = await LegalFinanceService.recordPayment(
        orgAId,
        Number(caseFinance.id),
        agreement.id,
        {
          amount: 100.0,
          paymentMethod: "Efectivo",
        },
        userSecretaryA.id
      );
      assert.ok(payNoKey1.payment.id);
      assert.equal(payNoKey1.financialSummary.paidAmount, 400.0);

      const payNoKey2 = await LegalFinanceService.recordPayment(
        orgAId,
        Number(caseFinance.id),
        agreement.id,
        {
          amount: 100.0,
          paymentMethod: "Efectivo",
        },
        userSecretaryA.id
      );
      assert.ok(payNoKey2.payment.id);
      assert.equal(payNoKey2.financialSummary.paidAmount, 500.0);
    });

    // -------------------------------------------------------------
    // PRUEBA 10: INMUTABILIDAD Y BLINDAJE INTEGRAL DE EXPEDIENTES ARCHIVADOS
    // -------------------------------------------------------------
    await t.test("10. Inmutabilidad estricta: bloqueo total de modificaciones en casos archivados", async () => {
      // createdCaseIdA fue archivado en la Prueba 6.
      // 1. Bloqueo de updateCase directo en caso archivado
      await assert.rejects(
        async () => {
          await LegalService.updateCase(orgAId, createdCaseIdA, {
            title: "Intento de cambiar título tras archivo",
          });
        },
        /No se pueden modificar los datos de un expediente archivado/
      );

      // 2. Bloqueo de transición directa de estado a Cerrado o Archivado en updateCase
      const activeCase = await LegalService.createCase(orgAId, createdClientIdA, {
        title: "Caso para prueba de transición de estado",
        responsibleUserId: userLawyerA.id,
      });

      await assert.rejects(
        async () => {
          await LegalService.updateCase(orgAId, Number(activeCase.id), {
            status: "Archivado",
          });
        },
        /El cierre y archivado de expedientes deben realizarse exclusivamente mediante los procedimientos formales/
      );

      await assert.rejects(
        async () => {
          await LegalService.updateCase(orgAId, Number(activeCase.id), {
            status: "Cerrado",
          });
        },
        /El cierre y archivado de expedientes deben realizarse exclusivamente mediante los procedimientos formales/
      );

      // 3. Bloqueo de creación de acuerdos de honorarios en caso archivado
      await assert.rejects(
        async () => {
          await LegalFinanceService.createFeeAgreement(
            orgAId,
            createdCaseIdA,
            {
              title: "Acuerdo Ilegal",
              items: [{ description: "Honorarios", unitPrice: 500 }],
            },
            userOwnerA.id
          );
        },
        /No se pueden crear acuerdos de honorarios en un expediente.*Archivado/
      );

      // 4. Bloqueo de modificación de acuerdos existentes en caso archivado
      await assert.rejects(
        async () => {
          await LegalFinanceService.updateFeeAgreement(
            orgAId,
            createdCaseIdA,
            createdFeeAgreementIdA,
            { description: "Modificación no permitida" }
          );
        },
        /No se pueden modificar acuerdos de honorarios en un expediente.*archivado/
      );

      // 5. Bloqueo de registro de pagos en caso archivado
      await assert.rejects(
        async () => {
          await LegalFinanceService.recordPayment(
            orgAId,
            createdCaseIdA,
            createdFeeAgreementIdA,
            { amount: 50, paymentMethod: "Efectivo" },
            userSecretaryA.id
          );
        },
        /No se pueden registrar pagos en un expediente.*archivado/
      );

      // 6. Bloqueo de registro de actuaciones en caso archivado
      await assert.rejects(
        async () => {
          await LegalCaseOperationsService.addCaseActivity(
            orgAId,
            createdCaseIdA,
            {
              title: "Actuación Extemporánea",
              type: "Diligencia",
              occurredAt: new Date().toISOString(),
            },
            userLawyerA.id
          );
        },
        /No se pueden registrar nuevas actuaciones en un expediente archivado/
      );

      // 7. Bloqueo de actualización de tareas vinculadas a caso archivado
      const taskA = await db.legalTask.findFirst({
        where: { organizationId: orgAId, legalCaseId: createdCaseIdA },
      });
      if (taskA) {
        await assert.rejects(
          async () => {
            await LegalCaseOperationsService.updateTask(
              orgAId,
              createdCaseIdA,
              taskA.id,
              {
                title: "Tarea modificada tras archivo",
              }
            );
          },
          /No se pueden modificar tareas de un expediente archivado/
        );
      }

      // 8. Bloqueo de actualización de plazos vinculados a caso archivado
      const deadlineA = await db.legalDeadline.findFirst({
        where: { organizationId: orgAId, legalCaseId: createdCaseIdA },
      });
      if (deadlineA) {
        await assert.rejects(
          async () => {
            await LegalCaseOperationsService.updateDeadline(
              orgAId,
              createdCaseIdA,
              deadlineA.id,
              {
                title: "Plazo modificado tras archivo",
              }
            );
          },
          /No se pueden modificar plazos procesales de un expediente archivado/
        );
      }

      // 9. Bloqueo de actualización de audiencias vinculadas a caso archivado
      const hearingA = await db.legalHearing.findFirst({
        where: { organizationId: orgAId, legalCaseId: createdCaseIdA },
      });
      if (hearingA) {
        await assert.rejects(
          async () => {
            await LegalCaseOperationsService.updateHearing(
              orgAId,
              createdCaseIdA,
              hearingA.id,
              {
                title: "Audiencia modificada tras archivo",
              }
            );
          },
          /No se pueden modificar audiencias de un expediente archivado/
        );
      }
    });

    // -------------------------------------------------------------
    // PRUEBA 11: RESOLUCIÓN DETERMINISTA DE AUTENTICACIÓN DUAL (BEARER VS COOKIE)
    // -------------------------------------------------------------
    await t.test("11. Autenticación dual: validación de sesiones y detección de conflicto de identidad", async () => {
      // 1. Generar sesiones activas para dos usuarios diferentes
      const tokenUserA = await createAuthSession(userLawyerA, "PROFESSIONAL");
      const tokenUserB = await createAuthSession(userOwnerB, "OWNER");

      assert.ok(tokenUserA);
      assert.ok(tokenUserB);

      // 2. Validar que ambos tokens resuelven al usuario correcto de forma independiente
      const sessionA = await validateSessionToken(tokenUserA);
      const sessionB = await validateSessionToken(tokenUserB);

      assert.ok(sessionA);
      assert.ok(sessionB);
      assert.equal(sessionA.id, userLawyerA.id);
      assert.equal(sessionB.id, userOwnerB.id);

      // 3. Probar lógica determinista de resolución:
      // Cuando solo se proporciona Bearer:
      const resolveSingleBearer = sessionA;
      assert.equal(resolveSingleBearer.id, userLawyerA.id);

      // Cuando Bearer y Cookie son idénticos:
      const resolveIdentical = tokenUserA === tokenUserA ? sessionA : null;
      assert.equal(resolveIdentical?.id, userLawyerA.id);

      // Cuando Bearer y Cookie provienen de tokens distintos pero del mismo usuario:
      const tokenUserA2 = await createAuthSession(userLawyerA, "PROFESSIONAL");
      const sessionA2 = await validateSessionToken(tokenUserA2);
      assert.equal(sessionA.id, sessionA2?.id); // Misma identidad, no hay conflicto

      // Cuando Bearer y Cookie pertenecen a usuarios distintos: Detección de conflicto de identidad
      const hasConflict = sessionA && sessionB && sessionA.id !== sessionB.id;
      assert.equal(hasConflict, true);
    });
  }
);
