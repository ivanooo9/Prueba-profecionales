import React, { useState, useEffect, useCallback } from 'react';
import {
  Sliders,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import {
  AcademicEvaluationScheme,
  AcademicEvaluationCategory,
  AcademicPeriod,
  Course,
  Subject,
} from '../../types/teacher';
import { academicApi } from '../../services/api/academicApi';

export interface EvaluationSchemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: number;
  course: Course;
  subject: Subject;
  period: AcademicPeriod;
  onSchemeUpdated?: () => void;
}

export const EvaluationSchemeModal: React.FC<EvaluationSchemeModalProps> = ({
  isOpen,
  onClose,
  orgId,
  course,
  subject,
  period,
  onSchemeUpdated,
}) => {
  const [scheme, setScheme] = useState<AcademicEvaluationScheme | null>(null);
  const [categories, setCategories] = useState<AcademicEvaluationCategory[]>([]);
  const [maxScale, setMaxScale] = useState<number>(10);
  const [minPassingScore, setMinPassingScore] = useState<number>(7);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Nueva categoría
  const [newCatName, setNewCatName] = useState('');
  const [newCatWeight, setNewCatWeight] = useState<string>('');

  const loadScheme = useCallback(async () => {
    if (!isOpen || !orgId || !course?.id || !subject?.id || !period?.id) return;
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const schemes = await academicApi.getEvaluationSchemes(orgId, {
        courseId: course.id,
        subjectId: subject.id,
        academicPeriodId: period.id,
      });

      if (schemes.length > 0) {
        const activeScheme = schemes[0];
        setScheme(activeScheme);
        setCategories(activeScheme.categories || []);
        setMaxScale(activeScheme.maxScale || 10);
        setMinPassingScore(activeScheme.minPassingScore || 7);
      } else {
        setScheme(null);
        setCategories([]);
        setMaxScale(10);
        setMinPassingScore(7);
      }
    } catch (err: any) {
      console.error('[EvaluationSchemeModal Error]:', err);
      setErrorMsg(err.message || 'Error al cargar esquema de evaluación.');
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, orgId, course?.id, subject?.id, period?.id]);

  useEffect(() => {
    loadScheme();
  }, [loadScheme]);

  if (!isOpen) return null;

  const totalWeight = categories.reduce((sum, c) => sum + Number(c.weightPercentage), 0);
  const isLockedOrClosed = scheme?.status === 'LOCKED' || scheme?.status === 'CLOSED';

  // Crear Esquema inicial si no existe
  const handleCreateInitialScheme = async () => {
    if (!orgId || isSaving) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const created = await academicApi.createEvaluationScheme(orgId, {
        courseId: course.id,
        subjectId: subject.id,
        academicPeriodId: period.id,
        maxScale,
        minPassingScore,
      });
      setScheme(created);
      setCategories(created.categories || []);
      setSuccessMsg('Esquema de evaluación inicializado.');
      onSchemeUpdated?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo crear el esquema de evaluación.');
    } finally {
      setIsSaving(false);
    }
  };

  // Agregar Categoría
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !scheme || !newCatName.trim() || !newCatWeight) return;

    const parsedWeight = parseFloat(newCatWeight);
    if (isNaN(parsedWeight) || parsedWeight <= 0 || parsedWeight > 100) {
      setErrorMsg('La ponderación debe ser un porcentaje positivo entre 1% y 100%.');
      return;
    }

    if (totalWeight + parsedWeight > 100.01) {
      setErrorMsg(`La suma de ponderaciones no puede superar el 100 %. Actual: ${totalWeight}%, Excedente: +${parsedWeight}%`);
      return;
    }

    const normalizedName = newCatName.trim().toLowerCase();
    const isDuplicate = categories.some((c) => c.name.trim().toLowerCase() === normalizedName);
    if (isDuplicate) {
      setErrorMsg('Ya existe una categoría con ese nombre en este esquema.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const created = await academicApi.createEvaluationCategory(orgId, scheme.id, {
        name: newCatName.trim(),
        weightPercentage: parsedWeight,
        order: categories.length + 1,
      });
      setCategories((prev) => [...prev, created]);
      setNewCatName('');
      setNewCatWeight('');
      setSuccessMsg(`Categoría "${created.name}" agregada (${created.weightPercentage}%).`);
      onSchemeUpdated?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo agregar la categoría.');
    } finally {
      setIsSaving(false);
    }
  };

  // Eliminar Categoría
  const handleDeleteCategory = async (categoryId: number) => {
    if (!orgId || isLockedOrClosed || isSaving) return;
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await academicApi.deleteEvaluationCategory(orgId, categoryId);
      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
      setSuccessMsg('Categoría eliminada.');
      onSchemeUpdated?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo eliminar la categoría.');
    } finally {
      setIsSaving(false);
    }
  };

  // Validar Esquema (Estricto 100%)
  const handleValidateScheme = async () => {
    if (!orgId || !scheme || isSaving) return;
    if (Math.abs(totalWeight - 100) > 0.01) {
      setErrorMsg(`Para validar el esquema, la suma de ponderaciones debe ser exactamente 100 %. Actual: ${totalWeight}%`);
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const updated = await academicApi.validateEvaluationScheme(orgId, scheme.id);
      setScheme(updated);
      setSuccessMsg('¡Esquema de evaluación validado exitosamente! Estado: VALID');
      onSchemeUpdated?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al validar el esquema.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden my-8"
      >
        {/* Cabecera */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Ponderaciones y Esquema de Evaluación
              </h2>
              <p className="text-xs text-slate-500">
                {course.name} · {subject.name} · {period.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-6 space-y-5 text-xs">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
              <p className="text-slate-500">Cargando esquema de evaluación...</p>
            </div>
          ) : !scheme ? (
            <div className="p-6 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-indigo-600 mx-auto" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Sin esquema de evaluación configurado</h3>
                <p className="text-slate-600 text-[11px] mt-1 max-w-md mx-auto">
                  Este curso y materia no tiene un esquema formal con categorías y ponderaciones para <strong>{period.name}</strong>.
                </p>
              </div>
              <button
                onClick={handleCreateInitialScheme}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-xs inline-flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>Inicializar Esquema de Evaluación (Escala 10 / Ponderación 100%)</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Barra de Estado y Escalas */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-700">Estado del Esquema:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                      scheme.status === 'VALID'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : scheme.status === 'LOCKED'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : scheme.status === 'CLOSED'
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : 'bg-slate-200 text-slate-800 border-slate-300'
                    }`}
                  >
                    {scheme.status}
                  </span>
                </div>

                <div className="flex items-center gap-4 font-mono text-[11px] text-slate-600">
                  <div>Escala: <strong>/{scheme.maxScale}</strong></div>
                  <div>Mín. Aprobación: <strong>{scheme.minPassingScore}</strong></div>
                </div>
              </div>

              {/* Barra de Progreso de Ponderación Total */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-700">Ponderación Total Acumulada:</span>
                  <span
                    className={`font-mono text-sm ${
                      Math.abs(totalWeight - 100) < 0.01
                        ? 'text-emerald-700'
                        : totalWeight > 100
                        ? 'text-rose-700'
                        : 'text-indigo-700'
                    }`}
                  >
                    {totalWeight.toFixed(1)} % / 100.0 %
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className={`h-full transition-all duration-300 ${
                      Math.abs(totalWeight - 100) < 0.01
                        ? 'bg-emerald-500'
                        : totalWeight > 100
                        ? 'bg-rose-500'
                        : 'bg-indigo-600'
                    }`}
                    style={{ width: `${Math.min(totalWeight, 100)}%` }}
                  />
                </div>
                {totalWeight < 100 && (
                  <p className="text-[10px] text-slate-400">
                    Falta asignar {(100 - totalWeight).toFixed(1)}% para completar el 100% y poder validar el esquema.
                  </p>
                )}
              </div>

              {/* Lista de Categorías */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 font-bold text-slate-700 flex justify-between items-center">
                  <span>Categorías Definidas</span>
                  <span className="text-[10px] font-mono font-normal text-slate-500">
                    {categories.length} categoría(s)
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {categories.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 italic">
                      No hay categorías registradas. Agregue componentes como Tareas, Talleres o Examen.
                    </div>
                  ) : (
                    categories.map((cat, idx) => (
                      <div key={cat.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/50">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 font-mono font-bold text-[10px] flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900">{cat.name}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-mono font-bold rounded-lg border border-indigo-100">
                            {cat.weightPercentage}%
                          </span>

                          {!isLockedOrClosed && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat.id)}
                              disabled={isSaving}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Eliminar categoría"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Formulario para Agregar Nueva Categoría */}
              {!isLockedOrClosed && totalWeight < 100 && (
                <form
                  onSubmit={handleAddCategory}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
                >
                  <span className="font-bold text-slate-800 block">Agregar Componente de Evaluación</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <input
                        required
                        type="text"
                        placeholder="Ej. Trabajos Autónomos, Examen Quimestral..."
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-800 font-medium"
                      />
                    </div>
                    <div>
                      <input
                        required
                        type="number"
                        min="1"
                        max={100 - totalWeight}
                        step="0.1"
                        placeholder={`% (máx ${(100 - totalWeight).toFixed(1)})`}
                        value={newCatWeight}
                        onChange={(e) => setNewCatWeight(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-slate-800 font-bold"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSaving || !newCatName.trim() || !newCatWeight}
                      className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>Agregar Categoría</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Botón para Validar Esquema si está en 100% y en DRAFT */}
              {scheme.status === 'DRAFT' && Math.abs(totalWeight - 100) < 0.01 && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Ponderación completa al 100 %
                    </span>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Puede validar este esquema para fijarlo como oficial en este periodo académico.
                    </p>
                  </div>
                  <button
                    onClick={handleValidateScheme}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shrink-0 shadow-xs flex items-center gap-1.5"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Validar Esquema</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-100"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
