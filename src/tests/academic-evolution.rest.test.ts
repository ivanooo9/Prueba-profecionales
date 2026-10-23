import assert from "node:assert/strict";
import test from "node:test";
import http from "node:http";
import express from "express";
import { db } from "../lib/db";
import { academicRouter } from "../routes/academic.routes";
import {
  AcademicYearStatus,
  AcademicPeriodType,
  AcademicPeriodStatus,
  AcademicEvaluationSchemeStatus,
  AcademicGradeStatus,
} from "@prisma/client";

// Helper para realizar peticiones HTTP a la app Express en test
async function makeRequest(
  server: http.Server,
  options: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: any;
  }
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const addr = server.address() as { port: number };
    const payload = options.body ? JSON.stringify(options.body) : undefined;

    const req = http.request(
      {
        host: "127.0.0.1",
        port: addr.port,
        method: options.method,
        path: options.path,
        headers: {
          "Content-Type": "application/json",
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
          ...options.headers,
        },
      },
      (res) => {
        let rawData = "";
        res.on("data", (chunk) => {
          rawData += chunk;
        });
        res.on("end", () => {
          let parsed: any = null;
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = rawData;
          }
          resolve({ status: res.statusCode || 500, body: parsed });
        });
      }
    );

    req.on("error", reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

test("Phase 4 REST API - Academic Evolution Engine", async (t) => {
  const testSuffix = Date.now();

  // Setup DB Data: Crear organización aislada para tests REST
  const org = await db.organization.create({
    data: {
      name: `Test Org REST ${testSuffix}`,
      slug: `test-org-rest-${testSuffix}`,
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

  const defaultRole = await db.role.findFirst();

  // Crear usuario ADMIN exclusivo
  const adminUser = await db.user.create({
    data: {
      email: `admin_rest_${testSuffix}@example.com`,
      name: `Admin REST ${testSuffix}`,
      password: "hashed_password",
      status: "ACTIVE",
      roleId: defaultRole?.id || 1,
    },
  });

  await db.organizationMember.create({
    data: {
      organizationId,
      userId: adminUser.id,
      role: "OWNER",
      status: "ACTIVE",
    },
  });

  // Crear un usuario docente específico con rol PROFESSIONAL
  const teacherUser = await db.user.create({
    data: {
      email: `teacher_test_${testSuffix}@example.com`,
      name: `Docente Test ${testSuffix}`,
      password: "hashed_password",
      status: "ACTIVE",
      roleId: defaultRole?.id || 1,
    },
  });

  await db.organizationMember.create({
    data: {
      organizationId,
      userId: teacherUser.id,
      role: "PROFESSIONAL",
      status: "ACTIVE",
    },
  });

  // Crear app Express de prueba montando los middlewares y academicRouter
  const app = express();
  app.use(express.json());

  // Middleware de autenticación simulada según header 'x-test-user-id'
  app.use(async (req, res, next) => {
    const testUserIdHeader = req.headers["x-test-user-id"];

    if (testUserIdHeader) {
      const uId = parseInt(String(testUserIdHeader), 10);
      const dbUser = await db.user.findUnique({ where: { id: uId } });
      if (dbUser) {
        (req as any).user = {
          id: dbUser.id,
          email: dbUser.email,
          role: { id: 1, name: "USER" },
          status: dbUser.status,
        };
        res.locals.user = (req as any).user;
      }
    }
    next();
  });

  app.use(academicRouter);

  // Iniciar servidor HTTP
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));

  const adminHeaders = {
    "x-test-user-id": String(adminUser?.id || 1),
  };

  const teacherHeaders = {
    "x-test-user-id": String(teacherUser.id),
  };

  let testYearId = 0;
  let testPeriodId = 0;
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
    // 1. AÑOS LECTIVOS REST
    // =========================================================================
    await t.test("1. REST: Academic Years (POST, GET, PUT, PATCH status)", async () => {
      // 1.1 Non-admin (Teacher) intentando crear año lectivo recibe 403
      const forbiddenRes = await makeRequest(server, {
        method: "POST",
        path: `/api/organizations/${organizationId}/academic/years`,
        headers: teacherHeaders,
        body: {
          name: `Año Teacher ${testSuffix}`,
          startDate: "2026-05-01",
          endDate: "2027-02-28",
        },
      });
      assert.strictEqual(forbiddenRes.status, 403);
      assert.strictEqual(forbiddenRes.body.success, false);

      // 1.2 Admin crea año lectivo correctamente (201)
      const createRes = await makeRequest(server, {
        method: "POST",
        path: `/api/organizations/${organizationId}/academic/years`,
        headers: adminHeaders,
        body: {
          name: `Año Lectivo REST ${testSuffix}`,
          startDate: "2026-05-01",
          endDate: "2027-02-28",
          status: "ACTIVE",
        },
      });
      assert.strictEqual(createRes.status, 201);
      assert.strictEqual(createRes.body.success, true);
      assert.ok(createRes.body.data.id > 0);
      testYearId = createRes.body.data.id;

      // 1.2b Intentar crear un segundo año ACTIVE debe responder 409 (ACADEMIC_YEAR_ALREADY_ACTIVE)
      const conflictYearRes = await makeRequest(server, {
        method: "POST",
        path: `/api/organizations/${organizationId}/academic/years`,
        headers: adminHeaders,
        body: {
          name: `Segundo Año Activo ${testSuffix}`,
          startDate: "2026-05-01",
          endDate: "2027-02-28",
          status: "ACTIVE",
        },
      });
      assert.strictEqual(conflictYearRes.status, 409);
      assert.strictEqual(conflictYearRes.body.success, false);

      // 1.3 Listar años lectivos (200)
      const listRes = await makeRequest(server, {
        method: "GET",
        path: `/api/organizations/${organizationId}/academic/years?search=REST%20${testSuffix}`,
        headers: adminHeaders,
      });
      assert.strictEqual(listRes.status, 200);
      assert.strictEqual(listRes.body.success, true);
      assert.ok(Array.isArray(listRes.body.data));
      assert.ok(listRes.body.data.length >= 1);

      // 1.4 Obtener por ID (200)
      const getRes = await makeRequest(server, {
        method: "GET",
        path: `/api/organizations/${organizationId}/academic/years/${testYearId}`,
        headers: adminHeaders,
      });
      assert.strictEqual(getRes.status, 200);
      assert.strictEqual(getRes.body.data.id, testYearId);

      // 1.5 Actualizar año lectivo (200)
      const putRes = await makeRequest(server, {
        method: "PUT",
        path: `/api/organizations/${organizationId}/academic/years/${testYearId}`,
        headers: adminHeaders,
        body: {
          name: `Año Lectivo REST Editado ${testSuffix}`,
        },
      });
      assert.strictEqual(putRes.status, 200);
      assert.strictEqual(putRes.body.data.name, `Año Lectivo REST Editado ${testSuffix}`);

      // 1.6 Cambiar estado (200)
      const patchRes = await makeRequest(server, {
        method: "PATCH",
        path: `/api/organizations/${organizationId}/academic/years/${testYearId}/status`,
        headers: adminHeaders,
        body: { status: "ACTIVE" },
      });
      assert.strictEqual(patchRes.status, 200);
      assert.strictEqual(patchRes.body.data.status, "ACTIVE");
    });

    // =========================================================================
    // 2. PERIODOS ACADÉMICOS REST
    // =========================================================================
    await t.test("2. REST: Academic Periods (POST, GET, PUT, PATCH status)", async () => {
      // 2.1 Admin crea periodo académico (201)
      const createRes = await makeRequest(server, {
        method: "POST",
        path: `/api/organizations/${organizationId}/academic/periods`,
        headers: adminHeaders,
        body: {
          academicYearId: testYearId,
          name: `Primer Trimestre REST ${testSuffix}`,
          type: "TRIMESTER",
          order: 1,
          startDate: "2026-05-01",
          endDate: "2026-08-15",
          status: "ACTIVE",
        },
      });
      assert.strictEqual(createRes.status, 201);
      assert.strictEqual(createRes.body.success, true);
      assert.ok(createRes.body.data.id > 0);
      testPeriodId = createRes.body.data.id;

      // 2.2 Listar periodos (200)
      const listRes = await makeRequest(server, {
        method: "GET",
        path: `/api/organizations/${organizationId}/academic/periods?academicYearId=${testYearId}`,
        headers: adminHeaders,
      });
      assert.strictEqual(listRes.status, 200);
      assert.ok(listRes.body.data.length >= 1);

      // 2.3 Obtener detalle de periodo (200)
      const getRes = await makeRequest(server, {
        method: "GET",
        path: `/api/organizations/${organizationId}/academic/periods/${testPeriodId}`,
        headers: adminHeaders,
      });
      assert.strictEqual(getRes.status, 200);
      assert.strictEqual(getRes.body.data.id, testPeriodId);

      // 2.4 Actualizar periodo (200)
      const putRes = await makeRequest(server, {
        method: "PUT",
        path: `/api/organizations/${organizationId}/academic/periods/${testPeriodId}`,
        headers: adminHeaders,
        body: {
          name: `Primer Trimestre REST Renombrado ${testSuffix}`,
        },
      });
      assert.strictEqual(putRes.status, 200);
      assert.strictEqual(putRes.body.data.name, `Primer Trimestre REST Renombrado ${testSuffix}`);
    });

    // =========================================================================
    // 3. CURSO, MATERIA Y ESTUDIANTE SETUP
    // =========================================================================
    await t.test("3. REST: Pre-requisitos Académicos (Curso, Materia, Alumno, Matrícula)", async () => {
      // 3.1 Crear Curso
      const courseRes = await makeRequest(server, {
        method: "POST",
        path: `/api/organizations/${organizationId}/academic/courses`,
        headers: adminHeaders,
        body: {
          name: `Curso REST ${testSuffix}`,
          level: "10mo EGB",
          classroom: "Aula 101",
        },
      });
      assert.strictEqual(courseRes.status, 201);
      testCourseId = courseRes.body.data.id;

      // 3.2 Crear Materia
      const subjectRes = await makeRequest(server, {
        method: "POST",
        path: `/api/organizations/${organizationId}/academic/courses/${testCourseId}/subjects`,
        headers: adminHeaders,
        body: {
          name: `Matemáticas REST ${testSuffix}`,
          code: `MAT-${testSuffix}`,
          hoursPerWeek: 5,
          teacherUserId: teacherUser.id,
        },
      });
      assert.strictEqual(subjectRes.status, 201);
      testSubjectId = subjectRes.body.data.id;

      // 3.3 Crear Estudiante
      const studentRes = await makeRequest(server, {
        method: "POST",
        path: `/api/organizations/${organizationId}/academic/students`,
        headers: adminHeaders,
        body: {
          firstName: "Estudiante",
          lastName: `REST ${testSuffix}`,
          identification: `ID-${testSuffix}`,
          email: `student_${testSuffix}@example.com`,
        },
      });
      assert.strictEqual(studentRes.status, 201);
      testStudentId = studentRes.body.data.id;

      // 3.3b Matrícula sin academicYearId debe responder 400
      const invalidEnrollRes = await makeRequest(server, {
        method: "POST",
        path: `/api/organizations/${organizationId}/academic/enrollments`,
        headers: adminHeaders,
        body: {
          studentId: testStudentId,
          courseId: testCourseId,
        },
      });
      assert.strictEqual(invalidEnrollRes.status, 400);
      assert.strictEqual(invalidEnrollRes.body.success, false);

      // 3.4 Matricular en el curso vinculando academicYearId
      const enrollRes = await makeRequest(server, {
        method: "POST",
        path: `/api/organizations/${organizationId}/academic/enrollments`,
        headers: adminHeaders,
        body: {
          studentId: testStudentId,
          courseId: testCourseId,
          academicYearId: testYearId,
        },
      });
      assert.strictEqual(enrollRes.status, 201);
      testEnrollmentId = enrollRes.body.data.id;
    });

    // =========================================================================
    // 4. ESQUEMAS Y CATEGORÍAS DE EVALUACIÓN REST
    // =========================================================================
    await t.test("4. REST: Esquemas de Evaluación y Techo Estricto de 100%", async () => {
      // 4.1 Crear Esquema de Evaluación (201, estado DRAFT)
      const schemeRes = await makeRequest(server, {
        method: "POST",
        path: `/api/organizations/${organizationId}/academic/evaluation-schemes`,
        headers: adminHeaders,
        body: {
          courseId: testCourseId,
          subjectId: testSubjectId,
          academicPeriodId: testPeriodId,
          maxScale: 10.0,
          minPassingScore: 7.0,
          status: "DRAFT",
        },
      });
      assert.strictEqual(schemeRes.status, 201);
      assert.strictEqual(schemeRes.body.data.status, "DRAFT");
      testSchemeId = schemeRes.body.data.id;

      // 4.2 Agregar Categoría 1 (Tareas: 60%) (201)
      const cat1Res = await makeRequest(server, {
        method: "POST",
        path: `/api/organizations/${organizationId}/academic/evaluation-schemes/${testSchemeId}/categories`,
        headers: adminHeaders,
        body: {
          name: "Tareas y Trabajos",
          weightPercentage: 60,
          order: 1,
        },
      });
      assert.strictEqual(cat1Res.status, 201);
      assert.strictEqual(Number(cat1Res.body.data.weightPercentage), 60);
      testCat1Id = cat1Res.body.data.id;

      // 4.2b Intentar agregar categoría con nombre duplicado (case-insensitive) -> 409
      const dupCatRes = await makeRequest(server, {
        method: "POST",
        path: `/api/organizations/${organizationId}/academic/evaluation-schemes/${testSchemeId}/categories`,
        headers: adminHeaders,
        body: {
          name: "  tareas y trabajos  ",
          weightPercentage: 10,
          order: 2,
        },
      });
      assert.strictEqual(dupCatRes.status, 409);
      assert.strictEqual(dupCatRes.body.success, false);

      // 4.3 Intentar agregar Categoría que supere el 100% (ej: 50% cuando ya hay 60% -> 110%) -> 400
      const overflowRes = await makeRequest(server, {
        method: "POST",
        path: `/api/organizations/${organizationId}/academic/evaluation-schemes/${testSchemeId}/categories`,
        headers: adminHeaders,
        body: {
          name: "Exceso Ponderación",
          weightPercentage: 50,
          order: 2,
        },
      });
      assert.strictEqual(overflowRes.status, 400);
      assert.strictEqual(overflowRes.body.success, false);
      assert.ok(overflowRes.body.error.includes("EVALUATION_WEIGHT_EXCEEDED") || overflowRes.body.error.includes("100.00%"));

      // 4.4 Intentar validar esquema incompleto (60% != 100%) -> 400
      const invalidValRes = await makeRequest(server, {
        method: "POST",
        path: `/api/organizations/${organizationId}/academic/evaluation-schemes/${testSchemeId}/validate`,
        headers: adminHeaders,
      });
      assert.strictEqual(invalidValRes.status, 400);
      assert.ok(invalidValRes.body.error.includes("EVALUATION_WEIGHT_MISMATCH") || invalidValRes.body.error.includes("100.00%"));

      // 4.5 Agregar Categoría 2 (Exámenes: 40%) -> Total 100% exacto (201)
      const cat2Res = await makeRequest(server, {
        method: "POST",
        path: `/api/organizations/${organizationId}/academic/evaluation-schemes/${testSchemeId}/categories`,
        headers: adminHeaders,
        body: {
          name: "Exámenes y Evaluaciones",
          weightPercentage: 40,
          order: 2,
        },
      });
      assert.strictEqual(cat2Res.status, 201);
      assert.strictEqual(Number(cat2Res.body.data.weightPercentage), 40);
      testCat2Id = cat2Res.body.data.id;

      // 4.6 Validar esquema con 100% exacto -> 200 y estado VALID
      const validRes = await makeRequest(server, {
        method: "POST",
        path: `/api/organizations/${organizationId}/academic/evaluation-schemes/${testSchemeId}/validate`,
        headers: adminHeaders,
      });
      assert.strictEqual(validRes.status, 200);
      assert.strictEqual(validRes.body.data.status, "VALID");

      // 4.7 Bloquear esquema (LOCKED) -> 200
      const lockRes = await makeRequest(server, {
        method: "PATCH",
        path: `/api/organizations/${organizationId}/academic/evaluation-schemes/${testSchemeId}/lock`,
        headers: adminHeaders,
      });
      assert.strictEqual(lockRes.status, 200);
      assert.strictEqual(lockRes.body.data.status, "LOCKED");
    });

    // =========================================================================
    // 5. ACTIVIDADES Y CALIFICACIONES REST CON AUDIT LOG
    // =========================================================================
    await t.test("5. REST: Creación de Actividad, Calificación Batch y Auditoría", async () => {
      // 5.1 Crear Actividad asignada a la categoría 1 y periodo (201)
      const actRes = await makeRequest(server, {
        method: "POST",
        path: `/api/organizations/${organizationId}/academic/courses/${testCourseId}/activities`,
        headers: adminHeaders,
        body: {
          subjectId: testSubjectId,
          name: `Tarea 1 de Álgebra REST ${testSuffix}`,
          type: "HOMEWORK",
          maxScore: 10,
          dueDate: "2026-06-01",
          academicPeriodId: testPeriodId,
          evaluationSchemeId: testSchemeId,
          categoryId: testCat1Id,
        },
      });
      assert.strictEqual(actRes.status, 201);
      assert.strictEqual(actRes.body.success, true);
      assert.strictEqual(actRes.body.data.academicPeriodId, testPeriodId);
      assert.strictEqual(actRes.body.data.categoryId, testCat1Id);
      testActivityId = actRes.body.data.id;

      // 5.2 Registrar Calificación por Lote con motivo y status (200)
      const batchRes = await makeRequest(server, {
        method: "POST",
        path: `/api/organizations/${organizationId}/academic/activities/${testActivityId}/grades`,
        headers: adminHeaders,
        body: {
          reason: "Calificación inicial de tarea en clase",
          grades: [
            {
              studentId: testStudentId,
              score: 9.0,
              status: "GRADED",
              comments: "Buen trabajo",
            },
          ],
        },
      });
      assert.strictEqual(batchRes.status, 200);
      assert.strictEqual(batchRes.body.success, true);
      assert.ok(Array.isArray(batchRes.body.data));
      assert.strictEqual(batchRes.body.data.length, 1);
      testGradeId = batchRes.body.data[0].id;
      assert.strictEqual(Number(batchRes.body.data[0].score), 9.0);
      assert.strictEqual(batchRes.body.data[0].status, "GRADED");

      // 5.3 Actualizar individualmente la calificación con auditoría (200)
      const updateGradeRes = await makeRequest(server, {
        method: "PATCH",
        path: `/api/organizations/${organizationId}/academic/grades/${testGradeId}`,
        headers: adminHeaders,
        body: {
          score: 9.5,
          reason: "Corrección de ejercicio 3",
          comments: "Excelente corrección",
        },
      });
      assert.strictEqual(updateGradeRes.status, 200);
      assert.strictEqual(Number(updateGradeRes.body.data.score), 9.5);

      // 5.4 Verificar que el log de auditoría se creó en PostgreSQL
      const auditLog = await db.academicGradeAuditLog.findFirst({
        where: {
          organizationId,
          gradeId: testGradeId,
          newScore: 9.5,
        },
      });
      assert.ok(auditLog !== null);
      assert.strictEqual(auditLog.reason, "Corrección de ejercicio 3");
    });

    // =========================================================================
    // 6. MATRIZ DE NOTAS (SÁBANA DE CALIFICACIONES) REST
    // =========================================================================
    await t.test("6. REST: Sábana / Matriz de Calificaciones Progresivas", async () => {
      const matrixRes = await makeRequest(server, {
        method: "GET",
        path: `/api/organizations/${organizationId}/academic/grades/matrix?courseId=${testCourseId}&subjectId=${testSubjectId}&academicPeriodId=${testPeriodId}`,
        headers: adminHeaders,
      });

      assert.strictEqual(matrixRes.status, 200);
      assert.strictEqual(matrixRes.body.success, true);
      const matrix = matrixRes.body.data;

      assert.strictEqual(matrix.course.id, testCourseId);
      assert.strictEqual(matrix.subject.id, testSubjectId);
      assert.strictEqual(matrix.period.id, testPeriodId);
      assert.ok(matrix.scheme !== null);
      assert.strictEqual(matrix.scheme.maxScale, 10);
      assert.ok(Array.isArray(matrix.students));
      assert.strictEqual(matrix.students.length, 1);

      const std = matrix.students[0];
      assert.strictEqual(std.studentId, testStudentId);
      // Evaluado 60% (categoría 1 tiene tarea con nota 9.5)
      assert.strictEqual(std.evaluatedWeightPercentage, 60);
      assert.strictEqual(std.isComplete, false);
      // Provisional debe ser 9.5
      assert.strictEqual(std.provisionalAverage, 9.5);
      // Definitiva: 9.5 * (60/100) = 5.7
      assert.strictEqual(std.definitiveGrade, 5.7);
    });

    // =========================================================================
    // 7. INMUTABILIDAD DE PERIODOS CERRADOS Y READINESS REST
    // =========================================================================
    await t.test("7. REST: Diagnóstico de Cierre y Bloqueo Estricto en Periodo CLOSED", async () => {
      // Calificar la evaluación final automática en testCat2Id para completar el 100% y habilitar cierre
      const autoFinalExam = await db.academicActivity.findFirst({
        where: { organizationId, academicPeriodId: testPeriodId, categoryId: testCat2Id },
      });
      if (autoFinalExam) {
        await makeRequest(server, {
          method: "POST",
          path: `/api/organizations/${organizationId}/academic/activities/${autoFinalExam.id}/grades`,
          headers: adminHeaders,
          body: {
            reason: "Calificación de examen final",
            grades: [
              {
                studentId: testStudentId,
                score: 10.0,
                status: "GRADED",
              },
            ],
          },
        });
      }

      // 7.1 Consultar diagnóstico de cierre (closure-readiness) -> 200
      const readinessRes = await makeRequest(server, {
        method: "GET",
        path: `/api/organizations/${organizationId}/academic/periods/${testPeriodId}/closure-readiness`,
        headers: adminHeaders,
      });
      assert.strictEqual(readinessRes.status, 200);
      assert.strictEqual(readinessRes.body.success, true);
      assert.strictEqual(readinessRes.body.data.canClose, true);

      // 7.2 Crear actividad temporal PENDING y verificar que el cierre es rechazado con 409
      const tempActRes = await makeRequest(server, {
        method: "POST",
        path: `/api/organizations/${organizationId}/academic/courses/${testCourseId}/activities`,
        headers: adminHeaders,
        body: {
          subjectId: testSubjectId,
          name: `Actividad Temp ${testSuffix}`,
          maxScore: 10,
          academicPeriodId: testPeriodId,
          categoryId: testCat1Id,
        },
      });
      assert.strictEqual(tempActRes.status, 201);
      const tempActId = tempActRes.body.data.id;

      // Intentar cerrar periodo con nota pendiente -> 409 Conflict
      const blockedCloseRes = await makeRequest(server, {
        method: "PATCH",
        path: `/api/organizations/${organizationId}/academic/periods/${testPeriodId}/status`,
        headers: adminHeaders,
        body: { status: "CLOSED" },
      });
      assert.strictEqual(blockedCloseRes.status, 409);
      assert.strictEqual(blockedCloseRes.body.code, "ACADEMIC_PERIOD_NOT_READY_TO_CLOSE");
      assert.ok(Array.isArray(blockedCloseRes.body.blockers));
      assert.ok(blockedCloseRes.body.blockers.length >= 1);

      // Eliminar actividad temporal
      await db.academicGradeAuditLog.deleteMany({
        where: { grade: { activityId: tempActId } },
      });
      await db.academicGrade.deleteMany({ where: { activityId: tempActId } });
      await db.academicActivity.delete({ where: { id: tempActId } });

      // 7.3 Pasar a LOCKED -> 200 (Estructura congelada, notas permitidas)
      const lockRes = await makeRequest(server, {
        method: "PATCH",
        path: `/api/organizations/${organizationId}/academic/periods/${testPeriodId}/status`,
        headers: adminHeaders,
        body: { status: "LOCKED" },
      });
      assert.strictEqual(lockRes.status, 200);
      assert.strictEqual(lockRes.body.data.status, "LOCKED");

      // Intentar crear actividad en LOCKED -> 400
      const lockedCreateActRes = await makeRequest(server, {
        method: "POST",
        path: `/api/organizations/${organizationId}/academic/courses/${testCourseId}/activities`,
        headers: adminHeaders,
        body: {
          subjectId: testSubjectId,
          name: `Actividad Prohibida LOCKED ${testSuffix}`,
          maxScore: 10,
          academicPeriodId: testPeriodId,
        },
      });
      assert.strictEqual(lockedCreateActRes.status, 400);

      // 7.4 Cerrar el periodo académico listo (200)
      const closePeriodRes = await makeRequest(server, {
        method: "PATCH",
        path: `/api/organizations/${organizationId}/academic/periods/${testPeriodId}/status`,
        headers: adminHeaders,
        body: { status: "CLOSED" },
      });
      assert.strictEqual(closePeriodRes.status, 200);
      assert.strictEqual(closePeriodRes.body.data.status, "CLOSED");

      // 7.5 Intentar reabrir periodo cerrado -> 400
      const reopenRes = await makeRequest(server, {
        method: "PATCH",
        path: `/api/organizations/${organizationId}/academic/periods/${testPeriodId}/status`,
        headers: adminHeaders,
        body: { status: "ACTIVE" },
      });
      assert.strictEqual(reopenRes.status, 400);
      assert.ok(reopenRes.body.error.includes("reabrir"));

      // 7.6 Intentar crear una actividad en periodo cerrado -> 400
      const blockedActRes = await makeRequest(server, {
        method: "POST",
        path: `/api/organizations/${organizationId}/academic/courses/${testCourseId}/activities`,
        headers: adminHeaders,
        body: {
          subjectId: testSubjectId,
          name: `Actividad Bloqueada ${testSuffix}`,
          maxScore: 10,
          academicPeriodId: testPeriodId,
        },
      });
      assert.strictEqual(blockedActRes.status, 400);
      assert.ok(blockedActRes.body.error.includes("cerrado") || blockedActRes.body.error.includes("archivado"));

      // 7.7 Intentar calificar en periodo cerrado -> 400
      const blockedGradeRes = await makeRequest(server, {
        method: "PATCH",
        path: `/api/organizations/${organizationId}/academic/grades/${testGradeId}`,
        headers: adminHeaders,
        body: { score: 10.0 },
      });
      assert.strictEqual(blockedGradeRes.status, 400);
      assert.ok(blockedGradeRes.body.error.includes("cerrado") || blockedGradeRes.body.error.includes("archivado"));
    });

    // =========================================================================
    // 8. RETROCOMPATIBILIDAD Y SEGURIDAD MULTI-TENANT REST
    // =========================================================================
    await t.test("8. REST: Retrocompatibilidad y Aislamiento Multi-tenant", async () => {
      // 8.1 Petición sin autenticación -> 401
      const unauthRes = await makeRequest(server, {
        method: "GET",
        path: `/api/organizations/${organizationId}/academic/years`,
      });
      assert.strictEqual(unauthRes.status, 401);

      // 8.2 Endpoints legados (Dashboard, Reportes, Estudiantes) responden correctamente
      const dashRes = await makeRequest(server, {
        method: "GET",
        path: `/api/organizations/${organizationId}/academic/dashboard`,
        headers: adminHeaders,
      });
      assert.strictEqual(dashRes.status, 200);
      assert.strictEqual(dashRes.body.success, true);
      assert.ok(dashRes.body.data.activeCoursesCount >= 1);
    });

    // =========================================================================
    // 9. REST: PERMISOS DE DIAGNÓSTICO DE CIERRE (ADMIN vs DOCENTE)
    // =========================================================================
    await t.test("9. REST: Permisos de Diagnóstico de Cierre (closure-readiness: 403 Docente vs 200 Admin)", async () => {
      // 9.1 Docente (role: PROFESSIONAL) no debe tener acceso a closure-readiness -> 403
      const teacherReadinessRes = await makeRequest(server, {
        method: "GET",
        path: `/api/organizations/${organizationId}/academic/periods/${testPeriodId}/closure-readiness`,
        headers: teacherHeaders,
      });
      assert.strictEqual(teacherReadinessRes.status, 403);

      // 9.2 Administrador (role: OWNER/ADMIN) sí tiene acceso -> 200
      const adminReadinessRes = await makeRequest(server, {
        method: "GET",
        path: `/api/organizations/${organizationId}/academic/periods/${testPeriodId}/closure-readiness`,
        headers: adminHeaders,
      });
      assert.strictEqual(adminReadinessRes.status, 200);
      assert.strictEqual(adminReadinessRes.body.success, true);
      assert.ok(typeof adminReadinessRes.body.data.canClose === "boolean");
    });

    // =========================================================================
    // 10. REST: REPORTES ACADÉMICOS Y PROVISIONALIDAD
    // =========================================================================
    await t.test("10. REST: Reportes Académicos y Distinción de isProvisional / finalityStatus", async () => {
      // 10.1 Grade Report contiene isProvisional y finalityStatus
      const gradeReportRes = await makeRequest(server, {
        method: "GET",
        path: `/api/organizations/${organizationId}/academic/reports/grades?courseId=${testCourseId}`,
        headers: adminHeaders,
      });
      assert.strictEqual(gradeReportRes.status, 200);
      assert.strictEqual(gradeReportRes.body.success, true);
      assert.ok("isProvisional" in gradeReportRes.body.data.summary);
      assert.ok("finalityStatus" in gradeReportRes.body.data.summary);

      // 10.2 Student Report contiene isProvisional y finalityStatus en summary y calificaciones
      const studentReportRes = await makeRequest(server, {
        method: "GET",
        path: `/api/organizations/${organizationId}/academic/reports/students/${testStudentId}`,
        headers: adminHeaders,
      });
      assert.strictEqual(studentReportRes.status, 200);
      assert.strictEqual(studentReportRes.body.success, true);
      assert.ok("isProvisional" in studentReportRes.body.data.grades.summary);
      assert.ok("finalityStatus" in studentReportRes.body.data.grades.summary);
    });

    // =========================================================================
    // 11. REST: AISLAMIENTO Y HARDENING DE PERMISOS POR DOCENTE (403 VS 200)
    // =========================================================================
    await t.test("11. REST: Aislamiento por Docente (403 Docente no asignado vs 200 Docente asignado / Admin)", async () => {
      // Crear un docente NO asignado a ningún curso/materia
      const unassignedUser = await db.user.create({
        data: {
          email: `unassigned_teacher_${testSuffix}@example.com`,
          name: `Docente No Asignado ${testSuffix}`,
          password: "hashed_password",
          status: "ACTIVE",
          roleId: defaultRole?.id || 1,
        },
      });

      await db.organizationMember.create({
        data: {
          organizationId,
          userId: unassignedUser.id,
          role: "PROFESSIONAL",
          status: "ACTIVE",
        },
      });

      const unauthHeaders = {
        "x-test-user-id": String(unassignedUser.id),
      };

      try {
        // 11.1 Docente NO asignado intenta acceder por ID al curso (403)
        const unauthCourseRes = await makeRequest(server, {
          method: "GET",
          path: `/api/organizations/${organizationId}/academic/courses/${testCourseId}`,
          headers: unauthHeaders,
        });
        assert.strictEqual(unauthCourseRes.status, 403);
        assert.strictEqual(unauthCourseRes.body.success, false);

        // 11.2 Docente asignado accede exitosamente al curso (200)
        const authCourseRes = await makeRequest(server, {
          method: "GET",
          path: `/api/organizations/${organizationId}/academic/courses/${testCourseId}`,
          headers: teacherHeaders,
        });
        assert.strictEqual(authCourseRes.status, 200);
        assert.strictEqual(authCourseRes.body.success, true);

        // 11.3 Admin accede exitosamente al mismo curso (200)
        const adminCourseRes = await makeRequest(server, {
          method: "GET",
          path: `/api/organizations/${organizationId}/academic/courses/${testCourseId}`,
          headers: adminHeaders,
        });
        assert.strictEqual(adminCourseRes.status, 200);
        assert.strictEqual(adminCourseRes.body.success, true);

        // 11.4 Docente NO asignado intenta consultar actividad ajena por ID (403)
        const unauthActRes = await makeRequest(server, {
          method: "GET",
          path: `/api/organizations/${organizationId}/academic/activities/${testActivityId}`,
          headers: unauthHeaders,
        });
        assert.strictEqual(unauthActRes.status, 403);
        assert.strictEqual(unauthActRes.body.success, false);

        // 11.5 Docente asignado consulta actividad (200)
        const authActRes = await makeRequest(server, {
          method: "GET",
          path: `/api/organizations/${organizationId}/academic/activities/${testActivityId}`,
          headers: teacherHeaders,
        });
        assert.strictEqual(authActRes.status, 200);
        assert.strictEqual(authActRes.body.success, true);

        // 11.6 Docente NO asignado intenta mutar calificaciones batch en actividad ajena (403)
        const unauthBatchRes = await makeRequest(server, {
          method: "POST",
          path: `/api/organizations/${organizationId}/academic/activities/${testActivityId}/grades`,
          headers: unauthHeaders,
          body: {
            grades: [
              { studentId: testStudentId, score: 8.0, status: "GRADED" },
            ],
          },
        });
        assert.strictEqual(unauthBatchRes.status, 403);
        assert.strictEqual(unauthBatchRes.body.success, false);

        // 11.7 Docente NO asignado intenta consultar matriz de calificaciones ajena (403)
        const unauthMatrixRes = await makeRequest(server, {
          method: "GET",
          path: `/api/organizations/${organizationId}/academic/grades/matrix?courseId=${testCourseId}&subjectId=${testSubjectId}&academicPeriodId=${testPeriodId}`,
          headers: unauthHeaders,
        });
        assert.strictEqual(unauthMatrixRes.status, 403);
        assert.strictEqual(unauthMatrixRes.body.success, false);

        // 11.8 Docente asignado consulta matriz (200)
        const authMatrixRes = await makeRequest(server, {
          method: "GET",
          path: `/api/organizations/${organizationId}/academic/grades/matrix?courseId=${testCourseId}&subjectId=${testSubjectId}&academicPeriodId=${testPeriodId}`,
          headers: teacherHeaders,
        });
        assert.strictEqual(authMatrixRes.status, 200);
        assert.strictEqual(authMatrixRes.body.success, true);

        // 11.9 Admin consulta matriz de calificaciones (200)
        const adminMatrixRes = await makeRequest(server, {
          method: "GET",
          path: `/api/organizations/${organizationId}/academic/grades/matrix?courseId=${testCourseId}&subjectId=${testSubjectId}&academicPeriodId=${testPeriodId}`,
          headers: adminHeaders,
        });
        assert.strictEqual(adminMatrixRes.status, 200);
        assert.strictEqual(adminMatrixRes.body.success, true);
      } finally {
        await db.organizationMember.deleteMany({ where: { organizationId, userId: unassignedUser.id } });
        await db.user.deleteMany({ where: { id: unassignedUser.id } });
      }
    });
  } finally {
    // Cerrar servidor HTTP
    await new Promise<void>((resolve) => server.close(() => resolve()));

    // Cleanup ordenado de datos de prueba (en orden de dependencia de claves foráneas)
    try {
      await db.academicGradeAuditLog.deleteMany({ where: { organizationId } });
      await db.academicGrade.deleteMany({ where: { organizationId } });
      await db.academicActivity.deleteMany({ where: { organizationId } });
      if (testCat1Id || testCat2Id || testSchemeId) {
        await db.academicEvaluationCategory.deleteMany({ where: { schemeId: testSchemeId } });
      }
      if (testSchemeId) {
        await db.academicEvaluationScheme.deleteMany({ where: { id: testSchemeId } });
      }
      if (testEnrollmentId) {
        await db.academicEnrollment.deleteMany({ where: { id: testEnrollmentId } });
      }
      if (testSubjectId) {
        await db.academicSubject.deleteMany({ where: { id: testSubjectId } });
      }
      if (testCourseId) {
        await db.academicCourse.deleteMany({ where: { id: testCourseId } });
      }
      if (testStudentId) {
        await db.academicStudent.deleteMany({ where: { id: testStudentId } });
      }
      if (testPeriodId) {
        await db.academicPeriod.deleteMany({ where: { id: testPeriodId } });
      }
      if (testYearId) {
        await db.academicYear.deleteMany({ where: { id: testYearId } });
      }
      if (teacherUser?.id) {
        await db.organizationMember.deleteMany({ where: { userId: teacherUser.id, organizationId } });
        await db.user.deleteMany({ where: { id: teacherUser.id } });
      }
      if (adminUser?.id) {
        await db.organizationMember.deleteMany({ where: { userId: adminUser.id, organizationId } });
        await db.user.deleteMany({ where: { id: adminUser.id } });
      }
      await db.organizationMember.deleteMany({ where: { organizationId } });
      await db.organizationModule.deleteMany({ where: { organizationId } });
      await db.organization.delete({ where: { id: organizationId } }).catch(() => {});
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr);
    }
  }
});
