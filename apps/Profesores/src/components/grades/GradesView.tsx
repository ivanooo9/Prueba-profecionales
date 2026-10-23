import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  GraduationCap,
  Plus,
  BookOpen,
  Sliders,
  Table,
  Lock,
  AlertCircle,
  Layers,
  Calendar,
  Edit3,
} from 'lucide-react';
import {
  Activity,
  Course,
  Enrollment,
  GradeDraft,
  GradeItem,
  Student,
  Subject,
  AcademicYear,
  AcademicPeriod,
  AcademicEvaluationCategory,
  PeriodGradesMatrixDTO,
  AcademicGradeStatus,
} from '../../types/teacher';
import { GradeFormModal } from '../modals/GradeFormModal';
import { ActivityFormModal } from '../activities/ActivityFormModal';
import { EvaluationSchemeModal } from './EvaluationSchemeModal';
import { GradeMatrixTable } from './GradeMatrixTable';
import { academicApi } from '../../services/api/academicApi';
import { Organization, UserSession } from '../../services/api/organizationApi';

export interface GradesViewProps {
  currentUser?: UserSession | null;
  organization?: Organization | null;
  students: Student[];
  grades: GradeItem[];
  onAddGrade: (grade: Omit<GradeItem, 'id'>) => Promise<void>;
  activities: Activity[];
  courses: Course[];
  subjects: Subject[];
  onAddActivity: (activity: Omit<Activity, 'id'>) => boolean | Promise<boolean>;
  enrollments: Enrollment[];
  onSaveGrades: (drafts: GradeDraft[]) => Promise<void>;
  academicYears?: AcademicYear[];
  onReloadAcademicData?: () => Promise<void>;
}

interface ParcialActivityItem {
  id: string;
  name: string;
  maxScore: number;
  categoryName?: string;
  weightPercentage?: number;
}

/**
 * Sanitiza nombres académicos eliminando identificadores numéricos o timestamps legacy/test.
 * Ejemplo: "Primer Trimestre 1791335026716" -> "Primer Trimestre"
 *          "Curso Evaluación Test 1791335044026" -> "Curso Evaluación"
 */
function cleanAcademicName(name: string): string {
  if (!name) return '';
  return name.replace(/\s*(Test\s*)?\d{6,}\b/gi, '').trim();
}


export const GradesView: React.FC<GradesViewProps> = ({
  currentUser,
  organization,
  students,
  onAddGrade,
  activities,
  courses,
  subjects,
  onAddActivity,
  enrollments,
  onReloadAcademicData,
}) => {
  const orgId = organization?.id || 0;

  // Modo de visualización una vez seleccionado el contexto:
  // 'matrix' (Ingresar notas / Sábana de Notas Ponderada) | 'activities' (Resumen de actividades)
  const [activeMode, setActiveMode] = useState<'matrix' | 'activities'>('matrix');

  // Selectores en Cascada Estricta con Persistencia de Sesión: Curso -> Materia -> Quimestre -> Parcial
  const [selectedCourseId, setSelectedCourseId] = useState<string>(() => {
    return sessionStorage.getItem('profesores_grades_course_id') || '';
  });
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    return sessionStorage.getItem('profesores_grades_subject_id') || '';
  });
  const [selectedQuimesterId, setSelectedQuimesterId] = useState<string>(() => {
    return sessionStorage.getItem('profesores_grades_quimester_id') || '';
  });
  const [selectedParcialId, setSelectedParcialId] = useState<string>(() => {
    return sessionStorage.getItem('profesores_grades_parcial_id') || '';
  });

  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setSelectedSubjectId('');
    setSelectedQuimesterId('');
    setSelectedParcialId('');
    sessionStorage.setItem('profesores_grades_course_id', courseId);
    sessionStorage.removeItem('profesores_grades_subject_id');
    sessionStorage.removeItem('profesores_grades_quimester_id');
    sessionStorage.removeItem('profesores_grades_parcial_id');
  };

  const handleSelectSubject = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setSelectedQuimesterId('');
    setSelectedParcialId('');
    sessionStorage.setItem('profesores_grades_subject_id', subjectId);
    sessionStorage.removeItem('profesores_grades_quimester_id');
    sessionStorage.removeItem('profesores_grades_parcial_id');
  };

  const handleSelectQuimester = (quimesterId: string) => {
    setSelectedQuimesterId(quimesterId);
    setSelectedParcialId('');
    sessionStorage.setItem('profesores_grades_quimester_id', quimesterId);
    sessionStorage.removeItem('profesores_grades_parcial_id');
  };

  const handleSelectParcial = (parcialId: string) => {
    setSelectedParcialId(parcialId);
    sessionStorage.setItem('profesores_grades_parcial_id', parcialId);
  };

  // Periodos cargados desde la BD
  const [availablePeriods, setAvailablePeriods] = useState<AcademicPeriod[]>([]);

  // Datos de la Matriz Ponderada del Backend
  const [matrixData, setMatrixData] = useState<PeriodGradesMatrixDTO | null>(null);
  const [isMatrixLoading, setIsMatrixLoading] = useState(false);
  const [isMatrixSaving, setIsMatrixSaving] = useState(false);
  const [matrixError, setMatrixError] = useState<string | null>(null);

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isSchemeModalOpen, setIsSchemeModalOpen] = useState(false);
  const [showSchemeRequiredModal, setShowSchemeRequiredModal] = useState(false);
  const [showTeacherNoPermissionModal, setShowTeacherNoPermissionModal] = useState(false);

  // 1. Cargar Periodos Académicos de la Organización
  useEffect(() => {
    if (!orgId) return;
    academicApi
      .getAcademicPeriods(orgId)
      .then((periods) => {
        setAvailablePeriods(periods);
      })
      .catch((err) => {
        console.error('[GradesView] Error cargando periodos:', err);
      });
  }, [orgId]);

  // 2. Filtro de Materias dependientes del Curso seleccionado
  const courseSubjects = useMemo(() => {
    if (!selectedCourseId) return [];
    return subjects.filter((s) => s.courseId === selectedCourseId);
  }, [subjects, selectedCourseId]);

  // 3. Filtro de Quimestres / Periodos Principales (padres con parentId = null o tipos QUIMESTER)
  const parentPeriods = useMemo(() => {
    const roots = availablePeriods.filter((p) => !p.parentId);
    const quimesters = roots.filter((p) => p.type === 'QUIMESTER');
    const targetList = quimesters.length > 0 ? quimesters : roots;
    return targetList.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [availablePeriods]);

  // 4. Filtro de Parciales / Periodos Hijos dependientes del Quimestre seleccionado
  const childPeriods = useMemo(() => {
    if (!selectedQuimesterId) return [];
    const qId = Number(selectedQuimesterId);
    return availablePeriods
      .filter((p) => p.parentId === qId || (p.parent && p.parent.id === qId) || (p.type === 'PARTIAL' && p.parentId === qId))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [availablePeriods, selectedQuimesterId]);

  // 5. Entidades seleccionadas activas
  const selectedCourse = useMemo(() => {
    return courses.find((c) => c.id === selectedCourseId) || null;
  }, [courses, selectedCourseId]);

  const selectedSubject = useMemo(() => {
    return courseSubjects.find((s) => s.id === selectedSubjectId) || null;
  }, [courseSubjects, selectedSubjectId]);

  const selectedQuimester = useMemo(() => {
    return parentPeriods.find((p) => String(p.id) === selectedQuimesterId) || null;
  }, [parentPeriods, selectedQuimesterId]);

  const selectedParcial = useMemo(() => {
    return childPeriods.find((p) => String(p.id) === selectedParcialId) || null;
  }, [childPeriods, selectedParcialId]);

  const isContextComplete = Boolean(
    selectedCourse && selectedSubject && selectedQuimester && selectedParcial
  );

  // Control temporal: verificación de parcial futuro
  const isFuturePeriod = useMemo(() => {
    if (!selectedParcial || !selectedParcial.startDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(selectedParcial.startDate);
    return start > today;
  }, [selectedParcial]);

  const isReadOnlyPeriod =
    selectedParcial?.status === 'CLOSED' || selectedParcial?.status === 'ARCHIVED' || isFuturePeriod;

  // 6. Consultar Matriz de Calificaciones Ponderadas al completar el contexto
  const fetchMatrix = useCallback(async () => {
    if (!orgId || !selectedCourseId || !selectedSubjectId || !selectedParcialId) {
      setMatrixData(null);
      return;
    }
    setIsMatrixLoading(true);
    setMatrixError(null);
    try {
      const data = await academicApi.getPeriodGradesMatrix(orgId, {
        courseId: selectedCourseId,
        subjectId: selectedSubjectId,
        academicPeriodId: selectedParcialId,
      });
      setMatrixData(data);
    } catch (err: any) {
      console.error('[GradesView Matrix Error]:', err);
      setMatrixError(err.message || 'Error al cargar la matriz de calificaciones.');
      setMatrixData(null);
    } finally {
      setIsMatrixLoading(false);
    }
  }, [orgId, selectedCourseId, selectedSubjectId, selectedParcialId]);

  useEffect(() => {
    if (isContextComplete) {
      fetchMatrix();
    } else {
      setMatrixData(null);
    }
  }, [isContextComplete, fetchMatrix]);

  // Guardar calificaciones desde la matriz de notas
  const handleSaveMatrixGrades = async (
    changedGrades: {
      studentId: number;
      enrollmentId?: number;
      activityId: number;
      score: number | null;
      status: AcademicGradeStatus;
    }[]
  ) => {
    if (!orgId || changedGrades.length === 0) return;
    setIsMatrixSaving(true);
    try {
      const activityMap = new Map<
        number,
        {
          studentId: number;
          enrollmentId?: number;
          score: number | null;
          status: AcademicGradeStatus;
        }[]
      >();

      for (const g of changedGrades) {
        if (!activityMap.has(g.activityId)) {
          activityMap.set(g.activityId, []);
        }
        activityMap.get(g.activityId)!.push({
          studentId: g.studentId,
          enrollmentId: g.enrollmentId,
          score: g.score,
          status: g.status,
        });
      }

      for (const [activityId, items] of activityMap.entries()) {
        await academicApi.saveGradesBatch(
          orgId,
          activityId,
          items,
          'Actualización de calificaciones por docente'
        );
      }

      // 1. Recargar directamente la matriz de notas activa para actualizar los promedios en pantalla
      await fetchMatrix();

      // 2. Notificar actualización global en segundo plano de manera silenciosa
      if (onReloadAcademicData) {
        onReloadAcademicData().catch((err) =>
          console.error('[Background Academic Reload]:', err)
        );
      }
    } catch (err: any) {
      console.error('[Save Matrix Grades Error]:', err);
      throw err;
    } finally {
      setIsMatrixSaving(false);
    }
  };

  // Actividades pertenecientes a este parcial
  const parcialActivities = useMemo<ParcialActivityItem[]>(() => {
    if (!isContextComplete || !selectedParcialId) return [];

    if (matrixData?.activities && matrixData.activities.length > 0) {
      return matrixData.activities.map((a) => ({
        id: String(a.id),
        name: a.name,
        maxScore: a.maxScore || 10,
        categoryName: a.categoryName,
      }));
    }

    if (matrixData && matrixData.students.length > 0) {
      const actMap = new Map<number, ParcialActivityItem>();
      for (const st of matrixData.students) {
        for (const cat of st.categories) {
          for (const act of cat.activities) {
            if (!actMap.has(act.activityId)) {
              actMap.set(act.activityId, {
                id: String(act.activityId),
                name: act.activityName,
                maxScore: act.maxScore || 10,
                categoryName: cat.categoryName,
                weightPercentage: cat.weightPercentage,
              });
            }
          }
        }
      }
      return Array.from(actMap.values());
    }

    return activities
      .filter(
        (a) =>
          a.courseId === selectedCourseId &&
          a.subjectId === selectedSubjectId &&
          (String(a.academicPeriodId) === selectedParcialId || !a.academicPeriodId)
      )
      .map((a) => ({
        id: a.id,
        name: a.name,
        maxScore: a.maxScore || 10,
      }));
  }, [isContextComplete, selectedParcialId, selectedCourseId, selectedSubjectId, matrixData, activities]);

  // Estudiantes del curso seleccionado
  const courseStudents = useMemo(() => {
    if (!selectedCourseId) return [];
    const enrolledIds = new Set(
      enrollments
        .filter((e) => e.courseId === selectedCourseId && e.status === 'active')
        .map((e) => e.studentId)
    );
    return students.filter((s) => enrolledIds.has(s.id) || s.courseId === selectedCourseId);
  }, [selectedCourseId, enrollments, students]);

  // Categorías disponibles del esquema activo para asociar actividades
  const availableCategories = useMemo<AcademicEvaluationCategory[]>(() => {
    if (matrixData?.scheme?.categories && matrixData.scheme.categories.length > 0) {
      return matrixData.scheme.categories;
    }
    if (matrixData?.categories && matrixData.categories.length > 0) {
      return matrixData.categories
        .filter((c) => c.categoryId > 0)
        .map((c, idx) => ({
          id: c.categoryId,
          evaluationSchemeId: matrixData.scheme?.id || 0,
          name: c.categoryName,
          weightPercentage: c.weightPercentage,
          order: idx + 1,
        }));
    }
    if (matrixData && matrixData.students.length > 0) {
      return matrixData.students[0].categories
        .filter((c) => c.categoryId > 0)
        .map((c, idx) => ({
          id: c.categoryId,
          evaluationSchemeId: matrixData.scheme?.id || 0,
          name: c.categoryName,
          weightPercentage: c.weightPercentage,
          order: idx + 1,
        }));
    }
    return [];
  }, [matrixData]);

  // Verificar si ya existe una Evaluación Parcial creada para este curso, materia y parcial
  const hasExamActivity = useMemo(() => {
    if (matrixData && matrixData.students.length > 0) {
      const examCategory = matrixData.students[0].categories.find((c) =>
        /evalua|examen|parcial/i.test(c.categoryName)
      );
      if (examCategory && examCategory.activities.length > 0) {
        return true;
      }
    }
    return activities
      .filter(
        (a) =>
          a.courseId === selectedCourseId &&
          a.subjectId === selectedSubjectId &&
          (!selectedParcialId || String(a.academicPeriodId) === selectedParcialId || !a.academicPeriodId)
      )
      .some(
        (a) =>
          a.type === 'exam' ||
          /evalua|examen|parcial/i.test(a.name) ||
          (a.categoryId &&
            availableCategories.some(
              (cat) => String(cat.id) === String(a.categoryId) && /evalua|examen|parcial/i.test(cat.name)
            ))
      );
  }, [matrixData, activities, selectedCourseId, selectedSubjectId, selectedParcialId, availableCategories]);

  // Permisos: Administrador Global, Admin/Owner de Organización o Docente Asignado a la Materia
  const isGlobalAdmin = currentUser?.role === 'ADMIN';
  const isOrgAdmin = organization?.role === 'OWNER' || organization?.role === 'ADMIN';
  const isAssignedTeacher = Boolean(
    selectedSubject?.teacherUserId &&
    currentUser?.id &&
    String(selectedSubject.teacherUserId) === String(currentUser.id)
  );
  const canManageScheme = Boolean(isGlobalAdmin || isOrgAdmin || isAssignedTeacher);

  // Apertura controlada de creación de actividades: Exige esquema VALID antes de abrir formulario
  const handleOpenCreateActivity = () => {
    const hasValidScheme =
      Boolean(matrixData?.scheme) &&
      matrixData?.scheme?.status === 'VALID' &&
      availableCategories.length > 0;

    if (!hasValidScheme) {
      if (canManageScheme) {
        setShowSchemeRequiredModal(true);
      } else {
        setShowTeacherNoPermissionModal(true);
      }
      return;
    }

    setIsActivityModalOpen(true);
  };

  // Reasignación transaccional de actividades huérfanas a categorías ponderadas
  const handleReassignActivityCategory = async (activityId: number, targetCategoryId: number) => {
    if (!orgId) return;
    try {
      await academicApi.updateActivity(orgId, activityId, { categoryId: targetCategoryId });
      await fetchMatrix();
      if (onReloadAcademicData) {
        await onReloadAcademicData();
      }
    } catch (err: any) {
      alert(err.message || 'Error al reasignar categoría.');
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. CARD PRINCIPAL: SELECTOR DE CONTEXTO EN CASCADA */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Calificaciones
              </h1>
              <p className="text-xs text-slate-500">
                Seleccione el curso, materia, quimestre y parcial para registrar o consultar notas.
              </p>
            </div>
          </div>

          {/* Configuración secundaria de ponderaciones */}
          {isContextComplete && selectedCourse && selectedSubject && selectedParcial && (
            <button
              onClick={() => setIsSchemeModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition"
              title="Configurar categorías y ponderaciones del esquema de evaluación"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-500" />
              <span>Ponderaciones</span>
            </button>
          )}
        </div>

        {/* Formulario de 4 Selectores en Cascada (Grid 2x2 en Desktop / 1 Columna en Móvil) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          {/* Selector 1: Curso / Paralelo */}
          <div>
            <label htmlFor="select-course" className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>Curso / Paralelo</span>
            </label>
            <select
              id="select-course"
              value={selectedCourseId}
              onChange={(e) => handleSelectCourse(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition cursor-pointer"
            >
              <option value="">Seleccione un curso ▼</option>
              {courses
                .filter((course) => course.status !== 'archived')
                .map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name} {course.level ? `(${course.level})` : ''}
                  </option>
                ))}
            </select>
          </div>

          {/* Selector 2: Materia / Asignatura */}
          <div>
            <label htmlFor="select-subject" className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Materia / Asignatura</span>
            </label>
            <select
              id="select-subject"
              value={selectedSubjectId}
              onChange={(e) => handleSelectSubject(e.target.value)}
              disabled={!selectedCourseId || courseSubjects.length === 0}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
            >
              <option value="">
                {!selectedCourseId
                  ? 'Seleccione primero un curso ▼'
                  : courseSubjects.length === 0
                  ? 'Sin materias autorizadas en este curso'
                  : 'Seleccione una materia ▼'}
              </option>
              {courseSubjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          {/* Selector 3: Quimestre */}
          <div>
            <label htmlFor="select-quimester" className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Quimestre</span>
            </label>
            <select
              id="select-quimester"
              value={selectedQuimesterId}
              onChange={(e) => handleSelectQuimester(e.target.value)}
              disabled={!selectedSubjectId || parentPeriods.length === 0}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
            >
              <option value="">
                {!selectedSubjectId
                  ? 'Seleccione primero una materia ▼'
                  : parentPeriods.length === 0
                  ? 'No hay quimestres y parciales configurados para este año lectivo'
                  : 'Seleccione un quimestre ▼'}
              </option>
              {parentPeriods.map((period) => (
                <option key={period.id} value={period.id}>
                  {cleanAcademicName(period.name)}
                </option>
              ))}
            </select>
          </div>

          {/* Selector 4: Parcial */}
          <div>
            <label htmlFor="select-parcial" className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Parcial</span>
            </label>
            <select
              id="select-parcial"
              value={selectedParcialId}
              onChange={(e) => handleSelectParcial(e.target.value)}
              disabled={!selectedQuimesterId || childPeriods.length === 0}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
            >
              <option value="">
                {!selectedQuimesterId
                  ? 'Seleccione primero un quimestre ▼'
                  : childPeriods.length === 0
                  ? 'Sin parciales configurados en este quimestre'
                  : 'Seleccione un parcial ▼'}
              </option>
              {childPeriods.map((period) => (
                <option key={period.id} value={period.id}>
                  {cleanAcademicName(period.name)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Resumen de Contexto (UNA sola línea discreta con insignia de estado a la derecha) */}
        {isContextComplete && selectedCourse && selectedSubject && selectedQuimester && selectedParcial && (
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="text-slate-700 font-medium">
              <span className="font-bold text-slate-900">{selectedCourse.name}</span>
              <span className="mx-1.5 text-slate-400">·</span>
              <span className="font-bold text-slate-900">{selectedSubject.name}</span>
              <span className="mx-1.5 text-slate-400">·</span>
              <span>{cleanAcademicName(selectedQuimester.name)}</span>
              <span className="mx-1.5 text-slate-400">·</span>
              <span>{cleanAcademicName(selectedParcial.name)}</span>
            </div>

            <div className="flex items-center gap-2">
              {isFuturePeriod && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                  AÚN NO INICIADO
                </span>
              )}
              {!isFuturePeriod && selectedParcial.status === 'ACTIVE' && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ACTIVO
                </span>
              )}
              {selectedParcial.status === 'LOCKED' && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  BLOQUEADO
                </span>
              )}
              {selectedParcial.status === 'CLOSED' && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                  CERRADO
                </span>
              )}
              {selectedParcial.status === 'ARCHIVED' && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
                  ARCHIVADO
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Alerta de Error en Carga */}
      {matrixError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{matrixError}</span>
        </div>
      )}

      {/* 2. ESTADO VACÍO (ANTES DE COMPLETAR LOS 4 SELECTORES) */}
      {!isContextComplete && (
        <div className="py-16 px-6 text-center bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 text-emerald-600 flex items-center justify-center mx-auto">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            Seleccione curso, materia, quimestre y parcial para comenzar.
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            El sistema cargará automáticamente la lista de actividades, las calificaciones de los estudiantes y el cálculo de promedios ponderados.
          </p>
        </div>
      )}

      {/* 3. CONTENIDO PRINCIPAL (SOLO TRAS SELECCIONAR PARCIAL) */}
      {isContextComplete && (
        <div className="space-y-4">
          {/* Alerta si el Parcial no ha iniciado */}
          {isFuturePeriod && (
            <div className="px-3.5 py-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-sky-600 shrink-0" />
              <span>
                <strong>Parcial programado:</strong> Este periodo inicia el{' '}
                {new Date(selectedParcial!.startDate).toLocaleDateString('es-EC', { timeZone: 'UTC' })}. No se pueden crear actividades ni calificar hasta su fecha de inicio.
              </span>
            </div>
          )}

          {/* Alerta Compacta si el Parcial está CLOSED */}
          {selectedParcial?.status === 'CLOSED' && (
            <div className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs flex items-center gap-2 font-medium">
              <Lock className="w-4 h-4 text-slate-500 shrink-0" />
              <span><strong>Parcial cerrado:</strong> Las calificaciones son de solo lectura.</span>
            </div>
          )}

          {/* Advertencia si no existe esquema de evaluación configurado */}
          {!isMatrixLoading && !matrixData?.scheme && (
            <div className="px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <p className="font-bold">Esquema de evaluación no configurado para este periodo.</p>
                  <p className="text-amber-700 text-[11px]">
                    Para clasificar y ponderar notas adecuadamente (tareas, lecciones, examen), configure las ponderaciones antes de calificar.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSchemeModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition shrink-0 shadow-2xs cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Configurar ponderaciones</span>
              </button>
            </div>
          )}

          {/* Advertencia si la materia no tiene docente asignado */}
          {selectedSubject && (!selectedSubject.teacherUserId || selectedSubject.teacherName === 'Sin asignar') && (
            <div className="px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />
              <span>
                <strong>Docente no asignado:</strong> Esta materia no tiene un docente titular registrado. Solo administradores institucionales pueden crear actividades y asentar calificaciones.
              </span>
            </div>
          )}

          {/* Barra de Acciones Principales */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Switcher de Vistas */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveMode('matrix')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeMode === 'matrix'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Ingresar notas</span>
              </button>
              <button
                onClick={() => setActiveMode('activities')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeMode === 'activities'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Ver resumen</span>
              </button>
            </div>

            {/* Acciones Secundarias y Principales */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenCreateActivity}
                disabled={selectedParcial?.status !== 'ACTIVE' || isFuturePeriod}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-2 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
                title={
                  isFuturePeriod
                    ? 'No se pueden crear actividades en un periodo que aún no ha iniciado'
                    : selectedParcial?.status !== 'ACTIVE'
                    ? 'No se pueden crear actividades en un periodo bloqueado o cerrado'
                    : 'Crear nueva actividad en este parcial'
                }
              >
                <Plus className="w-4 h-4" />
                <span>Crear actividad</span>
              </button>
            </div>
          </div>

          {/* MODO 1: SÁBANA DE NOTAS PONDERADA (INGRESAR NOTAS EN LOTE) */}
          {activeMode === 'matrix' && (
            <GradeMatrixTable
              matrixData={matrixData}
              isLoading={isMatrixLoading}
              isSaving={isMatrixSaving}
              onSaveGrades={handleSaveMatrixGrades}
              isReadOnly={isReadOnlyPeriod}
              onReassignCategory={handleReassignActivityCategory}
              canManageScheme={canManageScheme}
            />
          )}

          {/* MODO 2: RESUMEN DE ACTIVIDADES DEL PARCIAL */}
          {activeMode === 'activities' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                    ACTIVIDADES DEL {cleanAcademicName(selectedParcial?.name || '').toUpperCase()}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Evaluaciones y tareas registradas para esta materia en el parcial activo.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500">
                  {parcialActivities.length} {parcialActivities.length === 1 ? 'actividad' : 'actividades'}
                </span>
              </div>

              {parcialActivities.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <p className="text-xs text-slate-500 font-medium">Aún no hay actividades en este parcial.</p>
                  {selectedParcial?.status === 'ACTIVE' && !isFuturePeriod && (
                    <button
                      onClick={() => setIsActivityModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Crear actividad</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {parcialActivities.map((act) => (
                    <div
                      key={act.id}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <h4 className="font-bold text-slate-900 text-xs truncate" title={act.name}>
                            {act.name}
                          </h4>
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-white border border-slate-200 text-slate-700 shrink-0">
                            {act.maxScore} pts
                          </span>
                        </div>
                        {act.categoryName && (
                          <div className="text-[11px] text-indigo-600 font-medium">
                            {act.categoryName} {act.weightPercentage !== undefined ? `(${act.weightPercentage}%)` : ''}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => setActiveMode('matrix')}
                        className="w-full py-1.5 px-3 rounded-lg bg-white border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Ingresar notas</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODALES */}
      {selectedCourse && selectedSubject && (
        <GradeFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          students={courseStudents}
          courses={courses}
          subjects={subjects}
          onAddGrade={onAddGrade}
        />
      )}

      {selectedCourse && selectedSubject && (
        <ActivityFormModal
          isOpen={isActivityModalOpen}
          onClose={() => setIsActivityModalOpen(false)}
          courses={courses}
          subjects={subjects}
          periods={availablePeriods}
          categories={availableCategories}
          initialCourseId={selectedCourseId}
          initialSubjectId={selectedSubjectId}
          initialPeriodId={selectedParcialId}
          courseName={selectedCourse.name}
          subjectName={selectedSubject.name}
          periodName={
            selectedParcial
              ? `${selectedQuimester ? cleanAcademicName(selectedQuimester.name) + ' · ' : ''}${cleanAcademicName(selectedParcial.name)}`
              : undefined
          }
          selectedPeriod={selectedParcial}
          hasExamActivity={hasExamActivity}
          onSave={async (newAct) => {
            const ok = await onAddActivity({
              ...newAct,
              academicPeriodId: selectedParcialId || newAct.academicPeriodId,
              evaluationSchemeId: matrixData?.scheme?.id ? String(matrixData.scheme.id) : newAct.evaluationSchemeId,
            });
            if (ok) {
              await fetchMatrix();
            }
            return ok;
          }}
        />
      )}

      {selectedCourse && selectedSubject && selectedParcial && (
        <EvaluationSchemeModal
          isOpen={isSchemeModalOpen}
          onClose={() => setIsSchemeModalOpen(false)}
          orgId={orgId}
          course={selectedCourse}
          subject={selectedSubject}
          period={selectedParcial}
          onSchemeUpdated={async () => {
            await fetchMatrix();
          }}
        />
      )}

      {/* Modal 1: Ponderaciones requeridas antes de crear actividades (Docente titular o Admin con permisos) */}
      {showSchemeRequiredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div role="dialog" aria-modal="true" className="bg-white rounded-3xl border border-slate-200 shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-700 rounded-2xl">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Ponderaciones requeridas</h3>
                <p className="text-xs text-slate-500">Configure los criterios de evaluación antes de continuar.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed bg-amber-50/70 p-3 rounded-2xl border border-amber-200/80">
              Esta materia aún no tiene un esquema de evaluación válido para este parcial. Es obligatorio configurar primero las ponderaciones (ej. Tareas, Lecciones, Examen) sumando el 100% para poder clasificar las actividades académicas.
            </p>
            <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSchemeRequiredModal(false)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSchemeRequiredModal(false);
                  setIsSchemeModalOpen(true);
                }}
                className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Configurar ponderaciones ahora</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Ponderaciones requeridas sin permisos (Docente ajeno o materia sin docente asignado) */}
      {showTeacherNoPermissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div role="dialog" aria-modal="true" className="bg-white rounded-3xl border border-slate-200 shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 text-rose-700 rounded-2xl">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Configuración restringida</h3>
                <p className="text-xs text-slate-500">Esquema de evaluación pendiente.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed bg-rose-50/70 p-3 rounded-2xl border border-rose-200/80">
              Esta materia no tiene un esquema de ponderaciones configurado para este periodo. Al no figurar como docente titular de la materia, debe solicitar a un administrador institucional que configure las ponderaciones antes de crear actividades.
            </p>
            <div className="pt-2 flex justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowTeacherNoPermissionModal(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradesView;
