import React, { useState } from 'react';
import { DentalBudget } from '../../types';
import { dentalService } from '../../services/dentalService';
import { X, DollarSign, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  budget: DentalBudget;
  onSuccess?: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  patientId,
  budget,
  onSuccess,
}) => {
  const [amount, setAmount] = useState<number | string>(budget.balance > 0 ? budget.balance : '');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const parsedAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  const newBalance = Math.max(0, budget.balance - parsedAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (parsedAmount <= 0) {
      setError('El monto a abonar debe ser mayor a 0.');
      return;
    }

    if (parsedAmount > budget.balance) {
      setError(`El monto ($${parsedAmount.toFixed(2)}) no puede exceder el saldo pendiente ($${budget.balance.toFixed(2)}).`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await dentalService.recordRealPayment(patientId, budget.id, {
        amount: parsedAmount,
        paymentMethod,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('[RecordPaymentModal] Error:', err);
      setError(err.message || 'Error al registrar el pago / abono.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetFullBalance = () => {
    setAmount(budget.balance);
  };

  const handleSetHalfBalance = () => {
    setAmount(Number((budget.balance / 2).toFixed(2)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Registrar Pago / Abono</h3>
              <p className="text-xs text-slate-500">
                Presupuesto #{budget.id}: {budget.title}
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

          {/* Financial summary banner */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total</span>
              <span className="text-xs font-bold font-mono text-slate-900">${budget.total.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Abonado</span>
              <span className="text-xs font-bold font-mono text-emerald-700">${budget.paidAmount.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Saldo</span>
              <span className="text-xs font-bold font-mono text-amber-700">${budget.balance.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Monto a Recibir ($) *
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSetHalfBalance}
                  className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
                >
                  50% (${(budget.balance / 2).toFixed(2)})
                </button>
                <button
                  type="button"
                  onClick={handleSetFullBalance}
                  className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded"
                >
                  Total (${budget.balance.toFixed(2)})
                </button>
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-sm">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={budget.balance}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-base font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Método de Pago *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia Bancaria</option>
              <option value="Tarjeta de Débito">Tarjeta de Débito</option>
              <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
              <option value="Depósito">Depósito Bancario</option>
              <option value="Cheque">Cheque</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Comprobante / Referencia (opcional)
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              placeholder="Ej: Transf. #94827 o Cheque #00123"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notas / Observaciones (opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              placeholder="Ej: Abono inicial para inicio de endodoncia."
            />
          </div>

          {/* Balance Preview */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-center justify-between text-xs">
            <span className="font-semibold text-emerald-950">Nuevo Saldo tras este abono:</span>
            <span className="font-mono font-bold text-sm text-emerald-800">
              ${newBalance.toFixed(2)}
            </span>
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
              disabled={isSubmitting || parsedAmount <= 0 || parsedAmount > budget.balance}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Registrando...' : 'Confirmar Abono'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
