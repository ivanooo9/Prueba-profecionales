import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { dentalService } from '../../services/dentalService';
import { DentalTreatmentPlan } from '../../types';
import { Loader2, Plus, Check } from 'lucide-react';

interface CreatePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onSuccess: (plan: DentalTreatmentPlan) => void;
}

export const CreatePlanModal: React.FC<CreatePlanModalProps> = ({
  isOpen,
  onClose,
  patientId,
  onSuccess
}) => {
  const [title, setTitle] = useState('Plan de Tratamiento Integral');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'ACTIVE'>('ACTIVE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('El título del plan es requerido.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const created = await dentalService.createRealTreatmentPlan(patientId, {
        title: title.trim(),
        notes: notes.trim() || undefined,
        status
      });

      onSuccess(created);
      onClose();
    } catch (err: any) {
      console.error('[CreatePlanModal] Error creating plan:', err);
      setErrorMessage(err.message || 'Error al crear plan de tratamiento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nuevo Plan de Tratamiento Odontológico"
      subtitle="Crea un plan agrupador para procedimientos, presupuestos y seguimiento clínico."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {errorMessage}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Título del Plan *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Plan de Rehabilitación Oral, Ortodoncia Correctiva..."
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Estado Inicial
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'DRAFT' | 'ACTIVE')}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 font-medium"
          >
            <option value="ACTIVE">Activo (En curso)</option>
            <option value="DRAFT">Borrador (Propuesta)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Observaciones Generales
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Indicaciones preliminares, condiciones de salud oral, acuerdos con el paciente..."
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-xs inline-flex items-center gap-1.5"
          >
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>Crear Plan</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
