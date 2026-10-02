import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { DentalTreatmentItem, TOOTH_STATES, ToothState, ToothSurface } from '../../types';
import { dentalService } from '../../services/dentalService';
import { Loader2, Check, Stethoscope, AlertCircle, Sparkles, Calendar, Clock, FileText, Info } from 'lucide-react';

interface RecordExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: number;
  item: DentalTreatmentItem | null;
  patientId: string;
  onSuccess: () => void;
}

const SURFACES_CONFIG: { key: ToothSurface; label: string; abbr: string }[] = [
  { key: 'mesial', label: 'Mesial', abbr: 'M' },
  { key: 'distal', label: 'Distal', abbr: 'D' },
  { key: 'occlusal', label: 'Oclusal / Incisal', abbr: 'O' },
  { key: 'vestibular', label: 'Vestibular', abbr: 'V' },
  { key: 'lingual', label: 'Lingual / Palatino', abbr: 'L' },
];

export const RecordExecutionModal: React.FC<RecordExecutionModalProps> = ({
  isOpen,
  onClose,
  planId,
  item,
  patientId,
  onSuccess,
}) => {
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [performedAt, setPerformedAt] = useState('');
  const [updateOdontogram, setUpdateOdontogram] = useState(false);
  const [toothState, setToothState] = useState<ToothState>('Restauracion');
  const [surfaces, setSurfaces] = useState<Record<ToothSurface, boolean>>({
    mesial: false,
    distal: false,
    occlusal: true,
    vestibular: false,
    lingual: false,
  });
  const [odontogramNotes, setOdontogramNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Helper para generar formato datetime-local
  const getNowFormatted = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (!isOpen || !item) return;

    setClinicalNotes('');
    setIsCompleted(false);
    setPerformedAt(getNowFormatted());
    setUpdateOdontogram(false);
    setToothState('Restauracion');
    setSurfaces({
      mesial: false,
      distal: false,
      occlusal: true,
      vestibular: false,
      lingual: false,
    });
    setOdontogramNotes('');
    setErrorMessage(null);
  }, [isOpen, item]);

  if (!item) return null;

  const handleToggleSurface = (surf: ToothSurface) => {
    setSurfaces((prev) => ({
      ...prev,
      [surf]: !prev[surf],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: any = {
        clinicalNotes: clinicalNotes.trim() || null,
        completed: isCompleted,
        performedAt: performedAt ? new Date(performedAt).toISOString() : null,
      };

      if (updateOdontogram && item.toothNumber) {
        payload.odontogramUpdate = {
          toothNumber: item.toothNumber,
          state: toothState,
          surfaces,
          notes: odontogramNotes.trim() || null,
        };
      }

      await dentalService.recordTreatmentExecution(patientId, planId, item.id, payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('[RecordExecutionModal] Error:', err);
      setErrorMessage(err.message || 'Error al registrar la ejecución clínica.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title="Registrar Ejecución Clínica / Evolución"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Cabecera del Procedimiento */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Procedimiento a Ejecutar
            </span>
            <span className="text-xs font-mono font-bold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
              {item.toothNumber ? `Pieza #${item.toothNumber}` : 'General (Boca)'}
            </span>
          </div>
          <div className="text-sm font-bold text-slate-900">{item.procedureName}</div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>Estado actual: <strong>{item.status}</strong></span>
            <span>•</span>
            <span>Sesiones registradas: <strong>{item.executions?.length || 0}</strong></span>
          </div>
        </div>

        {/* Mensaje de error si ocurre */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Fecha y Hora de la Sesión */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-cyan-600" />
            <span>Fecha y Hora de la Atención</span>
          </label>
          <input
            type="datetime-local"
            value={performedAt}
            onChange={(e) => setPerformedAt(e.target.value)}
            disabled={isSubmitting}
            className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
            required
          />
          <p className="text-[10px] text-slate-400 mt-1">
            Por regla de integridad clínica, no se admiten fechas futuras (salvo tolerancia mínima de reloj).
          </p>
        </div>

        {/* Notas Clínicas / Evolución */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-cyan-600" />
            <span>Notas Clínicas de la Sesión</span>
          </label>
          <textarea
            value={clinicalNotes}
            onChange={(e) => setClinicalNotes(e.target.value)}
            rows={3}
            placeholder="Describa el procedimiento realizado, anestesia aplicada, materiales utilizados, instrumental, tolerancia del paciente..."
            disabled={isSubmitting}
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Checkbox: Finalización Definitiva */}
        <div className="p-3.5 bg-sky-50/60 border border-sky-200/80 rounded-xl">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isCompleted}
              onChange={(e) => setIsCompleted(e.target.checked)}
              disabled={isSubmitting}
              className="mt-0.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 w-4 h-4"
            />
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Marcar procedimiento como COMPLETADO definitivamente
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                {isCompleted
                  ? 'El estado del procedimiento pasará a COMPLETED y no recibirá nuevas sesiones ordinarias.'
                  : 'El procedimiento quedará o se mantendrá en EN CURSO (IN_PROGRESS) para permitir sesiones futuras.'}
              </span>
            </div>
          </label>
        </div>

        {/* Integración con Odontograma (Solo si el ítem tiene pieza asociada) */}
        {item.toothNumber ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={updateOdontogram}
                onChange={(e) => setUpdateOdontogram(e.target.checked)}
                disabled={isSubmitting}
                className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 w-4 h-4"
              />
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Actualizar Odontograma con esta sesión (Pieza #{item.toothNumber})</span>
              </span>
            </label>

            {updateOdontogram && (
              <div className="pt-2 border-t border-slate-200 space-y-3 animate-fade-in">
                {/* Selector canónico de ToothState */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Nuevo Estado Dental Resultante
                  </label>
                  <select
                    value={toothState}
                    onChange={(e) => setToothState(e.target.value as ToothState)}
                    disabled={isSubmitting}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  >
                    {TOOTH_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Superficies canónicas (5 superficies exactas) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                    Superficies Comprometidas
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {SURFACES_CONFIG.map(({ key, label, abbr }) => {
                      const selected = surfaces[key];
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleToggleSurface(key)}
                          disabled={isSubmitting}
                          className={`p-2 rounded-lg text-center border transition-all ${
                            selected
                              ? 'bg-cyan-600 border-cyan-600 text-white font-bold shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 font-medium'
                          }`}
                          title={label}
                        >
                          <div className="text-xs font-mono font-bold">{abbr}</div>
                          <div className="text-[9px] truncate mt-0.5">{label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notas adicionales del odontograma */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Nota Clínica del Odontograma (Opcional)
                  </label>
                  <input
                    type="text"
                    value={odontogramNotes}
                    onChange={(e) => setOdontogramNotes(e.target.value)}
                    placeholder="Ej. Resina color A2 fotocurada en cara oclusal"
                    disabled={isSubmitting}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Procedimiento general (sin pieza específica) — no altera el odontograma.</span>
          </div>
        )}

        {/* Botones de Acción con protección de doble clic */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-700 hover:to-sky-700 rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Registrando Ejecución...</span>
              </>
            ) : (
              <>
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Confirmar Ejecución Clínica</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
