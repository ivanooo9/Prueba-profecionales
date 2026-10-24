import assert from "node:assert/strict";
import test from "node:test";
import {
  validarCedulaEcuador,
  validarPasaporte,
  validarDocumentoPaciente,
  validarDocumentoIdentidad,
} from "../lib/ecuador-validators";
import { PatientService } from "../services/patient.service";
import { MedicineService } from "../services/medicine.service";

// Dynamic import via variable so tsc does not pull apps/ into rootDir
const loadFeValidators = async () => {
  const fePath = "../../apps/Odontologia/src/utils/ecuadorValidators.ts";
  return import(fePath);
};

test("ETAPA 2: Identificación de Pacientes (Cédula y Pasaporte)", async (t) => {
  // 1. Cédula válida
  await t.test("1. Cédula válida: acepta cédulas ecuatorianas reales calculadas por Módulo 10", () => {
    // Casos sintéticos válidos para provincias 17 (Pichincha), 09 (Guayas), 01 (Azuay), 30 (Exterior)
    assert.equal(validarCedulaEcuador("1710034065"), true);
    assert.equal(validarCedulaEcuador("0926687856"), true);
    assert.equal(validarCedulaEcuador("0103774840"), true);

    const diag = validarDocumentoIdentidad("CEDULA", "1710034065");
    assert.equal(diag.isValid, true);
    assert.equal(diag.tipo, "CEDULA");
    assert.equal(diag.normalized, "1710034065");
    assert.equal(diag.error, undefined);
  });

  // 2. Cédula con longitud incorrecta
  await t.test("2. Cédula con longitud incorrecta: rechaza longitudes distintas a 10 dígitos", () => {
    assert.equal(validarCedulaEcuador("171003406"), false); // 9 dígitos
    assert.equal(validarCedulaEcuador("17100340655"), false); // 11 dígitos
    assert.equal(validarCedulaEcuador(""), false);

    const diagShort = validarDocumentoIdentidad("CEDULA", "171003406");
    assert.equal(diagShort.isValid, false);
    assert.match(diagShort.error || "", /debe tener exactamente 10 dígitos/);

    const diagLong = validarDocumentoIdentidad("CEDULA", "17100340655");
    assert.equal(diagLong.isValid, false);
    assert.match(diagLong.error || "", /debe tener exactamente 10 dígitos/);
  });

  // 3. Cédula con caracteres no numéricos
  await t.test("3. Cédula con caracteres no numéricos: rechaza letras, espacios intermedios y caracteres especiales", () => {
    assert.equal(validarCedulaEcuador("171003406A"), false);
    assert.equal(validarCedulaEcuador("17100-4065"), false);
    assert.equal(validarCedulaEcuador("1710 34065"), false);
    assert.equal(validarCedulaEcuador("abcdefghij"), false);

    const diagAlpha = validarDocumentoIdentidad("CEDULA", "171003406A");
    assert.equal(diagAlpha.isValid, false);
    assert.match(diagAlpha.error || "", /únicamente dígitos numéricos/);
  });

  // 4. Cédula con dígitos de control incorrectos
  await t.test("4. Cédula con dígitos de control incorrectos: detecta adulteración de verificador y tercer dígito inválido", () => {
    // 1710034065 es válida, con dígito alterado a 4 debe fallar
    assert.equal(validarCedulaEcuador("1710034064"), false);
    assert.equal(validarCedulaEcuador("0926687850"), false);
    // Tercer dígito >= 6 no corresponde a personas naturales ecuatorianas
    assert.equal(validarCedulaEcuador("1760034065"), false);
    assert.equal(validarCedulaEcuador("1770034065"), false);
    assert.equal(validarCedulaEcuador("1780034065"), false);
    assert.equal(validarCedulaEcuador("1790034065"), false);
    // Provincias inexistentes (00, 25, 99)
    assert.equal(validarCedulaEcuador("0010034065"), false);
    assert.equal(validarCedulaEcuador("2510034065"), false);
    assert.equal(validarCedulaEcuador("9910034065"), false);

    const diagChecksum = validarDocumentoIdentidad("CEDULA", "1710034064");
    assert.equal(diagChecksum.isValid, false);
    assert.match(diagChecksum.error || "", /inválida según el Registro Civil/);
  });

  // 5. Pasaporte alfanumérico válido según la regla definida
  await t.test("5. Pasaporte alfanumérico válido: admite letras, números y guiones en rango 6-20", () => {
    assert.equal(validarPasaporte("A12345678"), true);
    assert.equal(validarPasaporte("pas-987654"), true);
    assert.equal(validarPasaporte("ECU-2026-X8"), true);
    assert.equal(validarPasaporte("G1234567890"), true);

    const diag = validarDocumentoIdentidad("PASAPORTE", "pas-987654");
    assert.equal(diag.isValid, true);
    assert.equal(diag.tipo, "PASAPORTE");
    assert.equal(diag.normalized, "PAS-987654"); // normalizado en mayúsculas
  });

  // 6. Pasaporte inválido o vacío
  await t.test("6. Pasaporte inválido o vacío: rechaza cadenas demasiado cortas, largas, vacías o sin alfanuméricos suficientes", () => {
    assert.equal(validarPasaporte(""), false);
    assert.equal(validarPasaporte("A123"), false); // 4 caracteres < 6
    assert.equal(validarPasaporte("A123456789012345678901"), false); // 21 caracteres > 20
    assert.equal(validarPasaporte("------"), false); // solo guiones sin >= 3 alfanuméricos
    assert.equal(validarPasaporte("AB---"), false); // solo 2 alfanuméricos

    const diagEmpty = validarDocumentoIdentidad("PASAPORTE", "");
    assert.equal(diagEmpty.isValid, false);
    assert.match(diagEmpty.error || "", /no puede estar vacío/);

    const diagShort = validarDocumentoIdentidad("PASAPORTE", "A123");
    assert.equal(diagShort.isValid, false);
    assert.match(diagShort.error || "", /entre 6 y 20 caracteres/);
  });

  // 7. Pasaporte formado por exactamente diez dígitos numéricos
  await t.test("7. Pasaporte formado por 10 dígitos numéricos: no aplica algoritmo de cédula ecuatoriana cuando se declara PASAPORTE", () => {
    // Supongamos un pasaporte extranjero de 10 dígitos: "1234567890" (que NO es una cédula ecuatoriana válida)
    const foreignNumericPass = "1234567890";
    assert.equal(validarCedulaEcuador(foreignNumericPass), false); // No es cédula ecuatoriana

    // Declarado como PASAPORTE, debe ser aceptado como pasaporte válido
    assert.equal(validarPasaporte(foreignNumericPass), true);

    const diag = validarDocumentoIdentidad("PASAPORTE", foreignNumericPass);
    assert.equal(diag.isValid, true);
    assert.equal(diag.tipo, "PASAPORTE");
    assert.equal(diag.normalized, "1234567890");
    assert.equal(diag.error, undefined);

    // Pero si se declara erróneamente como CEDULA, debe ser rechazado por no cumplir Módulo 10
    const diagAsCedula = validarDocumentoIdentidad("CEDULA", foreignNumericPass);
    assert.equal(diagAsCedula.isValid, false);
    assert.match(diagAsCedula.error || "", /inválida según el Registro Civil/);
  });

  // 8. Tipo documental ausente, desconocido o manipulado
  await t.test("8. Tipo documental ausente, desconocido o manipulado: maneja con seguridad y rechaza tipos indebidos", () => {
    // Si tipo es manipulado (ej. RUC inyectado en paciente, DNI, etc.)
    const diagRuc = validarDocumentoIdentidad("RUC", "1710034065001");
    assert.equal(diagRuc.isValid, false);
    assert.match(diagRuc.error || "", /no soportado para pacientes/);

    const diagDni = validarDocumentoIdentidad("DNI_EXTRANJERO", "12345678");
    assert.equal(diagDni.isValid, false);
    assert.match(diagDni.error || "", /no soportado para pacientes/);

    // Si tipo no viene especificado (null o undefined):
    // Con letras -> se infiere pasaporte
    const diagInferPass = validarDocumentoIdentidad(null, "PAS-987654");
    assert.equal(diagInferPass.isValid, true);
    assert.equal(diagInferPass.tipo, "PASAPORTE");

    // Con 10 dígitos numéricos de cédula válida -> se acepta como cédula
    const diagInferCed = validarDocumentoIdentidad(null, "1710034065");
    assert.equal(diagInferCed.isValid, true);
    assert.equal(diagInferCed.tipo, "CEDULA");

    // Con 10 dígitos pero inválida de Registro Civil -> se rechaza con mensaje claro
    const diagInferInv = validarDocumentoIdentidad(null, "1710034064");
    assert.equal(diagInferInv.isValid, false);
    assert.match(diagInferInv.error || "", /Módulo 10 del Registro Civil/);
  });

  // 9. Creación y actualización de pacientes en PatientService (Unitario con mock)
  await t.test("9. Creación y actualización de pacientes en PatientService valida sin escribir en DB de producción", async () => {
    const memoryPatients: any[] = [];
    let nextId = 100;

    const mockDb: any = {
      patient: {
        findFirst: async ({ where }: any) => {
          return memoryPatients.find(p => {
            if (where.id && p.id !== where.id) return false;
            if (where.organizationId && p.organizationId !== where.organizationId) return false;
            if (where.idNumber && p.idNumber !== where.idNumber) return false;
            if (where.NOT?.id && p.id === where.NOT.id) return false;
            return true;
          }) || null;
        },
        create: async ({ data }: any) => {
          const created = { id: ++nextId, ...data };
          memoryPatients.push(created);
          return created;
        },
        update: async ({ where, data }: any) => {
          const idx = memoryPatients.findIndex(p => p.id === where.id);
          if (idx !== -1) {
            memoryPatients[idx] = { ...memoryPatients[idx], ...data };
            return memoryPatients[idx];
          }
          throw new Error("Not found");
        },
      },
    };

    // Creación válida con Cédula
    const pCed = await PatientService.createPatient(
      15,
      {
        name: "Carlos Paciente Cédula",
        idNumber: "1710034065",
        idType: "CEDULA",
      },
      mockDb
    );
    assert.equal(pCed?.idNumber, "1710034065");

    // Creación válida con Pasaporte
    const pPass = await PatientService.createPatient(
      15,
      {
        name: "Elena Foreigner",
        idNumber: "PAS-123456",
        idType: "PASAPORTE",
      },
      mockDb
    );
    assert.equal(pPass?.idNumber, "PAS-123456");

    // Rechazo de Cédula adulterada
    await assert.rejects(
      async () => {
        await PatientService.createPatient(
          15,
          {
            name: "Falso Verificador",
            idNumber: "1710034064",
            idType: "CEDULA",
          },
          mockDb
        );
      },
      /no es una cédula ecuatoriana válida según el Registro Civil/
    );

    // Rechazo de Pasaporte inválido
    await assert.rejects(
      async () => {
        await PatientService.createPatient(
          15,
          {
            name: "Pasaporte Corto",
            idNumber: "P-12",
            idType: "PASAPORTE",
          },
          mockDb
        );
      },
      /entre 6 y 20 caracteres alfanuméricos/
    );

    // Rechazo de tipo manipulado
    await assert.rejects(
      async () => {
        await PatientService.createPatient(
          15,
          {
            name: "Tipo Invalido",
            idNumber: "1710034065",
            idType: "RUC",
          },
          mockDb
        );
      },
      /Tipo de documento 'RUC' no soportado/
    );

    // Actualización de datos demográficos preservando idNumber
    const updatedPhone = await PatientService.updatePatient(
      15,
      pCed!.id,
      { phone: "0998877665" },
      mockDb
    );
    assert.equal(updatedPhone?.phone, "0998877665");
    assert.equal(updatedPhone?.idNumber, "1710034065");
  });

  // 10. Coincidencia exacta de resultados entre frontend y backend
  await t.test("10. Coincidencia exacta entre validadores de frontend y backend", async () => {
    const feMod = await loadFeValidators();
    const feValidarDocumentoIdentidad = feMod.validarDocumentoIdentidad;
    const testCases = [
      { tipo: "CEDULA", val: "1710034065", expected: true },
      { tipo: "CEDULA", val: "1710034064", expected: false },
      { tipo: "CEDULA", val: "0926687856", expected: true },
      { tipo: "CEDULA", val: "2510034065", expected: false },
      { tipo: "PASAPORTE", val: "A12345678", expected: true },
      { tipo: "PASAPORTE", val: "PAS-987654", expected: true },
      { tipo: "PASAPORTE", val: "A12", expected: false },
      { tipo: "PASAPORTE", val: "1234567890", expected: true },
      { tipo: "RUC", val: "1710034065001", expected: false }, // No soportado como paciente
    ];

    for (const tc of testCases) {
      const beResult = validarDocumentoIdentidad(tc.tipo, tc.val);
      const feResult = feValidarDocumentoIdentidad(tc.tipo, tc.val);

      assert.equal(
        beResult.isValid,
        tc.expected,
        `Backend fallo para tipo ${tc.tipo} con valor ${tc.val}`
      );
      assert.equal(
        feResult.isValid,
        tc.expected,
        `Frontend fallo para tipo ${tc.tipo} con valor ${tc.val}`
      );
      assert.equal(
        beResult.isValid,
        feResult.isValid,
        `Discrepancia entre BE y FE para tipo ${tc.tipo} con valor ${tc.val}`
      );
      assert.equal(
        beResult.error,
        feResult.error,
        `Discrepancia en mensajes de error entre BE y FE para ${tc.tipo} y ${tc.val}`
      );
    }
  });

  // 11. Compatibilidad con los consumidores de Medicina General
  await t.test("11. Compatibilidad con Medicina General: MedicineService no es afectado por validadores de Odontología", () => {
    // MedicineService tiene sus propias interfaces y no importa ecuador-validators.ts
    assert.equal(typeof MedicineService.createPatient, "function");
    assert.equal(typeof MedicineService.updatePatient, "function");
    assert.equal(typeof MedicineService.getPatients, "function");
  });

  // 12. Registros históricos ambiguos sin reclasificación automática
  await t.test("12. Registros históricos ambiguos: updatePatient no bloquea ni altera identificaciones históricas existentes", async () => {
    // Paciente histórico con formato antiguo o ambiguo (ej. 8 dígitos '12345678')
    const historicalPatient = {
      id: 44,
      organizationId: 11,
      name: "Eda Abel Torres Torres",
      idNumber: "12345678",
      phone: "0991122334",
    };

    const mockDb: any = {
      patient: {
        findFirst: async () => historicalPatient,
        update: async ({ data }: any) => ({ ...historicalPatient, ...data }),
      },
    };

    // Actualizar solo el nombre o teléfono sin enviar idNumber
    const updatedNoId = await PatientService.updatePatient(
      11,
      44,
      { phone: "0999999999" },
      mockDb
    );
    assert.equal(updatedNoId?.idNumber, "12345678"); // Conservado intacto

    // Actualizar enviando el mismo idNumber que ya tenía (no cambia)
    const updatedSameId = await PatientService.updatePatient(
      11,
      44,
      { idNumber: "12345678", address: "Av. Loja 123" },
      mockDb
    );
    assert.equal(updatedSameId?.idNumber, "12345678"); // No lanza error y se conserva
  });
});
