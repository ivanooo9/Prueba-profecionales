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
  Prisma,
} from "@prisma/client";

test("Academic Isolated Flow - Complete 2 Quimesters x 3 Partials Verification", async (t) => {
  const testSuffix = Date.now();

  // 0. Protección Fail-Closed de Base de Datos: Rechazar terminantemente la base principal
  const dbInfo = await db.$queryRaw<Array<{ current_database: string; current_schema: string }>>`
    SELECT current_database(), current_schema()
  `;
  const currentDbName = dbInfo[0]?.current_database;
  if (!currentDbName || currentDbName === "profesionales_ecuador" || !currentDbName.includes("test")) {
    throw new Error(
      `FATAL_FAIL_CLOSED_GUARD: Intento de ejecución bloqueado. La base activa es '${currentDbName}'. Las pruebas con escrituras deben ejecutarse exclusivamente sobre 'profesionales_ecuador_test'.`
    );
  }

  // 1. Setup: Crear una organización completamente aislada con datos ficticios
  const org = await db.organization.create({
    data: {
      name: `UAT Isolated School ${testSuffix}`,
      slug: `uat-isolated-school-${testSuffix}`,
      type: "INSTITUTION",
      status: "ACTIVE",
    },
  });
  const orgId = org.id;

  // Habilitar módulo TEACHING y Roles
  const adminRole = await db.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { name: "ADMIN", description: "Administrador del Sistema" },
  });
  const teacherRole = await db.role.upsert({
    where: { name: "PROFESSIONAL" },
    update: {},
    create: { name: "PROFESSIONAL", description: "Docente / Profesional" },
  });

  const teachingMod = await db.professionalModule.upsert({
    where: { code: "TEACHING" },
    update: {},
    create: { code: "TEACHING", name: "Docencia", description: "Módulo Docente" },
  });
  await db.organizationModule.create({
    data: {
      organizationId: orgId,
      moduleId: teachingMod.id,
      status: "ACTIVE",
    },
  });

  // Crear usuario Admin ficticio
  const adminUser = await db.user.create({
    data: {
      email: `admin_isolated_${testSuffix}@example.com`,
      password: "IsolatedTestPassword123!",
      name: `Admin UAT ${testSuffix}`,
      roleId: adminRole.id,
    },
  });
  await db.organizationMember.create({
    data: {
      organizationId: orgId,
      userId: adminUser.id,
      role: "OWNER",
      status: "ACTIVE",
    },
  });

  // Crear usuario Docente ficticio
  const teacherUser = await db.user.create({
    data: {
      email: `teacher_isolated_${testSuffix}@example.com`,
      password: "IsolatedTestPassword123!",
      name: `Docente Geometría ${testSuffix}`,
      roleId: teacherRole.id,
    },
  });
  await db.organizationMember.create({
    data: {
      organizationId: orgId,
      userId: teacherUser.id,
      role: "MEMBER",
      status: "ACTIVE",
    },
  });

  // Crear otro docente no asignado para probar RBAC
  const otherTeacherUser = await db.user.create({
    data: {
      email: `other_teacher_${testSuffix}@example.com`,
      password: "IsolatedTestPassword123!",
      name: `Otro Docente ${testSuffix}`,
      roleId: teacherRole.id,
    },
  });
  await db.organizationMember.create({
    data: {
      organizationId: orgId,
      userId: otherTeacherUser.id,
      role: "MEMBER",
      status: "ACTIVE",
    },
  });

  // Teardown automático: Limpieza determinista de datos efímeros al finalizar la prueba
  t.after(async () => {
    try {
      await db.academicGradeAuditLog.deleteMany({ where: { organizationId: orgId } });
      await db.academicGrade.deleteMany({ where: { organizationId: orgId } });
      await db.academicActivity.deleteMany({ where: { organizationId: orgId } });
      await db.academicEvaluationCategory.deleteMany({ where: { organizationId: orgId } });
      await db.academicEvaluationScheme.deleteMany({ where: { organizationId: orgId } });
      await db.academicEnrollment.deleteMany({ where: { organizationId: orgId } });
      await db.academicStudent.deleteMany({ where: { organizationId: orgId } });
      await db.academicSubject.deleteMany({ where: { organizationId: orgId } });
      await db.academicCourse.deleteMany({ where: { organizationId: orgId } });
      await db.academicPeriod.deleteMany({ where: { organizationId: orgId } });
      await db.academicYear.deleteMany({ where: { organizationId: orgId } });
      await db.organizationMember.deleteMany({ where: { organizationId: orgId } });
      await db.organizationModule.deleteMany({ where: { organizationId: orgId } });
      await db.organization.delete({ where: { id: orgId } });
      await db.user.deleteMany({
        where: { id: { in: [adminUser.id, teacherUser.id, otherTeacherUser.id] } },
      });
    } catch (e) {
      console.error("[Test Teardown Error]:", e);
    }
  });

  let yearId = 0;
  let q1Id = 0;
  let q2Id = 0;
  let p1Id = 0;
  let p2Id = 0;
  let p3Id = 0;
  let p4Id = 0;
  let p5Id = 0;
  let p6Id = 0;
  let courseId = 0;
  let subjectId = 0;
  let studentAId = 0;
  let studentBId = 0;
  let enrollmentAId = 0;
  let enrollmentBId = 0;
  let schemeId = 0;
  let catTareasId = 0;
  let catLeccionesId = 0;
  let catExamenId = 0;
  let activityId = 0;

  await t.test("1. Estructura Académica: Año Lectivo 2026-2027 y 2 Quimestres x 3 Parciales (Todos Visibles)", async () => {
    // A. Crear Año Lectivo 2026-2027 en estado ACTIVE
    const year = await AcademicService.createAcademicYear(orgId, {
      name: "Año Lectivo 2026-2027",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2027-06-30"),
      status: AcademicYearStatus.ACTIVE,
    });
    assert.ok(year.id > 0);
    assert.equal(year.status, AcademicYearStatus.ACTIVE);
    yearId = year.id;

    // B. Crear Primer Quimestre (QUIMESTER, parentId: null, ACTIVE)
    const q1 = await AcademicService.createAcademicPeriod(orgId, {
      academicYearId: yearId,
      name: "Primer Quimestre",
      type: AcademicPeriodType.QUIMESTER,
      order: 1,
      startDate: new Date("2026-09-01"),
      endDate: new Date("2027-01-31"),
    });
    assert.equal(q1.type, AcademicPeriodType.QUIMESTER);
    assert.equal(q1.status, AcademicPeriodStatus.ACTIVE);
    q1Id = q1.id;

    // C. Crear 3 Parciales para Quimestre 1 en estado ACTIVE (Visibles desde el inicio)
    const p1 = await AcademicService.createAcademicPeriod(orgId, {
      academicYearId: yearId,
      parentId: q1Id,
      name: "Parcial 1",
      type: AcademicPeriodType.PARTIAL,
      order: 1,
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-10-15"),
    });
    const p2 = await AcademicService.createAcademicPeriod(orgId, {
      academicYearId: yearId,
      parentId: q1Id,
      name: "Parcial 2",
      type: AcademicPeriodType.PARTIAL,
      order: 2,
      startDate: new Date("2026-10-16"),
      endDate: new Date("2026-11-30"),
    });
    const p3 = await AcademicService.createAcademicPeriod(orgId, {
      academicYearId: yearId,
      parentId: q1Id,
      name: "Parcial 3",
      type: AcademicPeriodType.PARTIAL,
      order: 3,
      startDate: new Date("2026-12-01"),
      endDate: new Date("2027-01-31"),
    });

    p1Id = p1.id;
    p2Id = p2.id;
    p3Id = p3.id;

    // D. Crear Segundo Quimestre (QUIMESTER, parentId: null, ACTIVE)
    const q2 = await AcademicService.createAcademicPeriod(orgId, {
      academicYearId: yearId,
      name: "Segundo Quimestre",
      type: AcademicPeriodType.QUIMESTER,
      order: 2,
      startDate: new Date("2027-02-01"),
      endDate: new Date("2027-06-30"),
    });
    q2Id = q2.id;

    // E. Crear 3 Parciales para Quimestre 2 en estado ACTIVE (Visibles desde el inicio)
    const p4 = await AcademicService.createAcademicPeriod(orgId, {
      academicYearId: yearId,
      parentId: q2Id,
      name: "Parcial 1",
      type: AcademicPeriodType.PARTIAL,
      order: 1,
      startDate: new Date("2027-02-01"),
      endDate: new Date("2027-03-20"),
    });
    const p5 = await AcademicService.createAcademicPeriod(orgId, {
      academicYearId: yearId,
      parentId: q2Id,
      name: "Parcial 2",
      type: AcademicPeriodType.PARTIAL,
      order: 2,
      startDate: new Date("2027-03-21"),
      endDate: new Date("2027-05-10"),
    });
    const p6 = await AcademicService.createAcademicPeriod(orgId, {
      academicYearId: yearId,
      parentId: q2Id,
      name: "Parcial 3",
      type: AcademicPeriodType.PARTIAL,
      order: 3,
      startDate: new Date("2027-05-11"),
      endDate: new Date("2027-06-30"),
    });

    p4Id = p4.id;
    p5Id = p5.id;
    p6Id = p6.id;

    // F. Verificar visibilidad total de los 8 periodos en la organización
    const allPeriods = await db.academicPeriod.findMany({ where: { organizationId: orgId } });
    assert.equal(allPeriods.length, 8);
    assert.equal(allPeriods.filter((p) => p.type === AcademicPeriodType.QUIMESTER).length, 2);
    assert.equal(allPeriods.filter((p) => p.type === AcademicPeriodType.PARTIAL).length, 6);
    assert.equal(allPeriods.every((p) => p.status === AcademicPeriodStatus.ACTIVE), true);
  });

  await t.test("2. Cursos, Materias, Asignación Docente y Matrículas Ficticias", async () => {
    // A. Crear Curso 3ro A
    const course = await AcademicService.createCourse(orgId, {
      name: `3ro A ${testSuffix}`,
      level: "Bachillerato General",
      classroom: "Aula 301",
    });
    courseId = course.id;

    // B. Crear Materia Geometría asignada al Docente de prueba
    const subject = await AcademicService.createSubject(orgId, courseId, {
      name: `Geometría ${testSuffix}`,
      code: `GEO-${testSuffix}`,
      hoursPerWeek: 4,
      teacherUserId: teacherUser.id,
    });
    subjectId = subject.id;
    assert.equal(subject.teacherUserId, teacherUser.id);

    // C. Crear 2 Estudiantes Ficticios
    const stA = await AcademicService.createStudent(orgId, {
      firstName: "Estudiante",
      lastName: `A UAT ${testSuffix}`,
      identification: `09${String(testSuffix).slice(-8)}1`,
      email: `student_a_${testSuffix}@example.com`,
    });
    const stB = await AcademicService.createStudent(orgId, {
      firstName: "Estudiante",
      lastName: `B UAT ${testSuffix}`,
      identification: `09${String(testSuffix).slice(-8)}2`,
      email: `student_b_${testSuffix}@example.com`,
    });
    studentAId = stA.id;
    studentBId = stB.id;

    // D. Matricular estudiantes explícitamente en el Año 2026-2027
    const enrA = await AcademicService.enrollStudent(orgId, {
      courseId,
      studentId: studentAId,
      academicYearId: yearId,
    });
    const enrB = await AcademicService.enrollStudent(orgId, {
      courseId,
      studentId: studentBId,
      academicYearId: yearId,
    });
    enrollmentAId = enrA.id;
    enrollmentBId = enrB.id;

    assert.equal(enrA.academicYearId, yearId);
    assert.equal(enrB.academicYearId, yearId);
  });

  await t.test("3. Control de Autorización Docente (RBAC)", async () => {
    // Docente asignado tiene acceso
    const accessAssigned = {
      isAcademicAdmin: false,
      userId: teacherUser.id,
      organizationId: orgId,
    };
    // Docente no asignado debe ser rechazado con 403
    const accessUnassigned = {
      isAcademicAdmin: false,
      userId: otherTeacherUser.id,
      organizationId: orgId,
    };

    // Intentar crear esquema con docente no asignado -> 403
    await assert.rejects(
      async () => {
        await AcademicService.createEvaluationScheme(
          orgId,
          {
            courseId,
            subjectId,
            academicPeriodId: p1Id,
            maxScale: 10,
            minPassingScore: 7,
          },
          accessUnassigned
        );
      },
      (err: any) => err.statusCode === 403
    );
  });

  await t.test("4. Esquema de Evaluación (40% Tareas, 30% Lecciones, 30% Examen = 100%)", async () => {
    const teacherAccess = {
      isAcademicAdmin: false,
      userId: teacherUser.id,
      organizationId: orgId,
    };

    // A. Crear esquema en estado DRAFT
    const scheme = await AcademicService.createEvaluationScheme(
      orgId,
      {
        courseId,
        subjectId,
        academicPeriodId: p1Id,
        maxScale: 10,
        minPassingScore: 7,
        status: AcademicEvaluationSchemeStatus.DRAFT,
      },
      teacherAccess
    );
    schemeId = scheme.id;
    assert.equal(scheme.status, AcademicEvaluationSchemeStatus.DRAFT);

    // B. Crear Categoría 1: Tareas y deberes (40%)
    const cat1 = await AcademicService.createEvaluationCategory(
      orgId,
      schemeId,
      {
        name: "Tareas y deberes",
        weightPercentage: 40,
        order: 1,
      },
      teacherAccess
    );
    catTareasId = cat1.id;

    // C. Crear Categoría 2: Lecciones y prácticas (30%)
    const cat2 = await AcademicService.createEvaluationCategory(
      orgId,
      schemeId,
      {
        name: "Lecciones y prácticas",
        weightPercentage: 30,
        order: 2,
      },
      teacherAccess
    );
    catLeccionesId = cat2.id;

    // D. Crear Categoría 3: Evaluación parcial (30%)
    const cat3 = await AcademicService.createEvaluationCategory(
      orgId,
      schemeId,
      {
        name: "Evaluación parcial",
        weightPercentage: 30,
        order: 3,
      },
      teacherAccess
    );
    catExamenId = cat3.id;

    // E. Intentar exceder el 100% -> Debe ser rechazado
    await assert.rejects(
      async () => {
        await AcademicService.createEvaluationCategory(
          orgId,
          schemeId,
          {
            name: "Categoría Extra",
            weightPercentage: 5,
            order: 4,
          },
          teacherAccess
        );
      },
      /EVALUATION_WEIGHT_EXCEEDED|superar el 100/i
    );

    // F. Validar y activar esquema (Transición a VALID)
    const validatedScheme = await AcademicService.validateEvaluationScheme(
      orgId,
      schemeId,
      teacherAccess
    );
    assert.equal(validatedScheme.status, AcademicEvaluationSchemeStatus.VALID);

    // G. FASE 10.5: Verificación de Creación Automática de Evaluación Final
    const finalEval = await db.academicActivity.findFirst({
      where: {
        organizationId: orgId,
        academicPeriodId: p1Id,
        categoryId: catExamenId,
      },
    });
    assert.ok(finalEval, "La evaluación final del parcial debe haberse creado automáticamente");
    assert.equal(finalEval?.name, "Evaluación final del parcial");
    assert.equal(finalEval?.type, "EXAM");
    assert.equal(finalEval?.categoryId, catExamenId);

    // H. Idempotencia y Concurrencia: Garantizar que no se duplica la evaluación final
    const secondCall = await AcademicService.ensurePeriodFinalEvaluation(orgId, schemeId, teacherAccess);
    assert.equal(secondCall?.id, finalEval?.id, "Llamadas sucesivas deben ser idempotentes");

    const [c1, c2] = await Promise.all([
      AcademicService.ensurePeriodFinalEvaluation(orgId, schemeId, teacherAccess),
      AcademicService.ensurePeriodFinalEvaluation(orgId, schemeId, teacherAccess),
    ]);
    assert.equal(c1?.id, finalEval?.id);
    assert.equal(c2?.id, finalEval?.id);

    const totalFinalEvals = await db.academicActivity.count({
      where: {
        organizationId: orgId,
        academicPeriodId: p1Id,
        categoryId: catExamenId,
      },
    });
    assert.equal(totalFinalEvals, 1, "Debe existir exactamente 1 evaluación final en el parcial");
  });

  await t.test("5. Creación de Actividades (Tipos: Actividad, Práctica, Lección) y Asignación Automática", async () => {
    const teacherAccess = {
      isAcademicAdmin: false,
      userId: teacherUser.id,
      organizationId: orgId,
    };

    // A. Crear actividad ordinaria (type: ACTIVITY) en Parcial 1
    const activity = await AcademicService.createActivity(
      orgId,
      courseId,
      {
        subjectId,
        academicPeriodId: p1Id,
        evaluationSchemeId: schemeId,
        categoryId: catTareasId,
        teacherUserId: teacherUser.id,
        name: "Deber 1: Vectores y Planos",
        type: "ACTIVITY",
        maxScore: 10,
        dueDate: new Date("2026-09-20"),
      },
      teacherAccess
    );
    activityId = activity.id;
    assert.ok(activityId > 0);
    assert.equal(activity.type, "ACTIVITY");

    // B. Crear actividad tipo PRACTICE en Parcial 1
    const actPractica = await AcademicService.createActivity(
      orgId,
      courseId,
      {
        subjectId,
        academicPeriodId: p1Id,
        evaluationSchemeId: schemeId,
        categoryId: catTareasId,
        teacherUserId: teacherUser.id,
        name: "Práctica 1: Laboratorio de Geometría",
        type: "PRACTICE",
        maxScore: 10,
        dueDate: new Date("2026-09-22"),
      },
      teacherAccess
    );
    assert.equal(actPractica.type, "PRACTICE");

    // C. Crear actividad tipo LESSON en Parcial 1
    const actLeccion = await AcademicService.createActivity(
      orgId,
      courseId,
      {
        subjectId,
        academicPeriodId: p1Id,
        evaluationSchemeId: schemeId,
        categoryId: catLeccionesId,
        teacherUserId: teacherUser.id,
        name: "Lección 1: Figuras Espaciales",
        type: "LESSON",
        maxScore: 10,
        dueDate: new Date("2026-09-25"),
      },
      teacherAccess
    );
    assert.equal(actLeccion.type, "LESSON");

    // D. Verificar que se inicializaron las calificaciones en estado PENDING para los 2 estudiantes
    const initialGrades = await db.academicGrade.findMany({
      where: { activityId },
    });
    assert.equal(initialGrades.length, 2);
    assert.equal(initialGrades.every((g) => g.status === AcademicGradeStatus.PENDING), true);
  });

  await t.test("6. Registro de Calificaciones en Lote, Persistencia y Auditoría", async () => {
    const teacherAccess = {
      isAcademicAdmin: false,
      userId: teacherUser.id,
      organizationId: orgId,
    };

    // Guardar lote: Estudiante A = 9.50, Estudiante B = 8.00
    const saveResult = await AcademicService.saveGradesBatch(
      orgId,
      activityId,
      [
        {
          studentId: studentAId,
          enrollmentId: enrollmentAId,
          score: 9.5,
          status: AcademicGradeStatus.GRADED,
          comments: "Excelente trabajo en vectores",
        },
        {
          studentId: studentBId,
          enrollmentId: enrollmentBId,
          score: 8.0,
          status: AcademicGradeStatus.GRADED,
          comments: "Buen desarrollo, revisar ejercicios impares",
        },
      ],
      { reason: "Calificación formal Deber 1", changedByUserId: teacherUser.id },
      teacherAccess
    );
    assert.equal(saveResult.length, 2);

    // Verificar persistencia directa en DB
    const gradeA = await db.academicGrade.findUnique({
      where: { activityId_studentId: { activityId, studentId: studentAId } },
    });
    const gradeB = await db.academicGrade.findUnique({
      where: { activityId_studentId: { activityId, studentId: studentBId } },
    });
    assert.equal(Number(gradeA?.score), 9.5);
    assert.equal(Number(gradeB?.score), 8.0);
    assert.equal(gradeA?.status, AcademicGradeStatus.GRADED);

    // Verificar inserción en AcademicGradeAuditLog
    const auditLogs = await db.academicGradeAuditLog.findMany({
      where: { organizationId: orgId, gradeId: { in: [gradeA!.id, gradeB!.id] } },
    });
    assert.equal(auditLogs.length, 2);
    assert.equal(auditLogs[0].changedByUserId, teacherUser.id);
    assert.equal(auditLogs[0].reason, "Calificación formal Deber 1");
  });

  await t.test("7. Cálculo Automático de Promedios Ponderados Progresivos", async () => {
    const teacherAccess = {
      isAcademicAdmin: false,
      userId: teacherUser.id,
      organizationId: orgId,
    };

    const matrix = await AcademicService.calculatePeriodGradesMatrix(
      orgId,
      courseId,
      subjectId,
      p1Id,
      undefined,
      teacherAccess
    );

    assert.equal(matrix.students.length, 2);

    // Estudiante A (Melanie / 9.50 en Tareas):
    const rowA = matrix.students.find((s) => s.studentId === studentAId);
    assert.ok(rowA);
    assert.equal(rowA.evaluatedWeightPercentage, 40); // 40% evaluado
    assert.equal(rowA.provisionalAverage, 9.5); // Promedio sobre lo evaluado (100% de la categoría Tareas)
    assert.equal(rowA.definitiveGrade, 3.8); // 9.5 * 0.40 = 3.80 / 10 definitivo acumulado

    // Estudiante B (Christian / 8.00 en Tareas):
    const rowB = matrix.students.find((s) => s.studentId === studentBId);
    assert.ok(rowB);
    assert.equal(rowB.evaluatedWeightPercentage, 40);
    assert.equal(rowB.provisionalAverage, 8.0);
    assert.equal(rowB.definitiveGrade, 3.2); // 8.0 * 0.40 = 3.20 / 10 definitivo acumulado
  });

  await t.test("8. Verificación de Máquina de Estados: LOCKED e Inmutabilidad en CLOSED", async () => {
    const teacherAccess = {
      isAcademicAdmin: false,
      userId: teacherUser.id,
      organizationId: orgId,
    };

    // A. Bloquear Parcial 1 (Transición a LOCKED)
    await AcademicService.changeAcademicPeriodStatus(orgId, p1Id, AcademicPeriodStatus.LOCKED);

    // En LOCKED: Rechaza crear nuevas actividades
    await assert.rejects(
      async () => {
        await AcademicService.createActivity(
          orgId,
          courseId,
          {
            subjectId,
            academicPeriodId: p1Id,
            name: "Deber 2 Intento en Periodo Bloqueado",
            maxScore: 10,
          },
          teacherAccess
        );
      },
      /ACADEMIC_PERIOD_LOCKED/
    );

    // En LOCKED: Permite editar notas en actividades existentes
    const updateGradeResult = await AcademicService.saveGradesBatch(
      orgId,
      activityId,
      [
        {
          studentId: studentAId,
          enrollmentId: enrollmentAId,
          score: 10.0,
          status: AcademicGradeStatus.GRADED,
          comments: "Corrección justificada: 10/10",
        },
      ],
      { reason: "Corrección justificada en LOCKED", changedByUserId: teacherUser.id },
      teacherAccess
    );
    assert.equal(updateGradeResult.length, 1);

    const updatedGradeA = await db.academicGrade.findUnique({
      where: { activityId_studentId: { activityId, studentId: studentAId } },
    });
    assert.equal(Number(updatedGradeA?.score), 10.0);

    // B. Reabrir a ACTIVE para completar actividades restantes y poder cerrar
    await AcademicService.changeAcademicPeriodStatus(orgId, p1Id, AcademicPeriodStatus.ACTIVE);

    // Calificar en Prácticas (40%) - utilizar la actividad creada en paso 5
    const actPractica = await db.academicActivity.findFirst({
      where: { organizationId: orgId, academicPeriodId: p1Id, name: "Práctica 1: Laboratorio de Geometría" },
    });
    assert.ok(actPractica);
    await AcademicService.saveGradesBatch(
      orgId,
      actPractica!.id,
      [
        { studentId: studentAId, score: 9.5, status: AcademicGradeStatus.GRADED },
        { studentId: studentBId, score: 8.0, status: AcademicGradeStatus.GRADED },
      ],
      undefined,
      teacherAccess
    );

    // Calificar en Lecciones (30%) - utilizar la actividad creada en paso 5
    const actLeccion = await db.academicActivity.findFirst({
      where: { organizationId: orgId, academicPeriodId: p1Id, categoryId: catLeccionesId },
    });
    assert.ok(actLeccion);
    await AcademicService.saveGradesBatch(
      orgId,
      actLeccion!.id,
      [
        { studentId: studentAId, score: 9.0, status: AcademicGradeStatus.GRADED },
        { studentId: studentBId, score: 9.0, status: AcademicGradeStatus.GRADED },
      ],
      undefined,
      teacherAccess
    );

    // Calificar en Evaluación Final Automática (30%)
    const finalExam = await db.academicActivity.findFirst({
      where: { organizationId: orgId, academicPeriodId: p1Id, categoryId: catExamenId },
    });
    assert.ok(finalExam);
    assert.equal(finalExam!.name, "Evaluación final del parcial");
    await AcademicService.saveGradesBatch(
      orgId,
      finalExam!.id,
      [
        { studentId: studentAId, score: 10.0, status: AcademicGradeStatus.GRADED },
        { studentId: studentBId, score: 8.5, status: AcademicGradeStatus.GRADED },
      ],
      undefined,
      teacherAccess
    );

    // C. Cerrar Parcial 1 (Transición a CLOSED)
    await AcademicService.changeAcademicPeriodStatus(orgId, p1Id, AcademicPeriodStatus.CLOSED);

    // En CLOSED: Rechaza crear actividades
    await assert.rejects(
      async () => {
        await AcademicService.createActivity(
          orgId,
          courseId,
          {
            subjectId,
            academicPeriodId: p1Id,
            name: "Deber Extemporáneo",
            maxScore: 10,
          },
          teacherAccess
        );
      },
      /ACADEMIC_PERIOD_IMMUTABLE/
    );

    // En CLOSED: Rechaza editar notas (Inmutabilidad estricta)
    await assert.rejects(
      async () => {
        await AcademicService.saveGradesBatch(
          orgId,
          activityId,
          [
            {
              studentId: studentAId,
              score: 7.0,
              status: AcademicGradeStatus.GRADED,
            },
          ],
          undefined,
          teacherAccess
        );
      },
      /cerrado o archivado/i
    );
  });

  await t.test("9. Control Temporal de Parciales Futuros (ACADEMIC_PERIOD_NOT_STARTED)", async () => {
    const teacherAccess = {
      isAcademicAdmin: false,
      userId: teacherUser.id,
      organizationId: orgId,
    };
    const adminAccess = {
      isAcademicAdmin: true,
      userId: adminUser.id,
      organizationId: orgId,
    };

    // p4Id es Segundo Quimestre - Parcial 1 (startDate: 2027-02-01, ESTRICTAMENTE FUTURO)
    // Crear y validar esquema de evaluación para p4Id según las reglas de Fase 14
    const schemeP4 = await AcademicService.createEvaluationScheme(
      orgId,
      {
        courseId,
        subjectId,
        academicPeriodId: p4Id,
        maxScale: 10,
        minPassingScore: 7,
        status: AcademicEvaluationSchemeStatus.DRAFT,
      },
      adminAccess
    );
    const catP4 = await AcademicService.createEvaluationCategory(
      orgId,
      schemeP4.id,
      {
        name: "Tareas y proyectos",
        weightPercentage: 100,
        order: 1,
      },
      adminAccess
    );
    await AcademicService.validateEvaluationScheme(orgId, schemeP4.id, adminAccess);

    // 9.1 Parcial futuro ACTIVE: Docente intenta crear actividad -> Rechazado con ACADEMIC_PERIOD_NOT_STARTED (HTTP 409)
    await assert.rejects(
      async () => {
        await AcademicService.createActivity(
          orgId,
          courseId,
          {
            subjectId,
            academicPeriodId: p4Id,
            categoryId: catP4.id,
            name: "Actividad Prematura en Periodo Futuro",
            maxScore: 10,
          },
          teacherAccess
        );
      },
      (err: any) => {
        assert.equal(err.code, "ACADEMIC_PERIOD_NOT_STARTED");
        assert.equal(err.statusCode, 409);
        assert.match(err.message, /ACADEMIC_PERIOD_NOT_STARTED/);
        return true;
      }
    );

    // 9.2 Excepción Administrativa: Administrador puede crear actividad preparatoria en periodo futuro
    const prepActivity = await AcademicService.createActivity(
      orgId,
      courseId,
      {
        subjectId,
        academicPeriodId: p4Id,
        categoryId: catP4.id,
        name: "Examen Preparatorio Creado por Admin",
        maxScore: 10,
      },
      adminAccess
    );
    assert.ok(prepActivity.id > 0);

    // 9.3 Parcial futuro ACTIVE: Docente intenta calificar la actividad preparatoria -> Rechazado con ACADEMIC_PERIOD_NOT_STARTED
    const gradesCountBefore = await db.academicGrade.count({ where: { activityId: prepActivity.id } });
    await assert.rejects(
      async () => {
        await AcademicService.saveGradesBatch(
          orgId,
          prepActivity.id,
          [
            {
              studentId: studentAId,
              enrollmentId: enrollmentAId,
              score: 9.0,
              status: AcademicGradeStatus.GRADED,
            },
          ],
          undefined,
          teacherAccess
        );
      },
      (err: any) => {
        assert.equal(err.code, "ACADEMIC_PERIOD_NOT_STARTED");
        assert.equal(err.statusCode, 409);
        return true;
      }
    );

    // 9.4 Atomicidad: No hubo mutación ni inserción parcial tras el rechazo
    const gradesCountAfter = await db.academicGrade.count({ where: { activityId: prepActivity.id } });
    assert.equal(gradesCountBefore, gradesCountAfter);

    // 9.5 Parcial futuro LOCKED: Si el periodo futuro estuviera en LOCKED, docente tampoco puede calificar
    await AcademicService.changeAcademicPeriodStatus(orgId, p4Id, AcademicPeriodStatus.LOCKED);
    await assert.rejects(
      async () => {
        await AcademicService.saveGradesBatch(
          orgId,
          prepActivity.id,
          [
            {
              studentId: studentAId,
              score: 10.0,
              status: AcademicGradeStatus.GRADED,
            },
          ],
          undefined,
          teacherAccess
        );
      },
      (err: any) => {
        assert.equal(err.code, "ACADEMIC_PERIOD_NOT_STARTED");
        assert.equal(err.statusCode, 409);
        return true;
      }
    );

    // Limpieza de la actividad preparatoria de prueba antes del cierre
    await db.academicGrade.deleteMany({ where: { activity: { academicPeriodId: p4Id } } });
    await db.academicActivity.deleteMany({ where: { academicPeriodId: p4Id } });

    // 9.6 Inmutabilidad de Periodos CLOSED / ARCHIVED incluso para administradores
    await AcademicService.changeAcademicPeriodStatus(orgId, p4Id, AcademicPeriodStatus.CLOSED);
    await assert.rejects(
      async () => {
        await AcademicService.createActivity(
          orgId,
          courseId,
          {
            subjectId,
            academicPeriodId: p4Id,
            name: "Actividad Ilegal en Periodo Cerrado",
            maxScore: 10,
          },
          adminAccess
        );
      },
      /ACADEMIC_PERIOD_IMMUTABLE/
    );
  });

  await t.test("10. Gestión Segura de Cursos: Dependencias, Rechazo de Eliminación, Archivado y Reactivación", async () => {
    // 10.1 Inspección de dependencias en curso con matrícula, materias y notas
    const depsWithData = await AcademicService.getCourseDependencies(orgId, courseId);
    assert.equal(depsWithData.canDelete, false, "El curso con datos académicos no debe ser eliminable");
    assert.ok(depsWithData.dependencies.enrollments > 0, "Debe reportar matrículas existentes");
    assert.ok(depsWithData.dependencies.subjects > 0, "Debe reportar materias existentes");
    assert.ok(depsWithData.dependencies.activities > 0, "Debe reportar actividades existentes");

    // 10.2 Intento de eliminación física directa debe ser bloqueado con 409
    await assert.rejects(
      async () => {
        await AcademicService.deleteCourse(orgId, courseId);
      },
      (err: any) => {
        assert.equal(err.code, "COURSE_HAS_DEPENDENCIES");
        assert.equal(err.statusCode, 409);
        return true;
      }
    );

    // 10.3 Archivado seguro del curso
    await AcademicService.archiveCourse(orgId, courseId);
    const archivedCourse = await AcademicService.getCourseById(orgId, courseId);
    assert.equal(archivedCourse.status, "ARCHIVED");

    // 10.4 Reactivación segura del curso
    const reactivatedCourse = await AcademicService.reactivateCourse(orgId, courseId);
    assert.equal(reactivatedCourse.status, "ACTIVE");

    // 10.5 Creación de un curso vacío de prueba sin dependencias
    const emptyCourse = await AcademicService.createCourse(orgId, {
      name: `Curso Vacio Temporal ${Date.now()}`,
      level: "Nivel Prueba",
    });
    const emptyDeps = await AcademicService.getCourseDependencies(orgId, emptyCourse.id);
    assert.equal(emptyDeps.canDelete, true, "Un curso recién creado sin dependencias debe ser eliminable");
    assert.equal(emptyDeps.dependencies.enrollments, 0);
    assert.equal(emptyDeps.dependencies.subjects, 0);

    // 10.6 Eliminación física exitosa del curso vacío
    await AcademicService.deleteCourse(orgId, emptyCourse.id);
    await assert.rejects(
      async () => {
        await AcademicService.getCourseById(orgId, emptyCourse.id);
      },
      (err: any) => {
        assert.equal(err.statusCode, 404);
        return true;
      }
    );
  });

  await t.test("11. Certificación de Ejecución en Base de Datos de Pruebas y Aislamiento Total", async () => {
    const dbVerification = await db.$queryRaw<Array<{ current_database: string }>>`
      SELECT current_database()
    `;
    const activeDb = dbVerification[0]?.current_database;
    assert.equal(activeDb, "profesionales_ecuador_test", "El test debe haberse ejecutado en profesionales_ecuador_test");
    assert.notEqual(activeDb, "profesionales_ecuador", "La base principal nunca debe ser el destino del test");

    // En la base de pruebas aislada, la organización real de producción no existe
    const liveOrgInTestDb = await db.organization.findFirst({
      where: { name: "Clinica San Jose/Consultorio Medico" },
    });
    assert.equal(liveOrgInTestDb, null, "La organización real de producción no existe en la base de pruebas aislada");
  });
});
