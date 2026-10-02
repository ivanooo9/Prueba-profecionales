import React, { useState } from 'react';
import { DentalTreatmentPlan } from '../../types';
import { dentalService } from '../../services/dentalService';
import { X, FileText, DollarSign, AlertCircle } from 'lucide-react';

interface GenerateBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  plan: DentalTreatmentPlan;
  onSuccess?: () => void;
}

export const GenerateBudgetModal: React.FC<GenerateBudgetModalProps> = ({
  isOpen,
  onClose,
  patientId,
  plan,
  onSuccess,
}) => {
  const [title, setTitle] = useState(`Presupuesto - ${plan.title}`);
  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const subtotal = plan.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const parsedDiscount = Math.max(0, Number(discount) || 0);
  const total = Math.max(0, subtotal - parsedDiscount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedDiscount > subtotal) {
      setError('El descuento no puede exceder el subtotal.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await dentalService.createRealBudgetFromPlan(patientId, plan.id, {
        title: title.trim() || `Presupuesto - ${plan.title}`,
        discount: parsedDiscount,
        notes: notes.trim() || undefined,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('[GenerateBudgetModal] Error:', err);
      setError(err.message || 'Error al generar el presupuesto formal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Generar Presupuesto Formal</h3>
              <p className="text-xs text-slate-500">
                A partir del Plan #{plan.id}: {plan.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Título del Presupuesto *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
              placeholder="Ej: Presupuesto Tratamiento Integral"
            />
          </div>

          {/* Desglose de ítems que se congelarán */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Items a congelar en el presupuesto ({plan.items.length})
            </span>
            <div className="max-h-36 overflow-y-auto space-y-1.5 text-xs">
              {plan.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-slate-700 bg-white p-2 rounded-lg border border-slate-100 font-mono"
                >
                  <div className="truncate pr-2">
                    <span className="font-semibold text-slate-900">{item.procedureName}</span>
                    {item.toothNumber && (
                      <span className="text-cyan-700 ml-1.5 text-[11px]">
                        (Pieza #{item.toothNumber})
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-slate-900 shrink-0">
                    ${(item.totalPrice || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subtotal
              </label>
              <input
                type="text"
                disabled
                value={`$${subtotal.toFixed(2)}`}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Descuento Global ($)
              </label>
              <input
                type="number"
                min="0"
                max={subtotal}
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="p-3 bg-cyan-50/70 border border-cyan-100 rounded-xl flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-900">Total Acordado:</span>
            <span className="text-lg font-mono font-bold text-cyan-800">${total.toFixed(2)}</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notas / Condiciones de Pago (opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
              placeholder="Ej: Válido por 30 días. Pago del 50% al inicio y 50% al concluir."
            />
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              <DollarSign className="w-4 h-4" />
              <span>{isSubmitting ? 'Generando...' : 'Generar Presupuesto'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
