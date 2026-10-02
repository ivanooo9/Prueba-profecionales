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

// Middleware compuesto para el módulo TEACHING (Profesores / Gestión Académica)
const requireTeachingModule = [
  requireAuth,
  requireOrganization,
  requireOrganizationModule(PROFESSIONAL_MODULE_CODE.TEACHING),
];

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

// Archivar lógicamente un curso (DELETE funcional = 0)
router.patch(
  "/api/organizations/:id/academic/courses/:courseId/archive",
  requireTeachingModule,
  AcademicController.archiveCourse
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




