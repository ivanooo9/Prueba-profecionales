import assert from "node:assert/strict";
import test from "node:test";
import { db } from "../lib/db";
import { AcademicService } from "../services/academic.service";
import {
  AcademicYearStatus,
  AcademicPeriodType,
  AcademicPeriodStatus,
  AcademicEvaluationSchemeStatus,
  AcademicGradeStatus,
} from "@prisma/client";

test("Fase 14.B - Suite Exhaustiva de Validación de Ponderaciones, Categorías y Reasignación Segura", async () => {
  // 0. Fail-Closed Guard: Validar terminantemente que estamos en base de pruebas
  const dbInfo = await db.$queryRaw<Array<{ current_database: string; current_schema: string }>>`
    SELECT current_database(), current_schema()
  `;
  const currentDbName = dbInfo[0]?.current_database;
  if (!currentDbName || currentDbName === "profesionales_ecuador" || !currentDbName.includes("test")) {
    throw new Error(
      `FATAL_FAIL_CLOSED_GUARD: Intento de ejecución bloqueado. La base activa es '${currentDbName}'. Las pruebas deben ejecutarse exclusivamente sobre 'profesionales_ecuador_test'.`
    );
  }

  const ts = Date.now();

  // 1. Setup inicial de organizaciones y roles
  const org = await db.organization.create({
    data: {
      name: `Fase 14 Strict Org ${ts}`,
      slug: `fase14-strict-org-${ts}`,
      type: "INSTITUTION",
      status: "ACTIVE",
    },
  });

  const foreignOrg = await db.organization.create({
    data: {
      name: `Foreign Org ${ts}`,
      slug: `foreign-org-${ts}`,
      type: "INSTITUTION",
      status: "ACTIVE",
    },
  });

  const adminRole = await db.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { name: "ADMIN", description: "Administrador" },
  });
  const teacherRole = await db.role.upsert({
    where: { name: "PROFESSIONAL" },
    update: {},
    create: { name: "PROFESSIONAL", description: "Docente" },
  });

  const teacher = await db.user.create({
    data: {
      email: `teacher_strict_${ts}@test.ec`,
      password: "TestPassword123!",
      name: "Docente Asignado Strict",
      roleId: teacherRole.id,
    },
  });

  const unauthorizedTeacher = await db.user.create({
    data: {
      email: `unauth_strict_${ts}@test.ec`,
      password: "TestPassword123!",
      name: "Docente Ajeno Strict",
      roleId: teacherRole.id,
    },
  });

  const admin = await db.user.create({
    data: {
      email: `admin_strict_${ts}@test.ec`,
      password: "TestPassword123!",
      name: "Admin Strict",
      roleId: adminRole.id,
    },
  });

  await db.organizationMember.create({
    data: { organizationId: org.id, userId: teacher.id, role: "MEMBER" },
  });
  await db.organizationMember.create({
    data: { organizationId: org.id, userId: unauthorizedTeacher.id, role: "MEMBER" },
  });
  await db.organizationMember.create({
    data: { organizationId: org.id, userId: admin.id, role: "OWNER" },
  });

  // Año lectivo y periodos
  const academicYear = await db.academicYear.create({
    data: {
      organizationId: org.id,
      name: `Año Lectivo 2026-2027 Strict ${ts}`,
      startDate: new Date("2026-09-01"),
      endDate: new Date("2027-06-30"),
      status: AcademicYearStatus.ACTIVE,
    },
  });

  // Periodo Activo (Parcial 1)
  const p1 = await db.academicPeriod.create({
    data: {
      organizationId: org.id,
      academicYearId: academicYear.id,
      name: "Parcial 1",
      type: AcademicPeriodType.PARTIAL,
      order: 1,
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-10-31"),
      status: AcademicPeriodStatus.ACTIVE,
    },
  });

  // Periodo Cerrado (Parcial 2)
  const pClosed = await db.academicPeriod.create({
    data: {
      organizationId: org.id,
      academicYearId: academicYear.id,
      name: "Parcial Cerrado",
      type: AcademicPeriodType.PARTIAL,
      order: 2,
      startDate: new Date("2026-11-01"),
      endDate: new Date("2026-12-31"),
      status: AcademicPeriodStatus.CLOSED,
    },
  });

  // Cursos y materias
  const course = await db.academicCourse.create({
    data: {
      organizationId: org.id,
      name: `10mo Strict ${ts}`,
      level: "Básica Superior",
    },
  });

  // Materia A: Tendrá esquema VALID
  const subjectValid = await db.academicSubject.create({
    data: {
      organizationId: org.id,
      courseId: course.id,
      name: "Matemáticas Strict",
      teacherUserId: teacher.id,
    },
  });

  // Materia B: Tendrá esquema DRAFT
  const subjectDraft = await db.academicSubject.create({
    data: {
      organizationId: org.id,
      courseId: course.id,
      name: "Ciencias en Borrador",
      teacherUserId: teacher.id,
    },
  });

  // Materia C: Sin esquema
  const subjectNoScheme = await db.academicSubject.create({
    data: {
      organizationId: org.id,
      courseId: course.id,
      name: "Arte Sin Esquema",
      teacherUserId: teacher.id,
    },
  });

  // Esquema VALID para Materia A (60% Tareas, 40% Examen)
  const schemeValid = await db.academicEvaluationScheme.create({
    data: {
      organizationId: org.id,
      courseId: course.id,
      subjectId: subjectValid.id,
      academicPeriodId: p1.id,
      maxScale: 10,
      minPassingScore: 7,
      status: AcademicEvaluationSchemeStatus.VALID,
      categories: {
        create: [
          { organizationId: org.id, name: "Tareas y Trabajos", weightPercentage: 60, order: 1 },
          { organizationId: org.id, name: "Evaluación Parcial", weightPercentage: 40, order: 2 },
        ],
      },
    },
    include: { categories: true },
  });
  const catTareas = schemeValid.categories.find((c) => c.name === "Tareas y Trabajos")!;
  const catExamen = schemeValid.categories.find((c) => c.name === "Evaluación Parcial")!;

  // Esquema DRAFT para Materia B
  const schemeDraft = await db.academicEvaluationScheme.create({
    data: {
      organizationId: org.id,
      courseId: course.id,
      subjectId: subjectDraft.id,
      academicPeriodId: p1.id,
      maxScale: 10,
      minPassingScore: 7,
      status: AcademicEvaluationSchemeStatus.DRAFT,
      categories: {
        create: [
          { organizationId: org.id, name: "Borrador Incompleto", weightPercentage: 50, order: 1 },
        ],
      },
    },
    include: { categories: true },
  });
  const catDraft = schemeDraft.categories[0]!;

  // Esquema y Categoría en Foreign Org
  const foreignCourse = await db.academicCourse.create({
    data: {
      organizationId: foreignOrg.id,
      name: `Curso Ajeno ${ts}`,
      level: "Básica",
    },
  });
  const foreignSubject = await db.academicSubject.create({
    data: {
      organizationId: foreignOrg.id,
      courseId: foreignCourse.id,
      name: "Materia Ajena",
    },
  });
  const foreignYear = await db.academicYear.create({
    data: {
      organizationId: foreignOrg.id,
      name: `Año Ajeno ${ts}`,
      startDate: new Date("2026-09-01"),
      endDate: new Date("2027-06-30"),
    },
  });
  const foreignPeriod = await db.academicPeriod.create({
    data: {
      organizationId: foreignOrg.id,
      academicYearId: foreignYear.id,
      name: "Periodo Ajeno",
      type: AcademicPeriodType.PARTIAL,
      order: 1,
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-10-31"),
    },
  });
  const foreignScheme = await db.academicEvaluationScheme.create({
    data: {
      organizationId: foreignOrg.id,
      courseId: foreignCourse.id,
      subjectId: foreignSubject.id,
      academicPeriodId: foreignPeriod.id,
      maxScale: 10,
      minPassingScore: 7,
      status: AcademicEvaluationSchemeStatus.VALID,
      categories: {
        create: [
          { organizationId: foreignOrg.id, name: "Cat Ajena", weightPercentage: 100, order: 1 },
        ],
      },
    },
    include: { categories: true },
  });
  const foreignCat = foreignScheme.categories[0]!;

  // =========================================================================
  // 1. Creación sin esquema -> Rechazo con EVALUATION_SCHEME_REQUIRED (400)
  // =========================================================================
  await assert.rejects(
    async () => {
      await AcademicService.createActivity(
        org.id,
        course.id,
        {
          subjectId: subjectNoScheme.id,
          name: "Actividad Sin Esquema",
          type: "activity",
          maxScore: 10,
          academicPeriodId: p1.id,
        },
        { userId: teacher.id, isAcademicAdmin: false }
      );
    },
    (err: any) => err.code === "EVALUATION_SCHEME_REQUIRED" || /EVALUATION_SCHEME_REQUIRED/.test(err.message)
  );
  console.log("✔ 1. Creación sin esquema rechazada con EVALUATION_SCHEME_REQUIRED");

  // =========================================================================
  // 2. Creación con esquema DRAFT -> Rechazo con EVALUATION_SCHEME_NOT_VALID (400)
  // =========================================================================
  await assert.rejects(
    async () => {
      await AcademicService.createActivity(
        org.id,
        course.id,
        {
          subjectId: subjectDraft.id,
          name: "Actividad En Borrador",
          type: "activity",
          maxScore: 10,
          academicPeriodId: p1.id,
          categoryId: catDraft.id,
        },
        { userId: teacher.id, isAcademicAdmin: false }
      );
    },
    (err: any) => err.code === "EVALUATION_SCHEME_NOT_VALID" || /EVALUATION_SCHEME_NOT_VALID/.test(err.message)
  );
  console.log("✔ 2. Creación con esquema en DRAFT rechazada con EVALUATION_SCHEME_NOT_VALID");

  // =========================================================================
  // 3. Categoría obligatoria -> Rechazo con CATEGORY_REQUIRED (400)
  // =========================================================================
  await assert.rejects(
    async () => {
      await AcademicService.createActivity(
        org.id,
        course.id,
        {
          subjectId: subjectValid.id,
          name: "Actividad Omitiendo Categoría",
          type: "activity",
          maxScore: 10,
          academicPeriodId: p1.id,
        },
        { userId: teacher.id, isAcademicAdmin: false }
      );
    },
    (err: any) => err.code === "CATEGORY_REQUIRED" || /CATEGORY_REQUIRED/.test(err.message)
  );
  console.log("✔ 3. Creación omitiendo categoría rechazada con CATEGORY_REQUIRED");

  // =========================================================================
  // 4. Categoría de otro esquema / materia -> Rechazo con CATEGORY_NOT_IN_SCHEME (400)
  // =========================================================================
  await assert.rejects(
    async () => {
      await AcademicService.createActivity(
        org.id,
        course.id,
        {
          subjectId: subjectValid.id,
          name: "Actividad Con Categoría de Otra Materia",
          type: "activity",
          maxScore: 10,
          academicPeriodId: p1.id,
          categoryId: catDraft.id, // pertenece a subjectDraft, no a subjectValid
        },
        { userId: teacher.id, isAcademicAdmin: false }
      );
    },
    (err: any) => err.code === "CATEGORY_NOT_IN_SCHEME" || /CATEGORY_NOT_IN_SCHEME/.test(err.message)
  );
  console.log("✔ 4. Categoría perteneciente a otra materia rechazada con CATEGORY_NOT_IN_SCHEME");

  // =========================================================================
  // 5. Categoría de otra organización -> Rechazo estricto (400)
  // =========================================================================
  await assert.rejects(
    async () => {
      await AcademicService.createActivity(
        org.id,
        course.id,
        {
          subjectId: subjectValid.id,
          name: "Actividad Con Categoría Foránea",
          type: "activity",
          maxScore: 10,
          academicPeriodId: p1.id,
          categoryId: foreignCat.id,
        },
        { userId: teacher.id, isAcademicAdmin: false }
      );
    },
    (err: any) => err.code === "CATEGORY_NOT_IN_SCHEME" || /CATEGORY_NOT_IN_SCHEME/.test(err.message)
  );
  console.log("✔ 5. Categoría perteneciente a otra organización rechazada");

  // =========================================================================
  // 6. Usuario sin permisos -> Rechazo con HTTP 403 Forbidden
  // =========================================================================
  await assert.rejects(
    async () => {
      await AcademicService.createActivity(
        org.id,
        course.id,
        {
          subjectId: subjectValid.id,
          name: "Intruso en Materia",
          type: "activity",
          maxScore: 10,
          academicPeriodId: p1.id,
          categoryId: catTareas.id,
        },
        { userId: unauthorizedTeacher.id, isAcademicAdmin: false }
      );
    },
    (err: any) => err.statusCode === 403
  );
  console.log("✔ 6. Docente ajeno no autorizado rechazado con HTTP 403");

  // =========================================================================
  // 7. Creación exitosa con esquema VALID y categoría correcta (HTTP 201)
  // =========================================================================
  const actTarea1 = await AcademicService.createActivity(
    org.id,
    course.id,
    {
      subjectId: subjectValid.id,
      name: "Tarea 1 Álgebra",
      type: "activity",
      dueDate: "2026-09-15",
      maxScore: 10,
      academicPeriodId: p1.id,
      categoryId: catTareas.id,
    },
    { userId: teacher.id, isAcademicAdmin: false }
  );
  assert.ok(actTarea1.id);
  assert.equal(actTarea1.categoryId, catTareas.id);
  assert.equal(actTarea1.type, "ACTIVITY");
  console.log("✔ 7. Creación con esquema VALID y categoría correcta completada con éxito (201)");

  // Regla de examen único estricta según type === 'exam'
  const actExamen = await AcademicService.createActivity(
    org.id,
    course.id,
    {
      subjectId: subjectValid.id,
      name: "Evaluación Sumativa Parcial 1",
      type: "exam",
      dueDate: "2026-10-20",
      maxScore: 10,
      academicPeriodId: p1.id,
      categoryId: catExamen.id,
    },
    { userId: teacher.id, isAcademicAdmin: false }
  );
  assert.ok(actExamen.id);

  // Intentar crear un segundo examen en el mismo periodo debe ser rechazado
  await assert.rejects(
    async () => {
      await AcademicService.createActivity(
        org.id,
        course.id,
        {
          subjectId: subjectValid.id,
          name: "Segundo Examen No Permitido",
          type: "exam",
          dueDate: "2026-10-25",
          maxScore: 10,
          academicPeriodId: p1.id,
          categoryId: catExamen.id,
        },
        { userId: teacher.id, isAcademicAdmin: false }
      );
    },
    (err: any) => err.code === "DUPLICATE_EXAM_ACTIVITY" || err.statusCode === 409
  );
  console.log("✔ 7.1. Regla de examen parcial único (type='exam') respetada deterministamente (409)");

  // =========================================================================
  // 8. Reasignación de actividad sin notas
  // =========================================================================
  // Simulamos una actividad histórica que se creó antes de tener categoría
  const actOrphanNoGrades = await db.academicActivity.create({
    data: {
      organizationId: org.id,
      courseId: course.id,
      subjectId: subjectValid.id,
      academicPeriodId: p1.id,
      name: "Taller Antiguo Huérfano",
      type: "PRACTICE",
      maxScore: 10,
      categoryId: null,
      evaluationSchemeId: null,
    },
  });
  assert.equal(actOrphanNoGrades.categoryId, null);

  // Verificar que mientras está huérfana, la matriz la proyecta en bloque "Sin ponderar"
  const matrixBeforeReassign = await AcademicService.calculatePeriodGradesMatrix(
    org.id,
    course.id,
    subjectValid.id,
    p1.id,
    undefined,
    { userId: teacher.id, isAcademicAdmin: false }
  );
  const uncatBlockBefore = matrixBeforeReassign.categories.find((c: any) => c.categoryId === 0);
  assert.ok(uncatBlockBefore, "El bloque 'Sin ponderar' debe estar presente mientras haya actividades huérfanas");

  // Reasignar a la categoría Tareas
  const updatedActNoGrades = await AcademicService.updateActivity(
    org.id,
    actOrphanNoGrades.id,
    { categoryId: catTareas.id },
    { userId: teacher.id, isAcademicAdmin: false }
  );
  assert.equal(updatedActNoGrades.categoryId, catTareas.id);
  assert.equal(updatedActNoGrades.evaluationSchemeId, schemeValid.id);
  console.log("✔ 8. Reasignación de actividad huérfana sin notas completada exitosamente");

  // =========================================================================
  // 9. Reasignación de actividad con notas existentes y conservación intacta
  // =========================================================================
  const student = await db.academicStudent.create({
    data: {
      organizationId: org.id,
      firstName: "Mateo",
      lastName: "Guerrero",
      identification: `ID-STRICT-${ts}`,
    },
  });
  const enrollment = await db.academicEnrollment.create({
    data: {
      organizationId: org.id,
      courseId: course.id,
      studentId: student.id,
      academicYearId: academicYear.id,
      status: "ACTIVE",
    },
  });

  // Crear actividad huérfana con notas registradas
  const actOrphanWithGrades = await db.academicActivity.create({
    data: {
      organizationId: org.id,
      courseId: course.id,
      subjectId: subjectValid.id,
      academicPeriodId: p1.id,
      name: "Práctica Histórica Con Notas",
      type: "ACTIVITY",
      maxScore: 10,
      categoryId: null,
      evaluationSchemeId: null,
    },
  });

  const gradeInitial = await db.academicGrade.create({
    data: {
      organizationId: org.id,
      activityId: actOrphanWithGrades.id,
      studentId: student.id,
      enrollmentId: enrollment.id,
      score: 8.5,
      status: AcademicGradeStatus.GRADED,
    },
  });

  // Reasignar a la categoría Tareas
  const updatedWithGrades = await AcademicService.updateActivity(
    org.id,
    actOrphanWithGrades.id,
    { categoryId: catTareas.id },
    { userId: teacher.id, isAcademicAdmin: false }
  );
  assert.equal(updatedWithGrades.categoryId, catTareas.id);

  // Verificar que la nota en AcademicGrade se conservó 100% idéntica
  const gradeAfterReassign = await db.academicGrade.findUnique({
    where: { id: gradeInitial.id },
  });
  assert.equal(gradeAfterReassign?.score?.toNumber(), 8.5);
  console.log("✔ 9. Reasignación de actividad con notas: Calificación en base de datos conservada al 100%");

  // =========================================================================
  // 10. Reasignación en periodo cerrado rechazada con ACADEMIC_PERIOD_IMMUTABLE
  // =========================================================================
  const actInClosedPeriod = await db.academicActivity.create({
    data: {
      organizationId: org.id,
      courseId: course.id,
      subjectId: subjectValid.id,
      academicPeriodId: pClosed.id,
      name: "Actividad en Periodo Pasado",
      type: "ACTIVITY",
      maxScore: 10,
      categoryId: null,
    },
  });

  await assert.rejects(
    async () => {
      await AcademicService.updateActivity(
        org.id,
        actInClosedPeriod.id,
        { categoryId: catTareas.id },
        { userId: teacher.id, isAcademicAdmin: false }
      );
    },
    (err: any) => err.code === "ACADEMIC_PERIOD_IMMUTABLE" || /ACADEMIC_PERIOD_IMMUTABLE/.test(err.message)
  );
  console.log("✔ 10. Reasignación en periodo cerrado rechazada con ACADEMIC_PERIOD_IMMUTABLE");

  // =========================================================================
  // 11. Conservación de calificaciones y cálculo ponderado exacto
  // =========================================================================
  // En este punto:
  // - En 'Tareas y Trabajos' (60%) están:
  //   1) actTarea1 (sin nota aún)
  //   2) actOrphanNoGrades (sin nota)
  //   3) actOrphanWithGrades (nota: 8.5)
  // - En 'Evaluación Parcial' (40%) está:
  //   4) actExamen (vamos a calificarlo con 9.0)
  await db.academicGrade.create({
    data: {
      organizationId: org.id,
      activityId: actExamen.id,
      studentId: student.id,
      enrollmentId: enrollment.id,
      score: 9.0,
      status: AcademicGradeStatus.GRADED,
    },
  });

  const matrixAfter = await AcademicService.calculatePeriodGradesMatrix(
    org.id,
    course.id,
    subjectValid.id,
    p1.id,
    undefined,
    { userId: teacher.id, isAcademicAdmin: false }
  );

  const studentRow = matrixAfter.students[0];
  assert.ok(studentRow);
  // Ambas categorías evaluadas: 60% + 40% = 100%
  assert.equal(studentRow.evaluatedWeightPercentage, 100);
  // Categoría Tareas subtotal = 8.5 (ponderado al 60% = 5.10)
  // Categoría Examen subtotal = 9.0 (ponderado al 40% = 3.60)
  // Nota definitiva acumulada = 5.10 + 3.60 = 8.70 / 10
  assert.equal(studentRow.definitiveGrade, 8.7);
  assert.equal(studentRow.provisionalAverage, 8.7);
  console.log("✔ 11. Cálculo de sábana de calificaciones exacto con las actividades reasignadas");

  // =========================================================================
  // 12. Desaparición del bloque «Sin ponderar» cuando ya no hay huérfanas
  // =========================================================================
  const uncatBlockAfter = matrixAfter.categories.find((c: any) => c.categoryId === 0);
  assert.equal(uncatBlockAfter, undefined, "El bloque 'Sin ponderar' debe desaparecer por completo");
  console.log("✔ 12. Bloque 'Sin ponderar' desaparece automáticamente al no quedar actividades huérfanas");

  // =========================================================================
  // 13. Concurrencia: Múltiples lecturas de matriz concurrentes
  // =========================================================================
  const concurrentPromises = Array.from({ length: 5 }, () =>
    AcademicService.calculatePeriodGradesMatrix(
      org.id,
      course.id,
      subjectValid.id,
      p1.id,
      undefined,
      { userId: teacher.id, isAcademicAdmin: false }
    )
  );
  const concurrentResults = await Promise.all(concurrentPromises);
  for (const res of concurrentResults) {
    assert.equal(res.students.length, 1);
    assert.equal(res.students[0].definitiveGrade, 8.7);
    assert.equal(res.categories.find((c: any) => c.categoryId === 0), undefined);
  }
  console.log("✔ 13. Concurrencia validada: 5 peticiones concurrentes arrojaron resultados idénticos sin corrupción");

  console.log("===============================================================================");
  console.log("=== TODOS LOS 13 ESCENARIOS DE LA FASE 14 STRICT FUERON SUPERADOS AL 100% ===");
  console.log("===============================================================================");
});
