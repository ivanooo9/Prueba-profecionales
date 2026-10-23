import { db } from "../lib/db";
import { AcademicService } from "../services/academic.service";
import {
  AcademicYearStatus,
  AcademicPeriodType,
  AcademicEvaluationSchemeStatus,
} from "@prisma/client";

async function main() {
  console.log("=== INICIANDO APROVISIONAMIENTO ACADÉMICO ORG 11 ===");

  // 1. Verificación Fail-Closed de Base de Datos
  const dbInfo = await db.$queryRaw<Array<{ current_database: string; current_schema: string }>>`
    SELECT current_database(), current_schema()
  `;
  const currentDbName = dbInfo[0]?.current_database;
  console.log(`[Base de Datos Activa]: ${currentDbName} (Esquema: ${dbInfo[0]?.current_schema})`);

  if (currentDbName !== "profesionales_ecuador") {
    throw new Error(
      `FATAL: Base de datos incorrecta '${currentDbName}'. Se esperaba 'profesionales_ecuador'.`
    );
  }

  const orgId = 11;
  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org || org.status !== "ACTIVE") {
    throw new Error(`FATAL: Organización ${orgId} no encontrada o no está activa.`);
  }
  console.log(`[Organización Confirmada]: ID ${org.id} - ${org.name}`);

  // Contexto de acceso administrativo para aprovisionamiento inicial
  const adminAccess = {
    isAcademicAdmin: true,
    userId: 221,
    organizationId: orgId,
  };

  // 2. AÑO LECTIVO 2026-2027 (Idempotente)
  let year = await db.academicYear.findFirst({
    where: { organizationId: orgId, name: "Año Lectivo 2026-2027" },
  });

  if (!year) {
    year = await AcademicService.createAcademicYear(orgId, {
      name: "Año Lectivo 2026-2027",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2027-06-30"),
      status: AcademicYearStatus.ACTIVE,
    });
    console.log(`[Año Lectivo Creado]: ID ${year.id} - ${year.name} (ACTIVE)`);
  } else {
    console.log(`[Año Lectivo Existente]: ID ${year.id} - ${year.name}`);
  }
  const yearId = year.id;

  // 3. PRIMER QUIMESTRE Y SUS 3 PARCIALES
  let q1 = await db.academicPeriod.findFirst({
    where: { organizationId: orgId, academicYearId: yearId, name: "Primer Quimestre" },
  });
  if (!q1) {
    q1 = await AcademicService.createAcademicPeriod(orgId, {
      academicYearId: yearId,
      name: "Primer Quimestre",
      type: AcademicPeriodType.QUIMESTER,
      order: 1,
      startDate: new Date("2026-09-01"),
      endDate: new Date("2027-01-31"),
    });
    console.log(`[Primer Quimestre Creado]: ID ${q1.id}`);
  } else {
    console.log(`[Primer Quimestre Existente]: ID ${q1.id}`);
  }
  const q1Id = q1.id;

  // Parciales Q1
  const q1Partials = [
    { name: "Parcial 1", order: 1, start: "2026-09-01", end: "2026-10-15" },
    { name: "Parcial 2", order: 2, start: "2026-10-16", end: "2026-11-30" },
    { name: "Parcial 3", order: 3, start: "2026-12-01", end: "2027-01-31" },
  ];
  const q1PartialIds: number[] = [];

  for (const p of q1Partials) {
    let partial = await db.academicPeriod.findFirst({
      where: { organizationId: orgId, academicYearId: yearId, parentId: q1Id, order: p.order },
    });
    if (!partial) {
      partial = await AcademicService.createAcademicPeriod(orgId, {
        academicYearId: yearId,
        parentId: q1Id,
        name: p.name,
        type: AcademicPeriodType.PARTIAL,
        order: p.order,
        startDate: new Date(p.start),
        endDate: new Date(p.end),
      });
      console.log(`[Q1 ${p.name} Creado]: ID ${partial.id} (${p.start} al ${p.end})`);
    } else {
      console.log(`[Q1 ${p.name} Existente]: ID ${partial.id}`);
    }
    q1PartialIds.push(partial.id);
  }

  // 4. SEGUNDO QUIMESTRE Y SUS 3 PARCIALES
  let q2 = await db.academicPeriod.findFirst({
    where: { organizationId: orgId, academicYearId: yearId, name: "Segundo Quimestre" },
  });
  if (!q2) {
    q2 = await AcademicService.createAcademicPeriod(orgId, {
      academicYearId: yearId,
      name: "Segundo Quimestre",
      type: AcademicPeriodType.QUIMESTER,
      order: 2,
      startDate: new Date("2027-02-01"),
      endDate: new Date("2027-06-30"),
    });
    console.log(`[Segundo Quimestre Creado]: ID ${q2.id}`);
  } else {
    console.log(`[Segundo Quimestre Existente]: ID ${q2.id}`);
  }
  const q2Id = q2.id;

  // Parciales Q2
  const q2Partials = [
    { name: "Parcial 1", order: 1, start: "2027-02-01", end: "2027-03-20" },
    { name: "Parcial 2", order: 2, start: "2027-03-21", end: "2027-05-10" },
    { name: "Parcial 3", order: 3, start: "2027-05-11", end: "2027-06-30" },
  ];
  const q2PartialIds: number[] = [];

  for (const p of q2Partials) {
    let partial = await db.academicPeriod.findFirst({
      where: { organizationId: orgId, academicYearId: yearId, parentId: q2Id, order: p.order },
    });
    if (!partial) {
      partial = await AcademicService.createAcademicPeriod(orgId, {
        academicYearId: yearId,
        parentId: q2Id,
        name: p.name,
        type: AcademicPeriodType.PARTIAL,
        order: p.order,
        startDate: new Date(p.start),
        endDate: new Date(p.end),
      });
      console.log(`[Q2 ${p.name} Creado]: ID ${partial.id} (${p.start} al ${p.end})`);
    } else {
      console.log(`[Q2 ${p.name} Existente]: ID ${partial.id}`);
    }
    q2PartialIds.push(partial.id);
  }

  // 5. ASIGNACIÓN DOCENTE (Materia Geometría ID 166 -> Ivan Peralta ID 221)
  const subject166 = await db.academicSubject.findUnique({ where: { id: 166 } });
  if (!subject166 || subject166.organizationId !== orgId) {
    throw new Error("FATAL: Materia ID 166 no encontrada en Organización 11.");
  }
  if (subject166.teacherUserId !== 221) {
    await AcademicService.updateSubject(orgId, 166, { teacherUserId: 221 });
    console.log(`[Asignación Docente]: Materia 166 (Geometria) asignada a Docente 221 (Ivan Peralta)`);
  } else {
    console.log(`[Asignación Docente]: Materia 166 ya cuenta con Docente 221`);
  }

  // 6. MATRÍCULAS 2026-2027 (Estudiantes 95 y 78 en Curso 105)
  // Preservando matrículas históricas 89 y 90
  const courseId = 105;
  const targetStudents = [95, 78];
  const newEnrollmentIds: number[] = [];

  for (const studentId of targetStudents) {
    let enr = await db.academicEnrollment.findFirst({
      where: {
        organizationId: orgId,
        courseId,
        studentId,
        academicYearId: yearId,
      },
    });
    if (!enr) {
      enr = await AcademicService.enrollStudent(orgId, {
        courseId,
        studentId,
        academicYearId: yearId,
      });
      console.log(`[Nueva Matrícula 2026-2027]: ID ${enr.id} para Estudiante ${studentId} en Curso 105`);
    } else {
      console.log(`[Matrícula 2026-2027 Existente]: ID ${enr.id} para Estudiante ${studentId}`);
    }
    newEnrollmentIds.push(enr.id);
  }

  // 7. ESQUEMA DE EVALUACIÓN Y CATEGORÍAS EN PARCIAL 1 (Q1-P1)
  const p1Id = q1PartialIds[0];
  let scheme = await db.academicEvaluationScheme.findUnique({
    where: {
      organizationId_courseId_subjectId_academicPeriodId: {
        organizationId: orgId,
        courseId,
        subjectId: 166,
        academicPeriodId: p1Id,
      },
    },
    include: { categories: true },
  });

  if (!scheme) {
    scheme = await AcademicService.createEvaluationScheme(
      orgId,
      {
        courseId,
        subjectId: 166,
        academicPeriodId: p1Id,
        maxScale: 10.0,
        minPassingScore: 7.0,
        status: AcademicEvaluationSchemeStatus.DRAFT,
      },
      adminAccess
    );
    console.log(`[Esquema Creado en DRAFT]: ID ${scheme.id} para Parcial 1 (ID ${p1Id})`);

    // Categorías 40% / 30% / 30%
    const cat1 = await AcademicService.createEvaluationCategory(
      orgId,
      scheme.id,
      { name: "Tareas y trabajos", weightPercentage: 40, order: 1 },
      adminAccess
    );
    const cat2 = await AcademicService.createEvaluationCategory(
      orgId,
      scheme.id,
      { name: "Lecciones y talleres", weightPercentage: 30, order: 2 },
      adminAccess
    );
    const cat3 = await AcademicService.createEvaluationCategory(
      orgId,
      scheme.id,
      { name: "Evaluación parcial", weightPercentage: 30, order: 3 },
      adminAccess
    );
    console.log(`[Categorías Creadas]: Tareas (40%), Lecciones (30%), Evaluación (30%)`);

    // Validar esquema formalmente hasta VALID
    const validated = await AcademicService.validateEvaluationScheme(
      orgId,
      scheme.id,
      adminAccess
    );
    console.log(`[Esquema Validado Formalmente]: Estado final: ${validated.status}`);
  } else {
    console.log(`[Esquema Existente]: ID ${scheme.id} (Estado: ${scheme.status})`);
  }

  console.log("=== APROVISIONAMIENTO ACADÉMICO ORG 11 COMPLETADO CON ÉXITO ===");
  return {
    yearId,
    q1Id,
    q2Id,
    q1PartialIds,
    q2PartialIds,
    newEnrollmentIds,
    schemeId: scheme.id,
  };
}

main()
  .then((res) => {
    console.log("[Resultado Final]:", res);
    process.exit(0);
  })
  .catch((err) => {
    console.error("[Error en Aprovisionamiento]:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
