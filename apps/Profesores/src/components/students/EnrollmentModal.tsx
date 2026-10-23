import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Save,
  UserRoundPlus,
  X,
  Calendar,
  Search,
  Check,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Users,
  CheckSquare,
  GraduationCap,
  UserCheck,
} from 'lucide-react';
import { AcademicYear, Course, Enrollment, Student } from '../../types/teacher';
import { matchesStudentQuery } from '../../utils/studentFilter';

export interface EnrollmentResult {
  success?: boolean;
  totalRequested?: number;
  successCount?: number;
  failedCount?: number;
  failedStudentIds?: string[];
  errors?: { studentId: string; identification?: string; name?: string; error: string }[];
}

export interface EnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  courses: Course[];
  enrollments: Enrollment[];
  academicYears?: AcademicYear[];
  onSave: (
    studentIds: string[] | string,
    courseId: string,
    academicYearId?: string | null
  ) => Promise<EnrollmentResult | void>;
}

export const EnrollmentModal: React.FC<EnrollmentModalProps> = ({
  isOpen,
  onClose,
  students,
  courses,
  enrollments,
  academicYears = [],
  onSave,
}) => {
  // Estado local del formulario
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [academicYearId, setAcademicYearId] = useState<string>('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failedDetails, setFailedDetails] = useState<
    { studentId: string; identification?: string; name?: string; error: string }[]
  >([]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Inicialización cuando abre el modal
  useEffect(() => {
    if (isOpen) {
      setSelectedStudentIds([]);
      setSearchQuery('');
      const defaultCourse = courses.find((c) => c.status !== 'archived') || courses[0];
      setCourseId(defaultCourse?.id || '');
      const validYear =
        academicYears.find((y) => y.status === 'ACTIVE') ||
        academicYears.find((y) => y.status === 'PLANNED') ||
        null;
      setAcademicYearId(validYear ? String(validYear.id) : '');
      setError('');
      setSuccessMessage('');
      setFailedDetails([]);
      setIsSubmitting(false);
    }
  }, [isOpen, courses, academicYears]);

  // Filtrado de estudiantes en tiempo real
  const filteredStudents = useMemo(() => {
    if (!students || students.length === 0) return [];
    return students.filter((student) => matchesStudentQuery(student, searchQuery));
  }, [students, searchQuery]);

  // Estudiantes seleccionados como objetos completos
  const selectedStudentsMap = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach((s) => map.set(s.id, s));
    return map;
  }, [students]);

  const selectedStudentsList = useMemo(() => {
    return selectedStudentIds
      .map((id) => selectedStudentsMap.get(id))
      .filter((s): s is Student => Boolean(s));
  }, [selectedStudentIds, selectedStudentsMap]);

  // Análisis de reasignaciones y matrículas ya existentes en el mismo curso para el año lectivo
  const activeEnrollmentsByStudent = useMemo(() => {
    const map = new Map<string, Enrollment>();
    enrollments
      .filter((e) => e.status === 'active' && (!academicYearId || String(e.academicYearId) === String(academicYearId)))
      .forEach((e) => map.set(e.studentId, e));
    return map;
  }, [enrollments, academicYearId]);

  const { sameCourseStudents, reallocatedStudents } = useMemo(() => {
    const sameCourse: Student[] = [];
    const reallocated: { student: Student; fromCourseName: string }[] = [];

    selectedStudentIds.forEach((id) => {
      const student = selectedStudentsMap.get(id);
      if (!student) return;

      const activeEnr = activeEnrollmentsByStudent.get(id);
      if (activeEnr) {
        if (activeEnr.courseId === courseId) {
          sameCourse.push(student);
        } else {
          const fromCourse = courses.find((c) => c.id === activeEnr.courseId);
          reallocated.push({
            student,
            fromCourseName: fromCourse ? fromCourse.name : 'otro curso',
          });
        }
      }
    });

    return { sameCourseStudents: sameCourse, reallocatedStudents: reallocated };
  }, [selectedStudentIds, selectedStudentsMap, activeEnrollmentsByStudent, courseId, courses]);

  if (!isOpen) return null;

  // Manejadores de selección
  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
    );
    setError('');
  };

  const removeStudent = (id: string) => {
    setSelectedStudentIds((prev) => prev.filter((sId) => sId !== id));
    setError('');
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredStudents.map((s) => s.id);
    setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    setError('');
  };

  const handleClearSelection = () => {
    setSelectedStudentIds([]);
    setError('');
    setFailedDetails([]);
  };

  const allFilteredSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedStudentIds.includes(s.id));

  // Envío del formulario masivo
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting || selectedStudentIds.length === 0 || !courseId) return;

    if (!academicYearId) {
      setError('Selecciona un año lectivo para registrar la matrícula.');
      return;
    }

    if (sameCourseStudents.length === selectedStudentIds.length) {
      setError('Todos los estudiantes seleccionados ya cuentan con una matrícula activa en este curso para el año lectivo.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');
    setFailedDetails([]);

    try {
      const result = await onSave(selectedStudentIds, courseId, academicYearId || null);

      if (result && typeof result === 'object' && 'failedCount' in result) {
        const { successCount = 0, failedCount = 0, failedStudentIds = [], errors = [] } = result;

        if (failedCount === 0) {
          setSuccessMessage(
            successCount > 1
              ? `¡Se matricularon ${successCount} estudiantes con éxito!`
              : '¡Estudiante matriculado con éxito!'
          );
          setTimeout(() => {
            onClose();
          }, 700);
        } else {
          // Mantener en la selección únicamente los que fallaron para que el usuario pueda corregirlos
          setSelectedStudentIds(failedStudentIds);
          setFailedDetails(errors);
          setError(
            `Se matricularon ${successCount} estudiantes correctamente, pero ${failedCount} presentaron error.`
          );
        }
      } else {
        // Callback estándar sin retorno detallado
        setSuccessMessage(
          selectedStudentIds.length > 1
            ? `¡Se matricularon ${selectedStudentIds.length} estudiantes con éxito!`
            : '¡Estudiante matriculado con éxito!'
        );
        setTimeout(() => {
          onClose();
        }, 700);
      }
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error ? saveError.message : 'No se pudo procesar la matrícula masiva.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCourses = courses.filter((c) => c.status !== 'archived');
  const availableYears = academicYears.filter(
    (y) => y.status === 'ACTIVE' || y.status === 'PLANNED'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="enrollment-title"
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto flex flex-col max-h-[90vh]"
      >
        {/* Cabecera */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-2xl">
              <UserRoundPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 id="enrollment-title" className="text-base font-bold text-slate-900">
                Matricular Estudiantes
              </h2>
              <p className="text-xs text-slate-500">
                Búsqueda dinámica y asignación masiva a curso y año lectivo.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar formulario"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto flex-1" aria-busy={isSubmitting}>
          {students.length === 0 || courses.length === 0 ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Registra al menos un estudiante y un curso antes de matricular.</span>
            </div>
          ) : null}

          {/* Sección 1: Selector Multi-Select con Buscador */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="student-search-input" className="block font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>Estudiantes a matricular *</span>
              </label>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="font-semibold text-slate-500">
                  {selectedStudentIds.length}{' '}
                  {selectedStudentIds.length === 1 ? 'seleccionado' : 'seleccionados'}
                </span>
                {selectedStudentIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    disabled={isSubmitting}
                    className="text-rose-600 hover:text-rose-700 font-bold hover:underline transition disabled:opacity-50"
                  >
                    Limpiar selección
                  </button>
                )}
              </div>
            </div>

            {/* Chips de Estudiantes Seleccionados */}
            {selectedStudentsList.length > 0 && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl max-h-32 overflow-y-auto space-y-1.5 custom-scrollbar">
                <div className="flex flex-wrap gap-1.5">
                  {selectedStudentsList.map((student) => {
                    const isAlreadyInSame = sameCourseStudents.some((s) => s.id === student.id);
                    return (
                      <span
                        key={student.id}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border transition shadow-2xs ${
                          isAlreadyInSame
                            ? 'bg-amber-50 border-amber-200 text-amber-800'
                            : 'bg-white border-indigo-200 text-indigo-900'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-extrabold flex items-center justify-center shrink-0">
                          {student.firstName[0] || 'E'}
                        </span>
                        <span className="font-bold truncate max-w-[140px]">
                          {student.firstName} {student.lastName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({student.identification || 'Sin ID'})
                        </span>
                        <button
                          type="button"
                          onClick={() => removeStudent(student.id)}
                          disabled={isSubmitting}
                          aria-label={`Quitar a ${student.firstName} ${student.lastName}`}
                          className="p-0.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Buscador Dinámico */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="student-search-input"
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, apellido o cédula..."
                disabled={isSubmitting}
                className="w-full pl-9 pr-24 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 text-[11px] font-semibold transition"
                >
                  Borrar
                </button>
              )}
            </div>

            {/* Botón de acción rápida: Seleccionar todos los resultados */}
            {filteredStudents.length > 0 && (
              <div className="flex items-center justify-between px-1 text-[11px]">
                <span className="text-slate-500">
                  {filteredStudents.length}{' '}
                  {filteredStudents.length === 1 ? 'coincidencia' : 'coincidencias encontradas'}
                </span>
                {!allFilteredSelected ? (
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    disabled={isSubmitting}
                    className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline transition"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Seleccionar todos los resultados ({filteredStudents.length})</span>
                  </button>
                ) : (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Todos los resultados seleccionados
                  </span>
                )}
              </div>
            )}

            {/* Lista interactiva de resultados del Combobox */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                {filteredStudents.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    No se encontraron estudiantes que coincidan con &ldquo;{searchQuery}&rdquo;.
                  </div>
                ) : (
                  filteredStudents.slice(0, 50).map((student) => {
                    const isSelected = selectedStudentIds.includes(student.id);
                    const activeEnr = activeEnrollmentsByStudent.get(student.id);
                    const currentCourse = activeEnr
                      ? courses.find((c) => c.id === activeEnr.courseId)
                      : null;

                    return (
                      <div
                        key={student.id}
                        onClick={() => toggleStudent(student.id)}
                        role="checkbox"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            toggleStudent(student.id);
                          }
                        }}
                        className={`p-2.5 px-3 flex items-center justify-between gap-2 cursor-pointer transition select-none ${
                          isSelected
                            ? 'bg-indigo-50/80 hover:bg-indigo-100/70'
                            : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center transition shrink-0 ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">
                              {student.firstName} {student.lastName}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                              <span>CI: {student.identification || 'Sin identificación'}</span>
                              {currentCourse && (
                                <span className="text-indigo-600 font-sans font-medium">
                                  • Actual: {currentCourse.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full shrink-0">
                            Seleccionado
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              {filteredStudents.length > 50 && (
                <div className="p-1.5 bg-slate-100 text-center text-[11px] text-slate-500 font-medium border-t border-slate-200">
                  Mostrando 50 de {filteredStudents.length} resultados. Especifique su búsqueda para filtrar más.
                </div>
              )}
            </div>
          </div>

          {/* Sección 2: Curso / Paralelo de Destino */}
          <div>
            <label htmlFor="enrollment-course" className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              <span>Curso / Paralelo de Destino *</span>
            </label>
            <select
              id="enrollment-course"
              required
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            >
              {activeCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name} - {course.level}
                </option>
              ))}
            </select>
          </div>

          {/* Sección 3: Año Lectivo */}
          <div>
            <label htmlFor="enrollment-year" className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Año Lectivo *</span>
            </label>
            {availableYears.length === 0 ? (
              <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                No hay años lectivos disponibles para matrícula (Activos o Planificados). Configure o active un año lectivo primero.
              </p>
            ) : (
              <select
                id="enrollment-year"
                required
                value={academicYearId}
                onChange={(event) => setAcademicYearId(event.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              >
                <option value="">Selecciona un año lectivo *</option>
                {availableYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name} ({year.status})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Avisos de Reasignación */}
          {reallocatedStudents.length > 0 && (
            <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-2xl text-indigo-900 text-[11px] leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-indigo-800">
                <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>ℹ️ Reasignación de curso ({reallocatedStudents.length} estudiantes)</span>
              </div>
              <p>
                Los siguientes alumnos ya cuentan con matrícula activa en otro curso para este período y serán reasignados al curso seleccionado:{' '}
                <strong>
                  {reallocatedStudents
                    .slice(0, 3)
                    .map((r) => `${r.student.firstName} ${r.student.lastName} (desde ${r.fromCourseName})`)
                    .join(', ')}
                  {reallocatedStudents.length > 3 ? ` y ${reallocatedStudents.length - 3} más` : ''}
                </strong>.
              </p>
            </div>
          )}

          {/* Aviso si algunos ya están en el mismo curso */}
          {sameCourseStudents.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-[11px] leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Advertencia de duplicidad ({sameCourseStudents.length})</span>
              </div>
              <p>
                {sameCourseStudents
                  .slice(0, 3)
                  .map((s) => `${s.firstName} ${s.lastName}`)
                  .join(', ')}
                {sameCourseStudents.length > 3 ? ` y ${sameCourseStudents.length - 3} más` : ''}{' '}
                ya se encuentran matriculados en este mismo curso para el año lectivo seleccionado.
              </p>
            </div>
          )}

          {/* Feedback de Error y Detalles de Fallo */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold space-y-1.5 animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
              {failedDetails.length > 0 && (
                <div className="mt-2 space-y-1 max-h-24 overflow-y-auto bg-white/70 p-2 rounded-xl border border-rose-200 text-[11px] font-normal">
                  {failedDetails.map((f, idx) => (
                    <div key={idx} className="text-rose-800">
                      • <strong>{f.name || f.identification || f.studentId}:</strong> {f.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Feedback de Éxito */}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Pie de Acciones */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold transition disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={
                isSubmitting ||
                selectedStudentIds.length === 0 ||
                !courseId ||
                !academicYearId ||
                sameCourseStudents.length === selectedStudentIds.length
              }
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {selectedStudentIds.length > 1
                      ? `Matriculando (${selectedStudentIds.length})...`
                      : 'Guardando...'}
                  </span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>
                    {selectedStudentIds.length === 0
                      ? 'Matricular'
                      : selectedStudentIds.length === 1
                      ? 'Matricular (1 estudiante)'
                      : `Matricular (${selectedStudentIds.length} estudiantes)`}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
