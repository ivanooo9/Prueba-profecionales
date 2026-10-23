import express, { Request, Response, NextFunction } from "express";
import { AcademicController } from "../controllers/academic.controller";
import {
  requireOrganization,
  requireOrganizationModule,
} from "../lib/organization.middleware";
import { PROFESSIONAL_MODULE_CODE } from "../constants/professional-module.constants";

const router = express.Router();

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user || res.locals.user;
  if (!user) {
    return res.status(401).json({
      success: false,
      error: "No autenticado. Inicie sesión para continuar.",
    });
  }
  next();
}

function requireAcademicAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user || res.locals.user;
  const isGlobalAdmin = user?.role?.name === "ADMIN";
  const member = (req as any).organizationMember || res.locals.organizationMember;

  if (isGlobalAdmin) {
    return next();
  }

  if (member && (member.role === "OWNER" || member.role === "ADMIN")) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: "Acceso denegado: se requieren permisos administrativos para esta operación.",
  });
}

// Middleware compuesto para el módulo TEACHING (Profesores / Gestión Académica)
const requireTeachingModule = [
  requireAuth,
  requireOrganization,
  requireOrganizationModule(PROFESSIONAL_MODULE_CODE.TEACHING),
];

// -------------------------------------------------------------
// AÑOS LECTIVOS (AcademicYear - FASE 3/4)
// -------------------------------------------------------------

// Registrar nuevo año lectivo (ADMIN/OWNER)
router.post(
  "/api/organizations/:id/academic/years",
  requireTeachingModule,
  requireAcademicAdmin,
  AcademicController.createAcademicYear
);

// Listar años lectivos
router.get(
  "/api/organizations/:id/academic/years",
  requireTeachingModule,
  AcademicController.getAcademicYears
);

// Detalle de un año lectivo
router.get(
  "/api/organizations/:id/academic/years/:yearId",
  requireTeachingModule,
  AcademicController.getAcademicYearById
);

// Actualizar año lectivo (ADMIN/OWNER)
router.put(
  "/api/organizations/:id/academic/years/:yearId",
  requireTeachingModule,
  requireAcademicAdmin,
  AcademicController.updateAcademicYear
);

// Cambiar estado de año lectivo (ADMIN/OWNER)
router.patch(
  "/api/organizations/:id/academic/years/:yearId/status",
  requireTeachingModule,
  requireAcademicAdmin,
  AcademicController.changeAcademicYearStatus
);

// -------------------------------------------------------------
// PERIODOS ACADÉMICOS (AcademicPeriod - FASE 3/4)
// -------------------------------------------------------------

// Registrar nuevo periodo académico (ADMIN/OWNER)
router.post(
  "/api/organizations/:id/academic/periods",
  requireTeachingModule,
  requireAcademicAdmin,
  AcademicController.createAcademicPeriod
);

// Listar periodos académicos
router.get(
  "/api/organizations/:id/academic/periods",
  requireTeachingModule,
  AcademicController.getAcademicPeriods
);

// Detalle de un periodo académico
router.get(
  "/api/organizations/:id/academic/periods/:periodId",
  requireTeachingModule,
  AcademicController.getAcademicPeriodById
);

// Actualizar periodo académico (ADMIN/OWNER)
router.put(
  "/api/organizations/:id/academic/periods/:periodId",
  requireTeachingModule,
  requireAcademicAdmin,
  AcademicController.updateAcademicPeriod
);

// Diagnóstico de preparación de cierre de periodo académico (ADMIN/OWNER)
router.get(
  "/api/organizations/:id/academic/periods/:periodId/closure-readiness",
  requireTeachingModule,
  requireAcademicAdmin,
  AcademicController.getPeriodClosureReadiness
);

// Cambiar estado de periodo académico (ADMIN/OWNER)
router.patch(
  "/api/organizations/:id/academic/periods/:periodId/status",
  requireTeachingModule,
  requireAcademicAdmin,
  AcademicController.changeAcademicPeriodStatus
);

// -------------------------------------------------------------
// ESQUEMAS DE EVALUACIÓN (AcademicEvaluationScheme - FASE 3/4)
// -------------------------------------------------------------

// Registrar nuevo esquema de evaluación
router.post(
  "/api/organizations/:id/academic/evaluation-schemes",
  requireTeachingModule,
  AcademicController.createEvaluationScheme
);

// Listar esquemas de evaluación
router.get(
  "/api/organizations/:id/academic/evaluation-schemes",
  requireTeachingModule,
  AcademicController.getEvaluationSchemes
);

// Detalle de un esquema de evaluación
router.get(
  "/api/organizations/:id/academic/evaluation-schemes/:schemeId",
  requireTeachingModule,
  AcademicController.getEvaluationSchemeById
);

// Actualizar esquema de evaluación
router.put(
  "/api/organizations/:id/academic/evaluation-schemes/:schemeId",
  requireTeachingModule,
  AcademicController.updateEvaluationScheme
);

// Validar esquema de evaluación (100% estricto -> VALID)
router.post(
  "/api/organizations/:id/academic/evaluation-schemes/:schemeId/validate",
  requireTeachingModule,
  AcademicController.validateEvaluationScheme
);

// Bloquear esquema de evaluación (LOCKED)
router.patch(
  "/api/organizations/:id/academic/evaluation-schemes/:schemeId/lock",
  requireTeachingModule,
  AcademicController.lockEvaluationScheme
);

// Cerrar esquema de evaluación (CLOSED)
router.patch(
  "/api/organizations/:id/academic/evaluation-schemes/:schemeId/close",
  requireTeachingModule,
  AcademicController.closeEvaluationScheme
);

// -------------------------------------------------------------
// CATEGORÍAS DE EVALUACIÓN (AcademicEvaluationCategory - FASE 3/4)
// -------------------------------------------------------------

// Crear categoría en un esquema (<= 100% techo)
router.post(
  "/api/organizations/:id/academic/evaluation-schemes/:schemeId/categories",
  requireTeachingModule,
  AcademicController.createEvaluationCategory
);

// Actualizar categoría de evaluación
router.put(
  "/api/organizations/:id/academic/categories/:categoryId",
  requireTeachingModule,
  AcademicController.updateEvaluationCategory
);

// Eliminar categoría de evaluación
router.delete(
  "/api/organizations/:id/academic/categories/:categoryId",
  requireTeachingModule,
  AcademicController.deleteEvaluationCategory
);

// -------------------------------------------------------------
// SÁBANA / MATRIZ DE CALIFICACIONES (Grades Matrix - FASE 3/4)
// -------------------------------------------------------------

// Consultar sábana de calificaciones por periodo y materia
router.get(
  "/api/organizations/:id/academic/grades/matrix",
  requireTeachingModule,
  AcademicController.getPeriodGradesMatrix
);

// -------------------------------------------------------------
// CURSOS (AcademicCourse)
// -------------------------------------------------------------

// Registrar nuevo curso/paralelo
router.post(
  "/api/organizations/:id/academic/courses",
  requireTeachingModule,
  AcademicController.createCourse
);

// Listar cursos de la institución
router.get(
  "/api/organizations/:id/academic/courses",
  requireTeachingModule,
  AcademicController.getCourses
);

// Detalle de un curso específico
router.get(
  "/api/organizations/:id/academic/courses/:courseId",
  requireTeachingModule,
  AcademicController.getCourseById
);

// Actualizar datos de un curso
router.put(
  "/api/organizations/:id/academic/courses/:courseId",
  requireTeachingModule,
  AcademicController.updateCourse
);

// Archivar lógicamente un curso
router.patch(
  "/api/organizations/:id/academic/courses/:courseId/archive",
  requireTeachingModule,
  AcademicController.archiveCourse
);

// Reactivar un curso archivado
router.patch(
  "/api/organizations/:id/academic/courses/:courseId/reactivate",
  requireTeachingModule,
  AcademicController.reactivateCourse
);

// Consultar dependencias de un curso antes de eliminar o archivar
router.get(
  "/api/organizations/:id/academic/courses/:courseId/dependencies",
  requireTeachingModule,
  AcademicController.getCourseDependencies
);

// Eliminar definitivamente un curso (Solo si no tiene dependencias)
router.delete(
  "/api/organizations/:id/academic/courses/:courseId",
  requireTeachingModule,
  AcademicController.deleteCourse
);

// -------------------------------------------------------------
// ASIGNATURAS / MATERIAS (AcademicSubject)
// -------------------------------------------------------------

// Registrar materia en un curso
router.post(
  "/api/organizations/:id/academic/courses/:courseId/subjects",
  requireTeachingModule,
  AcademicController.createSubject
);

// Listar materias de un curso
router.get(
  "/api/organizations/:id/academic/courses/:courseId/subjects",
  requireTeachingModule,
  AcademicController.getSubjectsByCourse
);

// Actualizar datos de una materia
router.put(
  "/api/organizations/:id/academic/subjects/:subjectId",
  requireTeachingModule,
  AcademicController.updateSubject
);

// Inactivar lógicamente una materia (DELETE funcional = 0)
router.patch(
  "/api/organizations/:id/academic/subjects/:subjectId/inactivate",
  requireTeachingModule,
  AcademicController.inactivateSubject
);

// -------------------------------------------------------------
// HORARIOS SEMANALES POR MATERIA (AcademicSubjectScheduleSlot - FASE 11.2)
// -------------------------------------------------------------

// Consultar horario semanal de una materia (con historial opcional)
router.get(
  "/api/organizations/:id/academic/subjects/:subjectId/schedule",
  requireTeachingModule,
  AcademicController.getSubjectSchedule
);

// Guardar o versionar horario semanal de una materia
router.put(
  "/api/organizations/:id/academic/subjects/:subjectId/schedule",
  requireTeachingModule,
  AcademicController.saveSubjectSchedule
);

// Consultar matriz de horario semanal de un curso completo
router.get(
  "/api/organizations/:id/academic/courses/:courseId/schedule",
  requireTeachingModule,
  AcademicController.getCourseSchedule
);

// -------------------------------------------------------------
// ESTUDIANTES (AcademicStudent)
// -------------------------------------------------------------

// Registrar nuevo alumno
router.post(
  "/api/organizations/:id/academic/students",
  requireTeachingModule,
  AcademicController.createStudent
);

// Listar alumnos de la institución
router.get(
  "/api/organizations/:id/academic/students",
  requireTeachingModule,
  AcademicController.getStudents
);

// Detalle de expediente de alumno
router.get(
  "/api/organizations/:id/academic/students/:studentId",
  requireTeachingModule,
  AcademicController.getStudentById
);

// Actualizar ficha de alumno
router.put(
  "/api/organizations/:id/academic/students/:studentId",
  requireTeachingModule,
  AcademicController.updateStudent
);

// Inactivar lógicamente un alumno (DELETE funcional = 0)
router.patch(
  "/api/organizations/:id/academic/students/:studentId/inactivate",
  requireTeachingModule,
  AcademicController.inactivateStudent
);

// -------------------------------------------------------------
// MATRÍCULAS (AcademicEnrollment)
// -------------------------------------------------------------

// Matricular estudiante en un curso
router.post(
  "/api/organizations/:id/academic/enrollments",
  requireTeachingModule,
  AcademicController.enrollStudent
);

// Listar matrículas
router.get(
  "/api/organizations/:id/academic/enrollments",
  requireTeachingModule,
  AcademicController.getEnrollments
);

// Cambiar estado de matrícula (ACTIVE, INACTIVE, WITHDRAWN)
router.patch(
  "/api/organizations/:id/academic/enrollments/:enrollmentId/status",
  requireTeachingModule,
  AcademicController.updateEnrollmentStatus
);

// -------------------------------------------------------------
// SESIONES DE CLASE (AcademicClassSession - FASE 2)
// -------------------------------------------------------------

// Registrar nueva sesión de clase en un curso
router.post(
  "/api/organizations/:id/academic/courses/:courseId/sessions",
  requireTeachingModule,
  AcademicController.createSession
);

// Listar sesiones de clase de un curso
router.get(
  "/api/organizations/:id/academic/courses/:courseId/sessions",
  requireTeachingModule,
  AcademicController.getSessions
);

// Listar todas las sesiones de clase de la institución (con filtros)
router.get(
  "/api/organizations/:id/academic/sessions",
  requireTeachingModule,
  AcademicController.getSessions
);

// Detalle de una sesión de clase específica
router.get(
  "/api/organizations/:id/academic/sessions/:sessionId",
  requireTeachingModule,
  AcademicController.getSessionById
);

// Actualizar datos de una sesión de clase
router.put(
  "/api/organizations/:id/academic/sessions/:sessionId",
  requireTeachingModule,
  AcademicController.updateSession
);

// Actualizar estado de una sesión de clase
router.patch(
  "/api/organizations/:id/academic/sessions/:sessionId/status",
  requireTeachingModule,
  AcademicController.updateSessionStatus
);

// Cancelar lógicamente una sesión de clase (DELETE funcional = 0)
router.patch(
  "/api/organizations/:id/academic/sessions/:sessionId/cancel",
  requireTeachingModule,
  AcademicController.cancelSession
);

// -------------------------------------------------------------
// REGISTRO DE ASISTENCIA (AcademicAttendanceRecord - FASE 2)
// -------------------------------------------------------------

// Registrar o actualizar lote de asistencias para una sesión
router.post(
  "/api/organizations/:id/academic/sessions/:sessionId/attendance",
  requireTeachingModule,
  AcademicController.saveAttendanceBatch
);

// Rectificación administrativa de asistencias cerradas con justificación y auditoría
router.post(
  "/api/organizations/:id/academic/sessions/:sessionId/attendance/rectify",
  requireTeachingModule,
  AcademicController.rectifyAttendanceBatch
);

router.post(
  "/api/organizations/:id/academic/attendance/rectify",
  requireTeachingModule,
  AcademicController.rectifyAttendanceBatch
);

// Consultar lista de asistencia de una sesión específica
router.get(
  "/api/organizations/:id/academic/sessions/:sessionId/attendance",
  requireTeachingModule,
  AcademicController.getAttendanceBySession
);

// Consultar historial general de asistencias (filtros curso, materia, alumno, fecha, estado)
router.get(
  "/api/organizations/:id/academic/attendance/history",
  requireTeachingModule,
  AcademicController.getAttendanceHistory
);

// Corregir individualmente un registro de asistencia
router.patch(
  "/api/organizations/:id/academic/attendance/:attendanceId",
  requireTeachingModule,
  AcademicController.updateAttendanceRecord
);

// -------------------------------------------------------------
// ACTIVIDADES Y EVALUACIONES (AcademicActivity - FASE 3)
// -------------------------------------------------------------

// Registrar nueva actividad / evaluación en un curso
router.post(
  "/api/organizations/:id/academic/courses/:courseId/activities",
  requireTeachingModule,
  AcademicController.createActivity
);

// Listar actividades de un curso
router.get(
  "/api/organizations/:id/academic/courses/:courseId/activities",
  requireTeachingModule,
  AcademicController.getActivities
);

// Listar actividades de toda la institución (con filtros opcionales)
router.get(
  "/api/organizations/:id/academic/activities",
  requireTeachingModule,
  AcademicController.getActivities
);

// Detalle de una actividad específica
router.get(
  "/api/organizations/:id/academic/activities/:activityId",
  requireTeachingModule,
  AcademicController.getActivityById
);

// Actualizar datos de una actividad
router.put(
  "/api/organizations/:id/academic/activities/:activityId",
  requireTeachingModule,
  AcademicController.updateActivity
);

// -------------------------------------------------------------
// CALIFICACIONES Y EVALUACIONES (AcademicGrade - FASE 3)
// -------------------------------------------------------------

// Guardar o actualizar lote de calificaciones para una actividad
router.post(
  "/api/organizations/:id/academic/activities/:activityId/grades",
  requireTeachingModule,
  AcademicController.saveGradesBatch
);

// Consultar calificaciones de una actividad específica
router.get(
  "/api/organizations/:id/academic/activities/:activityId/grades",
  requireTeachingModule,
  AcademicController.getGradesByActivity
);

// Consultar historial general de calificaciones (filtros curso, materia, actividad, alumno)
router.get(
  "/api/organizations/:id/academic/grades/history",
  requireTeachingModule,
  AcademicController.getGradesHistory
);

// Consultar expediente de calificaciones de un estudiante
router.get(
  "/api/organizations/:id/academic/students/:studentId/grades",
  requireTeachingModule,
  AcademicController.getStudentGrades
);

// Corregir individualmente una calificación registrada
router.patch(
  "/api/organizations/:id/academic/grades/:gradeId",
  requireTeachingModule,
  AcademicController.updateGradeRecord
);

// -------------------------------------------------------------
// DASHBOARD ACADÉMICO REAL Y READ MODELS (FASE 4)
// -------------------------------------------------------------

// Consultar métricas e indicadores consolidados del portal docente
router.get(
  "/api/organizations/:id/academic/dashboard",
  requireTeachingModule,
  AcademicController.getDashboard
);

// -------------------------------------------------------------
// REPORTES ACADÉMICOS REALES (FASE 5)
// -------------------------------------------------------------

// Reporte 1: Nómina General de Estudiantes
router.get(
  "/api/organizations/:id/academic/reports/roster",
  requireTeachingModule,
  AcademicController.getRosterReport
);

// Reporte 2: Consolidado de Asistencia
router.get(
  "/api/organizations/:id/academic/reports/attendance",
  requireTeachingModule,
  AcademicController.getAttendanceReport
);

// Reporte 3: Boletín / Sábana de Calificaciones
router.get(
  "/api/organizations/:id/academic/reports/grades",
  requireTeachingModule,
  AcademicController.getGradeReport
);

// Reporte 4: Ficha Individual del Estudiante
router.get(
  "/api/organizations/:id/academic/reports/students/:studentId",
  requireTeachingModule,
  AcademicController.getStudentReport
);

export const academicRouter = router;




