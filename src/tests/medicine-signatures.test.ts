import assert from "node:assert/strict";
import test from "node:test";
import { MedicineService } from "../services/medicine.service";
import { MedicineController } from "../controllers/medicine.controller";
import { MEDICAL_CONSULTATION_STATUS, MEDICAL_PRESCRIPTION_STATUS } from "../constants/medicine.constants";

// Helper mock para emular contextos Express Request / Response
function createMockContext(options: {
  user?: any;
  organization?: any;
  params?: any;
  body?: any;
}) {
  const req: any = {
    user: options.user,
    organization: options.organization || { id: 101, name: "Clínica Test" },
    params: options.params || {},
    body: options.body || {},
    headers: {},
  };

  const resState = {
    statusCode: 200,
    body: null as any,
  };

  const res: any = {
    locals: {
      user: options.user,
      organization: req.organization,
    },
    status(code: number) {
      resState.statusCode = code;
      return this;
    },
    json(data: any) {
      resState.body = data;
      return this;
    },
  };

  return { req, res, resState };
}

// -------------------------------------------------------------
// PRUEBAS DE AUTORIZACIÓN Y FIRMA CLÍNICA (MOCKS AISLADOS)
// -------------------------------------------------------------

test("1. TC-01: Firma por profesional médico debidamente autorizado (OWNER o PROFESSIONAL con perfil APROBADO en Salud)", async () => {
  const mockDb: any = {
    user: {
      findUnique: async () => ({
        id: 42,
        name: "Dra. Elena Ramos",
        email: "elena.ramos@clinica.ec",
        status: "ACTIVE",
        role: { name: "PROFESSIONAL" },
        professionalProfile: {
          id: 10,
          status: "APROBADO",
          verified: true,
          specialties: [
            {
              specialty: {
                nombre: "Medicina General",
                profession: { nombre: "Salud y Medicina" },
              },
            },
          ],
        },
      }),
    },
    organizationMember: {
      findUnique: async () => ({
        id: 1,
        organizationId: 101,
        userId: 42,
        role: "PROFESSIONAL",
        status: "ACTIVE",
      }),
    },
  };

  const signer = await MedicineService.validateMedicalSigner(101, 42, mockDb);
  assert.equal(signer.userId, 42);
  assert.equal(signer.name, "Dra. Elena Ramos");
});

test("2. TC-02: Firma por usuario no autorizado (ASSISTANT, SECRETARY, ADMIN sin facultades)", async () => {
  const mockDbAssistant: any = {
    user: {
      findUnique: async () => ({
        id: 55,
        name: "Carlos Asistente",
        status: "ACTIVE",
        role: { name: "USER" },
        professionalProfile: null,
      }),
    },
    organizationMember: {
      findUnique: async () => ({
        id: 2,
        organizationId: 101,
        userId: 55,
        role: "ASSISTANT",
        status: "ACTIVE",
      }),
    },
  };

  await assert.rejects(
    async () => {
      await MedicineService.validateMedicalSigner(101, 55, mockDbAssistant);
    },
    (err: any) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /no cuenta con facultades clínicas/i);
      return true;
    }
  );
});

test("3. TC-03: Rechazo cuando el perfil profesional está PENDIENTE o no corresponde a Salud y Medicina", async () => {
  const mockDbPending: any = {
    user: {
      findUnique: async () => ({
        id: 60,
        name: "Dr. Aspirante",
        status: "ACTIVE",
        role: { name: "PROFESSIONAL" },
        professionalProfile: {
          id: 12,
          status: "PENDIENTE", // No aprobado por administración
          verified: false,
          specialties: [
            {
              specialty: {
                nombre: "Medicina General",
                profession: { nombre: "Salud y Medicina" },
              },
            },
          ],
        },
      }),
    },
    organizationMember: {
      findUnique: async () => ({
        id: 3,
        organizationId: 101,
        userId: 60,
        role: "PROFESSIONAL",
        status: "ACTIVE",
      }),
    },
  };

  await assert.rejects(
    async () => {
      await MedicineService.validateMedicalSigner(101, 60, mockDbPending);
    },
    (err: any) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /habilitación profesional médica verificada y aprobada/i);
      return true;
    }
  );
});

test("4. TC-04: Manipulación de signedBy en el payload es ignorada por el controlador", async () => {
  // Simular BD para el validador
  const originalValidate = MedicineService.validateMedicalSigner;
  const originalCreate = MedicineService.createConsultation;

  let capturedInput: any = null;

  MedicineService.validateMedicalSigner = async () => ({
    userId: 42,
    name: "Dr. Autenticado Real",
  });

  MedicineService.createConsultation = async (_orgId, data) => {
    capturedInput = data;
    return { id: 1, ...data } as any;
  };

  try {
    const { req, res, resState } = createMockContext({
      user: { id: 42, name: "Dr. Autenticado Real" },
      params: { patientId: "10" },
      body: {
        reason: "Chequeo general",
        status: "SIGNED",
        signedBy: "Dr. Suplantador Malicioso", // Intento de inyección
      },
    });

    await MedicineController.createConsultation(req, res);

    assert.equal(resState.statusCode, 201);
    assert.equal(capturedInput.signedBy, "Dr. Autenticado Real");
    assert.notEqual(capturedInput.signedBy, "Dr. Suplantador Malicioso");
  } finally {
    MedicineService.validateMedicalSigner = originalValidate;
    MedicineService.createConsultation = originalCreate;
  }
});

test("5. TC-05: Manipulación de professionalId en el payload es bloqueada por el controlador", async () => {
  const originalValidate = MedicineService.validateMedicalSigner;
  const originalCreate = MedicineService.createConsultation;

  let capturedInput: any = null;

  MedicineService.validateMedicalSigner = async () => ({
    userId: 42,
    name: "Dr. Autenticado Real",
  });

  MedicineService.createConsultation = async (_orgId, data) => {
    capturedInput = data;
    return { id: 1, ...data } as any;
  };

  try {
    const { req, res, resState } = createMockContext({
      user: { id: 42, name: "Dr. Autenticado Real" },
      params: { patientId: "10" },
      body: {
        reason: "Consulta de control",
        status: "SIGNED",
        professionalId: 9999, // Intento de asociar a otro médico
      },
    });

    await MedicineController.createConsultation(req, res);

    assert.equal(resState.statusCode, 201);
    assert.equal(capturedInput.professionalId, 42);
    assert.notEqual(capturedInput.professionalId, 9999);
  } finally {
    MedicineService.validateMedicalSigner = originalValidate;
    MedicineService.createConsultation = originalCreate;
  }
});

test("6. TC-06: Bloqueo de firma si el usuario no pertenece a la organización solicitada", async () => {
  const mockDbCrossTenant: any = {
    user: {
      findUnique: async () => ({
        id: 42,
        name: "Dr. Ajenus",
        status: "ACTIVE",
        role: { name: "PROFESSIONAL" },
        professionalProfile: {
          id: 1,
          status: "APROBADO",
          specialties: [{ specialty: { nombre: "Medicina General", profession: { nombre: "Salud y Medicina" } } }],
        },
      }),
    },
    organizationMember: {
      findUnique: async () => null, // No es miembro de la Org 999
    },
  };

  await assert.rejects(
    async () => {
      await MedicineService.validateMedicalSigner(999, 42, mockDbCrossTenant);
    },
    (err: any) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /no es un miembro activo de la organización/i);
      return true;
    }
  );
});

test("7. TC-07: Inmutabilidad de recetas — Bloqueo estricto de doble firma en receta ya SIGNED", async () => {
  const mockDb: any = {
    medicalPrescription: {
      findFirst: async () => ({
        id: 50,
        organizationId: 101,
        status: MEDICAL_PRESCRIPTION_STATUS.SIGNED,
        signedBy: "Dra. Elena Ramos",
        signedAt: new Date("2026-10-01"),
        items: [],
      }),
    },
  };

  await assert.rejects(
    async () => {
      await MedicineService.updatePrescriptionStatus(
        101,
        50,
        MEDICAL_PRESCRIPTION_STATUS.SIGNED,
        "Dr. Otro Médico",
        mockDb
      );
    },
    (err: any) => {
      assert.match(err.message, /ya se encuentra firmada \(doble firma no permitida\)/i);
      return true;
    }
  );
});

test("8. TC-08: Inmutabilidad de recetas — Prohibición de regresar receta SIGNED a estado DRAFT", async () => {
  const mockDb: any = {
    medicalPrescription: {
      findFirst: async () => ({
        id: 50,
        organizationId: 101,
        status: MEDICAL_PRESCRIPTION_STATUS.SIGNED,
        signedBy: "Dra. Elena Ramos",
        signedAt: new Date("2026-10-01"),
        items: [],
      }),
    },
  };

  await assert.rejects(
    async () => {
      await MedicineService.updatePrescriptionStatus(
        101,
        50,
        MEDICAL_PRESCRIPTION_STATUS.DRAFT,
        undefined,
        mockDb
      );
    },
    (err: any) => {
      assert.match(err.message, /firmada no puede regresar a estado borrador/i);
      return true;
    }
  );
});

test("9. TC-09: Inmutabilidad de recetas — Prohibición de reactivar o modificar receta CANCELLED", async () => {
  const mockDb: any = {
    medicalPrescription: {
      findFirst: async () => ({
        id: 52,
        organizationId: 101,
        status: MEDICAL_PRESCRIPTION_STATUS.CANCELLED,
        signedBy: "Dra. Elena Ramos",
        signedAt: new Date("2026-10-01"),
        items: [],
      }),
    },
  };

  await assert.rejects(
    async () => {
      await MedicineService.updatePrescriptionStatus(
        101,
        52,
        MEDICAL_PRESCRIPTION_STATUS.SIGNED,
        "Dr. Intentando Revivir",
        mockDb
      );
    },
    (err: any) => {
      assert.match(err.message, /no se puede reactivar ni modificar una receta médica que ha sido cancelada/i);
      return true;
    }
  );
});

test("10. TC-10: Firma atómica en receta DRAFT estampa autor y fecha sin fallback genérico", async () => {
  let updateManyCalled = false;
  let updateManyPayload: any = null;

  const mockDb: any = {
    medicalPrescription: {
      findFirst: async () => ({
        id: 70,
        organizationId: 101,
        status: MEDICAL_PRESCRIPTION_STATUS.DRAFT,
        signedBy: null,
        signedAt: null,
        items: [],
      }),
      updateMany: async (args: any) => {
        updateManyCalled = true;
        updateManyPayload = args;
        return { count: 1 };
      },
      findUnique: async () => ({
        id: 70,
        organizationId: 101,
        status: MEDICAL_PRESCRIPTION_STATUS.SIGNED,
        signedBy: "Dra. Elena Ramos",
        signedAt: new Date(),
        items: [],
      }),
    },
  };

  const result = await MedicineService.updatePrescriptionStatus(
    101,
    70,
    MEDICAL_PRESCRIPTION_STATUS.SIGNED,
    "Dra. Elena Ramos",
    mockDb
  );

  assert.equal(updateManyCalled, true);
  assert.equal(updateManyPayload.where.status, MEDICAL_PRESCRIPTION_STATUS.DRAFT);
  assert.equal(updateManyPayload.data.status, MEDICAL_PRESCRIPTION_STATUS.SIGNED);
  assert.equal(updateManyPayload.data.signedBy, "Dra. Elena Ramos");
  assert.notEqual(updateManyPayload.data.signedBy, "Profesional Médico");
  assert.ok(result);
});

// =============================================================
// PRUEBAS OBLIGATORIAS AUD-MG-01 Y AUD-MG-02 (FASE 1.1)
// =============================================================

test("11. TC-AUD-01: Un usuario ADMIN no puede cancelar una receta firmada sin autorización clínica", async () => {
  const mockDbAdmin: any = {
    medicalPrescription: {
      findFirst: async () => ({
        id: 50,
        organizationId: 101,
        status: MEDICAL_PRESCRIPTION_STATUS.SIGNED,
        signedBy: "Dra. Elena Ramos",
        signedAt: new Date("2026-10-01"),
        items: [],
      }),
    },
    user: {
      findUnique: async () => ({
        id: 77,
        name: "Admin Sistema",
        status: "ACTIVE",
        role: { name: "ADMIN" },
        professionalProfile: null,
      }),
    },
    organizationMember: {
      findUnique: async () => ({
        id: 5,
        organizationId: 101,
        userId: 77,
        role: "ADMIN",
        status: "ACTIVE",
      }),
    },
  };

  await assert.rejects(
    async () => {
      await MedicineService.updatePrescriptionStatus(
        101,
        50,
        MEDICAL_PRESCRIPTION_STATUS.CANCELLED,
        undefined,
        mockDbAdmin,
        77
      );
    },
    (err: any) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /El rol 'ADMIN' no cuenta con facultades clínicas/i);
      return true;
    }
  );
});

test("12. TC-AUD-02: Un usuario ASSISTANT no puede cancelar una receta firmada sin autorización clínica", async () => {
  const mockDbAssistant: any = {
    medicalPrescription: {
      findFirst: async () => ({
        id: 50,
        organizationId: 101,
        status: MEDICAL_PRESCRIPTION_STATUS.SIGNED,
        signedBy: "Dra. Elena Ramos",
        signedAt: new Date("2026-10-01"),
        items: [],
      }),
    },
    user: {
      findUnique: async () => ({
        id: 78,
        name: "Asistente Consultorio",
        status: "ACTIVE",
        role: { name: "USER" },
        professionalProfile: null,
      }),
    },
    organizationMember: {
      findUnique: async () => ({
        id: 6,
        organizationId: 101,
        userId: 78,
        role: "ASSISTANT",
        status: "ACTIVE",
      }),
    },
  };

  await assert.rejects(
    async () => {
      await MedicineService.updatePrescriptionStatus(
        101,
        50,
        MEDICAL_PRESCRIPTION_STATUS.CANCELLED,
        undefined,
        mockDbAssistant,
        78
      );
    },
    (err: any) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /El rol 'ASSISTANT' no cuenta con facultades clínicas/i);
      return true;
    }
  );
});

test("13. TC-AUD-03: Un usuario SECRETARY no puede cancelar una receta firmada sin autorización clínica", async () => {
  const mockDbSecretary: any = {
    medicalPrescription: {
      findFirst: async () => ({
        id: 50,
        organizationId: 101,
        status: MEDICAL_PRESCRIPTION_STATUS.SIGNED,
        signedBy: "Dra. Elena Ramos",
        signedAt: new Date("2026-10-01"),
        items: [],
      }),
    },
    user: {
      findUnique: async () => ({
        id: 79,
        name: "Secretaria Recepción",
        status: "ACTIVE",
        role: { name: "USER" },
        professionalProfile: null,
      }),
    },
    organizationMember: {
      findUnique: async () => ({
        id: 7,
        organizationId: 101,
        userId: 79,
        role: "SECRETARY",
        status: "ACTIVE",
      }),
    },
  };

  await assert.rejects(
    async () => {
      await MedicineService.updatePrescriptionStatus(
        101,
        50,
        MEDICAL_PRESCRIPTION_STATUS.CANCELLED,
        undefined,
        mockDbSecretary,
        79
      );
    },
    (err: any) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /El rol 'SECRETARY' no cuenta con facultades clínicas/i);
      return true;
    }
  );
});

test("14. TC-AUD-04: Un usuario que sí cumple la política clínica puede realizar la cancelación autorizada de una receta firmada", async () => {
  let updateManyCalled = false;
  let updateManyArgs: any = null;

  const mockDbDoctor: any = {
    medicalPrescription: {
      findFirst: async () => ({
        id: 50,
        organizationId: 101,
        status: MEDICAL_PRESCRIPTION_STATUS.SIGNED,
        signedBy: "Dra. Elena Ramos",
        signedAt: new Date("2026-10-01"),
        items: [],
      }),
      updateMany: async (args: any) => {
        updateManyCalled = true;
        updateManyArgs = args;
        return { count: 1 };
      },
      findUnique: async () => ({
        id: 50,
        organizationId: 101,
        status: MEDICAL_PRESCRIPTION_STATUS.CANCELLED,
        signedBy: "Dra. Elena Ramos",
        items: [],
      }),
    },
    user: {
      findUnique: async () => ({
        id: 42,
        name: "Dra. Elena Ramos",
        email: "elena.ramos@clinica.ec",
        status: "ACTIVE",
        role: { name: "PROFESSIONAL" },
        professionalProfile: {
          id: 10,
          status: "APROBADO",
          specialties: [
            {
              specialty: {
                nombre: "Medicina General",
                profession: { nombre: "Salud y Medicina" },
              },
            },
          ],
        },
      }),
    },
    organizationMember: {
      findUnique: async () => ({
        id: 1,
        organizationId: 101,
        userId: 42,
        role: "PROFESSIONAL",
        status: "ACTIVE",
      }),
    },
  };

  const result = await MedicineService.updatePrescriptionStatus(
    101,
    50,
    MEDICAL_PRESCRIPTION_STATUS.CANCELLED,
    undefined,
    mockDbDoctor,
    42
  );

  assert.equal(updateManyCalled, true);
  assert.equal(updateManyArgs.where.status, MEDICAL_PRESCRIPTION_STATUS.SIGNED);
  assert.equal(updateManyArgs.data.status, MEDICAL_PRESCRIPTION_STATUS.CANCELLED);
  assert.equal(result.status, MEDICAL_PRESCRIPTION_STATUS.CANCELLED);
});

test("15. TC-AUD-05: Una consulta firmada no puede cancelarse mediante una ruta que omita la autorización aplicable", async () => {
  let consultationStatus: string = MEDICAL_CONSULTATION_STATUS.SIGNED;
  const mockDbSignedConsultation: any = {
    medicalConsultation: {
      findFirst: async () => ({
        id: 80,
        organizationId: 101,
        patientId: 10,
        status: consultationStatus,
        reason: "Consulta anual",
        subjective: "Sin dolor",
        objective: "TA normal",
        assessment: "Sano",
        plan: "Dieta",
        signedBy: "Dr. Médico Titular",
        signedAt: new Date("2026-10-01"),
      }),
      updateMany: async (args: any) => {
        if (args.data.status) {
          consultationStatus = args.data.status;
        }
        return { count: 1 };
      },
      findUnique: async () => ({
        id: 80,
        organizationId: 101,
        patientId: 10,
        status: consultationStatus,
      }),
    },
    patient: {
      findFirst: async () => ({ id: 10, organizationId: 101 }),
    },
    medicalVitalSigns: {
      findMany: async () => [],
    },
    medicalPrescription: {
      findMany: async () => [],
    },
    medicalCertificate: {
      findMany: async () => [],
    },
    laboratoryResult: {
      findMany: async () => [],
    },
    imagingStudy: {
      findMany: async () => [],
    },
    user: {
      findUnique: async (args: any) => {
        if (args.where.id === 99) {
          // Asistente
          return {
            id: 99,
            name: "Asistente Juan",
            status: "ACTIVE",
            role: { name: "USER" },
            professionalProfile: null,
          };
        }
        // Médico
        return {
          id: 42,
          name: "Dra. Elena Ramos",
          status: "ACTIVE",
          role: { name: "PROFESSIONAL" },
          professionalProfile: {
            id: 10,
            status: "APROBADO",
            specialties: [{ specialty: { nombre: "Medicina General", profession: { nombre: "Salud y Medicina" } } }],
          },
        };
      },
    },
    organizationMember: {
      findUnique: async (args: any) => {
        if (args.where.organizationId_userId.userId === 99) {
          return { id: 20, organizationId: 101, userId: 99, role: "ASSISTANT", status: "ACTIVE" };
        }
        return { id: 21, organizationId: 101, userId: 42, role: "PROFESSIONAL", status: "ACTIVE" };
      },
    },
  };

  // A. Intento sin autenticación / sin userId: debe rechazar con 401
  await assert.rejects(
    async () => {
      await MedicineService.updateConsultation(
        101,
        80,
        { status: MEDICAL_CONSULTATION_STATUS.CANCELLED },
        mockDbSignedConsultation,
        undefined
      );
    },
    (err: any) => {
      assert.equal(err.statusCode, 401);
      assert.match(err.message, /No autenticado/i);
      return true;
    }
  );

  // B. Intento con usuario ASSISTANT: debe rechazar con 403
  await assert.rejects(
    async () => {
      await MedicineService.updateConsultation(
        101,
        80,
        { status: MEDICAL_CONSULTATION_STATUS.CANCELLED },
        mockDbSignedConsultation,
        99
      );
    },
    (err: any) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /facultades clínicas/i);
      return true;
    }
  );

  // C. Intento con médico acreditado: se ejecuta exitosamente
  const cancelled = await MedicineService.updateConsultation(
    101,
    80,
    { status: MEDICAL_CONSULTATION_STATUS.CANCELLED },
    mockDbSignedConsultation,
    42
  );
  assert.equal(cancelled.status, MEDICAL_CONSULTATION_STATUS.CANCELLED);
});

test("16. TC-AUD-06: Una receta asociada a una consulta del mismo paciente y organización puede crearse correctamente", async () => {
  let createdPayload: any = null;
  const mockDb: any = {
    patient: {
      findFirst: async () => ({ id: 10, organizationId: 101, name: "Paciente Juan" }),
    },
    medicalConsultation: {
      findFirst: async (args: any) => {
        if (args.where.id === 100 && args.where.organizationId === 101 && args.where.patientId === 10) {
          return { id: 100, organizationId: 101, patientId: 10, status: "SIGNED" };
        }
        return null;
      },
    },
    medicalPrescription: {
      create: async (args: any) => {
        createdPayload = args.data;
        return { id: 1, ...args.data };
      },
    },
  };

  const prescription = await MedicineService.createPrescription(
    101,
    {
      patientId: 10,
      consultationId: 100,
      diagnosis: "Infección respiratoria",
      items: [
        {
          medicationName: "Amoxicilina",
          dose: "500mg",
          frequency: "Cada 8h",
        },
      ],
    },
    mockDb
  );

  assert.ok(prescription);
  assert.equal(createdPayload.patientId, 10);
  assert.equal(createdPayload.consultationId, 100);
  assert.equal(createdPayload.organizationId, 101);
});

test("17. TC-AUD-07: Una receta para el paciente A vinculada a una consulta del paciente B es rechazada", async () => {
  const mockDbCrossPatient: any = {
    patient: {
      findFirst: async (args: any) => {
        if (args.where.id === 10 && args.where.organizationId === 101) {
          return { id: 10, organizationId: 101, name: "Paciente A" };
        }
        return null;
      },
    },
    medicalConsultation: {
      findFirst: async (args: any) => {
        // La consulta 200 pertenece a la org 101 pero al paciente 20 (Paciente B), no al paciente 10 (Paciente A)
        if (args.where.id === 200 && args.where.organizationId === 101 && args.where.patientId === 20) {
          return { id: 200, organizationId: 101, patientId: 20 };
        }
        return null;
      },
    },
    medicalPrescription: {
      create: async () => {
        throw new Error("No debe llamarse a create cuando la validación falla.");
      },
    },
  };

  await assert.rejects(
    async () => {
      await MedicineService.createPrescription(
        101,
        {
          patientId: 10, // Paciente A
          consultationId: 200, // Consulta de Paciente B
          items: [{ medicationName: "Paracetamol", dose: "500mg", frequency: "Cada 8h" }],
        },
        mockDbCrossPatient
      );
    },
    (err: any) => {
      assert.match(
        err.message,
        /La consulta asociada no pertenece al paciente especificado o no existe en esta organización/i
      );
      return true;
    }
  );
});

test("18. TC-AUD-08: Una consulta de otra organización no puede vincularse a la receta", async () => {
  const mockDbCrossOrg: any = {
    patient: {
      findFirst: async (args: any) => {
        if (args.where.id === 10 && args.where.organizationId === 101) {
          return { id: 10, organizationId: 101, name: "Paciente A" };
        }
        return null;
      },
    },
    medicalConsultation: {
      findFirst: async (args: any) => {
        // La consulta 300 está en la organización 999, no en 101
        if (args.where.id === 300 && args.where.organizationId === 999) {
          return { id: 300, organizationId: 999, patientId: 10 };
        }
        return null;
      },
    },
    medicalPrescription: {
      create: async () => {
        throw new Error("No debe llamarse a create.");
      },
    },
  };

  await assert.rejects(
    async () => {
      await MedicineService.createPrescription(
        101, // Org actual 101
        {
          patientId: 10,
          consultationId: 300, // Consulta existente en Org 999
          items: [{ medicationName: "Ibuprofeno", dose: "400mg", frequency: "Cada 12h" }],
        },
        mockDbCrossOrg
      );
    },
    (err: any) => {
      assert.match(
        err.message,
        /La consulta asociada no pertenece al paciente especificado o no existe en esta organización/i
      );
      return true;
    }
  );
});

test("19. TC-AUD-09: Si no se proporciona consultationId, se conserva el comportamiento válido anterior", async () => {
  let createdPayload: any = null;
  const mockDb: any = {
    patient: {
      findFirst: async () => ({ id: 10, organizationId: 101, name: "Paciente Juan" }),
    },
    medicalPrescription: {
      create: async (args: any) => {
        createdPayload = args.data;
        return { id: 2, ...args.data };
      },
    },
  };

  const prescription = await MedicineService.createPrescription(
    101,
    {
      patientId: 10,
      // consultationId omitido deliberadamente
      items: [{ medicationName: "Loratadina", dose: "10mg", frequency: "Cada 24h" }],
    },
    mockDb
  );

  assert.ok(prescription);
  assert.equal(createdPayload.patientId, 10);
  assert.equal(createdPayload.consultationId, null);
});

test("20. TC-AUD-10: Una receta cancelada no puede reactivarse y una receta firmada no puede volver a DRAFT", async () => {
  const mockDbCancelled: any = {
    medicalPrescription: {
      findFirst: async () => ({
        id: 52,
        organizationId: 101,
        status: MEDICAL_PRESCRIPTION_STATUS.CANCELLED,
        signedBy: "Dra. Elena Ramos",
        signedAt: new Date("2026-10-01"),
        items: [],
      }),
    },
  };

  // Intento de reactivar receta cancelada
  await assert.rejects(
    async () => {
      await MedicineService.updatePrescriptionStatus(
        101,
        52,
        MEDICAL_PRESCRIPTION_STATUS.SIGNED,
        "Dr. Médico",
        mockDbCancelled
      );
    },
    (err: any) => {
      assert.match(err.message, /no se puede reactivar ni modificar una receta médica que ha sido cancelada/i);
      return true;
    }
  );

  const mockDbSigned: any = {
    medicalPrescription: {
      findFirst: async () => ({
        id: 50,
        organizationId: 101,
        status: MEDICAL_PRESCRIPTION_STATUS.SIGNED,
        signedBy: "Dra. Elena Ramos",
        signedAt: new Date("2026-10-01"),
        items: [],
      }),
    },
  };

  // Intento de regresar receta firmada a DRAFT
  await assert.rejects(
    async () => {
      await MedicineService.updatePrescriptionStatus(
        101,
        50,
        MEDICAL_PRESCRIPTION_STATUS.DRAFT,
        undefined,
        mockDbSigned
      );
    },
    (err: any) => {
      assert.match(err.message, /firmada no puede regresar a estado borrador/i);
      return true;
    }
  );
});
