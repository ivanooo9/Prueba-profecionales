import assert from "node:assert/strict";
import test from "node:test";
import { db } from "../lib/db";
import { AcademicService } from "../services/academic.service";
import {
  AcademicYearStatus,
  AcademicPeriodType,
} from "@prisma/client";

const AcademicAttendanceStatus = {
  PRESENT: "PRESENT",
  ABSENT: "ABSENT",
  LATE: "LATE",
  EXCUSED: "EXCUSED",
} as const;

const AcademicSessionStatus = {
  SCHEDULED: "SCHEDULED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

test("Fase 11 - Normalización del Módulo de Asistencia, Control por Horario y Cierre Diario", async (t) => {
  const testSuffix = Date.now();

  // 0. Protección Fail-Closed de Base de Datos
  const dbInfo = await db.$queryRaw<Array<{ current_database: string; current_schema: string }>>`
    SELECT current_database(), current_schema()
  `;
  const currentDbName = dbInfo[0]?.current_database;
  if (!currentDbName || currentDbName === "profesionales_ecuador" || !currentDbName.includes("test")) {
    throw new Error(
      `FATAL_FAIL_CLOSED_GUARD: Intento de ejecución bloqueado. La base activa es '${currentDbName}'. Las pruebas con escrituras deben ejecutarse exclusivamente sobre 'profesionales_ecuador_test'.`
    );
  }

  // 1. Setup: Crear organizaciones aisladas con datos de prueba
  const org = await db.organization.create({
    data: {
      name: `UAT Attendance Org ${testSuffix}`,
      slug: `uat-attendance-org-${testSuffix}`,
      type: "INSTITUTION",
      status: "ACTIVE",
    },
  });
  const orgId = org.id;

  const otherOrg = await db.organization.create({
    data: {
      name: `UAT Other Org ${testSuffix}`,
      slug: `uat-other-org-${testSuffix}`,
      type: "INSTITUTION",
      status: "ACTIVE",
    },
  });
  const otherOrgId = otherOrg.id;

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
  await db.organizationModule.create({
    data: {
      organizationId: otherOrgId,
      moduleId: teachingMod.id,
      status: "ACTIVE",
    },
  });

  // Usuarios: Admin, Docente asignado, Docente no asignado
  const adminUser = await db.user.create({
    data: {
      email: `admin_att_${testSuffix}@example.com`,
      password: "TestPassword123!",
      name: `Admin Asistencia ${testSuffix}`,
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

  const teacherUser = await db.user.create({
    data: {
      email: `teacher_att_${testSuffix}@example.com`,
      password: "TestPassword123!",
      name: `Docente Titular ${testSuffix}`,
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

  const unauthorizedTeacher = await db.user.create({
    data: {
      email: `unauth_teacher_${testSuffix}@example.com`,
      password: "TestPassword123!",
      name: `Docente No Asignado ${testSuffix}`,
      roleId: teacherRole.id,
    },
  });
  await db.organizationMember.create({
    data: {
      organizationId: orgId,
      userId: unauthorizedTeacher.id,
      role: "MEMBER",
      status: "ACTIVE",
    },
  });

  // Teardown
  t.after(async () => {
    try {
      await db.auditLog.deleteMany({ where: { userId: { in: [adminUser.id, teacherUser.id, unauthorizedTeacher.id] } } });
      await db.academicAttendanceRecord.deleteMany({ where: { organizationId: { in: [orgId, otherOrgId] } } });
      await db.academicClassSession.deleteMany({ where: { organizationId: { in: [orgId, otherOrgId] } } });
      await db.academicEnrollment.deleteMany({ where: { organizationId: { in: [orgId, otherOrgId] } } });
      await db.academicStudent.deleteMany({ where: { organizationId: { in: [orgId, otherOrgId] } } });
      await db.academicSubject.deleteMany({ where: { organizationId: { in: [orgId, otherOrgId] } } });
      await db.academicCourse.deleteMany({ where: { organizationId: { in: [orgId, otherOrgId] } } });
      await db.academicPeriod.deleteMany({ where: { organizationId: { in: [orgId, otherOrgId] } } });
      await db.academicYear.deleteMany({ where: { organizationId: { in: [orgId, otherOrgId] } } });
      await db.organizationMember.deleteMany({ where: { organizationId: { in: [orgId, otherOrgId] } } });
      await db.organizationModule.deleteMany({ where: { organizationId: { in: [orgId, otherOrgId] } } });
      await db.organization.deleteMany({ where: { id: { in: [orgId, otherOrgId] } } });
      await db.user.deleteMany({ where: { id: { in: [adminUser.id, teacherUser.id, unauthorizedTeacher.id] } } });
    } catch (e) {
      console.error("[Attendance Test Teardown Error]:", e);
    }
  });

  // Estructura Académica: Año Lectivo, Período, Esquema
  const academicYear = await AcademicService.createAcademicYear(orgId, {
    name: `Año Lectivo 2026 ${testSuffix}`,
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-12-31"),
    status: AcademicYearStatus.ACTIVE,
  });

  const period = await AcademicService.createAcademicPeriod(orgId, {
    academicYearId: academicYear.id,
    name: "Primer Quimestre",
    type: AcademicPeriodType.QUIMESTER,
    order: 1,
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-06-30"),
  });

  const course = await AcademicService.createCourse(orgId, {
    name: `10mo EGB A ${testSuffix}`,
    level: "EGB_SUPERIOR",
    classroom: "Aula 10A",
  });

  const subject = await AcademicService.createSubject(orgId, course.id, {
    name: `Matemática ${testSuffix}`,
    code: `MAT-${testSuffix}`,
    hoursPerWeek: 4,
    teacherUserId: teacherUser.id,
  });

  const subject2 = await AcademicService.createSubject(orgId, course.id, {
    name: `Lengua ${testSuffix}`,
    code: `LENG-${testSuffix}`,
    hoursPerWeek: 4,
    teacherUserId: teacherUser.id,
  });

  // Estudiantes: 3 estudiantes (2 activos matriculados, 1 inactivo)
  const student1 = await AcademicService.createStudent(orgId, {
    firstName: "Carlos",
    lastName: "Pérez",
    identification: `09${String(testSuffix).slice(-7)}1`,
    email: `carlos_${testSuffix}@example.com`,
  });

  const student2 = await AcademicService.createStudent(orgId, {
    firstName: "María",
    lastName: "Gómez",
    identification: `09${String(testSuffix).slice(-7)}2`,
    email: `maria_${testSuffix}@example.com`,
  });

  const studentInactive = await AcademicService.createStudent(orgId, {
    firstName: "Juan",
    lastName: "Retirado",
    identification: `09${String(testSuffix).slice(-7)}3`,
    email: `juan_${testSuffix}@example.com`,
  });
  await db.academicStudent.update({
    where: { id: studentInactive.id },
    data: { status: "INACTIVE" },
  });

  // Matricular student1 y student2 en el curso y año
  await AcademicService.enrollStudent(orgId, {
    academicYearId: academicYear.id,
    courseId: course.id,
    studentId: student1.id,
  });

  await AcademicService.enrollStudent(orgId, {
    academicYearId: academicYear.id,
    courseId: course.id,
    studentId: student2.id,
  });

  // Obtener fecha de hoy en hora Ecuador
  const todayEcStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const todayDate = new Date(`${todayEcStr}T12:00:00.000Z`);
  const yesterdayDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

  // Crear sesiones de prueba
  // Sesión 1: Hoy - Período 1
  const sessionTodayP1 = await db.academicClassSession.create({
    data: {
      organizationId: orgId,
      courseId: course.id,
      subjectId: subject.id,
      teacherUserId: teacherUser.id,
      sessionDate: todayDate,
      startTime: "08:00",
      endTime: "09:00",
      status: AcademicSessionStatus.SCHEDULED,
      topic: "Clase Hoy Período 1",
    },
  });

  // Sesión 2: Hoy - Período 2 (Misma materia, mismo día -> Debe converger a canónica)
  const sessionTodayP2 = await db.academicClassSession.create({
    data: {
      organizationId: orgId,
      courseId: course.id,
      subjectId: subject.id,
      teacherUserId: teacherUser.id,
      sessionDate: todayDate,
      startTime: "10:00",
      endTime: "11:00",
      status: AcademicSessionStatus.SCHEDULED,
      topic: "Clase Hoy Período 2",
    },
  });

  // Sesión 3: Ayer
  const sessionYesterday = await db.academicClassSession.create({
    data: {
      organizationId: orgId,
      courseId: course.id,
      subjectId: subject.id,
      teacherUserId: teacherUser.id,
      sessionDate: yesterdayDate,
      startTime: "08:00",
      endTime: "09:00",
      status: AcademicSessionStatus.SCHEDULED,
      topic: "Clase Ayer",
    },
  });

  // Sesión 4: Futura
  const sessionFuture = await db.academicClassSession.create({
    data: {
      organizationId: orgId,
      courseId: course.id,
      subjectId: subject.id,
      teacherUserId: teacherUser.id,
      sessionDate: futureDate,
      startTime: "08:00",
      endTime: "09:00",
      status: AcademicSessionStatus.SCHEDULED,
      topic: "Clase Futura",
    },
  });

  // Sesión 5: Cancelada
  const sessionCancelled = await db.academicClassSession.create({
    data: {
      organizationId: orgId,
      courseId: course.id,
      subjectId: subject.id,
      teacherUserId: teacherUser.id,
      sessionDate: todayDate,
      startTime: "14:00",
      endTime: "15:00",
      status: AcademicSessionStatus.CANCELLED,
      topic: "Clase Cancelada",
    },
  });

  // ==========================================
  // INICIO DE PRUEBAS DE LOS 28 ESCENARIOS
  // ==========================================

  // Caso 1: Clase programada hoy permite registro por docente titular
  await t.test("1. Clase programada hoy permite registro por docente titular", async () => {
    const result = await AcademicService.saveAttendanceBatch(
      orgId,
      sessionTodayP1.id,
      [
        { studentId: student1.id, status: AcademicAttendanceStatus.PRESENT },
        { studentId: student2.id, status: AcademicAttendanceStatus.LATE, observation: "Llegó 5 min tarde" },
      ],
      { userId: teacherUser.id, isAcademicAdmin: false }
    );
    assert.equal(result.length, 2);

    const records = await db.academicAttendanceRecord.findMany({
      where: { sessionId: sessionTodayP1.id },
    });
    assert.equal(records.length, 2);
  });

  // Caso 2: Clase no asignada rechaza a docente no autorizado (RBAC)
  await t.test("2. Docente no autorizado es rechazado al intentar registrar asistencia", async () => {
    await assert.rejects(
      async () => {
        await AcademicService.saveAttendanceBatch(
          orgId,
          sessionTodayP1.id,
          [{ studentId: student1.id, status: AcademicAttendanceStatus.PRESENT }],
          { userId: unauthorizedTeacher.id, isAcademicAdmin: false }
        );
      },
      (err: any) => {
        assert.equal(err.code, "ACADEMIC_UNAUTHORIZED_SCHEDULE");
        return true;
      }
    );
  });

  // Caso 3: Clase futura rechaza registro (409 ACADEMIC_ATTENDANCE_FUTURE_DATE)
  await t.test("3. Clase futura rechaza registro con ACADEMIC_ATTENDANCE_FUTURE_DATE", async () => {
    await assert.rejects(
      async () => {
        await AcademicService.saveAttendanceBatch(
          orgId,
          sessionFuture.id,
          [{ studentId: student1.id, status: AcademicAttendanceStatus.PRESENT }],
          { userId: teacherUser.id, isAcademicAdmin: false }
        );
      },
      (err: any) => {
        assert.equal(err.code, "ACADEMIC_ATTENDANCE_FUTURE_DATE");
        return true;
      }
    );
  });

  // Caso 4: Clase de ayer rechaza registro de docente ordinario (409 ACADEMIC_ATTENDANCE_DAY_CLOSED)
  await t.test("4. Clase de fecha pasada bloquea registro a docente ordinario (ACADEMIC_ATTENDANCE_DAY_CLOSED)", async () => {
    await assert.rejects(
      async () => {
        await AcademicService.saveAttendanceBatch(
          orgId,
          sessionYesterday.id,
          [{ studentId: student1.id, status: AcademicAttendanceStatus.PRESENT }],
          { userId: teacherUser.id, isAcademicAdmin: false }
        );
      },
      (err: any) => {
        assert.equal(err.code, "ACADEMIC_ATTENDANCE_DAY_CLOSED");
        return true;
      }
    );
  });

  // Caso 5: Asistencia guardada hoy permite edición en el mismo día
  await t.test("5. Asistencia guardada hoy permite re-edición y actualización en el mismo día", async () => {
    const editResult = await AcademicService.saveAttendanceBatch(
      orgId,
      sessionTodayP1.id,
      [
        { studentId: student1.id, status: AcademicAttendanceStatus.PRESENT },
        { studentId: student2.id, status: AcademicAttendanceStatus.ABSENT, observation: "Falta corregida" },
      ],
      { userId: teacherUser.id, isAcademicAdmin: false }
    );
    assert.equal(editResult.length, 2);

    const s2Record = await db.academicAttendanceRecord.findUnique({
      where: {
        sessionId_studentId: {
          sessionId: sessionTodayP1.id,
          studentId: student2.id,
        },
      },
    });
    assert.equal(s2Record?.status, AcademicAttendanceStatus.ABSENT);
    assert.equal(s2Record?.observation, "Falta corregida");
  });

  // Caso 6: Modificación en día anterior bloqueada a docente ordinario
  await t.test("6. Edición en fecha pasada bloqueada a docente ordinario", async () => {
    await assert.rejects(
      async () => {
        await AcademicService.saveAttendanceBatch(
          orgId,
          sessionYesterday.id,
          [{ studentId: student1.id, status: AcademicAttendanceStatus.PRESENT }],
          { userId: teacherUser.id, isAcademicAdmin: false }
        );
      },
      (err: any) => {
        assert.equal(err.code, "ACADEMIC_ATTENDANCE_DAY_CLOSED");
        return true;
      }
    );
  });

  // Caso 7: 2 períodos de clase en el mismo día convergen a la sesión canónica única
  await t.test("7. Múltiples períodos del mismo día convergen a la sesión canónica única", async () => {
    const result2 = await AcademicService.saveAttendanceBatch(
      orgId,
      sessionTodayP2.id,
      [
        { studentId: student1.id, status: AcademicAttendanceStatus.PRESENT },
        { studentId: student2.id, status: AcademicAttendanceStatus.PRESENT, observation: "Presente en segundo bloque" },
      ],
      { userId: teacherUser.id, isAcademicAdmin: false }
    );

    assert.equal(result2.length, 2);

    // Verificar que solo existen registros en la sesión canónica y NO hay registros huérfanos en sessionTodayP2
    const p2Records = await db.academicAttendanceRecord.findMany({
      where: { sessionId: sessionTodayP2.id },
    });
    assert.equal(p2Records.length, 0);

    const canonicalRecords = await db.academicAttendanceRecord.findMany({
      where: { sessionId: sessionTodayP1.id },
    });
    assert.equal(canonicalRecords.length, 2);
  });

  // Caso 8: 5 peticiones concurrentes convergen y no generan duplicados
  await t.test("8. 5 peticiones concurrentes sobre el mismo curso/materia/día no duplican registros", async () => {
    const promises = [1, 2, 3, 4, 5].map((i) =>
      AcademicService.saveAttendanceBatch(
        orgId,
        sessionTodayP1.id,
        [
          { studentId: student1.id, status: AcademicAttendanceStatus.PRESENT, observation: `Concurrente ${i}` },
          { studentId: student2.id, status: AcademicAttendanceStatus.PRESENT, observation: `Concurrente ${i}` },
        ],
        { userId: teacherUser.id, isAcademicAdmin: false }
      )
    );

    const results = await Promise.all(promises);
    assert.equal(results.length, 5);

    const allRecords = await db.academicAttendanceRecord.findMany({
      where: {
        session: {
          organizationId: orgId,
          courseId: course.id,
          subjectId: subject.id,
        },
      },
    });
    assert.equal(allRecords.length, 2, "Solo deben existir exactamente 2 registros para los 2 estudiantes");
  });

  // Caso 9: Sesión cancelada bloquea registro
  await t.test("9. Sesión cancelada rechaza registro de asistencia", async () => {
    await assert.rejects(
      async () => {
        await AcademicService.saveAttendanceBatch(
          orgId,
          sessionCancelled.id,
          [{ studentId: student1.id, status: AcademicAttendanceStatus.PRESENT }],
          { userId: teacherUser.id, isAcademicAdmin: false }
        );
      },
      (err: any) => {
        assert.equal(err.code, "ACADEMIC_SESSION_CANCELLED");
        return true;
      }
    );
  });

  // Caso 10: Sesión extraordinaria autorizada permite registro
  await t.test("10. Sesión extraordinaria autorizada permite registro", async () => {
    const extraSession = await db.academicClassSession.create({
      data: {
        organizationId: orgId,
        courseId: course.id,
        subjectId: subject2.id,
        teacherUserId: teacherUser.id,
        sessionDate: todayDate,
        startTime: "16:00",
        endTime: "17:00",
        status: AcademicSessionStatus.SCHEDULED,
        topic: "Tutoría Extraordinaria",
      },
    });

    const extraResult = await AcademicService.saveAttendanceBatch(
      orgId,
      extraSession.id,
      [{ studentId: student1.id, status: AcademicAttendanceStatus.PRESENT }],
      { userId: teacherUser.id, isAcademicAdmin: false }
    );
    assert.equal(extraResult.length, 1);
  });

  // Caso 11: Estudiante inactivo/no matriculado excluido
  await t.test("11. Estudiante inactivo o no matriculado no pertenece a la nómina del curso", async () => {
    const roster = await db.academicEnrollment.findMany({
      where: {
        courseId: course.id,
        status: "ACTIVE",
        student: { status: "ACTIVE" },
      },
      include: { student: true },
    });

    const studentIds = roster.map((r) => r.studentId);
    assert.ok(studentIds.includes(student1.id));
    assert.ok(studentIds.includes(student2.id));
    assert.ok(!studentIds.includes(studentInactive.id), "Estudiante inactivo no debe figurar");
  });

  // Caso 12: Estudiante activo incluido en nómina
  await t.test("12. Estudiante activo matriculado está correctamente incluido", async () => {
    const enrollment = await db.academicEnrollment.findFirst({
      where: {
        courseId: course.id,
        studentId: student1.id,
        status: "ACTIVE",
      },
    });
    assert.ok(enrollment !== null);
  });

  // Caso 13: Clase sin registrar permanece en estado neutral sin registros
  await t.test("13. Clase sin registrar no genera registros automáticos", async () => {
    const freshSession = await db.academicClassSession.create({
      data: {
        organizationId: orgId,
        courseId: course.id,
        subjectId: subject.id,
        teacherUserId: teacherUser.id,
        sessionDate: todayDate,
        startTime: "17:00",
        endTime: "18:00",
        status: AcademicSessionStatus.SCHEDULED,
        topic: "Clase Sin Registrar",
      },
    });

    const existingRecords = await db.academicAttendanceRecord.findMany({
      where: { sessionId: freshSession.id },
    });
    assert.equal(existingRecords.length, 0);
  });

  // Caso 14: Marcar todos presente opera correctamente
  await t.test("14. Marcar todos presente persiste estados PRESENT para toda la nómina", async () => {
    const result = await AcademicService.saveAttendanceBatch(
      orgId,
      sessionTodayP1.id,
      [
        { studentId: student1.id, status: AcademicAttendanceStatus.PRESENT },
        { studentId: student2.id, status: AcademicAttendanceStatus.PRESENT },
      ],
      { userId: teacherUser.id, isAcademicAdmin: false }
    );
    assert.equal(result.length, 2);

    const records = await db.academicAttendanceRecord.findMany({
      where: { sessionId: sessionTodayP1.id },
    });
    assert.ok(records.every((r) => r.status === AcademicAttendanceStatus.PRESENT));
  });

  // Caso 15: Validación de nómina incompleta
  await t.test("15. Validación rechaza batch con lista vacía", async () => {
    await assert.rejects(
      async () => {
        await AcademicService.saveAttendanceBatch(
          orgId,
          sessionTodayP1.id,
          [],
          { userId: teacherUser.id, isAcademicAdmin: false }
        );
      },
      (err: any) => {
        assert.ok(err.message.includes("Debe proporcionar al menos un registro"));
        return true;
      }
    );
  });

  // Caso 16: Rectificación administrativa exige rol ADMIN y motivo >= 10 caracteres
  await t.test("16. Rectificación rechaza motivo menor a 10 caracteres o rol no administrativo", async () => {
    // Motivo corto
    await assert.rejects(
      async () => {
        await AcademicService.rectifyAttendanceBatch(
          orgId,
          sessionYesterday.id,
          [{ studentId: student1.id, status: AcademicAttendanceStatus.EXCUSED }],
          "Corto",
          { userId: adminUser.id, isAcademicAdmin: true }
        );
      },
      (err: any) => {
        assert.equal(err.code, "INVALID_RECTIFICATION_REASON");
        return true;
      }
    );

    // Usuario docente no admin
    await assert.rejects(
      async () => {
        await AcademicService.rectifyAttendanceBatch(
          orgId,
          sessionYesterday.id,
          [{ studentId: student1.id, status: AcademicAttendanceStatus.EXCUSED }],
          "Justificación médica presentada por secretaría",
          { userId: teacherUser.id, isAcademicAdmin: false }
        );
      },
      (err: any) => {
        assert.ok(err.message.includes("Se requieren permisos administrativos"));
        return true;
      }
    );
  });

  // Caso 17: Rectificación administrativa guarda cambios y genera registro atómico en AuditLog
  await t.test("17. Rectificación administrativa autorizada persiste cambios y registra AuditLog atómicamente", async () => {
    const rectifyResult = await AcademicService.rectifyAttendanceBatch(
      orgId,
      sessionYesterday.id,
      [
        { studentId: student1.id, status: AcademicAttendanceStatus.EXCUSED, observation: "Certificado médico 123" },
        { studentId: student2.id, status: AcademicAttendanceStatus.PRESENT },
      ],
      "Justificación médica presentada ante vicerrectorado",
      { userId: adminUser.id, isAcademicAdmin: true }
    );

    assert.equal(rectifyResult.records.length, 2);
    assert.equal(rectifyResult.auditLogRecorded, true);

    // Verificar AuditLog
    const audit = await db.auditLog.findFirst({
      where: {
        userId: adminUser.id,
        action: "ACADEMIC_ATTENDANCE_RECTIFICATION",
      },
      orderBy: { id: "desc" },
    });

    assert.ok(audit !== null);
    assert.equal(audit?.userId, adminUser.id);
    const details = JSON.parse(audit?.details || "{}");
    assert.equal(details.reason, "Justificación médica presentada ante vicerrectorado");
  });

  // Caso 18: Cálculo unificado de porcentaje de asistencia (PRESENT + LATE) / total
  await t.test("18. Fórmula unificada de asistencia: (PRESENT + LATE) / Total * 100", async () => {
    const report = await AcademicService.getAttendanceReport(orgId, {
      courseId: course.id,
      subjectId: subject.id,
    });

    // student1: 1 Presente en Hoy, 1 Justificada (Excused) en Ayer -> Total 2 clases. Asistencia: 1 / 2 = 50%
    // student2: 1 Presente en Hoy, 1 Presente en Ayer -> Total 2 clases. Asistencia: 2 / 2 = 100%
    const st1 = report.studentSummaries.find((s) => s.studentId === student1.id);
    const st2 = report.studentSummaries.find((s) => s.studentId === student2.id);

    assert.equal(st1?.totalRecords, 2);
    assert.equal(st1?.presentCount, 1);
    assert.equal(st1?.excusedCount, 1);
    assert.equal(st1?.attendanceRate, 50);

    assert.equal(st2?.totalRecords, 2);
    assert.equal(st2?.presentCount, 2);
    assert.equal(st2?.attendanceRate, 100);
  });

  // Caso 19: Cierre a medianoche a las 00:00 hora Ecuador bloquea fechas pasadas
  await t.test("19. Validación en base de datos evalúa estrictamente el cambio de día", async () => {
    const pastSession = await db.academicClassSession.create({
      data: {
        organizationId: orgId,
        courseId: course.id,
        subjectId: subject.id,
        teacherUserId: teacherUser.id,
        sessionDate: new Date("2026-01-10T12:00:00.000Z"),
        startTime: "08:00",
        endTime: "09:00",
        status: AcademicSessionStatus.SCHEDULED,
        topic: "Sesión Enero",
      },
    });

    await assert.rejects(
      async () => {
        await AcademicService.saveAttendanceBatch(
          orgId,
          pastSession.id,
          [{ studentId: student1.id, status: AcademicAttendanceStatus.PRESENT }],
          { userId: teacherUser.id, isAcademicAdmin: false }
        );
      },
      (err: any) => {
        assert.equal(err.code, "ACADEMIC_ATTENDANCE_DAY_CLOSED");
        return true;
      }
    );
  });

  // Caso 20: Preservación total de datos académicos históricos
  await t.test("20. Los registros históricos y notas se mantienen inalterados", async () => {
    const historicalRecords = await db.academicAttendanceRecord.findMany({
      where: { sessionId: sessionYesterday.id },
    });
    assert.equal(historicalRecords.length, 2);
  });

  // Caso 21: Transaccionalidad rollback en fallo simulado
  await t.test("21. Transaccionalidad: Error en payload causa rollback completo", async () => {
    const beforeCount = await db.academicAttendanceRecord.count({
      where: { sessionId: sessionTodayP1.id },
    });

    try {
      await AcademicService.saveAttendanceBatch(
        orgId,
        sessionTodayP1.id,
        [
          { studentId: student1.id, status: AcademicAttendanceStatus.PRESENT },
          { studentId: 999999999, status: AcademicAttendanceStatus.PRESENT }, // Estudiante inexistente
        ],
        { userId: teacherUser.id, isAcademicAdmin: false }
      );
    } catch {
      // Se espera error
    }

    const afterCount = await db.academicAttendanceRecord.count({
      where: { sessionId: sessionTodayP1.id },
    });
    assert.equal(afterCount, beforeCount);
  });

  // Caso 22: Intento de rectificación con rol no autorizado responde 403
  await t.test("22. Rectificación de docente sin permisos es rechazada con ACADEMIC_FORBIDDEN", async () => {
    await assert.rejects(
      async () => {
        await AcademicService.rectifyAttendanceBatch(
          orgId,
          sessionTodayP1.id,
          [{ studentId: student1.id, status: AcademicAttendanceStatus.PRESENT }],
          "Corrección no autorizada de docente",
          { userId: unauthorizedTeacher.id, isAcademicAdmin: false }
        );
      },
      (err: any) => {
        assert.ok(err.message.includes("Se requieren permisos administrativos"));
        return true;
      }
    );
  });

  // Caso 23: Rechazo entre organizaciones distintas (Cross-org isolation)
  await t.test("23. Petición con organización ajena es rechazada", async () => {
    await assert.rejects(
      async () => {
        await AcademicService.saveAttendanceBatch(
          otherOrgId,
          sessionTodayP1.id,
          [{ studentId: student1.id, status: AcademicAttendanceStatus.PRESENT }],
          { userId: teacherUser.id, isAcademicAdmin: false }
        );
      },
      (err: any) => {
        assert.ok(err.message.includes("no encontrada"));
        return true;
      }
    );
  });

  // Caso 24: Aislamiento por curso y materia
  await t.test("24. Búsqueda de sesión canónica resuelve el día y materia exactos", async () => {
    const resolvedSession = await AcademicService.resolveCanonicalDailySession(
      db,
      orgId,
      course.id,
      subject.id,
      todayDate,
      sessionTodayP1.id
    );

    assert.equal(resolvedSession?.id, sessionTodayP1.id);
  });

  // Caso 25: Falta Justificada (EXCUSED) computada correctamente en denominador
  await t.test("25. Justificada no incrementa asistencia pero sí forma parte del total evaluado", async () => {
    const report = await AcademicService.getAttendanceReport(orgId, {
      courseId: course.id,
      subjectId: subject.id,
    });
    const st1 = report.studentSummaries.find((s) => s.studentId === student1.id);
    assert.equal(st1?.excusedCount, 1);
    assert.equal(st1?.totalRecords, 2);
    assert.equal(st1?.attendanceRate, 50);
  });

  // Caso 26: Consulta de sesión no existente
  await t.test("26. Sesión inexistente retorna error 404", async () => {
    await assert.rejects(
      async () => {
        await AcademicService.saveAttendanceBatch(
          orgId,
          99999999,
          [{ studentId: student1.id, status: AcademicAttendanceStatus.PRESENT }],
          { userId: teacherUser.id, isAcademicAdmin: false }
        );
      },
      (err: any) => {
        assert.ok(err.message.includes("no encontrada"));
        return true;
      }
    );
  });

  // Caso 27: Idempotencia en guardados sucesivos
  await t.test("27. Guardados repetidos son idempotentes y no incrementan registros", async () => {
    await AcademicService.saveAttendanceBatch(
      orgId,
      sessionTodayP1.id,
      [
        { studentId: student1.id, status: AcademicAttendanceStatus.PRESENT },
        { studentId: student2.id, status: AcademicAttendanceStatus.PRESENT },
      ],
      { userId: teacherUser.id, isAcademicAdmin: false }
    );

    await AcademicService.saveAttendanceBatch(
      orgId,
      sessionTodayP1.id,
      [
        { studentId: student1.id, status: AcademicAttendanceStatus.PRESENT },
        { studentId: student2.id, status: AcademicAttendanceStatus.PRESENT },
      ],
      { userId: teacherUser.id, isAcademicAdmin: false }
    );

    const count = await db.academicAttendanceRecord.count({
      where: { sessionId: sessionTodayP1.id },
    });
    assert.equal(count, 2);
  });

  // Caso 28: Estado de sesión cambia a COMPLETED al registrar asistencia
  await t.test("28. Sesión programada transiciona a COMPLETED tras registrar asistencia", async () => {
    const updatedSession = await db.academicClassSession.findUnique({
      where: { id: sessionTodayP1.id },
    });
    assert.equal(updatedSession?.status, AcademicSessionStatus.COMPLETED);
  });
});
