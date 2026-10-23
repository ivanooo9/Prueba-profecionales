import React, { useState, useEffect } from 'react';
import { Archive, AlertTriangle, Trash2, X, RefreshCw } from 'lucide-react';
import { Course, CourseDependenciesDTO } from '../../types/teacher';
import { academicApi } from '../../services/api/academicApi';

// ============================================================================
// MODAL: ARCHIVAR CURSO
// ============================================================================
export interface ArchiveCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
  onConfirm: (courseId: string) => Promise<void>;
}

export const ArchiveCourseModal: React.FC<ArchiveCourseModalProps> = ({
  isOpen,
  onClose,
  course,
  onConfirm,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen || !course) return null;

  const handleArchive = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(course.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al archivar el curso.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div role="dialog" aria-modal="true" aria-labelledby="archive-title" className="bg-white rounded-3xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 bg-amber-50/70 border-b border-amber-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-2xl">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h2 id="archive-title" className="text-base font-extrabold text-slate-900">
                ¿Archivar este curso?
              </h2>
              <p className="text-xs text-slate-500 font-medium">{course.name} · {course.level}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            El curso dejará de estar disponible para nuevas operaciones académicas. Su historial se conservará íntegramente y podrá consultarse o reactivarse posteriormente.
          </p>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-slate-700 font-medium">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500">Estudiantes asignados:</span>
              <span className="font-bold text-slate-900">{course.studentCount}</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500">Materias vinculadas:</span>
              <span className="font-bold text-slate-900">{course.subjectsCount}</span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-semibold text-xs">
              {error}
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleArchive}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-2 transition disabled:opacity-50 shadow-xs cursor-pointer"
            >
              <Archive className="w-4 h-4" />
              {isSubmitting ? 'Archivando...' : 'Archivar curso'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MODAL: REACTIVAR CURSO
// ============================================================================
export interface ReactivateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
  onConfirm: (courseId: string) => Promise<void>;
}

export const ReactivateCourseModal: React.FC<ReactivateCourseModalProps> = ({
  isOpen,
  onClose,
  course,
  onConfirm,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen || !course) return null;

  const handleReactivate = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(course.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al reactivar el curso.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div role="dialog" aria-modal="true" aria-labelledby="reactivate-title" className="bg-white rounded-3xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 bg-emerald-50/70 border-b border-emerald-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 id="reactivate-title" className="text-base font-extrabold text-slate-900">
                ¿Reactivar este curso?
              </h2>
              <p className="text-xs text-slate-500 font-medium">{course.name} · {course.level}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            El curso volverá a estar habilitado para las actividades académicas activas, calificaciones y asistencias.
          </p>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-semibold text-xs">
              {error}
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleReactivate}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 transition disabled:opacity-50 shadow-xs cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              {isSubmitting ? 'Reactivando...' : 'Reactivar curso'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MODAL: ELIMINAR DEFINITIVAMENTE (CON AUDITORÍA DE DEPENDENCIAS)
// ============================================================================
export interface DeleteCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
  orgId: number;
  onConfirm: (courseId: string) => Promise<void>;
  onSwitchToArchive?: (course: Course) => void;
}

export const DeleteCourseModal: React.FC<DeleteCourseModalProps> = ({
  isOpen,
  onClose,
  course,
  orgId,
  onConfirm,
  onSwitchToArchive,
}) => {
  const [isLoadingDeps, setIsLoadingDeps] = useState(false);
  const [dependenciesData, setDependenciesData] = useState<CourseDependenciesDTO | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && course) {
      setError(null);
      setIsSubmitting(false);
      setIsLoadingDeps(true);
      academicApi
        .getCourseDependencies(orgId, course.id)
        .then((data) => {
          setDependenciesData(data);
        })
        .catch((err: any) => {
          setError(err.message || 'Error al comprobar dependencias del curso.');
        })
        .finally(() => {
          setIsLoadingDeps(false);
        });
    } else {
      setDependenciesData(null);
    }
  }, [isOpen, course, orgId]);

  if (!isOpen || !course) return null;

  const canDelete = dependenciesData?.canDelete === true;

  const handleDelete = async () => {
    if (!canDelete) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(course.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el curso.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div role="dialog" aria-modal="true" aria-labelledby="delete-title" className="bg-white rounded-3xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabecera */}
        <div className="px-6 py-5 bg-rose-50/80 border-b border-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-100 text-rose-700 rounded-2xl">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="delete-title" className="text-base font-extrabold text-slate-900">
                ¿Eliminar definitivamente este curso?
              </h2>
              <p className="text-xs text-rose-700 font-semibold">
                El curso se eliminará permanentemente. Esta acción no se puede deshacer.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-4 text-xs">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Curso seleccionado</span>
            <span className="text-base font-extrabold text-slate-900">{course.name}</span>
            <span className="text-slate-500 block">{course.level} · {course.classroom || 'Sin aula asignada'}</span>
          </div>

          {/* Verificación de dependencias */}
          {isLoadingDeps ? (
            <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin text-indigo-600 mx-auto" />
              <p className="text-slate-500 font-medium">Verificando dependencias académicas en la base de datos...</p>
            </div>
          ) : dependenciesData ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className={`p-2.5 rounded-xl border text-center ${dependenciesData.dependencies.enrollments > 0 ? 'bg-amber-50/60 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                  <span className="text-[10px] font-bold uppercase block">Matrículas</span>
                  <span className="text-sm font-extrabold font-mono">{dependenciesData.dependencies.enrollments}</span>
                </div>
                <div className={`p-2.5 rounded-xl border text-center ${dependenciesData.dependencies.subjects > 0 ? 'bg-amber-50/60 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                  <span className="text-[10px] font-bold uppercase block">Materias</span>
                  <span className="text-sm font-extrabold font-mono">{dependenciesData.dependencies.subjects}</span>
                </div>
                <div className={`p-2.5 rounded-xl border text-center ${dependenciesData.dependencies.activities > 0 ? 'bg-amber-50/60 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                  <span className="text-[10px] font-bold uppercase block">Actividades</span>
                  <span className="text-sm font-extrabold font-mono">{dependenciesData.dependencies.activities}</span>
                </div>
                <div className={`p-2.5 rounded-xl border text-center ${dependenciesData.dependencies.grades > 0 ? 'bg-amber-50/60 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                  <span className="text-[10px] font-bold uppercase block">Notas</span>
                  <span className="text-sm font-extrabold font-mono">{dependenciesData.dependencies.grades}</span>
                </div>
                <div className={`p-2.5 rounded-xl border text-center ${dependenciesData.dependencies.classSessions > 0 ? 'bg-amber-50/60 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                  <span className="text-[10px] font-bold uppercase block">Sesiones</span>
                  <span className="text-sm font-extrabold font-mono">{dependenciesData.dependencies.classSessions}</span>
                </div>
                <div className={`p-2.5 rounded-xl border text-center ${dependenciesData.dependencies.evaluationSchemes > 0 ? 'bg-amber-50/60 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                  <span className="text-[10px] font-bold uppercase block">Esquemas</span>
                  <span className="text-sm font-extrabold font-mono">{dependenciesData.dependencies.evaluationSchemes}</span>
                </div>
              </div>

              {!canDelete ? (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Eliminación bloqueada por dependencias</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {dependenciesData.reason || 'Este curso contiene registros académicos vinculados que deben conservarse para auditoría.'}
                  </p>
                  {onSwitchToArchive && course.status !== 'archived' && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSwitchToArchive(course);
                      }}
                      className="mt-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      Archivar este curso en su lugar
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="font-semibold">El curso no posee dependencias registradas y puede eliminarse de forma segura.</span>
                </div>
              )}
            </div>
          ) : null}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-semibold text-xs">
              {error}
            </div>
          )}

          {/* Acciones */}
          <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold transition disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting || !canDelete || isLoadingDeps}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              {isSubmitting ? 'Eliminando...' : 'Eliminar definitivamente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
