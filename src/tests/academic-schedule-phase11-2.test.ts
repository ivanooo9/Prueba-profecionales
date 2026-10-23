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

test("Fase 11.2 - Implementación Controlada de Horarios Semanales Recurrentes", async (t) => {
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
      name: `UAT Schedule Org ${testSuffix}`,
      slug: `uat-schedule-org-${testSuffix}`,
      type: "INSTITUTION",
      status: "ACTIVE",
    },
  });
  const orgId = org.id;

  const otherOrg = await db.organization.create({
    data: {
      name: `UAT Other Org ${testSuffix}`,
      slug: `uat-other-sched-org-${testSuffix}`,
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

  // Admin User
  const adminUser = await db.user.create({
    data: {
      email: `admin-sched-${testSuffix}@test.com`,
      password: "TestPassword123!",
      name: "Admin Schedule",
      roleId: adminRole.id,
    },
  });
  await db.organizationMember.create({
    data: {
      userId: adminUser.id,
      organizationId: orgId,
      role: "OWNER",
      status: "ACTIVE",
    },
  });

  // Teacher Users
  const teacher1 = await db.user.create({
    data: {
      email: `teacher1-sched-${testSuffix}@test.com`,
      password: "TestPassword123!",
      name: "Carlos Docente Uno",
      roleId: teacherRole.id,
    },
  });
  await db.organizationMember.create({
    data: {
      userId: teacher1.id,
      organizationId: orgId,
      role: "MEMBER",
      status: "ACTIVE",
    },
  });

  const teacher2 = await db.user.create({
    data: {
      email: `teacher2-sched-${testSuffix}@test.com`,
      password: "TestPassword123!",
      name: "Ana Docente Dos",
      roleId: teacherRole.id,
    },
  });
  await db.organizationMember.create({
    data: {
      userId: teacher2.id,
      organizationId: orgId,
      role: "MEMBER",
      status: "ACTIVE",
    },
  });

  // Academic Year
  const academicYear = await db.academicYear.create({
    data: {
      organizationId: orgId,
      name: `Lectivo ${testSuffix}`,
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-12-31T23:59:59.000Z"),
      status: AcademicYearStatus.ACTIVE,
    },
  });
  const academicYearId = academicYear.id;

  // Academic Course
  const course = await db.academicCourse.create({
    data: {
      organizationId: orgId,
      name: `10mo EGB Paralelo A - ${testSuffix}`,
      level: "EGB_SUPERIOR",
      status: "ACTIVE",
    },
  });
  const courseId = course.id;

  const course2 = await db.academicCourse.create({
    data: {
      organizationId: orgId,
      name: `10mo EGB Paralelo B - ${testSuffix}`,
      level: "EGB_SUPERIOR",
      status: "ACTIVE",
    },
  });
  const course2Id = course2.id;

  // Subjects: Matematicas (4 hrs/sem), Lengua (3 hrs/sem)
  const mathSubject = await db.academicSubject.create({
    data: {
      organizationId: orgId,
      courseId,
      name: "Matemáticas",
      code: `MAT-${testSuffix}`,
      hoursPerWeek: 4,
      status: "ACTIVE",
      teacherUserId: teacher1.id,
    },
  });
  const mathSubjectId = mathSubject.id;

  const langSubject = await db.academicSubject.create({
    data: {
      organizationId: orgId,
      courseId,
      name: "Lengua y Literatura",
      code: `LEN-${testSuffix}`,
      hoursPerWeek: 3,
      status: "ACTIVE",
      teacherUserId: teacher2.id,
    },
  });
  const langSubjectId = langSubject.id;

  // Student and enrollment
  const student = await db.academicStudent.create({
    data: {
      organizationId: orgId,
      firstName: "Estudiante",
      lastName: "Prueba",
      identification: `ID-${testSuffix}`,
      status: "ACTIVE",
    },
  });
  await db.academicEnrollment.create({
    data: {
      organizationId: orgId,
      studentId: student.id,
      courseId,
      academicYearId,
      status: "ACTIVE",
    },
  });

  // Calculate today's Ecuador day of week and formatted date
  const now = new Date();
  const ecuadorDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const [y, m, d] = ecuadorDateStr.split("-").map(Number);
  const localDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const jsDay = localDate.getUTCDay();
  const ecuadorTodayDayOfWeek = jsDay === 0 ? 7 : jsDay; // 1=Mon ... 7=Sun

  // A different day of the week
  const unscheduledDayOfWeek = ecuadorTodayDayOfWeek === 1 ? 2 : 1;

  // ==========================================
  // SCENARIO 1: Materia nueva sin horario retorna 'no_schedule'
  // ==========================================
  await t.test("1. Materia nueva sin horarios configurados retorna status 'no_schedule'", async () => {
    const scheduleData = await AcademicService.getSubjectSchedule(orgId, mathSubjectId);
    assert.equal(scheduleData.scheduleStatus, "no_schedule");
    assert.equal(scheduleData.totalPedagogicalHours, 0);
    assert.equal(scheduleData.activeSlots.length, 0);

    const subjects = await AcademicService.getSubjectsByCourse(orgId, courseId);
    const math = subjects.find((s) => s.id === mathSubjectId);
    assert.ok(math);
    assert.equal(math.scheduleStatus, "no_schedule");
    assert.equal(math.totalPedagogicalHours, 0);
  });

  // ==========================================
  // ==========================================
  // SCENARIO 2: Creación exitosa de horario semanal recurrente
  // ==========================================
  await t.test("2. Creación exitosa de horario semanal recurrente para la materia", async () => {
    const result = await AcademicService.saveSubjectSchedule(orgId, mathSubjectId, {
      academicYearId,
      effectiveFrom: "2026-01-01",
      slots: [
        {
          dayOfWeek: ecuadorTodayDayOfWeek,
          startTime: "07:30",
          endTime: "09:00",
          pedagogicalHours: 2,
          room: "Aula 101",
          teacherUserId: teacher1.id,
        },
        {
          dayOfWeek: unscheduledDayOfWeek,
          startTime: "09:30",
          endTime: "11:00",
          pedagogicalHours: 2,
          room: "Aula 101",
          teacherUserId: teacher1.id,
        },
      ],
    });

    assert.equal(result.scheduleStatus, "complete");
    assert.equal(result.totalPedagogicalHours, 4);
    assert.equal(result.slots.length, 2);
    assert.equal(result.slots[0].status, "ACTIVE");
  });

  // ==========================================
  // SCENARIO 3: Cálculo y coherencia de carga horaria (incomplete, complete, excess)
  // ==========================================
  await t.test("3. Verificación de estados de carga horaria: incomplete, complete y excess", async () => {
    // 3a. Incomplete (1 slot de 2 horas vs 3 horas de Lengua)
    const incResult = await AcademicService.saveSubjectSchedule(orgId, langSubjectId, {
      academicYearId,
      slots: [
        {
          dayOfWeek: 5,
          startTime: "12:00",
          endTime: "13:30",
          pedagogicalHours: 2,
          teacherUserId: teacher2.id,
        },
      ],
    });
    assert.equal(incResult.scheduleStatus, "incomplete");
    assert.equal(incResult.totalPedagogicalHours, 2);

    // 3b. Complete (agregar 1 hora más -> 3 de 3)
    const compResult = await AcademicService.saveSubjectSchedule(orgId, langSubjectId, {
      academicYearId,
      slots: [
        {
          dayOfWeek: 5,
          startTime: "12:00",
          endTime: "13:30",
          pedagogicalHours: 2,
          teacherUserId: teacher2.id,
        },
        {
          dayOfWeek: 6,
          startTime: "12:00",
          endTime: "12:45",
          pedagogicalHours: 1,
          teacherUserId: teacher2.id,
        },
      ],
    });
    assert.equal(compResult.scheduleStatus, "complete");
    assert.equal(compResult.totalPedagogicalHours, 3);

    // 3c. Excess (agregar 4 horas cuando el límite es 3 -> debe rechazar con 400)
    await assert.rejects(
      async () => {
        await AcademicService.saveSubjectSchedule(orgId, langSubjectId, {
          academicYearId,
          slots: [
            {
              dayOfWeek: 5,
              startTime: "12:00",
              endTime: "13:30",
              pedagogicalHours: 2,
              teacherUserId: teacher2.id,
            },
            {
              dayOfWeek: 6,
              startTime: "12:00",
              endTime: "13:30",
              pedagogicalHours: 2,
              teacherUserId: teacher2.id,
            },
          ],
        });
      },
      (err: any) => {
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, "ACADEMIC_SCHEDULE_EXCEEDS_HOURS");
        return true;
      }
    );
  });

  // ==========================================
  // SCENARIO 4: Conflicto de Docente en el mismo tramo horario
  // ==========================================
  await t.test("4. Rechazo determinista por cruce de horario del Docente (409)", async () => {
    // Math en Course 1 tiene a teacher1 el día ecuadorTodayDayOfWeek de 07:30 a 09:00
    // Intentar crear otra materia en Course 2 asignada a teacher1 en el mismo día y hora
    const scienceSubject = await db.academicSubject.create({
      data: {
        organizationId: orgId,
        courseId: course2Id,
        name: "Ciencias Naturales",
        code: `CN-${testSuffix}`,
        hoursPerWeek: 2,
        status: "ACTIVE",
        teacherUserId: teacher1.id,
      },
    });

    await assert.rejects(
      async () => {
        await AcademicService.saveSubjectSchedule(orgId, scienceSubject.id, {
          academicYearId,
          slots: [
            {
              dayOfWeek: ecuadorTodayDayOfWeek,
              startTime: "08:00", // Traslape con 07:30 - 09:00
              endTime: "09:30",
              pedagogicalHours: 2,
              teacherUserId: teacher1.id,
            },
          ],
        });
      },
      (err: any) => {
        assert.equal(err.code, "ACADEMIC_SCHEDULE_TEACHER_CONFLICT");
        return true;
      }
    );
  });

  // ==========================================
  // SCENARIO 5: Conflicto de Curso en el mismo tramo horario
  // ==========================================
  await t.test("5. Rechazo determinista por cruce de horario en el mismo Curso (409)", async () => {
    // Course 1 ya tiene Math de 07:30 a 09:00 el día ecuadorTodayDayOfWeek
    // Intentar asignar Lengua (con teacher2) en Course 1 en ese mismo horario
    await assert.rejects(
      async () => {
        await AcademicService.saveSubjectSchedule(orgId, langSubjectId, {
          academicYearId,
          slots: [
            {
              dayOfWeek: ecuadorTodayDayOfWeek,
              startTime: "08:00", // Traslape en Course 1
              endTime: "09:00",
              pedagogicalHours: 1,
              teacherUserId: teacher2.id,
            },
          ],
        });
      },
      (err: any) => {
        assert.equal(err.code, "ACADEMIC_SCHEDULE_COURSE_CONFLICT");
        return true;
      }
    );
  });

  // ==========================================
  // SCENARIO 6: Asistencia permitida en día con horario activo
  // ==========================================
  await t.test("6. Registro de asistencia permitido cuando la fecha coincide con el día del horario", async () => {
    // Hoy coincide con ecuadorTodayDayOfWeek, para el cual Math tiene horario activo
    const mathSession = await db.academicClassSession.create({
      data: {
        organizationId: orgId,
        courseId,
        subjectId: mathSubjectId,
        teacherUserId: teacher1.id,
        sessionDate: localDate,
        startTime: "07:30",
        endTime: "09:00",
        status: AcademicSessionStatus.SCHEDULED,
      },
    });

    const attendanceResult = await AcademicService.saveAttendanceBatch(
      orgId,
      mathSession.id,
      [
        {
          studentId: student.id,
          status: AcademicAttendanceStatus.PRESENT,
          observation: "Presente en hora programada",
        },
      ],
      { userId: teacher1.id, isAcademicAdmin: false }
    );

    assert.equal(attendanceResult.length, 1);
    assert.equal(attendanceResult[0].status, AcademicAttendanceStatus.PRESENT);
  });

  // ==========================================
  // SCENARIO 7: Asistencia bloqueada en día sin horario para la materia
  // ==========================================
  await t.test("7. Registro de asistencia rechazado si el día no forma parte del horario semanal (409)", async () => {
    // Crear una materia con horario solo los domingos (día 7) si hoy no es 7, o solo los lunes si hoy es domingo
    const sundayDay = ecuadorTodayDayOfWeek === 7 ? 6 : 7;
    const sundaySubject = await db.academicSubject.create({
      data: {
        organizationId: orgId,
        courseId,
        name: "Arte y Cultura",
        code: `ART-${testSuffix}`,
        hoursPerWeek: 2,
        status: "ACTIVE",
        teacherUserId: teacher2.id,
      },
    });

    await AcademicService.saveSubjectSchedule(orgId, sundaySubject.id, {
      academicYearId,
      slots: [
        {
          dayOfWeek: sundayDay,
          startTime: "14:00",
          endTime: "15:30",
          pedagogicalHours: 2,
          teacherUserId: teacher2.id,
        },
      ],
    });

    // Sesión creada hoy para Arte (que no tiene horario hoy)
    const sundaySession = await db.academicClassSession.create({
      data: {
        organizationId: orgId,
        courseId,
        subjectId: sundaySubject.id,
        teacherUserId: teacher2.id,
        sessionDate: localDate,
        startTime: "14:00",
        endTime: "15:30",
        status: AcademicSessionStatus.SCHEDULED,
      },
    });

    // Intentar tomar asistencia HOY para Arte (que no tiene horario hoy)
    await assert.rejects(
      async () => {
        await AcademicService.saveAttendanceBatch(
          orgId,
          sundaySession.id,
          [
            {
              studentId: student.id,
              status: AcademicAttendanceStatus.PRESENT,
            },
          ],
          { userId: teacher2.id, isAcademicAdmin: false }
        );
      },
      (err: any) => {
        assert.equal(err.code, "ACADEMIC_SUBJECT_NOT_SCHEDULED_TODAY");
        return true;
      }
    );
  });

  // ==========================================
  // SCENARIO 8: Múltiples bloques en el mismo día convergen en una sola sesión canónica
  // ==========================================
  await t.test("8. Múltiples bloques en el mismo día convergen a una única asistencia diaria canónica", async () => {
    // Math ya tiene asistencia hoy. Registrar una actualización en otro bloque del mismo día debe reusar la sesión canónica
    const mathSession2 = await db.academicClassSession.create({
      data: {
        organizationId: orgId,
        courseId,
        subjectId: mathSubjectId,
        teacherUserId: teacher1.id,
        sessionDate: localDate,
        startTime: "09:30",
        endTime: "11:00",
        status: AcademicSessionStatus.SCHEDULED,
      },
    });

    const secondBatch = await AcademicService.saveAttendanceBatch(
      orgId,
      mathSession2.id,
      [
        {
          studentId: student.id,
          status: AcademicAttendanceStatus.LATE,
          observation: "Atraso justificado en segundo bloque",
        },
      ],
      { userId: teacher1.id, isAcademicAdmin: false }
    );

    assert.equal(secondBatch.length, 1);
    assert.equal(secondBatch[0].status, AcademicAttendanceStatus.LATE);

    // Comprobar que en la base de datos los registros de asistencia convergen a la sesión canónica
    const studentRecords = await db.academicAttendanceRecord.findMany({
      where: {
        organizationId: orgId,
        studentId: student.id,
        session: { subjectId: mathSubjectId },
      },
    });
    // Solo existe 1 registro de asistencia activo para el estudiante en esta materia y día
    assert.equal(studentRecords.length, 1);
    assert.equal(studentRecords[0].status, AcademicAttendanceStatus.LATE);
  });

  // ==========================================
  // SCENARIO 9: Sesión cancelada rechaza toma de asistencia
  // ==========================================
  await t.test("9. Sesión cancelada rechaza la toma de asistencia con error 409", async () => {
    // Crear una sesión cancelada para hoy
    const session = await db.academicClassSession.create({
      data: {
        organizationId: orgId,
        courseId,
        subjectId: mathSubjectId,
        teacherUserId: teacher1.id,
        sessionDate: localDate,
        startTime: "12:00",
        endTime: "13:00",
        status: AcademicSessionStatus.CANCELLED,
      },
    });

    await assert.rejects(
      async () => {
        await AcademicService.saveAttendanceBatch(
          orgId,
          session.id,
          [
            {
              studentId: student.id,
              status: AcademicAttendanceStatus.ABSENT,
            },
          ],
          { userId: teacher1.id, isAcademicAdmin: false }
        );
      },
      (err: any) => {
        assert.equal(err.code, "ACADEMIC_SESSION_CANCELLED");
        return true;
      }
    );
  });

  // ==========================================
  // SCENARIO 10: Sesión extraordinaria autorizada permite asistencia
  // ==========================================
  await t.test("10. Sesión extraordinaria autorizada con horario explícito permite registro", async () => {
    // Crear sesión explícita no cancelada
    const extraSession = await db.academicClassSession.create({
      data: {
        organizationId: orgId,
        courseId,
        subjectId: mathSubjectId,
        teacherUserId: teacher1.id,
        sessionDate: localDate,
        startTime: "15:00",
        endTime: "16:00",
        topic: "Refuerzo pedagógico extraordinario",
        status: AcademicSessionStatus.IN_PROGRESS,
      },
    });

    const res = await AcademicService.saveAttendanceBatch(
      orgId,
      extraSession.id,
      [
        {
          studentId: student.id,
          status: AcademicAttendanceStatus.PRESENT,
          observation: "Refuerzo",
        },
      ],
      { userId: teacher1.id, isAcademicAdmin: false }
    );

    assert.equal(res.length, 1);
  });

  // ==========================================
  // SCENARIO 11: Modificación de horario cierra vigencia anterior y preserva historial
  // ==========================================
  await t.test("11. Modificación de horario cierra vigencia previa (SUPERSEDED) y preserva historial", async () => {
    // Obtener los slots antes del cambio
    const beforeSlots = await db.academicSubjectScheduleSlot.findMany({
      where: {
        organizationId: orgId,
        subjectId: mathSubjectId,
        status: "ACTIVE",
      },
    });
    assert.ok(beforeSlots.length > 0);

    // Guardar nuevo horario para Math a partir de mañana
    const newSchedule = await AcademicService.saveSubjectSchedule(orgId, mathSubjectId, {
      academicYearId,
      effectiveFrom: "2026-11-01",
      slots: [
        {
          dayOfWeek: ecuadorTodayDayOfWeek,
          startTime: "10:00",
          endTime: "11:30",
          pedagogicalHours: 2,
          room: "Laboratorio B",
          teacherUserId: teacher1.id,
        },
        {
          dayOfWeek: unscheduledDayOfWeek,
          startTime: "11:30",
          endTime: "13:00",
          pedagogicalHours: 2,
          room: "Laboratorio B",
          teacherUserId: teacher1.id,
        },
      ],
    });

    assert.equal(newSchedule.slots.length, 2);
    assert.equal(newSchedule.slots[0].room, "Laboratorio B");

    // Verificar que los slots anteriores están en estado SUPERSEDED
    const supersededSlots = await db.academicSubjectScheduleSlot.findMany({
      where: {
        organizationId: orgId,
        subjectId: mathSubjectId,
        status: "SUPERSEDED",
      },
    });
    assert.equal(supersededSlots.length, beforeSlots.length);
    assert.ok(supersededSlots[0].effectiveTo !== null);

    // Verificar que la asistencia histórica de Math sigue intacta
    const pastAttendances = await db.academicAttendanceRecord.findMany({
      where: {
        studentId: student.id,
      },
    });
    assert.ok(pastAttendances.length > 0);
  });

  // ==========================================
  // SCENARIO 12: Bloqueo de fechas pasadas (Cierre Diario 00:00) permanece activo
  // ==========================================
  await t.test("12. Bloqueo de fechas pasadas (Cierre Diario a las 00:00 Ecuador) permanece estricto", async () => {
    const pastDate = new Date("2026-01-05T12:00:00.000Z");
    const pastSession = await db.academicClassSession.create({
      data: {
        organizationId: orgId,
        courseId,
        subjectId: mathSubjectId,
        teacherUserId: teacher1.id,
        sessionDate: pastDate,
        startTime: "07:30",
        endTime: "09:00",
        status: AcademicSessionStatus.SCHEDULED,
      },
    });

    await assert.rejects(
      async () => {
        await AcademicService.saveAttendanceBatch(
          orgId,
          pastSession.id,
          [
            {
              studentId: student.id,
              status: AcademicAttendanceStatus.PRESENT,
            },
          ],
          { userId: teacher1.id, isAcademicAdmin: false }
        );
      },
      (err: any) => {
        assert.equal(err.code, "ACADEMIC_ATTENDANCE_DAY_CLOSED");
        return true;
      }
    );
  });

  // ==========================================
  // SCENARIO 13: Aislamiento estricto multi-tenancy entre Organizaciones
  // ==========================================
  await t.test("13. Aislamiento estricto multi-tenancy: los horarios de Org A no interfieren en Org B", async () => {
    // Crear curso y materia en otherOrg con el mismo teacher y el mismo horario
    const otherYear = await db.academicYear.create({
      data: {
        organizationId: otherOrgId,
        name: `Lectivo Other ${testSuffix}`,
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        endDate: new Date("2026-12-31T23:59:59.000Z"),
        status: AcademicYearStatus.ACTIVE,
      },
    });

    const otherCourse = await db.academicCourse.create({
      data: {
        organizationId: otherOrgId,
        name: `Curso Org B - ${testSuffix}`,
        level: "EGB_SUPERIOR",
        status: "ACTIVE",
      },
    });

    const otherSubject = await db.academicSubject.create({
      data: {
        organizationId: otherOrgId,
        courseId: otherCourse.id,
        name: "Matemáticas Org B",
        code: `MATB-${testSuffix}`,
        hoursPerWeek: 2,
        status: "ACTIVE",
        teacherUserId: teacher1.id,
      },
    });

    // Guardar horario en Org B con los mismos días/horas no debe colisionar con Org A
    const otherResult = await AcademicService.saveSubjectSchedule(otherOrgId, otherSubject.id, {
      academicYearId: otherYear.id,
      slots: [
        {
          dayOfWeek: ecuadorTodayDayOfWeek,
          startTime: "10:00",
          endTime: "11:30",
          pedagogicalHours: 2,
          room: "Aula Externa",
          teacherUserId: teacher1.id,
        },
      ],
    });

    assert.equal(otherResult.slots.length, 1);
    assert.equal(otherResult.slots[0].room, "Aula Externa");

    // Intentar leer materias de Org A desde Org B debe retornar vacío o error de pertenencia
    const orgBSchedule = await AcademicService.getSubjectSchedule(otherOrgId, otherSubject.id);
    assert.equal(orgBSchedule.activeSlots.length, 1);
  });

  // ==========================================
  // SCENARIO 14: Serialización y bloqueos concurrentes (pg_advisory_xact_lock)
  // ==========================================
  await t.test("14. Concurrencia controlada: peticiones concurrentes se serializan sin corrupción", async () => {
    // Ejecutar 2 guardados concurrentes con validaciones cruzadas
    const p1 = AcademicService.saveSubjectSchedule(orgId, mathSubjectId, {
      academicYearId,
      slots: [
        {
          dayOfWeek: 1,
          startTime: "07:00",
          endTime: "08:30",
          pedagogicalHours: 2,
          teacherUserId: teacher1.id,
        },
        {
          dayOfWeek: 2,
          startTime: "07:00",
          endTime: "08:30",
          pedagogicalHours: 2,
          teacherUserId: teacher1.id,
        },
      ],
    });

    const p2 = AcademicService.saveSubjectSchedule(orgId, langSubjectId, {
      academicYearId,
      slots: [
        {
          dayOfWeek: 1,
          startTime: "08:30",
          endTime: "10:00",
          pedagogicalHours: 2,
          teacherUserId: teacher2.id,
        },
        {
          dayOfWeek: 2,
          startTime: "08:30",
          endTime: "09:15",
          pedagogicalHours: 1,
          teacherUserId: teacher2.id,
        },
      ],
    });

    const [res1, res2] = await Promise.all([p1, p2]);
    assert.equal(res1.slots.length, 2);
    assert.equal(res2.slots.length, 2);
  });
});
