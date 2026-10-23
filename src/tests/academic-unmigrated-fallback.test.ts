import assert from "node:assert/strict";
import test from "node:test";
import { db } from "../lib/db";
import { AcademicService } from "../services/academic.service";

test("Fase 11.2.1 - Verificación de Tolerancia a Fallos y Compatibilidad Hacia Atrás", async (t) => {
  const testSuffix = Date.now();

  // 0. Protección Fail-Closed
  const dbInfo = await db.$queryRaw<Array<{ current_database: string; current_schema: string }>>`
    SELECT current_database(), current_schema()
  `;
  const currentDbName = dbInfo[0]?.current_database;
  if (!currentDbName || currentDbName === "profesionales_ecuador" || !currentDbName.includes("test")) {
    throw new Error(
      `FATAL_FAIL_CLOSED_GUARD: Intento de ejecución bloqueado. La base activa es '${currentDbName}'. Las pruebas con escrituras deben ejecutarse exclusivamente sobre 'profesionales_ecuador_test'.`
    );
  }

  // 1. Setup básico
  const org = await db.organization.create({
    data: {
      name: `UAT Fallback Org ${testSuffix}`,
      slug: `uat-fallback-org-${testSuffix}`,
      type: "INSTITUTION",
      status: "ACTIVE",
    },
  });
  const orgId = org.id;

  const course = await db.academicCourse.create({
    data: {
      organizationId: orgId,
      name: `8vo EGB - ${testSuffix}`,
      level: "EGB_SUPERIOR",
      status: "ACTIVE",
    },
  });

  const subject = await db.academicSubject.create({
    data: {
      organizationId: orgId,
      courseId: course.id,
      name: "Historia",
      hoursPerWeek: 3,
      status: "ACTIVE",
    },
  });

  // Test 1: Lectura de materias sin slots retorna exitosamente sin error de tabla inexistente
  await t.test("1. getSubjectsByCourse lee materias y calcula no_schedule sin lanzar excepciones", async () => {
    const subjects = await AcademicService.getSubjectsByCourse(orgId, course.id);
    assert.equal(subjects.length, 1);
    assert.equal(subjects[0].name, "Historia");
    assert.equal(subjects[0].scheduleStatus, "no_schedule");
    assert.equal(subjects[0].totalPedagogicalHours, 0);
  });

  // Test 2: getSubjectSchedule responde adecuadamente
  await t.test("2. getSubjectSchedule retorna estructura no_schedule sin error de esquema", async () => {
    const schedule = await AcademicService.getSubjectSchedule(orgId, subject.id);
    assert.equal(schedule.scheduleStatus, "no_schedule");
    assert.equal(schedule.totalPedagogicalHours, 0);
    assert.equal(schedule.activeSlots.length, 0);
  });

  // Test 3: getCourseSchedule retorna estructura consistente
  await t.test("3. getCourseSchedule retorna slots vacíos sin error de esquema", async () => {
    const courseSchedule = await AcademicService.getCourseSchedule(orgId, course.id);
    assert.equal(courseSchedule.courseId, course.id);
    assert.equal(courseSchedule.slots.length, 0);
  });
});
