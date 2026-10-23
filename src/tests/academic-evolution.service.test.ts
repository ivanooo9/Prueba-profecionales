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

test("Academic Evolution Engine - Comprehensive Test Suite", async (t) => {
  const testSuffix = Date.now();

  // Setup: Crear una organización aislada para las pruebas
  const org = await db.organization.create({
    data: {
      name: `Test Org Service ${testSuffix}`,
      slug: `test-org-service-${testSuffix}`,
      type: "INSTITUTION",
      status: "ACTIVE",
    },
  });

  const organizationId = org.id;

  const teachingMod = await db.professionalModule.findUnique({
    where: { code: "TEACHING" },
  });
  if (teachingMod) {
    await db.organizationModule.create({
      data: {
        organizationId,
        moduleId: teachingMod.id,
        status: "ACTIVE",
      },
    });
  }

  // Buscar o usar usuario para auditoría
  const defaultUser = await db.user.findFirst();
  const testUserId = defaultUser?.id || 1;
  await db.organizationMember.create({
    data: {
      organizationId,
      userId: testUserId,
      role: "OWNER",
      status: "ACTIVE",
    },
  });

  let testYearId = 0;
  let testPeriodId = 0;
  let testSubPeriodId = 0;
  let testCourseId = 0;
  let testSubjectId = 0;
  let testStudentId = 0;
  let testEnrollmentId = 0;
  let testSchemeId = 0;
  let testCat1Id = 0;
  let testCat2Id = 0;
  let testActivityId = 0;
  let testGradeId = 0;

  try {
    // =========================================================================
    // 1. TEST ACADEMIC YEAR
    // =========================================================================
    await t.test("1. Academic Year: creación, validación de fechas y unicidad", async () => {
      // 1.1 Fechas inválidas (startDate >= endDate) debe fallar
      await assert.rejects(
        async () => {
          await AcademicService.createAcademicYear(organizationId, {
            name: `Año Inválido ${testSuffix}`,
            startDate: new Date("2026-12-31"),
            endDate: new Date("2026-01-01"),
          });
        },
        /La fecha de inicio debe ser anterior a la fecha de fin/
      );

      // 1.2 Creación exitosa en estado PLANNED
      const plannedYear = await AcademicService.createAcademicYear(organizationId, {
        name: `Año Lectivo Planificado ${testSuffix}`,
        startDate: new Date("2026-05-01"),
        endDate: new Date("2027-02-28"),
        status: AcademicYearStatus.PLANNED,
      });
      assert.ok(plannedYear.id > 0);
      assert.strictEqual(plannedYear.status, AcademicYearStatus.PLANNED);

      // 1.3 Promover a ACTIVE
      const year = await AcademicService.changeAcademicYearStatus(
        organizationId,
        plannedYear.id,
        AcademicYearStatus.ACTIVE
      );

      assert.ok(year.id > 0);
      assert.strictEqual(year.status, AcademicYearStatus.ACTIVE);
      testYearId = year.id;

      // 1.4 Intentar crear un segundo año ACTIVE debe ser rechazado (ACADEMIC_YEAR_ALREADY_ACTIVE)
      await assert.rejects(
        async () => {
          await AcademicService.createAcademicYear(organizationId, {
            name: `Segundo Año Activo ${testSuffix}`,
            startDate: new Date("2026-05-01"),
            endDate: new Date("2027-02-28"),
            status: AcademicYearStatus.ACTIVE,
          });
        },
        /ACADEMIC_YEAR_ALREADY_ACTIVE/
      );

      // 1.5 Crear un segundo año como PLANNED y luego intentar activarlo cuando ya existe uno ACTIVE debe fallar
      const secondPlannedYear = await AcademicService.createAcademicYear(organizationId, {
        name: `Segundo Año Planificado ${testSuffix}`,
        startDate: new Date("2026-05-01"),
        endDate: new Date("2027-02-28"),
        status: AcademicYearStatus.PLANNED,
      });
      await assert.rejects(
        async () => {
          await AcademicService.changeAcademicYearStatus(
            organizationId,
            secondPlannedYear.id,
            AcademicYearStatus.ACTIVE
          );
        },
        /ACADEMIC_YEAR_ALREADY_ACTIVE/
      );
      await db.academicYear.delete({ where: { id: secondPlannedYear.id } });

      // 1.6 Nombre duplicado en la misma org debe fallar
      await assert.rejects(
        async () => {
          await AcademicService.createAcademicYear(organizationId, {
            name: `Año Lectivo Planificado ${testSuffix}`,
            startDate: new Date("2026-05-01"),
            endDate: new Date("2027-02-28"),
          });
        },
        /Ya existe un año lectivo con el nombre/
      );

      // 1.7 Listar y obtener por ID
      const years = await AcademicService.getAcademicYears(organizationId, {
        search: `Planificado ${testSuffix}`,
      });
      assert.ok(years.length >= 1);

      const fetched = await AcademicService.getAcademicYearById(organizationId, testYearId);
      assert.strictEqual(fetched.id, testYearId);
    });

    // =========================================================================
    // 2. TEST ACADEMIC PERIOD & HIERARCHY
    // =========================================================================
    await t.test("2. Academic Period: creación, fechas contenidas en año y sub-periodos", async () => {
      // 2.1 Periodo con fechas fuera del año lectivo debe fallar
      await assert.rejects(
        async () => {
          await AcademicService.createAcademicPeriod(organizationId, {
            academicYearId: testYearId,
            name: `Periodo Fuera de Rango ${testSuffix}`,
            type: AcademicPeriodType.TRIMESTER,
            startDate: new Date("2025-01-01"),
            endDate: new Date("2025-04-30"),
          });
        },
        /Las fechas del periodo deben estar contenidas dentro de las fechas del año lectivo/
      );

      // 2.2 Creación exitosa de periodo padre (Primer Trimestre)
      const period = await AcademicService.createAcademicPeriod(organizationId, {
        academicYearId: testYearId,
        name: `Primer Trimestre ${testSuffix}`,
        type: AcademicPeriodType.TRIMESTER,
        order: 1,
        startDate: new Date("2026-05-01"),
        endDate: new Date("2026-08-15"),
        status: AcademicPeriodStatus.ACTIVE,
      });

      assert.ok(period.id > 0);
      assert.strictEqual(period.academicYearId, testYearId);
      testPeriodId = period.id;

      // 2.3 Sub-periodo con fechas fuera del padre debe fallar (padre termina en 2026-08-15, sub-periodo en 2026-09-01)
      await assert.rejects(
        async () => {
          await AcademicService.createAcademicPeriod(organizationId, {
            academicYearId: testYearId,
            parentId: testPeriodId,
            name: `Parcial 1 Inválido ${testSuffix}`,
            type: AcademicPeriodType.PARTIAL,
            order: 1,
            startDate: new Date("2026-05-01"),
            endDate: new Date("2026-09-01"),
          });
        },
        /Las fechas del sub-periodo deben estar dentro del rango del periodo padre/
      );

      // 2.4 Creación exitosa de sub-periodo (Parcial 1 dentro del Primer Trimestre)
      const subPeriod = await AcademicService.createAcademicPeriod(organizationId, {
        academicYearId: testYearId,
        parentId: testPeriodId,
        name: `Parcial 1 ${testSuffix}`,
        type: AcademicPeriodType.PARTIAL,
        order: 1,
        startDate: new Date("2026-05-01"),
        endDate: new Date("2026-06-15"),
        status: AcademicPeriodStatus.ACTIVE,
      });

      assert.ok(subPeriod.id > 0);
      assert.strictEqual(subPeriod.parentId, testPeriodId);
      testSubPeriodId = subPeriod.id;
    });

    // =========================================================================
    // 3. SETUP COURSE, SUBJECT, STUDENT & ENROLLMENT
    // =========================================================================
    await t.test("3. Configuración de Curso, Materia y Matrícula", async () => {
      const course = await AcademicService.createCourse(organizationId, {
        name: `Curso Evaluación Test ${testSuffix}`,
        level: "Básica Superior",
      });
      testCourseId = course.id;

      const subject = await AcademicService.createSubject(organizationId, testCourseId, {
        name: `Matemáticas Test ${testSuffix}`,
        code: `MAT-${testSuffix}`,
      });
      testSubjectId = subject.id;

      const student = await AcademicService.createStudent(organizationId, {
        firstName: "Carlos",
        lastName: `Mendoza ${testSuffix}`,
        identification: `09${String(testSuffix).slice(-8)}`,
      });
      testStudentId = student.id;

      // 3.1 Matrícula sin academicYearId debe ser rechazada
      await assert.rejects(
        async () => {
          await AcademicService.enrollStudent(organizationId, {
            studentId: testStudentId,
            courseId: testCourseId,
          } as any);
        },
        /El año lectivo es obligatorio para registrar la matrícula/
      );

      // 3.2 Matrícula con academicYearId inexistente / otra institución debe ser rechazada
      await assert.rejects(
        async () => {
          await AcademicService.enrollStudent(organizationId, {
            studentId: testStudentId,
            courseId: testCourseId,
            academicYearId: 99999999,
          });
        },
        /Año lectivo no encontrado en esta institución/
      );

      // 3.3 Matrícula exitosa con academicYearId
      const enrollment = await AcademicService.enrollStudent(organizationId, {
        studentId: testStudentId,
        courseId: testCourseId,
        academicYearId: testYearId,
      });
      testEnrollmentId = enrollment.id;
      assert.ok(testEnrollmentId > 0);
      assert.strictEqual(enrollment.academicYearId, testYearId);

      // 3.4 Duplicado de matrícula moderna (mismo student, course, year) debe ser rechazado
      await assert.rejects(
        async () => {
          await AcademicService.enrollStudent(organizationId, {
            studentId: testStudentId,
            courseId: testCourseId,
            academicYearId: testYearId,
          });
        },
        /ya cuenta con una matrícula activa/
      );
    });

    // =========================================================================
    // 4. TEST EVALUATION SCHEME & 100% WEIGHT CEILING RULE
    // =========================================================================
    await t.test("4. Esquema de Evaluación y Techo Estricto del 100% en Categorías", async () => {
      // 4.1 Crear esquema en DRAFT
      const scheme = await AcademicService.createEvaluationScheme(organizationId, {
        courseId: testCourseId,
        subjectId: testSubjectId,
        academicPeriodId: testPeriodId,
        maxScale: 10.0,
        minPassingScore: 7.0,
      });

      assert.ok(scheme.id > 0);
      assert.strictEqual(scheme.status, AcademicEvaluationSchemeStatus.DRAFT);
      testSchemeId = scheme.id;

      // 4.2 Intentar validar esquema vacío (0% != 100%) debe fallar
      await assert.rejects(
        async () => {
          await AcademicService.validateEvaluationScheme(organizationId, testSchemeId);
        },
        /EVALUATION_WEIGHT_MISMATCH/
      );

      // 4.3 Agregar Categoría 1: Tareas (40.00%) - En DRAFT es permitido porque 40 <= 100
      const cat1 = await AcademicService.createEvaluationCategory(organizationId, testSchemeId, {
        name: "Tareas y Talleres",
        weightPercentage: 40.0,
        order: 1,
      });
      assert.ok(cat1.id > 0);
      assert.strictEqual(Number(cat1.weightPercentage), 40.0);
      testCat1Id = cat1.id;

      // 4.4 Intentar agregar categoría duplicada con el mismo nombre exacto, minúsculas o espacios
      await assert.rejects(
        async () => {
          await AcademicService.createEvaluationCategory(organizationId, testSchemeId, {
            name: "Tareas y Talleres",
            weightPercentage: 10.0,
          });
        },
        /EVALUATION_CATEGORY_DUPLICATE/
      );
      await assert.rejects(
        async () => {
          await AcademicService.createEvaluationCategory(organizationId, testSchemeId, {
            name: "tareas y talleres",
            weightPercentage: 10.0,
          });
        },
        /EVALUATION_CATEGORY_DUPLICATE/
      );
      await assert.rejects(
        async () => {
          await AcademicService.createEvaluationCategory(organizationId, testSchemeId, {
            name: "  Tareas y Talleres  ",
            weightPercentage: 10.0,
          });
        },
        /EVALUATION_CATEGORY_DUPLICATE/
      );

      // 4.5 Intentar agregar categoría con 70% (40 + 70 = 110% > 100%) DEBE RECHAZARSE INMEDIATAMENTE
      await assert.rejects(
        async () => {
          await AcademicService.createEvaluationCategory(organizationId, testSchemeId, {
            name: "Examen Excedido",
            weightPercentage: 70.0,
            order: 2,
          });
        },
        /EVALUATION_WEIGHT_EXCEEDED/
      );

      // 4.6 Agregar Categoría 2: Exámenes y Proyectos (60.00%) -> Total 100.00%
      const cat2 = await AcademicService.createEvaluationCategory(organizationId, testSchemeId, {
        name: "Exámenes y Proyectos",
        weightPercentage: 60.0,
        order: 2,
      });
      assert.ok(cat2.id > 0);
      assert.strictEqual(Number(cat2.weightPercentage), 60.0);
      testCat2Id = cat2.id;

      // 4.7 Validar el esquema ahora que suma exactamente 100% -> Pasa a VALID
      const validatedScheme = await AcademicService.validateEvaluationScheme(organizationId, testSchemeId);
      assert.strictEqual(validatedScheme.status, AcademicEvaluationSchemeStatus.VALID);

      // 4.8 Si intentamos agregar otra categoría del 10% debe rechazarse por exceder 100%
      await assert.rejects(
        async () => {
          await AcademicService.createEvaluationCategory(organizationId, testSchemeId, {
            name: "Categoría Extra",
            weightPercentage: 10.0,
            order: 3,
          });
        },
        /EVALUATION_WEIGHT_EXCEEDED/
      );
    });

    // =========================================================================
    // 5. TEST ACTIVITY CREATION & AUTO-GRADE ASSIGNMENT
    // =========================================================================
    await t.test("5. Actividades: asignación automática de notas PENDING", async () => {
      // 5.1 Crear actividad vinculada al periodo y categoría
      const activity = await AcademicService.createActivity(organizationId, testCourseId, {
        subjectId: testSubjectId,
        name: `Tarea 1 - Álgebra ${testSuffix}`,
        type: "HOMEWORK",
        maxScore: 10.0,
        dueDate: new Date("2026-06-01"),
        academicPeriodId: testPeriodId,
        categoryId: testCat1Id,
      });

      assert.ok(activity.id > 0);
      testActivityId = activity.id;

      // 5.2 Verificar que se creó automáticamente un registro AcademicGrade en estado PENDING con score=null
      const grades = await db.academicGrade.findMany({
        where: { activityId: testActivityId, organizationId },
      });

      assert.strictEqual(grades.length, 1);
      const initialGrade = grades[0];
      assert.strictEqual(initialGrade.studentId, testStudentId);
      assert.strictEqual(initialGrade.enrollmentId, testEnrollmentId);
      assert.strictEqual(initialGrade.status, AcademicGradeStatus.PENDING);
      assert.strictEqual(initialGrade.score, null);
      testGradeId = initialGrade.id;
    });

    // =========================================================================
    // 6. TEST GRADE RECORDING & ATOMIC AUDIT LOGGING
    // =========================================================================
    await t.test("6. Calificaciones: registro con Decimal y Auditoría Atómica", async () => {
      // 6.1 Calificar lote: actualizar a 9.50 (GRADED)
      const saveResult = await AcademicService.saveGradesBatch(
        organizationId,
        testActivityId,
        [
          {
            studentId: testStudentId,
            score: 9.5,
            status: AcademicGradeStatus.GRADED,
            comments: "Excelente trabajo",
          },
        ],
        {
          reason: "Calificación de entrega puntual",
          changedByUserId: testUserId,
        }
      );

      assert.strictEqual(saveResult.length, 1);
      const graded = saveResult[0];
      assert.strictEqual(graded.status, AcademicGradeStatus.GRADED);
      assert.strictEqual(Number(graded.score), 9.5);

      // 6.2 Verificar creación atómica de AcademicGradeAuditLog
      const auditLogs = await db.academicGradeAuditLog.findMany({
        where: { gradeId: testGradeId, organizationId },
        orderBy: { createdAt: "desc" },
      });

      assert.ok(auditLogs.length >= 1);
      const latestLog = auditLogs[0];
      assert.strictEqual(latestLog.newStatus, AcademicGradeStatus.GRADED);
      assert.strictEqual(Number(latestLog.newScore), 9.5);
      assert.strictEqual(latestLog.changedByUserId, testUserId);
      assert.strictEqual(latestLog.reason, "Calificación de entrega puntual");

      // 6.3 Modificación individual: corregir a 10.00
      const updatedGrade = await AcademicService.updateGradeRecord(organizationId, testGradeId, {
        score: 10.0,
        status: AcademicGradeStatus.GRADED,
        reason: "Corrección por punto extra",
        changedByUserId: testUserId,
      });

      assert.strictEqual(Number(updatedGrade.score), 10.0);

      // 6.4 Verificar nuevo log de auditoría
      const auditLogsAfter = await db.academicGradeAuditLog.findMany({
        where: { gradeId: testGradeId, organizationId },
        orderBy: { createdAt: "desc" },
      });
      assert.ok(auditLogsAfter.length >= 2);
      assert.strictEqual(Number(auditLogsAfter[0].previousScore), 9.5);
      assert.strictEqual(Number(auditLogsAfter[0].newScore), 10.0);
    });

    // =========================================================================
    // 7. TEST PROGRESSIVE CALCULATION & GRADEBOOK ENGINE
    // =========================================================================
    await t.test("7. Motor de Cálculo Progresivo: Promedio Provisional vs Nota Definitiva", async () => {
      // 7.1 Crear actividad para Categoría 2 (Examen 60%) sin calificar (PENDING)
      const examActivity = await AcademicService.createActivity(organizationId, testCourseId, {
        subjectId: testSubjectId,
        name: `Examen Trimestral ${testSuffix}`,
        type: "EXAM",
        maxScore: 10.0,
        dueDate: new Date("2026-08-01"),
        academicPeriodId: testPeriodId,
        categoryId: testCat2Id,
      });

      // 7.2 Ejecutar cálculo de matriz de periodo
      const matrix = await AcademicService.calculatePeriodGradesMatrix(
        organizationId,
        testCourseId,
        testSubjectId,
        testPeriodId,
        testStudentId
      );

      assert.strictEqual(matrix.students.length, 1);
      const studentCalc = matrix.students[0];

      // Explicación matemática esperada:
      // - Cat 1 (Tareas 40%): Calificada con 10.0/10.0 -> Contribución ponderada = 10.0 * 0.40 = 4.00
      // - Cat 2 (Exámenes 60%): No calificada aún (0%) -> Contribución = 0.00
      // - Evaluado actual: 40% (isComplete = false)
      // - Nota Definitiva acumulada: 4.00 / 10.00
      // - Promedio Provisional sobre lo evaluado: 4.00 / 0.40 = 10.00 / 10.00
      assert.strictEqual(studentCalc.evaluatedWeightPercentage, 40.0);
      assert.strictEqual(studentCalc.isComplete, false);
      assert.strictEqual(studentCalc.definitiveGrade, 4.0);
      assert.strictEqual(studentCalc.provisionalAverage, 10.0);

      // 7.3 Calificar el examen con 8.0/10.0
      await AcademicService.saveGradesBatch(
        organizationId,
        examActivity.id,
        [
          {
            studentId: testStudentId,
            score: 8.0,
            status: AcademicGradeStatus.GRADED,
          },
        ],
        { reason: "Calificación examen final", changedByUserId: testUserId }
      );

      // 7.4 Recalcular matriz: Ahora está al 100%
      // - Cat 1 (40%): 10.0 -> 4.00
      // - Cat 2 (60%): 8.0 -> 4.80
      // - Evaluado: 100% (isComplete = true)
      // - Nota Definitiva: 4.00 + 4.80 = 8.80
      // - Promedio Provisional: 8.80
      const matrixComplete = await AcademicService.calculatePeriodGradesMatrix(
        organizationId,
        testCourseId,
        testSubjectId,
        testPeriodId,
        testStudentId
      );

      const studentComplete = matrixComplete.students[0];
      assert.strictEqual(studentComplete.evaluatedWeightPercentage, 100.0);
      assert.strictEqual(studentComplete.isComplete, true);
      assert.strictEqual(studentComplete.definitiveGrade, 8.8);
      assert.strictEqual(studentComplete.provisionalAverage, 8.8);
      assert.strictEqual(studentComplete.isPassing, true);
    });

    // =========================================================================
    // 7B. TEST DECIMAL MAXSCORE & UPDATE PROTECTION
    // =========================================================================
    await t.test("7B. AcademicActivity.maxScore: validaciones Decimal(5,2), límites y protección de actualización", async () => {
      // 7B.1 Crear actividad con maxScore decimal (10.50)
      const decimalActivity = await AcademicService.createActivity(organizationId, testCourseId, {
        subjectId: testSubjectId,
        name: `Taller Decimal ${testSuffix}`,
        type: "PRACTICE",
        maxScore: 10.5,
        dueDate: new Date("2026-07-01"),
        academicPeriodId: testPeriodId,
        categoryId: testCat1Id,
      });

      assert.strictEqual(Number(decimalActivity.maxScore), 10.5);

      // 7B.2 Calificar con puntaje válido igual al máximo (10.50)
      const validGrade = await AcademicService.saveGradesBatch(
        organizationId,
        decimalActivity.id,
        [
          {
            studentId: testStudentId,
            score: 10.5,
            status: AcademicGradeStatus.GRADED,
          },
        ],
        { reason: "Calificación máxima válida", changedByUserId: testUserId }
      );
      assert.strictEqual(Number(validGrade[0].score), 10.5);

      // 7B.3 Intentar calificar con puntaje superior al maxScore (11.0 > 10.5) debe fallar
      await assert.rejects(
        async () => {
          await AcademicService.saveGradesBatch(
            organizationId,
            decimalActivity.id,
            [
              {
                studentId: testStudentId,
                score: 11.0,
                status: AcademicGradeStatus.GRADED,
              },
            ],
            { reason: "Puntaje inválido", changedByUserId: testUserId }
          );
        },
        /no puede exceder el puntaje máximo de la actividad/
      );

      // 7B.4 Actualizar nota a 8.50
      await AcademicService.saveGradesBatch(
        organizationId,
        decimalActivity.id,
        [
          {
            studentId: testStudentId,
            score: 8.5,
            status: AcademicGradeStatus.GRADED,
          },
        ],
        { reason: "Ajuste de nota a 8.5", changedByUserId: testUserId }
      );

      // 7B.5 Intentar reducir maxScore por debajo de la nota registrada (8.0 < 8.5) debe ser rechazado
      await assert.rejects(
        async () => {
          await AcademicService.updateActivity(organizationId, decimalActivity.id, {
            maxScore: 8.0,
          });
        },
        /No se puede reducir el puntaje máximo a 8 porque existen calificaciones registradas/
      );

      // 7B.6 Actualizar maxScore a un valor >= 8.5 (e.g. 9.0) debe ser permitido
      const updatedAct = await AcademicService.updateActivity(organizationId, decimalActivity.id, {
        maxScore: 9.0,
      });
      assert.strictEqual(Number(updatedAct.maxScore), 9.0);
    });

    // =========================================================================
    // 8. TEST PERIOD CLOSURE READINESS, IMMUTABILITY & LOCKED FREEZE
    // =========================================================================
    await t.test("8. Diagnóstico de Cierre, Congelamiento en LOCKED e Inmutabilidad en CLOSED", async () => {
      // 8.1 Crear una actividad temporal con calificación PENDING y verificar que bloquea el cierre
      const tempActivity = await AcademicService.createActivity(organizationId, testCourseId, {
        subjectId: testSubjectId,
        name: `Actividad Pendiente Test ${testSuffix}`,
        type: "HOMEWORK",
        maxScore: 10.0,
        academicPeriodId: testPeriodId,
        categoryId: testCat1Id,
      });

      const readinessWithPending = await AcademicService.getPeriodClosureReadiness(organizationId, testPeriodId);
      assert.strictEqual(readinessWithPending.canClose, false);
      assert.ok(readinessWithPending.blockers.some((b) => b.type === "PENDING_GRADES"));

      // 8.2 Intentar cerrar con calificación PENDING debe fallar (ACADEMIC_PERIOD_NOT_READY_TO_CLOSE) sin mutar notas
      await assert.rejects(
        async () => {
          await AcademicService.changeAcademicPeriodStatus(
            organizationId,
            testPeriodId,
            AcademicPeriodStatus.CLOSED
          );
        },
        (err: any) => {
          assert.strictEqual(err.code, "ACADEMIC_PERIOD_NOT_READY_TO_CLOSE");
          return true;
        }
      );

      // 8.3 Cambiar a estado ABSENT y verificar que también bloquea el cierre
      await AcademicService.saveGradesBatch(
        organizationId,
        tempActivity.id,
        [
          {
            studentId: testStudentId,
            status: AcademicGradeStatus.ABSENT,
          },
        ],
        { reason: "Estudiante ausente", changedByUserId: testUserId }
      );

      const readinessWithAbsent = await AcademicService.getPeriodClosureReadiness(organizationId, testPeriodId);
      assert.strictEqual(readinessWithAbsent.canClose, false);
      assert.ok(readinessWithAbsent.blockers.some((b) => b.type === "ABSENT_GRADES"));

      // 8.4 Cambiar a estado EXCUSED -> Genera advertencia pero NO bloquea el cierre y NO se convierte a 0
      await AcademicService.saveGradesBatch(
        organizationId,
        tempActivity.id,
        [
          {
            studentId: testStudentId,
            status: AcademicGradeStatus.EXCUSED,
          },
        ],
        { reason: "Justificativo médico aprobado", changedByUserId: testUserId }
      );

      const readinessWithExcused = await AcademicService.getPeriodClosureReadiness(organizationId, testPeriodId);
      assert.strictEqual(readinessWithExcused.canClose, true);
      assert.ok(readinessWithExcused.warnings.some((w) => w.type === "EXCUSED_GRADES_PRESENT"));

      // Limpiar actividad temporal para dejar estado 100% GRADED
      await db.academicGradeAuditLog.deleteMany({
        where: { grade: { activityId: tempActivity.id } },
      });
      await db.academicGrade.deleteMany({ where: { activityId: tempActivity.id } });
      await db.academicActivity.delete({ where: { id: tempActivity.id } });

      // 8.5 Transición a LOCKED: congela estructura pero permite calificaciones
      const lockedPeriod = await AcademicService.changeAcademicPeriodStatus(
        organizationId,
        testPeriodId,
        AcademicPeriodStatus.LOCKED
      );
      assert.ok(lockedPeriod);
      assert.strictEqual(lockedPeriod.status, AcademicPeriodStatus.LOCKED);

      // Intentar crear actividad en periodo LOCKED debe ser rechazado
      await assert.rejects(
        async () => {
          await AcademicService.createActivity(organizationId, testCourseId, {
            subjectId: testSubjectId,
            name: `Actividad Prohibida en LOCKED ${testSuffix}`,
            maxScore: 10.0,
            academicPeriodId: testPeriodId,
          });
        },
        /ACADEMIC_PERIOD_LOCKED/
      );

      // Intentar crear o modificar categorías en periodo LOCKED debe ser rechazado
      await assert.rejects(
        async () => {
          await AcademicService.createEvaluationCategory(organizationId, testSchemeId, {
            name: "Categoría en LOCKED",
            weightPercentage: 5.0,
          });
        },
        /periodo bloqueado/
      );

      // Calificar en periodo LOCKED sí es permitido
      const gradeInLocked = await AcademicService.saveGradesBatch(
        organizationId,
        testActivityId,
        [
          {
            studentId: testStudentId,
            score: 10.0,
            status: AcademicGradeStatus.GRADED,
          },
        ],
        { reason: "Calificación en periodo LOCKED", changedByUserId: testUserId }
      );
      assert.strictEqual(Number(gradeInLocked[0].score), 10.0);

      // 8.6 Cierre definitivo exitoso: Pasa a CLOSED y cierra esquemas asociados
      const readinessReady = await AcademicService.getPeriodClosureReadiness(organizationId, testPeriodId);
      assert.strictEqual(readinessReady.canClose, true);
      assert.strictEqual(readinessReady.blockers.length, 0);

      const closedPeriod = await AcademicService.changeAcademicPeriodStatus(
        organizationId,
        testPeriodId,
        AcademicPeriodStatus.CLOSED
      );
      assert.ok(closedPeriod);
      assert.strictEqual(closedPeriod.status, AcademicPeriodStatus.CLOSED);

      // Verificar que el esquema de evaluación también pasó a CLOSED
      const schemeAfterClose = await db.academicEvaluationScheme.findUnique({
        where: { id: testSchemeId },
      });
      assert.strictEqual(schemeAfterClose?.status, AcademicEvaluationSchemeStatus.CLOSED);

      // 8.7 Intentar reabrir periodo cerrado (CLOSED -> ACTIVE o CLOSED -> LOCKED) debe ser estrictamente rechazado
      await assert.rejects(
        async () => {
          await AcademicService.changeAcademicPeriodStatus(
            organizationId,
            testPeriodId,
            AcademicPeriodStatus.ACTIVE
          );
        },
        /No se puede reabrir un periodo académico cerrado/
      );

      // 8.8 Idempotencia: Intentar pasar CLOSED -> CLOSED debe retornar el periodo sin error
      const idempotentClose = await AcademicService.changeAcademicPeriodStatus(
        organizationId,
        testPeriodId,
        AcademicPeriodStatus.CLOSED
      );
      assert.ok(idempotentClose);
      assert.strictEqual(idempotentClose.status, AcademicPeriodStatus.CLOSED);

      // 8.9 Intentar crear actividad en periodo cerrado debe fallar
      await assert.rejects(
        async () => {
          await AcademicService.createActivity(organizationId, testCourseId, {
            subjectId: testSubjectId,
            name: `Actividad Prohibida ${testSuffix}`,
            maxScore: 10.0,
            academicPeriodId: testPeriodId,
          });
        },
        /No se pueden crear actividades en un periodo cerrado/
      );

      // 8.10 Intentar modificar calificación en periodo cerrado debe fallar
      await assert.rejects(
        async () => {
          await AcademicService.updateGradeRecord(organizationId, testGradeId, {
            score: 7.0,
            reason: "Intento no permitido en periodo cerrado",
          });
        },
        /No se puede modificar una calificación de un periodo académico cerrado/
      );

      // 8.11 Archivar periodo (CLOSED -> ARCHIVED) y verificar estado terminal
      const archivedPeriod = await AcademicService.changeAcademicPeriodStatus(
        organizationId,
        testPeriodId,
        AcademicPeriodStatus.ARCHIVED
      );
      assert.ok(archivedPeriod);
      assert.strictEqual(archivedPeriod.status, AcademicPeriodStatus.ARCHIVED);

      await assert.rejects(
        async () => {
          await AcademicService.changeAcademicPeriodStatus(
            organizationId,
            testPeriodId,
            AcademicPeriodStatus.CLOSED
          );
        },
        /estado terminal/
      );
    });

    // =========================================================================
    // 9. TEST DRAFT & INCOMPLETE WEIGHTS SCHEMES BLOCKERS
    // =========================================================================
    await t.test("9. Readiness: Bloqueo por esquemas en DRAFT o ponderaciones incompletas (<100%)", async () => {
      const year = await AcademicService.createAcademicYear(organizationId, {
        name: `Año Test Blockers ${testSuffix}`,
        startDate: new Date("2026-06-01"),
        endDate: new Date("2027-04-30"),
        status: AcademicYearStatus.PLANNED,
      });

      const period = await AcademicService.createAcademicPeriod(organizationId, {
        academicYearId: year.id,
        name: `Periodo Test Blockers ${testSuffix}`,
        type: AcademicPeriodType.TRIMESTER,
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-08-31"),
        status: AcademicPeriodStatus.ACTIVE,
      });

      const course = await AcademicService.createCourse(organizationId, {
        name: `Curso Blockers ${testSuffix}`,
        level: "Nivel 1",
      });

      const subject = await AcademicService.createSubject(organizationId, course.id, {
        name: `Materia Blockers ${testSuffix}`,
        code: `MB-${testSuffix}`.slice(0, 20),
      });

      // Crear esquema en DRAFT con categoría de 50% solamente
      const scheme = await AcademicService.createEvaluationScheme(organizationId, {
        courseId: course.id,
        subjectId: subject.id,
        academicPeriodId: period.id,
        status: AcademicEvaluationSchemeStatus.DRAFT,
      });

      await AcademicService.createEvaluationCategory(organizationId, scheme.id, {
        name: "Parcial 1",
        weightPercentage: 50.0,
      });

      const readiness = await AcademicService.getPeriodClosureReadiness(organizationId, period.id);
      assert.strictEqual(readiness.canClose, false);
      const blockerTypes = readiness.blockers.map((b) => b.type);
      assert.ok(blockerTypes.includes("INVALID_SCHEMES"), "Debe incluir blocker INVALID_SCHEMES");
      assert.ok(blockerTypes.includes("INCOMPLETE_WEIGHTS"), "Debe incluir blocker INCOMPLETE_WEIGHTS");

      // Limpieza local
      await db.academicEvaluationCategory.deleteMany({ where: { schemeId: scheme.id } });
      await db.academicEvaluationScheme.delete({ where: { id: scheme.id } });
      await db.academicSubject.delete({ where: { id: subject.id } });
      await db.academicCourse.delete({ where: { id: course.id } });
      await db.academicPeriod.delete({ where: { id: period.id } });
      await db.academicYear.delete({ where: { id: year.id } });
    });

    // =========================================================================
    // 10. TEST MULTI-YEAR & LEGACY NULL ENROLLMENT ISOLATION IN READINESS
    // =========================================================================
    await t.test("10. Readiness: Aislamiento estricto de matrículas multi-año y legacy NULL", async () => {
      const year1 = await AcademicService.createAcademicYear(organizationId, {
        name: `Año 1 MultiYear ${testSuffix}`,
        startDate: new Date("2026-06-01"),
        endDate: new Date("2027-04-30"),
        status: AcademicYearStatus.PLANNED,
      });

      const year2 = await AcademicService.createAcademicYear(organizationId, {
        name: `Año 2 MultiYear ${testSuffix}`,
        startDate: new Date("2027-06-01"),
        endDate: new Date("2028-04-30"),
        status: AcademicYearStatus.PLANNED,
      });

      const periodYear1 = await AcademicService.createAcademicPeriod(organizationId, {
        academicYearId: year1.id,
        name: `Periodo Year 1 ${testSuffix}`,
        type: AcademicPeriodType.TRIMESTER,
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-08-31"),
        status: AcademicPeriodStatus.ACTIVE,
      });

      const course = await AcademicService.createCourse(organizationId, {
        name: `Curso MultiYear ${testSuffix}`,
        level: "Nivel 1",
      });

      const subject = await AcademicService.createSubject(organizationId, course.id, {
        name: `Materia MultiYear ${testSuffix}`,
        code: `MMY-${testSuffix}`.slice(0, 20),
      });

      const student1 = await AcademicService.createStudent(organizationId, {
        firstName: "Estudiante",
        lastName: "Year1",
        identification: `Y1-${testSuffix}`.slice(0, 20),
      });

      const student2 = await AcademicService.createStudent(organizationId, {
        firstName: "Estudiante",
        lastName: "LegacyNull",
        identification: `LN-${testSuffix}`.slice(0, 20),
      });

      const student3 = await AcademicService.createStudent(organizationId, {
        firstName: "Estudiante",
        lastName: "Year2Foreign",
        identification: `Y2-${testSuffix}`.slice(0, 20),
      });

      // Matrícula en Year 1
      const enr1 = await AcademicService.enrollStudent(organizationId, {
        studentId: student1.id,
        courseId: course.id,
        academicYearId: year1.id,
      });

      // Matrícula legacy sin año (academicYearId = NULL)
      const enrLegacy = await db.academicEnrollment.create({
        data: {
          organizationId,
          studentId: student2.id,
          courseId: course.id,
          academicYearId: null,
          status: "ACTIVE",
        },
      });

      // Matrícula en Year 2
      const enr3 = await AcademicService.enrollStudent(organizationId, {
        studentId: student3.id,
        courseId: course.id,
        academicYearId: year2.id,
      });

      // Actividad en Periodo Year 1
      const act = await AcademicService.createActivity(organizationId, course.id, {
        subjectId: subject.id,
        name: `Actividad Year 1 ${testSuffix}`,
        maxScore: 10.0,
        academicPeriodId: periodYear1.id,
      });

      // Calificar a student1
      await AcademicService.saveGradesBatch(organizationId, act.id, [
        {
          studentId: student1.id,
          score: 9.5,
          status: AcademicGradeStatus.GRADED,
        },
      ]);

      // Verificar que el diagnóstico de PeriodYear1 SOLO cuenta a student1 (no requiere calificaciones de student2 o student3)
      const readiness = await AcademicService.getPeriodClosureReadiness(organizationId, periodYear1.id);
      assert.strictEqual(readiness.totalEnrollments, 1);
      assert.strictEqual(readiness.canClose, true);
      assert.strictEqual(readiness.blockers.length, 0);

      // Limpieza local
      const grades = await db.academicGrade.findMany({ where: { activityId: act.id } });
      const gradeIds = grades.map((g) => g.id);
      if (gradeIds.length > 0) {
        await db.academicGradeAuditLog.deleteMany({ where: { gradeId: { in: gradeIds } } });
        await db.academicGrade.deleteMany({ where: { id: { in: gradeIds } } });
      }
      await db.academicActivity.delete({ where: { id: act.id } });
      await db.academicEnrollment.deleteMany({ where: { id: { in: [enr1.id, enrLegacy.id, enr3.id] } } });
      await db.academicStudent.deleteMany({ where: { id: { in: [student1.id, student2.id, student3.id] } } });
      await db.academicSubject.delete({ where: { id: subject.id } });
      await db.academicCourse.delete({ where: { id: course.id } });
      await db.academicPeriod.delete({ where: { id: periodYear1.id } });
      await db.academicYear.deleteMany({ where: { id: { in: [year1.id, year2.id] } } });
    });

    // =========================================================================
    // 11. TEST LOCKED PERIOD: UPDATE ACTIVITY & CATEGORY MUTATIONS REJECTION
    // =========================================================================
    await t.test("11. Periodo LOCKED: Rechazo estricto de updateActivity y mutaciones de categoría", async () => {
      const year = await AcademicService.createAcademicYear(organizationId, {
        name: `Año Locked Mut ${testSuffix}`,
        startDate: new Date("2026-06-01"),
        endDate: new Date("2027-04-30"),
        status: AcademicYearStatus.PLANNED,
      });

      const period = await AcademicService.createAcademicPeriod(organizationId, {
        academicYearId: year.id,
        name: `Periodo Locked Mut ${testSuffix}`,
        type: AcademicPeriodType.TRIMESTER,
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-08-31"),
        status: AcademicPeriodStatus.ACTIVE,
      });

      const course = await AcademicService.createCourse(organizationId, {
        name: `Curso Locked Mut ${testSuffix}`,
        level: "Nivel 1",
      });

      const subject = await AcademicService.createSubject(organizationId, course.id, {
        name: `Materia Locked Mut ${testSuffix}`,
        code: `MLM-${testSuffix}`.slice(0, 20),
      });

      const scheme = await AcademicService.createEvaluationScheme(organizationId, {
        courseId: course.id,
        subjectId: subject.id,
        academicPeriodId: period.id,
      });

      const cat1 = await AcademicService.createEvaluationCategory(organizationId, scheme.id, {
        name: "Cat1",
        weightPercentage: 100.0,
      });

      const act = await AcademicService.createActivity(organizationId, course.id, {
        subjectId: subject.id,
        name: `Actividad PreLocked ${testSuffix}`,
        maxScore: 10.0,
        academicPeriodId: period.id,
        categoryId: cat1.id,
      });

      // Cambiar periodo a LOCKED
      await AcademicService.changeAcademicPeriodStatus(organizationId, period.id, AcademicPeriodStatus.LOCKED);

      // 1. Modificar actividad debe fallar
      await assert.rejects(
        async () => {
          await AcademicService.updateActivity(organizationId, act.id, {
            name: "Nombre Modificado En Locked",
          });
        },
        /ACADEMIC_PERIOD_LOCKED/
      );

      // 2. Modificar categoría debe fallar
      await assert.rejects(
        async () => {
          await AcademicService.updateEvaluationCategory(organizationId, cat1.id, {
            name: "Nuevo Nombre Cat",
          });
        },
        /No se pueden modificar categorías de un esquema en un periodo bloqueado/
      );

      // 3. Eliminar categoría debe fallar
      await assert.rejects(
        async () => {
          await AcademicService.deleteEvaluationCategory(organizationId, cat1.id);
        },
        /No se pueden eliminar categorías de un esquema en un periodo bloqueado/
      );

      // Limpieza local
      await db.academicActivity.delete({ where: { id: act.id } });
      await db.academicEvaluationCategory.delete({ where: { id: cat1.id } });
      await db.academicEvaluationScheme.delete({ where: { id: scheme.id } });
      await db.academicSubject.delete({ where: { id: subject.id } });
      await db.academicCourse.delete({ where: { id: course.id } });
      await db.academicPeriod.delete({ where: { id: period.id } });
      await db.academicYear.delete({ where: { id: year.id } });
    });

    // =========================================================================
    // 12. TEST STATE MACHINE TRANSITIONS & IDEMPOTENCY
    // =========================================================================
    await t.test("12. Máquina de Estados: Transiciones válidas, terminales e idempotencia", async () => {
      const year = await AcademicService.createAcademicYear(organizationId, {
        name: `Año SM ${testSuffix}`,
        startDate: new Date("2026-06-01"),
        endDate: new Date("2027-04-30"),
        status: AcademicYearStatus.PLANNED,
      });

      const period = await AcademicService.createAcademicPeriod(organizationId, {
        academicYearId: year.id,
        name: `Periodo SM ${testSuffix}`,
        type: AcademicPeriodType.TRIMESTER,
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-08-31"),
        status: AcademicPeriodStatus.ACTIVE,
      });

      // ACTIVE -> ACTIVE (idempotente)
      const pActive = await AcademicService.changeAcademicPeriodStatus(organizationId, period.id, AcademicPeriodStatus.ACTIVE);
      assert.strictEqual(pActive?.status, AcademicPeriodStatus.ACTIVE);

      // ACTIVE -> LOCKED
      const pLocked = await AcademicService.changeAcademicPeriodStatus(organizationId, period.id, AcademicPeriodStatus.LOCKED);
      assert.ok(pLocked);
      assert.strictEqual(pLocked.status, AcademicPeriodStatus.LOCKED);

      // LOCKED -> CLOSED (sin actividades ni blockers es listo para cerrar)
      const pClosed = await AcademicService.changeAcademicPeriodStatus(organizationId, period.id, AcademicPeriodStatus.CLOSED);
      assert.ok(pClosed);
      assert.strictEqual(pClosed.status, AcademicPeriodStatus.CLOSED);

      // CLOSED -> ACTIVE (prohibido reabrir)
      await assert.rejects(
        async () => {
          await AcademicService.changeAcademicPeriodStatus(organizationId, period.id, AcademicPeriodStatus.ACTIVE);
        },
        /No se puede reabrir un periodo académico cerrado/
      );

      // CLOSED -> ARCHIVED (válido)
      const pArchived = await AcademicService.changeAcademicPeriodStatus(organizationId, period.id, AcademicPeriodStatus.ARCHIVED);
      assert.ok(pArchived);
      assert.strictEqual(pArchived.status, AcademicPeriodStatus.ARCHIVED);

      // ARCHIVED -> ARCHIVED (idempotente)
      const pArchived2 = await AcademicService.changeAcademicPeriodStatus(organizationId, period.id, AcademicPeriodStatus.ARCHIVED);
      assert.strictEqual(pArchived2?.status, AcademicPeriodStatus.ARCHIVED);

      // ARCHIVED -> ACTIVE (prohibido)
      await assert.rejects(
        async () => {
          await AcademicService.changeAcademicPeriodStatus(organizationId, period.id, AcademicPeriodStatus.ACTIVE);
        },
        /estado terminal/
      );

      // Limpieza local
      await db.academicPeriod.delete({ where: { id: period.id } });
      await db.academicYear.delete({ where: { id: year.id } });
    });

    // =========================================================================
    // 13. TEST REPORTS PROVISIONALITY & FINALITY STATUS
    // =========================================================================
    await t.test("13. Reportes: Distinción de isProvisional y finalityStatus (Provisional vs Final vs Histórico)", async () => {
      const year = await AcademicService.createAcademicYear(organizationId, {
        name: `Año Rep ${testSuffix}`,
        startDate: new Date("2026-06-01"),
        endDate: new Date("2027-04-30"),
        status: AcademicYearStatus.PLANNED,
      });

      const period = await AcademicService.createAcademicPeriod(organizationId, {
        academicYearId: year.id,
        name: `Periodo Rep ${testSuffix}`,
        type: AcademicPeriodType.TRIMESTER,
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-08-31"),
        status: AcademicPeriodStatus.ACTIVE,
      });

      const course = await AcademicService.createCourse(organizationId, {
        name: `Curso Rep ${testSuffix}`,
        level: "Nivel 1",
      });

      const subject = await AcademicService.createSubject(organizationId, course.id, {
        name: `Materia Rep ${testSuffix}`,
        code: `MREP-${testSuffix}`.slice(0, 20),
      });

      const student = await AcademicService.createStudent(organizationId, {
        firstName: "Estudiante",
        lastName: "Reporte",
        identification: `REP-${testSuffix}`.slice(0, 20),
      });

      const enr = await AcademicService.enrollStudent(organizationId, {
        studentId: student.id,
        courseId: course.id,
        academicYearId: year.id,
      });

      const act = await AcademicService.createActivity(organizationId, course.id, {
        subjectId: subject.id,
        name: `Actividad Rep ${testSuffix}`,
        maxScore: 10.0,
        academicPeriodId: period.id,
      });

      // 1. Con periodo ACTIVE y nota sin asentar: Reporte debe ser PROVISIONAL
      const gradeReport1 = await AcademicService.getGradeReport(organizationId, { courseId: course.id });
      assert.strictEqual(gradeReport1.summary.isProvisional, true);
      assert.strictEqual(gradeReport1.summary.finalityStatus, "PROVISIONAL");

      const studentReport1 = await AcademicService.getStudentReport(organizationId, student.id);
      assert.strictEqual(studentReport1.grades.summary.isProvisional, true);
      assert.strictEqual(studentReport1.grades.summary.finalityStatus, "PROVISIONAL");

      // Calificar al estudiante
      await AcademicService.saveGradesBatch(organizationId, act.id, [
        {
          studentId: student.id,
          score: 9.0,
          status: AcademicGradeStatus.GRADED,
        },
      ]);

      // 2. Cerrar periodo: Reporte debe pasar a FINAL
      await AcademicService.changeAcademicPeriodStatus(organizationId, period.id, AcademicPeriodStatus.CLOSED);

      const gradeReport2 = await AcademicService.getGradeReport(organizationId, { courseId: course.id });
      assert.strictEqual(gradeReport2.summary.isProvisional, false);
      assert.strictEqual(gradeReport2.summary.finalityStatus, "FINAL");

      const studentReport2 = await AcademicService.getStudentReport(organizationId, student.id);
      assert.strictEqual(studentReport2.grades.summary.isProvisional, false);
      assert.strictEqual(studentReport2.grades.summary.finalityStatus, "FINAL");

      // Limpieza local
      const grades = await db.academicGrade.findMany({ where: { activityId: act.id } });
      const gradeIds = grades.map((g) => g.id);
      if (gradeIds.length > 0) {
        await db.academicGradeAuditLog.deleteMany({ where: { gradeId: { in: gradeIds } } });
        await db.academicGrade.deleteMany({ where: { id: { in: gradeIds } } });
      }
      await db.academicActivity.delete({ where: { id: act.id } });
      await db.academicEnrollment.delete({ where: { id: enr.id } });
      await db.academicStudent.delete({ where: { id: student.id } });
      await db.academicSubject.delete({ where: { id: subject.id } });
      await db.academicCourse.delete({ where: { id: course.id } });
      await db.academicPeriod.delete({ where: { id: period.id } });
      await db.academicYear.delete({ where: { id: year.id } });
    });

    // =========================================================================
    // 14. TEST CONCURRENCY LOCKING: WRITER FOR SHARE VS CLOSE FOR UPDATE
    // =========================================================================
    await t.test("14. Concurrencia: Protocolo de bloqueo FOR SHARE en escrituras vs FOR UPDATE en cierre", async () => {
      const year = await AcademicService.createAcademicYear(organizationId, {
        name: `Año Concurrencia ${testSuffix}`,
        startDate: new Date("2026-06-01"),
        endDate: new Date("2027-04-30"),
        status: AcademicYearStatus.PLANNED,
      });

      const period = await AcademicService.createAcademicPeriod(organizationId, {
        academicYearId: year.id,
        name: `Periodo Concurrencia ${testSuffix}`,
        type: AcademicPeriodType.TRIMESTER,
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-08-31"),
        status: AcademicPeriodStatus.ACTIVE,
      });

      const course = await AcademicService.createCourse(organizationId, {
        name: `Curso Concurrencia ${testSuffix}`,
        level: "Nivel 1",
      });

      const subject = await AcademicService.createSubject(organizationId, course.id, {
        name: `Materia Concurrencia ${testSuffix}`,
        code: `MCONC-${testSuffix}`.slice(0, 20),
      });

      // Crear actividad bajo el periodo
      const act = await AcademicService.createActivity(organizationId, course.id, {
        subjectId: subject.id,
        name: `Actividad Concurrencia ${testSuffix}`,
        maxScore: 10.0,
        academicPeriodId: period.id,
      });

      // Cerrar el periodo
      await AcademicService.changeAcademicPeriodStatus(organizationId, period.id, AcademicPeriodStatus.CLOSED);

      // Cualquier intento de transacción que use lockAcademicPeriodForAcademicWrite debe ser rechazado inmediatamente
      await assert.rejects(
        async () => {
          await AcademicService.createActivity(organizationId, course.id, {
            subjectId: subject.id,
            name: `Actividad Inyectada Tras Cierre ${testSuffix}`,
            maxScore: 10.0,
            academicPeriodId: period.id,
          });
        },
        /ACADEMIC_PERIOD_IMMUTABLE/
      );

      // Limpieza local
      await db.academicActivity.delete({ where: { id: act.id } });
      await db.academicSubject.delete({ where: { id: subject.id } });
      await db.academicCourse.delete({ where: { id: course.id } });
      await db.academicPeriod.delete({ where: { id: period.id } });
      await db.academicYear.delete({ where: { id: year.id } });
    });

    // =========================================================================
    // 15. TEST TEACHER AUTHORIZATION AND ACCESS SCOPING
    // =========================================================================
    await t.test("15. Aislamiento por Docente en Servicio: cursos, materias, actividades, notas batch y reportes", async () => {
      // Crear organización dedicada para este subtest
      const subOrg = await db.organization.create({
        data: {
          name: `Test Org Docente ${testSuffix}`,
          slug: `test-org-docente-${testSuffix}`,
          type: "INSTITUTION",
          status: "ACTIVE",
        },
      });
      const subOrgId = subOrg.id;

      if (teachingMod) {
        await db.organizationModule.create({
          data: {
            organizationId: subOrgId,
            moduleId: teachingMod.id,
            status: "ACTIVE",
          },
        });
      }

      // Crear 2 docentes y 1 admin
      const defaultRole = await db.role.findFirst();
      const adminSubUser = await db.user.create({
        data: {
          email: `adminsub_srv_${testSuffix}@example.com`,
          name: `Admin Sub ${testSuffix}`,
          password: "hashed_password",
          status: "ACTIVE",
          roleId: defaultRole?.id || 1,
        },
      });
      const teacher1User = await db.user.create({
        data: {
          email: `docente1_srv_${testSuffix}@example.com`,
          name: `Docente 1 ${testSuffix}`,
          password: "hashed_password",
          status: "ACTIVE",
          roleId: defaultRole?.id || 1,
        },
      });
      const teacher2User = await db.user.create({
        data: {
          email: `docente2_srv_${testSuffix}@example.com`,
          name: `Docente 2 ${testSuffix}`,
          password: "hashed_password",
          status: "ACTIVE",
          roleId: defaultRole?.id || 1,
        },
      });

      await db.organizationMember.createMany({
        data: [
          { organizationId: subOrgId, userId: adminSubUser.id, role: "OWNER", status: "ACTIVE" },
          { organizationId: subOrgId, userId: teacher1User.id, role: "PROFESSIONAL", status: "ACTIVE" },
          { organizationId: subOrgId, userId: teacher2User.id, role: "PROFESSIONAL", status: "ACTIVE" },
        ],
      });

      try {
        const year = await AcademicService.createAcademicYear(subOrgId, {
          name: `Año Docente ${testSuffix}`,
          startDate: new Date("2026-07-01"),
          endDate: new Date("2027-05-31"),
          status: AcademicYearStatus.ACTIVE,
        });

        const period = await AcademicService.createAcademicPeriod(subOrgId, {
          academicYearId: year.id,
          name: `Periodo Docente ${testSuffix}`,
          type: AcademicPeriodType.TRIMESTER,
          startDate: new Date("2026-07-01"),
          endDate: new Date("2026-09-30"),
          status: AcademicPeriodStatus.ACTIVE,
        });

        // Curso 1 asignado a Teacher 1
        const course1 = await AcademicService.createCourse(subOrgId, {
          name: `Curso Docente 1 ${testSuffix}`,
          level: "Nivel 1",
        });
        const subject1 = await AcademicService.createSubject(subOrgId, course1.id, {
          name: `Materia Docente 1 ${testSuffix}`,
          code: `MD1-${testSuffix}`.slice(0, 20),
          teacherUserId: teacher1User.id,
        });

        // Curso 2 asignado a Teacher 2
        const course2 = await AcademicService.createCourse(subOrgId, {
          name: `Curso Docente 2 ${testSuffix}`,
          level: "Nivel 2",
        });
        const subject2 = await AcademicService.createSubject(subOrgId, course2.id, {
          name: `Materia Docente 2 ${testSuffix}`,
          code: `MD2-${testSuffix}`.slice(0, 20),
          teacherUserId: teacher2User.id,
        });

        const student1 = await AcademicService.createStudent(subOrgId, {
          firstName: "Alumno1",
          lastName: `Test ${testSuffix}`,
          identification: `ID1-${testSuffix}`.slice(0, 20),
        });
        const student2 = await AcademicService.createStudent(subOrgId, {
          firstName: "Alumno2",
          lastName: `Test ${testSuffix}`,
          identification: `ID2-${testSuffix}`.slice(0, 20),
        });

        const enr1 = await AcademicService.enrollStudent(subOrgId, {
          studentId: student1.id,
          courseId: course1.id,
          academicYearId: year.id,
        });
        const enr2 = await AcademicService.enrollStudent(subOrgId, {
          studentId: student2.id,
          courseId: course2.id,
          academicYearId: year.id,
        });

        const act1 = await AcademicService.createActivity(subOrgId, course1.id, {
          subjectId: subject1.id,
          academicPeriodId: period.id,
          name: `Actividad Materia 1 ${testSuffix}`,
          maxScore: 10.0,
        }, { userId: teacher1User.id, isAcademicAdmin: false });

        // Contextos de acceso
        const teacher1Ctx = { userId: teacher1User.id, isAcademicAdmin: false };
        const teacher2Ctx = { userId: teacher2User.id, isAcademicAdmin: false };
        const adminCtx = { userId: adminSubUser.id, isAcademicAdmin: true };

        // 1. Scoping de cursos
        const t1Courses = await AcademicService.getCourses(subOrgId, {}, teacher1Ctx);
        assert.strictEqual(t1Courses.some(c => c.id === course1.id), true);
        assert.strictEqual(t1Courses.some(c => c.id === course2.id), false);

        const adminCourses = await AcademicService.getCourses(subOrgId, {}, adminCtx);
        assert.strictEqual(adminCourses.some(c => c.id === course1.id), true);
        assert.strictEqual(adminCourses.some(c => c.id === course2.id), true);

        // 2. Acceso directo por ID (Course 2 desde Teacher 1 -> 403)
        await assert.rejects(
          async () => {
            await AcademicService.getCourseById(subOrgId, course2.id, teacher1Ctx);
          },
          (err: any) => err.statusCode === 403 || err.message.includes("No tienes permisos")
        );
        const c1 = await AcademicService.getCourseById(subOrgId, course1.id, teacher1Ctx);
        assert.strictEqual(c1.id, course1.id);

        // 3. Acceso a actividades ajenas (Act 1 desde Teacher 2 -> 403)
        await assert.rejects(
          async () => {
            await AcademicService.getActivityById(subOrgId, act1.id, teacher2Ctx);
          },
          (err: any) => err.statusCode === 403 || err.message.includes("No tienes permisos")
        );

        // 4. Batch grades atomicity: Teacher 2 no puede calificar Actividad 1 (rechazo atómico sin escrituras)
        const gradesCountBefore = await db.academicGrade.count({ where: { activityId: act1.id, score: { not: null } } });
        await assert.rejects(
          async () => {
            await AcademicService.saveGradesBatch(
              subOrgId,
              act1.id,
              [{ studentId: student1.id, score: 9.5, status: AcademicGradeStatus.GRADED }],
              { reason: "Intento no autorizado" },
              teacher2Ctx
            );
          },
          (err: any) => err.statusCode === 403 || err.message.includes("No tienes permisos")
        );
        const gradesCountAfter = await db.academicGrade.count({ where: { activityId: act1.id, score: { not: null } } });
        assert.strictEqual(gradesCountBefore, gradesCountAfter);

        // 5. Calificación autorizada por Teacher 1
        const saved = await AcademicService.saveGradesBatch(
          subOrgId,
          act1.id,
          [{ studentId: student1.id, score: 9.5, status: AcademicGradeStatus.GRADED }],
          { reason: "Calificación autorizada" },
          teacher1Ctx
        );
        assert.strictEqual(saved.length, 1);
        assert.strictEqual(Number(saved[0].score), 9.5);

        // 6. Matriz de notas (Matrix): Teacher 2 rechazado con 403, Teacher 1 y Admin 200
        await assert.rejects(
          async () => {
            await AcademicService.calculatePeriodGradesMatrix(
              subOrgId,
              course1.id,
              subject1.id,
              period.id,
              undefined,
              teacher2Ctx
            );
          },
          (err: any) => err.statusCode === 403 || err.message.includes("No tienes permisos")
        );
        const matrixT1 = await AcademicService.calculatePeriodGradesMatrix(
          subOrgId,
          course1.id,
          subject1.id,
          period.id,
          undefined,
          teacher1Ctx
        );
        assert.strictEqual(matrixT1.subject.id, subject1.id);

        // 7. Reportes con scoping: Boletín de calificaciones
        await assert.rejects(
          async () => {
            await AcademicService.getGradeReport(subOrgId, { courseId: course1.id, subjectId: subject1.id }, teacher2Ctx);
          },
          (err: any) => err.statusCode === 403 || err.message.includes("No tienes permisos")
        );
        const repT1 = await AcademicService.getGradeReport(subOrgId, { courseId: course1.id, subjectId: subject1.id }, teacher1Ctx);
        assert.ok(repT1);

        // 8. Dashboard Scoping
        const dashT1 = await AcademicService.getDashboard(subOrgId, teacher1Ctx);
        assert.strictEqual(dashT1.totalCoursesCount, 1);
        assert.strictEqual(dashT1.activeStudentsCount, 1);

        const dashAdmin = await AcademicService.getDashboard(subOrgId, adminCtx);
        assert.ok(dashAdmin.totalCoursesCount >= 2);
      } finally {
        // Limpieza local de la sub-organización
        const actIds = (await db.academicActivity.findMany({ where: { organizationId: subOrgId }, select: { id: true } })).map((a) => a.id);
        if (actIds.length > 0) {
          const gradeIds = (await db.academicGrade.findMany({ where: { organizationId: subOrgId }, select: { id: true } })).map((g) => g.id);
          if (gradeIds.length > 0) {
            await db.academicGradeAuditLog.deleteMany({ where: { gradeId: { in: gradeIds } } });
            await db.academicGrade.deleteMany({ where: { id: { in: gradeIds } } });
          }
          await db.academicActivity.deleteMany({ where: { id: { in: actIds } } });
        }
        await db.academicEvaluationCategory.deleteMany({ where: { organizationId: subOrgId } });
        await db.academicEvaluationScheme.deleteMany({ where: { organizationId: subOrgId } });
        await db.academicEnrollment.deleteMany({ where: { organizationId: subOrgId } });
        await db.academicStudent.deleteMany({ where: { organizationId: subOrgId } });
        await db.academicSubject.deleteMany({ where: { organizationId: subOrgId } });
        await db.academicCourse.deleteMany({ where: { organizationId: subOrgId } });
        await db.academicPeriod.deleteMany({ where: { organizationId: subOrgId } });
        await db.academicYear.deleteMany({ where: { organizationId: subOrgId } });
        await db.organizationMember.deleteMany({ where: { organizationId: subOrgId } });
        await db.organizationModule.deleteMany({ where: { organizationId: subOrgId } });
        await db.organization.delete({ where: { id: subOrgId } }).catch(() => {});
        await db.user.deleteMany({ where: { id: { in: [adminSubUser.id, teacher1User.id, teacher2User.id] } } });
      }
    });
  } finally {
    // Limpieza de datos de prueba en orden de dependencias
    try {
      const actIds = (await db.academicActivity.findMany({ where: { organizationId }, select: { id: true } })).map((a) => a.id);
      if (actIds.length > 0) {
        const gradeIds = (await db.academicGrade.findMany({ where: { organizationId }, select: { id: true } })).map((g) => g.id);
        if (gradeIds.length > 0) {
          await db.academicGradeAuditLog.deleteMany({ where: { gradeId: { in: gradeIds } } });
          await db.academicGrade.deleteMany({ where: { id: { in: gradeIds } } });
        }
        await db.academicActivity.deleteMany({ where: { id: { in: actIds } } });
      }
      await db.academicEvaluationCategory.deleteMany({ where: { organizationId } });
      await db.academicEvaluationScheme.deleteMany({ where: { organizationId } });
      await db.academicEnrollment.deleteMany({ where: { organizationId } });
      await db.academicStudent.deleteMany({ where: { organizationId } });
      await db.academicSubject.deleteMany({ where: { organizationId } });
      await db.academicCourse.deleteMany({ where: { organizationId } });
      await db.academicPeriod.deleteMany({ where: { organizationId } });
      await db.academicYear.deleteMany({ where: { organizationId } });
      await db.organizationMember.deleteMany({ where: { organizationId } });
      await db.organizationModule.deleteMany({ where: { organizationId } });
      await db.organization.delete({ where: { id: organizationId } }).catch(() => {});
    } catch (e) {
      console.warn("Cleanup warning:", e);
    }
  }
});
