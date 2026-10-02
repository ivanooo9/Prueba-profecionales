import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { DentalProcedure } from '../../types';
import { dentalService } from '../../services/dentalService';
import { Loader2, Plus, Check, Info } from 'lucide-react';

interface AddTreatmentItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: number;
  patientId: string;
  onSuccess: () => void;
}

export const AddTreatmentItemModal: React.FC<AddTreatmentItemModalProps> = ({
  isOpen,
  onClose,
  planId,
  patientId,
  onSuccess
}) => {
  const [procedures, setProcedures] = useState<DentalProcedure[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedProcedureId, setSelectedProcedureId] = useState<number | 'custom'>('custom');
  const [procedureName, setProcedureName] = useState('');
  const [toothInput, setToothInput] = useState<string>('');
  const [unitPrice, setUnitPrice] = useState<string>('45.00');
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    setErrorMessage(null);

    dentalService
      .loadProcedures()
      .then((data) => {
        setProcedures(data);
        if (data.length > 0) {
          setSelectedProcedureId(data[0].id);
          setProcedureName(data[0].name);
          setUnitPrice(data[0].defaultPrice.toFixed(2));
        } else {
          setSelectedProcedureId('custom');
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('[AddTreatmentItemModal] Error loading procedures:', err);
        setIsLoading(false);
      });
  }, [isOpen]);

  const handleProcedureSelect = (val: string) => {
    if (val === 'custom') {
      setSelectedProcedureId('custom');
      setProcedureName('');
      return;
    }

    const id = parseInt(val, 10);
    const proc = procedures.find(p => p.id === id);
    if (proc) {
      setSelectedProcedureId(id);
      setProcedureName(proc.name);
      setUnitPrice(proc.defaultPrice.toFixed(2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!procedureName.trim()) {
      setErrorMessage('El nombre del procedimiento es requerido.');
      return;
    }

    const priceNum = parseFloat(unitPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setErrorMessage('Precio unitario inválido.');
      return;
    }

    let toothNum: number | null = null;
    if (toothInput.trim()) {
      toothNum = parseInt(toothInput.trim(), 10);
      if (isNaN(toothNum)) {
        setErrorMessage('La pieza dental debe ser un número FDI (ej: 11 a 48).');
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await dentalService.addRealTreatmentItem(patientId, planId, {
        procedureId: selectedProcedureId === 'custom' ? undefined : selectedProcedureId,
        procedureName: procedureName.trim(),
        toothNumber: toothNum,
        quantity,
        unitPrice: priceNum,
        notes: notes.trim() || undefined
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('[AddTreatmentItemModal] Error:', err);
      setErrorMessage(err.message || 'Error al agregar ítem al plan de tratamiento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Agregar Procedimiento al Plan"
      subtitle="Defina la intervención, pieza involucrada o procedimiento general y precio pactado."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-slate-400 gap-2 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
            <span>Cargando catálogo...</span>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Procedimiento del Catálogo
              </label>
              <select
                value={selectedProcedureId}
                onChange={(e) => handleProcedureSelect(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
              >
                <option value="custom">-- Procedimiento manual / libre --</option>
                {procedures.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.category ? `[${p.category}]` : ''} - Ref: ${p.defaultPrice.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre del Procedimiento *
              </label>
              <input
                type="text"
                value={procedureName}
                onChange={(e) => setProcedureName(e.target.value)}
                placeholder="Ej: Profilaxis completa, Restauración resina..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pieza Dental FDI (Opcional)
                </label>
                <input
                  type="number"
                  value={toothInput}
                  onChange={(e) => setToothInput(e.target.value)}
                  placeholder="Vacío = General"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">Dejar vacío si aplica a toda la boca</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Precio Unitario ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cantidad
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notas / Indicaciones
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones clínicas específicas..."
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
                <span>Agregar Ítem</span>
              </button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
};
