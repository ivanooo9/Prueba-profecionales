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

test("Fase 11.3 - Integración de Días y Horarios en el Registro de Materias", async (t) => {
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

  // 1. Setup inicial
  const org = await db.organization.create({
    data: {
      name: `UAT Phase 11.3 Org ${testSuffix}`,
      slug: `uat-phase11-3-org-${testSuffix}`,
      type: "INSTITUTION",
      status: "ACTIVE",
    },
  });
  const orgId = org.id;

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

  const teacher1 = await db.user.create({
    data: {
      email: `teacher1-${testSuffix}@test.com`,
      password: "TestPassword123!",
      name: "Lic. Carlos Mendoza",
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
      email: `teacher2-${testSuffix}@test.com`,
      password: "TestPassword123!",
      name: "Dra. Elena Silva",
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

  const academicYear = await db.academicYear.create({
    data: {
      organizationId: orgId,
      name: `Año Lectivo 2026-2027 ${testSuffix}`,
      startDate: new Date("2026-05-01T00:00:00.000Z"),
      endDate: new Date("2027-02-28T23:59:59.999Z"),
      status: AcademicYearStatus.ACTIVE,
    },
  });

  const period = await db.academicPeriod.create({
    data: {
      organizationId: orgId,
      academicYearId: academicYear.id,
      name: "Primer Quimestre",
      type: AcademicPeriodType.QUIMESTER,
      order: 1,
      startDate: new Date("2026-05-01T00:00:00.000Z"),
      endDate: new Date("2026-09-30T23:59:59.999Z"),
      status: "ACTIVE",
    },
  });

  const courseA = await db.academicCourse.create({
    data: {
      organizationId: orgId,
      name: "10mo EGB Paralelo A",
      level: "Básica Superior",
      classroom: "Aula 101",
      tutorUserId: teacher1.id,
      status: "ACTIVE",
    },
  });

  const courseB = await db.academicCourse.create({
    data: {
      organizationId: orgId,
      name: "10mo EGB Paralelo B",
      level: "Básica Superior",
      classroom: "Aula 102",
      tutorUserId: teacher2.id,
      status: "ACTIVE",
    },
  });

  const student = await db.academicStudent.create({
    data: {
      organizationId: orgId,
      firstName: "Gabriel",
      lastName: "Morales",
      identification: `09${String(testSuffix).slice(-8)}`,
      status: "ACTIVE",
    },
  });

  await db.academicEnrollment.create({
    data: {
      organizationId: orgId,
      studentId: student.id,
      courseId: courseA.id,
      academicYearId: academicYear.id,
      status: "ACTIVE",
    },
  });

  // --------------------------------------------------------------------------
  // ESCENARIO 1: Creación atómica de materia con 3 días de clase
  // --------------------------------------------------------------------------
  await t.test("1. Creación atómica de materia con 3 franjas horarias en días distintos", async () => {
    const created = await AcademicService.createSubject(orgId, courseA.id, {
      name: "Matemáticas 10mo",
      code: "MAT-10A",
      hoursPerWeek: 6,
      teacherUserId: teacher1.id,
      academicYearId: academicYear.id,
      scheduleSlots: [
        { dayOfWeek: 1, startTime: "07:00", endTime: "08:30", pedagogicalHours: 2, room: "Aula 101" }, // Lunes
        { dayOfWeek: 3, startTime: "07:00", endTime: "08:30", pedagogicalHours: 2, room: "Aula 101" }, // Miércoles
        { dayOfWeek: 5, startTime: "07:00", endTime: "08:30", pedagogicalHours: 2, room: "Aula 101" }, // Viernes
      ],
    });

    assert.ok(created.id, "Materia debe tener ID asignado");
    assert.equal(created.name, "Matemáticas 10mo");
    assert.equal(created.scheduleStatus, "complete", "6/6 períodos configurados debe ser 'complete'");
    assert.equal(created.totalPedagogicalHours, 6);
    assert.equal(created.activeSlots?.length, 3, "Debe tener 3 slots activos retornados");

    // Verificar en BD
    const slotsInDb = await db.academicSubjectScheduleSlot.findMany({
      where: { subjectId: created.id, status: "ACTIVE" },
      orderBy: { dayOfWeek: "asc" },
    });
    assert.equal(slotsInDb.length, 3);
    assert.equal(slotsInDb[0].dayOfWeek, 1);
    assert.equal(slotsInDb[1].dayOfWeek, 3);
    assert.equal(slotsInDb[2].dayOfWeek, 5);
  });

  // --------------------------------------------------------------------------
  // ESCENARIO 2: Creación con múltiples bloques en un mismo día
  // --------------------------------------------------------------------------
  await t.test("2. Creación con múltiples bloques en el mismo día (mañana y tarde)", async () => {
    const created = await AcademicService.createSubject(orgId, courseA.id, {
      name: "Física Superior",
      code: "FIS-10A",
      hoursPerWeek: 4,
      teacherUserId: teacher2.id,
      academicYearId: academicYear.id,
      scheduleSlots: [
        { dayOfWeek: 2, startTime: "07:00", endTime: "08:30", pedagogicalHours: 2 }, // Martes mañana
        { dayOfWeek: 2, startTime: "10:30", endTime: "12:00", pedagogicalHours: 2 }, // Martes medio día
      ],
    });

    assert.equal(created.name, "Física Superior");
    assert.equal(created.scheduleStatus, "complete");
    assert.equal(created.totalPedagogicalHours, 4);
    assert.equal(created.activeSlots?.length, 2);
  });

  // --------------------------------------------------------------------------
  // ESCENARIO 3: Validación de estados de carga horaria (incomplete, complete, excess)
  // --------------------------------------------------------------------------
  await t.test("3. Cálculo y validación de estados de carga horaria (incomplete y excess)", async () => {
    // Incompleto (4 requeridas, 2 configuradas)
    const subIncomplete = await AcademicService.createSubject(orgId, courseA.id, {
      name: "Historia",
      code: "HIS-10A",
      hoursPerWeek: 4,
      academicYearId: academicYear.id,
      scheduleSlots: [
        { dayOfWeek: 4, startTime: "07:00", endTime: "08:30", pedagogicalHours: 2 },
      ],
    });
    assert.equal(subIncomplete.scheduleStatus, "incomplete");
    assert.equal(subIncomplete.totalPedagogicalHours, 2);

    // Exceso (2 requeridas, 4 configuradas -> debe rechazar con 400 ACADEMIC_SCHEDULE_EXCEEDS_HOURS)
    await assert.rejects(
      async () => {
        await AcademicService.createSubject(orgId, courseA.id, {
          name: "Educación Física Exceso",
          code: "EDF-EXC",
          hoursPerWeek: 2,
          academicYearId: academicYear.id,
          scheduleSlots: [
            { dayOfWeek: 4, startTime: "09:00", endTime: "10:30", pedagogicalHours: 2 },
            { dayOfWeek: 4, startTime: "11:00", endTime: "12:30", pedagogicalHours: 2 },
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

  // --------------------------------------------------------------------------
  // ESCENARIO 4: Rollback atómico ante conflicto de horario en el curso
  // --------------------------------------------------------------------------
  await t.test("4. Rollback atómico si hay conflicto de horario en el curso (no crea la materia huérfana)", async () => {
    // Intentar crear materia en Course A el Lunes 07:30 a 09:00 (solapa con Matemáticas 07:00-08:30)
    let failed = false;
    try {
      await AcademicService.createSubject(orgId, courseA.id, {
        name: "Química Conflictiva",
        code: "QUI-10A",
        hoursPerWeek: 2,
        academicYearId: academicYear.id,
        scheduleSlots: [
          { dayOfWeek: 1, startTime: "07:30", endTime: "09:00", pedagogicalHours: 2 },
        ],
      });
    } catch (err: any) {
      failed = true;
      assert.equal(err.statusCode, 409);
      assert.equal(err.code, "ACADEMIC_SCHEDULE_COURSE_CONFLICT");
    }

    assert.ok(failed, "Debe rechazar con error 409 por conflicto de curso");

    // Verificar que la materia NO se creó en la BD (rollback atómico)
    const subjectInDb = await db.academicSubject.findFirst({
      where: { organizationId: orgId, name: "Química Conflictiva" },
    });
    assert.equal(subjectInDb, null, "La materia no debe existir en la BD tras el rollback");
  });

  // --------------------------------------------------------------------------
  // ESCENARIO 5: Rollback atómico ante conflicto de docente
  // --------------------------------------------------------------------------
  await t.test("5. Rollback atómico si hay conflicto de horario del docente (en otro curso)", async () => {
    // Teacher 1 ya da clases en Course A el Lunes 07:00-08:30.
    // Intentar asignarlo en Course B el Lunes 07:00-08:30.
    let failed = false;
    try {
      await AcademicService.createSubject(orgId, courseB.id, {
        name: "Matemáticas 10mo B",
        code: "MAT-10B",
        hoursPerWeek: 2,
        teacherUserId: teacher1.id,
        academicYearId: academicYear.id,
        scheduleSlots: [
          { dayOfWeek: 1, startTime: "07:00", endTime: "08:30", pedagogicalHours: 2 },
        ],
      });
    } catch (err: any) {
      failed = true;
      assert.equal(err.statusCode, 409);
      assert.equal(err.code, "ACADEMIC_SCHEDULE_TEACHER_CONFLICT");
    }

    assert.ok(failed, "Debe rechazar con error 409 por conflicto de docente");

    const subjectInDb = await db.academicSubject.findFirst({
      where: { organizationId: orgId, name: "Matemáticas 10mo B" },
    });
    assert.equal(subjectInDb, null, "La materia no debe existir en la BD tras el rollback");
  });

  // --------------------------------------------------------------------------
  // ESCENARIO 6: Recuperación de slots en `getSubjectsByCourse`
  // --------------------------------------------------------------------------
  await t.test("6. getSubjectsByCourse incluye activeSlots y scheduleStatus calculados", async () => {
    const subjects = await AcademicService.getSubjectsByCourse(orgId, courseA.id);
    const math = subjects.find((s: any) => s.name === "Matemáticas 10mo");
    assert.ok(math, "Debe encontrar Matemáticas");
    assert.equal(math.scheduleStatus, "complete");
    assert.equal(math.totalPedagogicalHours, 6);
    assert.equal(math.activeSlots?.length, 3);
  });

  // --------------------------------------------------------------------------
  // ESCENARIO 7: Edición de materia y versionamiento de horario
  // --------------------------------------------------------------------------
  await t.test("7. updateSubject con nuevos horarios versiona slots a SUPERSEDED y activa los nuevos", async () => {
    const math = await db.academicSubject.findFirstOrThrow({
      where: { organizationId: orgId, courseId: courseA.id, name: "Matemáticas 10mo" },
    });

    const updated = await AcademicService.updateSubject(orgId, math.id, {
      name: "Matemáticas Avanzadas",
      hoursPerWeek: 4,
      academicYearId: academicYear.id,
      scheduleSlots: [
        { dayOfWeek: 2, startTime: "08:30", endTime: "10:00", pedagogicalHours: 2 }, // Martes
        { dayOfWeek: 5, startTime: "08:30", endTime: "10:00", pedagogicalHours: 2 }, // Viernes
      ],
    });

    assert.equal(updated.name, "Matemáticas Avanzadas");
    assert.equal(updated.scheduleStatus, "complete");
    assert.equal(updated.totalPedagogicalHours, 4);

    // Verificar que los slots anteriores pasaron a SUPERSEDED
    const supersededSlots = await db.academicSubjectScheduleSlot.findMany({
      where: { subjectId: math.id, status: "SUPERSEDED" },
    });
    assert.equal(supersededSlots.length, 3, "Los 3 slots anteriores deben estar SUPERSEDED");

    // Verificar que los 2 nuevos slots están ACTIVE
    const activeSlots = await db.academicSubjectScheduleSlot.findMany({
      where: { subjectId: math.id, status: "ACTIVE", effectiveTo: null },
    });
    assert.equal(activeSlots.length, 2, "Deben haber 2 nuevos slots ACTIVE");
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
  const unscheduledDayOfWeek = ecuadorTodayDayOfWeek === 1 ? 2 : 1;

  // --------------------------------------------------------------------------
  // ESCENARIO 8: Asistencia en día programado permitida
  // --------------------------------------------------------------------------
  await t.test("8. Registro de asistencia permitido en día con horario programado", async () => {
    const scheduledSubject = await AcademicService.createSubject(orgId, courseA.id, {
      name: "Ciencias de Hoy",
      code: "CN-HOY",
      hoursPerWeek: 2,
      teacherUserId: teacher1.id,
      academicYearId: academicYear.id,
      scheduleSlots: [
        { dayOfWeek: ecuadorTodayDayOfWeek, startTime: "14:00", endTime: "15:30", pedagogicalHours: 2 },
      ],
    });

    const session = await db.academicClassSession.create({
      data: {
        organizationId: orgId,
        courseId: courseA.id,
        subjectId: scheduledSubject.id,
        teacherUserId: teacher1.id,
        sessionDate: localDate,
        startTime: "14:00",
        endTime: "15:30",
        status: "SCHEDULED",
      },
    });

    const result = await AcademicService.saveAttendanceBatch(
      orgId,
      session.id,
      [
        {
          studentId: student.id,
          status: AcademicAttendanceStatus.PRESENT,
          observation: "Presente en hora programada",
        },
      ],
      { userId: teacher1.id, isAcademicAdmin: true }
    );

    assert.equal(result.length, 1, "Debe registrar asistencia exitosamente");
    assert.equal(result[0].status, AcademicAttendanceStatus.PRESENT);
  });

  // --------------------------------------------------------------------------
  // ESCENARIO 9: Asistencia en día no programado rechazada
  // --------------------------------------------------------------------------
  await t.test("9. Registro de asistencia rechazado en día sin clase en el horario (409)", async () => {
    const unscheduledSubject = await AcademicService.createSubject(orgId, courseA.id, {
      name: "Materia de Otro Día",
      code: "OTRO-DIA",
      hoursPerWeek: 2,
      teacherUserId: teacher2.id,
      academicYearId: academicYear.id,
      scheduleSlots: [
        { dayOfWeek: unscheduledDayOfWeek, startTime: "14:00", endTime: "15:30", pedagogicalHours: 2 },
      ],
    });

    const session = await db.academicClassSession.create({
      data: {
        organizationId: orgId,
        courseId: courseA.id,
        subjectId: unscheduledSubject.id,
        teacherUserId: teacher2.id,
        sessionDate: localDate,
        startTime: "14:00",
        endTime: "15:30",
        status: "SCHEDULED",
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
              status: AcademicAttendanceStatus.PRESENT,
            },
          ],
          { userId: teacher2.id, isAcademicAdmin: false }
        );
      },
      (err: any) => {
        assert.equal(err.statusCode, 409);
        assert.equal(err.code, "ACADEMIC_SUBJECT_NOT_SCHEDULED_TODAY");
        return true;
      }
    );
  });

  // --------------------------------------------------------------------------
  // ESCENARIO 10: Invarianza de materias existentes sin horario
  // --------------------------------------------------------------------------
  await t.test("10. Materia creada sin horario permanece como 'no_schedule' (0 períodos) sin romper datos", async () => {
    const createdNoSchedule = await AcademicService.createSubject(orgId, courseA.id, {
      name: "Arte y Cultura Final",
      code: "ART-FINAL",
      hoursPerWeek: 2,
    });

    assert.equal(createdNoSchedule.scheduleStatus, "no_schedule");
    assert.equal(createdNoSchedule.totalPedagogicalHours, 0);
    assert.equal(createdNoSchedule.activeSlots?.length, 0);
  });
});
