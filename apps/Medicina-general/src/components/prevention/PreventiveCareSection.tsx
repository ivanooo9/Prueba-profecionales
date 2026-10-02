import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, Loader2, AlertCircle, Calendar, Plus, X } from 'lucide-react';
import type { PreventiveItem } from '../../types/clinical.types';
import { clinicalStore } from '../../services/clinical/clinicalStore';

export interface PreventiveCareSectionProps {
  preventiveItems: PreventiveItem[];
  patientId: string;
}

export const PreventiveCareSection: React.FC<PreventiveCareSectionProps> = ({ preventiveItems, patientId }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<PreventiveItem['type']>('SCREENING');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPreventiveItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await clinicalStore.addPreventiveItem({
        patientId,
        type,
        title: title.trim(),
        status: 'PENDING',
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
      });
      setTitle('');
      setDueDate('');
      setNotes('');
      setType('SCREENING');
      setIsCreating(false);
    } catch (err: any) {
      setError(err?.message || 'Error al guardar el registro de prevención.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (item: PreventiveItem) => {
    const nextStatus: PreventiveItem['status'] = item.status === 'UP_TO_DATE' ? 'PENDING' : 'UP_TO_DATE';
    setError(null);
    try {
      await clinicalStore.updatePreventiveItem(item.id, {
        status: nextStatus,
        completedAt: nextStatus === 'UP_TO_DATE' ? new Date().toISOString() : undefined,
      });
    } catch (err: any) {
      setError(err?.message || 'Error al actualizar el estado preventivo.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Programa de Prevención & Cuidados de Salud Red MSP</span>
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono">
            {preventiveItems.length} {preventiveItems.length === 1 ? 'control' : 'controles'}
          </span>
          <button
            onClick={() => {
              setError(null);
              setIsCreating(true);
            }}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 transition flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Registrar prevención</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {isCreating && (
        <form onSubmit={createPreventiveItem} className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
            <span className="text-xs font-bold text-slate-800">Nuevo Control / Tamizaje Preventivo</span>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Título / Vacuna / Control *</label>
              <input
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ej. Vacuna Antigripal, Tamizaje Glucosa, Citología..."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Tipo de Prevención</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500"
                disabled={isSubmitting}
              >
                <option value="SCREENING">Tamizaje / Cribado</option>
                <option value="VACCINE">Vacunación / Inmunización</option>
                <option value="PREVENTIVE_CONTROL">Control Preventivo</option>
                <option value="OTHER">Otro</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Fecha límite o programada</label>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Observaciones adicionales</label>
              <input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Dosis, intervalo o indicación..."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Guardar prevención
            </button>
          </div>
        </form>
      )}

      {preventiveItems.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500">
          <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold">No existen registros preventivos activos para este paciente.</p>
          <p className="text-xs text-slate-400 mt-1">Registra esquemas de vacunación, controles periódicos o cribados MSP.</p>
          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="mt-3 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 transition"
            >
              + Registrar primer control
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {preventiveItems.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 text-xs shadow-xs hover:border-slate-300 transition"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-900 flex items-center gap-2">
                  {item.status === 'UP_TO_DATE' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <span>{item.title}</span>
                </span>
                <button
                  type="button"
                  onClick={() => toggleStatus(item)}
                  title="Cambiar estado"
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                    item.status === 'UP_TO_DATE'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  {item.status === 'UP_TO_DATE' ? 'AL DÍA' : 'PENDIENTE'}
                </button>
              </div>

              {item.notes && <p className="text-[11px] text-slate-600">{item.notes}</p>}

              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-100">
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 uppercase font-semibold">
                  {item.type || 'CONTROL'}
                </span>
                {item.dueDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    Vence: {item.dueDate}
                  </span>
                )}
                {item.completedAt && (
                  <span className="text-emerald-700">Completado: {item.completedAt}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

