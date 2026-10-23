import React, { useState, useEffect } from 'react';
import {
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Loader2,
  X,
} from 'lucide-react';
import {
  PeriodGradesMatrixDTO,
  AcademicGradeStatus,
} from '../../types/teacher';

export interface GradeMatrixTableProps {
  matrixData: PeriodGradesMatrixDTO | null;
  isLoading: boolean;
  isSaving: boolean;
  onSaveGrades: (
    grades: {
      studentId: number;
      enrollmentId?: number;
      activityId: number;
      score: number | null;
      status: AcademicGradeStatus;
    }[]
  ) => Promise<void>;
  isReadOnly?: boolean;
  onReassignCategory?: (activityId: number, categoryId: number) => Promise<void>;
  canManageScheme?: boolean;
}

interface CellEditState {
  score: string;
  status: AcademicGradeStatus;
}

function cleanAcademicName(name: string): string {
  if (!name) return '';
  return name.replace(/\s*(Test\s*)?\d{6,}\b/gi, '').trim();
}

function getCategoryTheme(categoryName: string) {
  const nameLower = categoryName.toLowerCase();
  if (nameLower.includes('tarea') || nameLower.includes('trabajo') || nameLower.includes('deber')) {
    return {
      headerBg: 'bg-blue-50/90 text-blue-950 border-blue-200',
      badgeBg: 'bg-blue-600 text-white',
      subtotalBg: 'bg-blue-50/40',
      subtotalText: 'text-blue-700',
      activityBadge: 'bg-blue-100 text-blue-800 border-blue-200',
      activityLabel: 'ACTIVIDAD',
    };
  }
  if (nameLower.includes('lecci') || nameLower.includes('taller')) {
    return {
      headerBg: 'bg-amber-50/90 text-amber-950 border-amber-200',
      badgeBg: 'bg-amber-600 text-white',
      subtotalBg: 'bg-amber-50/40',
      subtotalText: 'text-amber-700',
      activityBadge: 'bg-amber-100 text-amber-800 border-amber-200',
      activityLabel: 'LECCIÓN',
    };
  }
  if (nameLower.includes('práct') || nameLower.includes('pract') || nameLower.includes('lab')) {
    return {
      headerBg: 'bg-teal-50/90 text-teal-950 border-teal-200',
      badgeBg: 'bg-teal-600 text-white',
      subtotalBg: 'bg-teal-50/40',
      subtotalText: 'text-teal-700',
      activityBadge: 'bg-teal-100 text-teal-800 border-teal-200',
      activityLabel: 'PRÁCTICA',
    };
  }
  if (
    nameLower.includes('evalua') ||
    nameLower.includes('examen') ||
    nameLower.includes('parcial') ||
    nameLower.includes('final')
  ) {
    return {
      headerBg: 'bg-purple-50/90 text-purple-950 border-purple-200',
      badgeBg: 'bg-purple-600 text-white',
      subtotalBg: 'bg-purple-50/40',
      subtotalText: 'text-purple-700',
      activityBadge: 'bg-purple-100 text-purple-800 border-purple-200',
      activityLabel: 'EVALUACIÓN',
    };
  }
  return {
    headerBg: 'bg-slate-100 text-slate-900 border-slate-200',
    badgeBg: 'bg-slate-700 text-white',
    subtotalBg: 'bg-slate-50/50',
    subtotalText: 'text-slate-700',
    activityBadge: 'bg-slate-100 text-slate-700 border-slate-200',
    activityLabel: 'ACTIVIDAD',
  };
}

function formatActivityCompactTitle(name: string): string {
  const clean = cleanAcademicName(name);
  if (clean.length <= 13) return clean;
  if (/^actividad/i.test(clean)) return clean.replace(/^actividad[\s_]*/i, 'Act. ');
  if (/^pr[aá]ctica/i.test(clean)) return clean.replace(/^pr[aá]ctica[\s_]*/i, 'Prac. ');
  if (/^lecci[oó]n/i.test(clean)) return clean.replace(/^lecci[oó]n[\s_]*/i, 'Lec. ');
  if (/^tarea/i.test(clean)) return clean.replace(/^tarea[\s_]*/i, 'Tar. ');
  if (/^evaluaci[oó]n/i.test(clean)) return clean.replace(/^evaluaci[oó]n[\s_]*/i, 'Eval. ');
  if (/^examen/i.test(clean)) return clean.replace(/^examen[\s_]*/i, 'Ex. ');
  return clean.length > 12 ? clean.slice(0, 11) + '…' : clean;
}

function formatCategoryTitle(name: string): string {
  const clean = cleanAcademicName(name);
  const lower = clean.toLowerCase();
  if (lower.includes('lecci')) {
    return 'Lecciones';
  }
  if (lower.includes('tarea') || lower.includes('trabajo')) {
    return 'Tareas y trabajos';
  }
  if (lower.includes('evalua') || lower.includes('examen') || lower.includes('parcial')) {
    return 'Evaluación parcial';
  }
  return clean;
}

function getActivityBadge(
  act: { activityName: string; activityType?: string },
  defaultStyle: ReturnType<typeof getCategoryTheme>
) {
  const typeUpper = (act.activityType || '').toUpperCase();
  const nameLower = act.activityName.toLowerCase();

  if (
    typeUpper === 'EXAM' ||
    nameLower.includes('evaluación final') ||
    nameLower.includes('evaluacion final') ||
    nameLower.includes('examen')
  ) {
    return {
      label: 'EVAL. FINAL',
      className: 'bg-purple-100 text-purple-800 border-purple-200',
    };
  }
  if (typeUpper === 'PRACTICE' || nameLower.includes('práctica') || nameLower.includes('practica')) {
    return {
      label: 'PRÁCTICA',
      className: 'bg-teal-100 text-teal-800 border-teal-200',
    };
  }
  if (typeUpper === 'LESSON' || nameLower.includes('lección') || nameLower.includes('leccion')) {
    return {
      label: 'LECCIÓN',
      className: 'bg-amber-100 text-amber-800 border-amber-200',
    };
  }
  if (typeUpper === 'ACTIVITY' || nameLower.includes('actividad')) {
    return {
      label: 'ACTIVIDAD',
      className: 'bg-blue-100 text-blue-800 border-blue-200',
    };
  }
  return {
    label: defaultStyle.activityLabel,
    className: defaultStyle.activityBadge,
  };
}

export const GradeMatrixTable: React.FC<GradeMatrixTableProps> = ({
  matrixData,
  isLoading,
  isSaving,
  onSaveGrades,
  isReadOnly = false,
  onReassignCategory,
  canManageScheme = false,
}) => {
  // Estado local para edición rápida por celda: key = `${studentId}_${activityId}`
  const [editedCells, setEditedCells] = useState<Record<string, CellEditState>>({});
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Estado para modal de reasignación de categoría para actividades sin categoría
  const [reassignTargetActivity, setReassignTargetActivity] = useState<{
    activityId: number;
    activityName: string;
    maxScore: number;
  } | null>(null);
  const [selectedNewCategoryId, setSelectedNewCategoryId] = useState<string>('');
  const [isReassigning, setIsReassigning] = useState<boolean>(false);

  // Inicializar estado local cuando cambia la matriz
  useEffect(() => {
    if (!matrixData) {
      setEditedCells({});
      setDirtyKeys(new Set());
      return;
    }

    const initialMap: Record<string, CellEditState> = {};
    for (const student of matrixData.students) {
      for (const cat of student.categories) {
        for (const act of cat.activities) {
          const key = `${student.studentId}_${act.activityId}`;
          initialMap[key] = {
            score: act.score !== null && act.score !== undefined ? String(act.score) : '',
            status: act.status || 'PENDING',
          };
        }
      }
    }
    setEditedCells(initialMap);
    setDirtyKeys(new Set());
    setSaveError(null);
  }, [matrixData]);

  if (isLoading) {
    return (
      <div className="py-20 text-center bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
        <p className="text-xs text-slate-500 font-medium">
          Calculando sábana de notas y ponderaciones por periodo...
        </p>
      </div>
    );
  }

  if (!matrixData) {
    return (
      <div className="p-8 text-center bg-white border border-dashed border-slate-200 rounded-2xl text-slate-500 text-xs">
        Selecciona un Curso, Materia y Periodo Académico para ver la sábana de notas.
      </div>
    );
  }

  const { scheme, period, students } = matrixData;
  const maxScale = scheme?.maxScale || 10;
  const minPassing = scheme?.minPassingScore || 7;
  const isGradeReadOnly = period.status === 'CLOSED' || period.status === 'ARCHIVED' || isReadOnly;

  // Extraer lista única de categorías del esquema/backend o del primer alumno
  const categoriesList =
    matrixData.categories && matrixData.categories.length > 0
      ? matrixData.categories
      : students[0]?.categories || [];

  // Manejar cambio de valor en celda
  const handleScoreChange = (
    studentId: number,
    activityId: number,
    value: string
  ) => {
    const key = `${studentId}_${activityId}`;
    const nextStatus: AcademicGradeStatus =
      value.trim() === '' ? 'PENDING' : 'GRADED';

    setEditedCells((prev) => ({
      ...prev,
      [key]: { score: value, status: nextStatus },
    }));

    setDirtyKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    setSaveSuccess(false);
  };

  // Descartar cambios
  const handleDiscardChanges = () => {
    if (!matrixData) return;
    const initialMap: Record<string, CellEditState> = {};
    for (const student of matrixData.students) {
      for (const cat of student.categories) {
        for (const act of cat.activities) {
          const key = `${student.studentId}_${act.activityId}`;
          initialMap[key] = {
            score: act.score !== null && act.score !== undefined ? String(act.score) : '',
            status: act.status || 'PENDING',
          };
        }
      }
    }
    setEditedCells(initialMap);
    setDirtyKeys(new Set());
    setSaveError(null);
    setSaveSuccess(false);
  };

  // Guardar lote de cambios
  const handleSaveAll = async () => {
    if (dirtyKeys.size === 0 || isGradeReadOnly) return;
    setSaveError(null);
    setSaveSuccess(false);

    const payload: {
      studentId: number;
      enrollmentId?: number;
      activityId: number;
      score: number | null;
      status: AcademicGradeStatus;
    }[] = [];

    for (const key of dirtyKeys) {
      const [studentIdStr, activityIdStr] = key.split('_');
      const studentId = Number(studentIdStr);
      const activityId = Number(activityIdStr);
      const editState = editedCells[key];
      const studentObj = students.find((s) => s.studentId === studentId);

      const parsedScore =
        editState.score.trim() !== '' ? Number(editState.score) : null;

      if (parsedScore !== null && (isNaN(parsedScore) || parsedScore < 0)) {
        setSaveError(`Calificación inválida para estudiante ID #${studentId}`);
        return;
      }

      payload.push({
        studentId,
        enrollmentId: studentObj?.enrollmentId,
        activityId,
        score: parsedScore,
        status: editState.status,
      });
    }

    try {
      await onSaveGrades(payload);
      setDirtyKeys(new Set());
      setSaveSuccess(true);
    } catch (err: any) {
      setSaveError(err.message || 'Error al guardar calificaciones.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de Control y Acciones de la Matriz */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900">
              {matrixData.course.name} · {matrixData.subject.name}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              {cleanAcademicName(matrixData.period.name)}
            </span>
          </div>

          {scheme && (
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${
                scheme.status === 'VALID'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              Esquema: {scheme.status}
            </span>
          )}

          {period.status === 'LOCKED' && !isGradeReadOnly && (
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Bloqueado · Calificación activa
            </span>
          )}

          {isGradeReadOnly && (
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Solo lectura
            </span>
          )}

          {matrixData.isProvisional && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
              Promedio provisional (sujeto a cierre)
            </span>
          )}
        </div>

        {/* Botones de Guardar / Descartar */}
        {!isGradeReadOnly && (
          <div className="flex items-center gap-2">
            {dirtyKeys.size > 0 && (
              <button
                type="button"
                onClick={handleDiscardChanges}
                disabled={isSaving}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Descartar ({dirtyKeys.size})</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving || dirtyKeys.size === 0}
              className={`px-4 py-2 rounded-xl text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer ${
                dirtyKeys.size > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-500/20'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>
                {dirtyKeys.size > 0
                  ? `Guardar cambios (${dirtyKeys.size})`
                  : 'Sin cambios'}
              </span>
            </button>
          </div>
        )}
      </div>

      {saveError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{saveError}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>¡Calificaciones guardadas exitosamente y promedios recalculados!</span>
        </div>
      )}

      {/* Matriz Completa con Scroll Horizontal y Columnas Congeladas (Sticky) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto relative">
          <table className="w-full text-left text-xs text-slate-700 border-collapse min-w-[850px]">
            {/* Header Nivel 1: Bloques Temáticos de Categorías */}
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700">
                {/* 1. Columna Congelada Izquierda: Estudiante */}
                <th
                  rowSpan={2}
                  className="py-3 px-4 sticky left-0 bg-slate-50 z-30 border-r border-slate-200 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.06)] min-w-[200px] max-w-[240px] text-slate-800 font-extrabold text-xs"
                >
                  Estudiante
                </th>

                {/* 2. Bloques por Categoría Ponderada */}
                {categoriesList.map((cat) => {
                  const theme = getCategoryTheme(cat.categoryName);
                  const actCount = cat.activities.length;
                  const colSpan = actCount > 0 ? actCount + 1 : 2;

                  return (
                    <th
                      key={cat.categoryId}
                      colSpan={colSpan}
                      className={`py-2 px-3 text-center border-r border-slate-200 ${theme.headerBg}`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-extrabold text-xs tracking-tight">
                          {formatCategoryTitle(cat.categoryName)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${theme.badgeBg}`}>
                          {cat.weightPercentage}%
                        </span>
                      </div>
                    </th>
                  );
                })}

                {/* 3. Columna Congelada Derecha: Nota acumulada / Consolidado */}
                <th
                  rowSpan={2}
                  className="py-3 px-3 text-center sticky right-0 bg-slate-50 z-30 border-l border-slate-200 shadow-[-4px_0_10px_-2px_rgba(0,0,0,0.06)] min-w-[120px]"
                >
                  <div className="font-extrabold text-slate-900 text-xs">
                    Nota acumulada
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono font-normal mt-0.5">
                    {matrixData.isProvisional ? 'Provisional' : 'Definitiva'}
                  </div>
                </th>
              </tr>

              {/* Header Nivel 2: Actividades Específicas y Subtotales */}
              <tr className="border-b border-slate-200 bg-white text-[10px] font-bold text-slate-600">
                {categoriesList.map((cat) => {
                  const theme = getCategoryTheme(cat.categoryName);

                  if (cat.activities.length === 0) {
                    return (
                      <React.Fragment key={`sub-${cat.categoryId}`}>
                        <th className="py-2 px-2 text-center text-slate-400 font-normal italic border-r border-slate-100 min-w-[95px]">
                          Sin actividades
                        </th>
                        <th className={`py-2 px-2 text-center border-r border-slate-200 min-w-[90px] font-mono ${theme.subtotalBg} text-slate-700 font-bold`}>
                          Subtotal
                        </th>
                      </React.Fragment>
                    );
                  }

                  return (
                    <React.Fragment key={`sub-${cat.categoryId}`}>
                      {cat.activities.map((act) => {
                        const badge = getActivityBadge(act, theme);
                        const compactTitle = formatActivityCompactTitle(act.activityName);

                        return (
                          <th
                            key={act.activityId}
                            className="py-2.5 px-2 text-center border-r border-slate-100 min-w-[85px] sm:min-w-[95px]"
                            title={cleanAcademicName(act.activityName)}
                          >
                            <div className="mb-1">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase border ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                            </div>
                            <div className="font-bold text-slate-900 text-xs truncate max-w-[110px] mx-auto">
                              {compactTitle}
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono font-normal mt-0.5">
                              Max: {act.maxScore} pts
                            </div>
                            {cat.categoryId === 0 && onReassignCategory && !isGradeReadOnly && canManageScheme && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReassignTargetActivity({
                                    activityId: act.activityId,
                                    activityName: act.activityName,
                                    maxScore: act.maxScore,
                                  });
                                  const firstValid = categoriesList.find((c) => c.categoryId > 0);
                                  setSelectedNewCategoryId(firstValid ? String(firstValid.categoryId) : '');
                                }}
                                className="mt-1 text-[9px] text-indigo-600 hover:text-indigo-800 underline font-semibold cursor-pointer block mx-auto"
                                title="Asignar esta actividad a una categoría ponderada"
                              >
                                Asignar categoría
                              </button>
                            )}
                          </th>
                        );
                      })}

                      {/* Columna de Subtotal para el Bloque */}
                      <th
                        className={`py-2 px-2 text-center border-r border-slate-200 min-w-[90px] font-mono text-xs font-bold text-slate-800 ${theme.subtotalBg}`}
                      >
                        Subtotal
                      </th>
                    </React.Fragment>
                  );
                })}
              </tr>
            </thead>

            {/* Filas de Estudiantes */}
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      1 +
                      categoriesList.reduce(
                        (sum, c) => sum + Math.max(c.activities.length, 1) + 1,
                        0
                      ) +
                      1
                    }
                    className="py-14 px-4 text-center text-slate-500 bg-white"
                  >
                    <div className="max-w-md mx-auto space-y-2">
                      <p className="font-bold text-slate-800 text-xs sm:text-sm">
                        Actividades configuradas para este parcial. Aún no hay estudiantes matriculados para calificar.
                      </p>
                      <p className="text-[11px] text-slate-400 font-normal leading-relaxed">
                        Las columnas superiores muestran las actividades académicas registradas. Una vez matriculados los estudiantes en el curso, sus casilleros se habilitarán automáticamente para ingresar notas.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  return (
                    <tr
                      key={student.studentId}
                      className="group hover:bg-slate-50/70 transition-colors"
                    >
                      {/* 1. Columna Congelada Izquierda: Estudiante */}
                      <td className="py-2.5 px-4 sticky left-0 bg-white group-hover:bg-slate-50 z-20 border-r border-slate-200 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.06)]">
                        <div
                          className="font-bold text-slate-900 text-xs truncate max-w-[210px]"
                          title={student.fullName}
                        >
                          {student.fullName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {student.identification || 'Sin cédula'}
                        </div>
                      </td>

                      {/* 2. Columnas por Categoría y Actividad */}
                      {student.categories.map((cat) => {
                        const theme = getCategoryTheme(cat.categoryName);

                        if (cat.activities.length === 0) {
                          return (
                            <React.Fragment key={`${student.studentId}_${cat.categoryId}`}>
                              <td className="py-2 px-2 text-center text-slate-300 text-xs border-r border-slate-100 min-w-[95px]">
                                —
                              </td>
                              <td className={`py-2.5 px-2 text-center border-r border-slate-200 font-mono min-w-[90px] ${theme.subtotalBg}`}>
                                <span className="text-slate-300 font-bold">—</span>
                              </td>
                            </React.Fragment>
                          );
                        }

                        return (
                          <React.Fragment key={`${student.studentId}_${cat.categoryId}`}>
                            {cat.activities.map((act) => {
                              const key = `${student.studentId}_${act.activityId}`;
                              const editState = editedCells[key] || {
                                score:
                                  act.score !== null && act.score !== undefined
                                    ? String(act.score)
                                    : '',
                                status: act.status || 'PENDING',
                              };
                              const isDirty = dirtyKeys.has(key);
                              const numVal = editState.score.trim() !== '' ? Number(editState.score) : null;
                              const hasScore = numVal !== null && !isNaN(numVal);
                              const isPassingScore = hasScore && numVal >= minPassing;

                              return (
                                <td
                                  key={act.activityId}
                                  className={`py-2 px-2 text-center border-r border-slate-100 min-w-[85px] sm:min-w-[95px] ${
                                    isDirty ? 'bg-amber-50/50' : ''
                                  }`}
                                >
                                  {isGradeReadOnly ? (
                                    <div className="font-mono font-bold text-xs py-1">
                                      {act.score !== null && act.score !== undefined ? (
                                        <span
                                          className={
                                            act.score >= minPassing
                                              ? 'text-slate-800'
                                              : 'text-rose-600'
                                          }
                                        >
                                          {act.score.toFixed(1)}
                                        </span>
                                      ) : (
                                        <span className="text-slate-300 font-medium">—</span>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center">
                                      <input
                                        type="number"
                                        min="0"
                                        max={act.maxScore}
                                        step="0.1"
                                        disabled={isSaving}
                                        value={editState.score}
                                        onChange={(e) =>
                                          handleScoreChange(
                                            student.studentId,
                                            act.activityId,
                                            e.target.value
                                          )
                                        }
                                        placeholder="—"
                                        className={`w-16 px-2 py-1.5 text-center font-mono font-bold text-xs rounded-xl border transition focus:outline-hidden focus:ring-2 focus:bg-white ${
                                          isDirty
                                            ? 'border-amber-400 bg-amber-50 text-amber-950 ring-2 ring-amber-400/30'
                                            : isPassingScore
                                            ? 'border-slate-200/90 bg-slate-50/80 text-slate-800 hover:bg-white focus:ring-emerald-500/20 focus:border-emerald-500'
                                            : hasScore
                                            ? 'border-rose-200 bg-rose-50/80 text-rose-700 hover:bg-rose-50 focus:ring-rose-500/20 focus:border-rose-500'
                                            : 'border-slate-200/80 bg-slate-50/60 text-slate-400 hover:bg-slate-50 focus:ring-emerald-500/20 focus:border-emerald-500'
                                        }`}
                                      />
                                    </div>
                                  )}
                                </td>
                              );
                            })}

                            {/* Subtotal de Categoría Diferenciado */}
                            <td
                              className={`py-2.5 px-2 text-center border-r border-slate-200 font-mono min-w-[90px] ${theme.subtotalBg}`}
                            >
                              {cat.isEvaluated && cat.categoryAverage !== null ? (
                                <div className="flex flex-col items-center justify-center leading-tight">
                                  <span className="font-bold text-slate-800 text-xs">
                                    {cat.categoryAverage.toFixed(1)}{' '}
                                    <span className="text-[10px] text-slate-400 font-normal">
                                      /{maxScale}
                                    </span>
                                  </span>
                                  <span className="text-[10px] font-semibold text-emerald-600 mt-0.5">
                                    (+{cat.weightedContribution.toFixed(1)} pts)
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-300 font-bold">—</span>
                              )}
                            </td>
                          </React.Fragment>
                        );
                      })}

                      {/* 3. Columna Congelada Derecha: Nota Acumulada */}
                      <td className="py-2.5 px-3 text-center sticky right-0 bg-white group-hover:bg-slate-50 z-20 border-l border-slate-200 shadow-[-4px_0_10px_-2px_rgba(0,0,0,0.06)] font-mono">
                        {student.evaluatedWeightPercentage === 0 ? (
                          <span className="text-slate-300 font-bold text-xs">—</span>
                        ) : (
                          <div className="flex flex-col items-center justify-center leading-tight">
                            <div className="font-black text-xs text-slate-900">
                              {student.definitiveGrade.toFixed(1)}
                              <span className="text-[10px] text-slate-400 font-normal ml-0.5">
                                /{maxScale}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-700 mt-0.5">
                              (+{student.definitiveGrade.toFixed(1)} pts)
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal interactivo para reasignar actividad sin categoría a una categoría ponderada */}
      {reassignTargetActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white rounded-3xl border border-slate-200 shadow-xl w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Asignar Categoría a Actividad</h3>
              <button
                type="button"
                onClick={() => setReassignTargetActivity(null)}
                disabled={isReassigning}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">Actividad seleccionada:</p>
              <div className="text-xs font-bold text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <span>{cleanAcademicName(reassignTargetActivity.activityName)}</span>
                <span className="text-[10px] text-slate-500 font-mono">Max: {reassignTargetActivity.maxScore} pts</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Seleccione la categoría de destino *:
              </label>
              {categoriesList.filter((c) => c.categoryId > 0).length === 0 ? (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl font-medium">
                  No hay categorías ponderadas configuradas en este esquema. Debe configurar primero las ponderaciones de la materia.
                </p>
              ) : (
                <select
                  value={selectedNewCategoryId}
                  onChange={(e) => setSelectedNewCategoryId(e.target.value)}
                  disabled={isReassigning}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition cursor-pointer"
                >
                  <option value="" disabled>Seleccione categoría ponderada ▼</option>
                  {categoriesList
                    .filter((c) => c.categoryId > 0)
                    .map((c) => (
                      <option key={c.categoryId} value={String(c.categoryId)}>
                        {c.categoryName} ({c.weightPercentage}%)
                      </option>
                    ))}
                </select>
              )}
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
              ℹ️ Al asignar la categoría, las calificaciones registradas de todos los estudiantes se conservarán intactas y se incorporarán automáticamente al cálculo ponderado del parcial.
            </p>

            <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReassignTargetActivity(null)}
                disabled={isReassigning}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!selectedNewCategoryId || isReassigning || categoriesList.filter((c) => c.categoryId > 0).length === 0}
                onClick={async () => {
                  if (!selectedNewCategoryId || !onReassignCategory) return;
                  setIsReassigning(true);
                  try {
                    await onReassignCategory(reassignTargetActivity.activityId, Number(selectedNewCategoryId));
                    setReassignTargetActivity(null);
                  } finally {
                    setIsReassigning(false);
                  }
                }}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 transition cursor-pointer"
              >
                {isReassigning ? 'Asignando...' : 'Asignar categoría'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


