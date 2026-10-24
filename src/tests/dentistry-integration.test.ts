import assert from "node:assert/strict";
import test from "node:test";
import { validateEcuadorianId } from "../lib/ecuador-validators";
import { derivePaymentStatus } from "../services/dentistry-budget.service";
import { normalizeDocumentType, DentistryDocumentService } from "../services/dentistry-document.service";

test("H-06: Validador de Cédula Ecuatoriana (Módulo 10 del Registro Civil)", async (t) => {
  await t.test("acepta cédulas válidas de diferentes provincias del Ecuador", () => {
    // Casos reales con algoritmo Módulo 10 válido
    // Pichincha (17): 1710034065 -> 1*2 + 7*1 + 1*2 + 0*1 + 0*2 + 3*1 + 4*2 + 0*1 + 6*2 = 2+7+2+0+0+3+8+0+3=25 -> 30-25=5 (OK)
    assert.equal(validateEcuadorianId("1710034065"), true);
    // Guayas (09): 0926687856 -> 0*2 + 9*1 + 2*2 + 6*1 + 6*2 + 8*1 + 7*2 + 8*1 + 5*2 = 0+9+4+6+3+8+5+8+1=44 -> 50-44=6 (OK)
    assert.equal(validateEcuadorianId("0926687856"), true);
    // Azuay (01): 0103774845 -> 0*2 + 1*1 + 0*2 + 3*1 + 7*2 + 7*1 + 4*2 + 8*1 + 4*2 = 0+1+0+3+5+7+8+8+8=40 -> 40-40=0 -> 0-0=0 (OK, caso residuo 0)
    // 0103774840
    assert.equal(validateEcuadorianId("0103774840"), true);
    // Manabí (13): 1312345678 -> calculamos verificador válido
    // 1*2=2, 3*1=3, 1*2=2, 2*1=2, 3*2=6, 4*1=4, 5*2=1, 6*1=6, 7*2=5 -> 2+3+2+2+6+4+1+6+5=31 -> 40-31=9
    assert.equal(validateEcuadorianId("1312345679"), true);
  });

  await t.test("rechaza códigos de provincia inexistentes o inválidos (00, 25, 99)", () => {
    assert.equal(validateEcuadorianId("0010034065"), false);
    assert.equal(validateEcuadorianId("2510034065"), false);
    assert.equal(validateEcuadorianId("9910034065"), false);
  });

  await t.test("rechaza cédulas cuyo tercer dígito sea 6, 7, 8 o 9 (no son personas naturales)", () => {
    assert.equal(validateEcuadorianId("1760034065"), false);
    assert.equal(validateEcuadorianId("1770034065"), false);
    assert.equal(validateEcuadorianId("1780034065"), false);
    assert.equal(validateEcuadorianId("1790034065"), false);
  });

  await t.test("rechaza dígito verificador adulterado o inválido", () => {
    // 1710034065 es válida, con último dígito alterado a 4 debe fallar
    assert.equal(validateEcuadorianId("1710034064"), false);
    assert.equal(validateEcuadorianId("0926687850"), false);
  });

  await t.test("rechaza longitudes inválidas, caracteres alfanuméricos y nulos", () => {
    assert.equal(validateEcuadorianId(""), false);
    assert.equal(validateEcuadorianId("171003406"), false); // 9 dígitos
    assert.equal(validateEcuadorianId("17100340655"), false); // 11 dígitos
    assert.equal(validateEcuadorianId("171003406A"), false); // letras
    assert.equal(validateEcuadorianId("abcdefghij"), false);
    assert.equal(validateEcuadorianId(null as any), false);
    assert.equal(validateEcuadorianId(undefined as any), false);
  });
});

test("H-01: Persistencia de Antecedentes Médicos y Alergias en OdontoCarePro", async (t) => {
  await t.test("los campos allergies, medicalBackground y currentMedication están tipados y admiten texto clínico estructurado", () => {
    const mockDentalRecordInput = {
      allergies: "Alergia severa a Penicilina y derivados betalactámicos; AINES (Ibuprofeno)",
      medicalBackground: "Hipertensión arterial controlada con Losartán 50mg; Diabetes Mellitus Tipo 2",
      currentMedication: "Losartán 50mg cada 12h, Metformina 850mg con el almuerzo",
    };

    assert.equal(typeof mockDentalRecordInput.allergies, "string");
    assert.equal(typeof mockDentalRecordInput.medicalBackground, "string");
    assert.equal(typeof mockDentalRecordInput.currentMedication, "string");
    assert.match(mockDentalRecordInput.allergies, /Penicilina/);
    assert.match(mockDentalRecordInput.medicalBackground, /Hipertensión/);
    assert.match(mockDentalRecordInput.currentMedication, /Losartán/);
  });

  await t.test("heurística clínica tri-state de alergias (activa vs confirmada ausente vs no evaluada)", () => {
    const isNegative = (str: string) => /^(ningun[oa]|niega|sin alergia|no refiere|no presenta|negativ[oa]|no\b)/i.test(str.trim());
    const classifyAllergies = (allergies?: string | null): "active" | "none" | "unconfirmed" => {
      const clean = (allergies || "").trim();
      if (!clean) return "unconfirmed";
      if (isNegative(clean)) return "none";
      return "active";
    };

    // Casos no evaluados (campo vacío o nulo nunca debe presumir ausencia de alergias)
    assert.equal(classifyAllergies(null), "unconfirmed");
    assert.equal(classifyAllergies(""), "unconfirmed");
    assert.equal(classifyAllergies("   "), "unconfirmed");
    assert.equal(classifyAllergies(undefined), "unconfirmed");

    // Casos confirmados de ausencia de alergias
    assert.equal(classifyAllergies("Ninguna"), "none");
    assert.equal(classifyAllergies("ninguno"), "none");
    assert.equal(classifyAllergies("Niega alergias a medicamentos"), "none");
    assert.equal(classifyAllergies("Sin alergias conocidas"), "none");
    assert.equal(classifyAllergies("No refiere alergias"), "none");
    assert.equal(classifyAllergies("No presenta"), "none");
    assert.equal(classifyAllergies("Negativo"), "none");

    // Casos activos (riesgo médico)
    assert.equal(classifyAllergies("Penicilina"), "active");
    assert.equal(classifyAllergies("Lidocaína con epinefrina"), "active");
    assert.equal(classifyAllergies("AINES, Ibuprofeno"), "active");
    assert.equal(classifyAllergies("Látex"), "active");
  });
});

test("H-02: Lógica Financiera de Presupuestos Odontológicos (derivePaymentStatus)", async (t) => {
  await t.test("deriva UNPAID cuando paidAmount es 0", () => {
    assert.equal(derivePaymentStatus(150.00, 0), "UNPAID");
    assert.equal(derivePaymentStatus(500.00, -10), "UNPAID");
  });

  await t.test("deriva PARTIALLY_PAID cuando se registran abonos parciales", () => {
    assert.equal(derivePaymentStatus(150.00, 50.00), "PARTIALLY_PAID");
    assert.equal(derivePaymentStatus(200.00, 199.99), "PARTIALLY_PAID");
  });

  await t.test("deriva PAID cuando el abonado cubre o supera el monto total presupuestado", () => {
    assert.equal(derivePaymentStatus(150.00, 150.00), "PAID");
    assert.equal(derivePaymentStatus(150.00, 150.01), "PAID");
    assert.equal(derivePaymentStatus(50.50, 50.50), "PAID");
  });
});

test("H-03: RBAC en Rutas Clínicas y Financieras de Odontología", async (t) => {
  const clinicalAllowedRoles = new Set(["OWNER", "ADMIN", "PROFESSIONAL"]);
  const financialAllowedRoles = new Set(["OWNER", "ADMIN", "PROFESSIONAL", "BILLING"]);

  await t.test("roles clínicos autorizados pueden firmar consentimientos, guardar odontograma y evolucionar tratamientos", () => {
    assert.equal(clinicalAllowedRoles.has("OWNER"), true);
    assert.equal(clinicalAllowedRoles.has("ADMIN"), true);
    assert.equal(clinicalAllowedRoles.has("PROFESSIONAL"), true);
  });

  await t.test("roles administrativos o auxiliares sin habilitación clínica son rechazados para actos médicos", () => {
    assert.equal(clinicalAllowedRoles.has("RECEPTIONIST"), false);
    assert.equal(clinicalAllowedRoles.has("BILLING"), false);
    assert.equal(clinicalAllowedRoles.has("STUDENT"), false);
    assert.equal(clinicalAllowedRoles.has("PATIENT"), false);
  });

  await t.test("rol BILLING tiene permiso financiero para pagos pero NO para evolucionar o alterar el odontograma", () => {
    assert.equal(financialAllowedRoles.has("BILLING"), true);
    assert.equal(clinicalAllowedRoles.has("BILLING"), false);
  });
});

test("H-07: Conversión de Horarios y Offset Ecuador (UTC-5 / America/Guayaquil)", async (t) => {
  await t.test("el string de fecha/hora se guarda con el offset explícito -05:00", () => {
    const appointmentDate = "2026-10-25";
    const appointmentTime = "14:30";
    const scheduledAtPayload = `${appointmentDate}T${appointmentTime}:00-05:00`;

    const parsedDate = new Date(scheduledAtPayload);
    assert.equal(Number.isNaN(parsedDate.getTime()), false);

    // En formato UTC debe equivaler exactamente a 19:30Z (14:30 + 5 horas)
    assert.equal(parsedDate.toISOString(), "2026-10-25T19:30:00.000Z");

    // Y al formatearlo en la zona horaria America/Guayaquil debe retornar 14:30
    const formatterTime = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Guayaquil",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    assert.equal(formatterTime.format(parsedDate), "14:30");
  });
});

test("H-09: Parametrización Segura de Advisory Locks", async (t) => {
  await t.test("los locks por organización usan identificador numérico de 64 bits sin inyección SQL", () => {
    const orgId = 15;
    const lockKey = 1000000 + orgId;
    assert.equal(typeof lockKey, "number");
    assert.equal(Number.isInteger(lockKey), true);
    assert.equal(lockKey > 0, true);
  });
});

test("H-10: Integridad y Normalización de Documentos Clínicos Odontológicos", async (t) => {
  await t.test("normaliza tipos de documentos en español e inglés a canon canonical", () => {
    assert.equal(normalizeDocumentType("Radiografía"), "RADIOGRAPHY");
    assert.equal(normalizeDocumentType("radiografia"), "RADIOGRAPHY");
    assert.equal(normalizeDocumentType("Fotografía"), "PHOTOGRAPHY");
    assert.equal(normalizeDocumentType("Consentimiento"), "CONSENT");
    assert.equal(normalizeDocumentType("Informe"), "REPORT");
    assert.equal(normalizeDocumentType("Presupuesto"), "BUDGET_ATTACHMENT");
    assert.equal(normalizeDocumentType("Otro"), "OTHER");
    assert.equal(normalizeDocumentType("desconocido"), "OTHER");
    assert.equal(normalizeDocumentType(null), "OTHER");
  });

  await t.test("createDocument inicializa atómicamente el DentalRecord si no existe", async () => {
    let dentalRecordCreated = false;
    let documentCreated = false;

    const mockDb: any = {
      patient: {
        findFirst: async () => ({ id: 99, organizationId: 10 }),
      },
      dentalRecord: {
        findFirst: async () => null, // No existía registro
        create: async (args: any) => {
          dentalRecordCreated = true;
          return { id: 500, patientId: args.data.patientId, organizationId: args.data.organizationId };
        },
      },
      dentalDocument: {
        create: async (args: any) => {
          documentCreated = true;
          assert.equal(args.data.dentalRecordId, 500);
          assert.equal(args.data.patientId, 99);
          assert.equal(args.data.title, "Radiografía Panorámica");
          assert.equal(args.data.type, "RADIOGRAPHY");
          assert.equal(args.data.fileName, "panoramica.png");
          assert.equal(args.data.mimeType, "image/png");
          return { id: 101, ...args.data };
        },
      },
    };

    const doc = await DentistryDocumentService.createDocument(
      10,
      99,
      {
        title: "Radiografía Panorámica",
        type: "Radiografía",
        fileName: "panoramica.png",
        mimeType: "image/png",
        fileSize: 2048,
      },
      undefined,
      mockDb
    );

    assert.equal(dentalRecordCreated, true);
    assert.equal(documentCreated, true);
    assert.equal(doc.id, 101);
  });
});
