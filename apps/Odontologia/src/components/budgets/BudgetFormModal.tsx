import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Budget, BudgetItem } from '../../types';
import { dentalService } from '../../services/dentalService';
import { Plus, Trash2, Calculator } from 'lucide-react';

interface BudgetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPatientId?: string;
  budget?: Budget;
}

const defaultItems: BudgetItem[] = [
  { id: '1', description: 'Restauración Resina Oclusal Pieza 16', pieceNumber: '16', price: 50.00 },
  { id: '2', description: 'Profilaxis Profunda y Fluorización', price: 35.00 }
];

export const BudgetFormModal: React.FC<BudgetFormModalProps> = ({
  isOpen,
  onClose,
  defaultPatientId,
  budget
}) => {
  const patients = dentalService.getPatients();
  
  const [patientId, setPatientId] = useState(budget?.patientId || defaultPatientId || patients[0]?.id || '');
  const [title, setTitle] = useState(budget?.title || 'Plan de Tratamiento Odontológico');
  const [items, setItems] = useState<BudgetItem[]>(budget?.items || defaultItems);
  const [notes, setNotes] = useState(budget?.notes || 'Presupuesto válido por 30 días.');

  useEffect(() => {
    if (!isOpen) return;
    setPatientId(budget?.patientId || defaultPatientId || patients[0]?.id || '');
    setTitle(budget?.title || 'Plan de Tratamiento Odontológico');
    setItems(budget?.items || defaultItems);
    setNotes(budget?.notes || 'Presupuesto válido por 30 días.');
  }, [isOpen, budget, defaultPatientId]);

  const handleAddItem = () => {
    const newItem: BudgetItem = {
      id: String(Date.now()),
      description: 'Nuevo procedimiento',
      price: 0
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleItemChange = (id: string, field: 'description' | 'pieceNumber' | 'price', value: string) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;

      const updated: BudgetItem = { ...item };
      if (field === 'price') {
        const price = Number(value);
        updated.price = Number.isFinite(price) && price >= 0 ? price : 0;
      } else if (field === 'pieceNumber') {
        updated.pieceNumber = value.trim() || undefined;
      } else {
        updated.description = value;
      }

      return updated;
    }));
  };

  const totalAmount = items.reduce((sum, item) => sum + Number(item.price || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || items.length === 0) return;

    const patient = dentalService.getPatientById(patientId);

    const budgetData = {
      patientId,
      patientName: patient ? `${patient.names} ${patient.surnames}` : 'Paciente',
      title,
      date: new Date().toISOString().split('T')[0],
      items,
      totalAmount,
      status: budget?.status || 'Pendiente',
      notes
    };

    if (budget) {
      dentalService.updateBudget(budget.id, budgetData);
    } else {
      dentalService.addBudget(budgetData);
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={budget ? 'Editar Presupuesto Odontológico' : 'Nuevo Presupuesto Odontológico'}
      subtitle="Agregue los procedimientos y precios finales para emitir la cotización."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Paciente */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Paciente *</label>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
              required
            >
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.names} {p.surnames} (CI: {p.identification})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Título del Presupuesto</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800"
              required
            />
          </div>
        </div>

        {/* Itemized Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                <th className="py-2.5 px-3">Procedimiento / Descripción</th>
                <th className="py-2.5 px-2 w-28">Pieza(s)</th>
                <th className="py-2.5 px-2 w-28">Precio ($)</th>
                <th className="py-2.5 px-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="p-2">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                      className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                      required
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={item.pieceNumber || ''}
                      onChange={(e) => handleItemChange(item.id, 'pieceNumber', e.target.value)}
                      placeholder="16, 17"
                      className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-mono"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.price}
                      onChange={(e) => handleItemChange(item.id, 'price', e.target.value)}
                      className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-mono"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 hover:text-cyan-700"
            >
              <Plus className="w-4 h-4" /> Agregar Fila
            </button>

            <div className="text-right">
              <span className="text-xs text-slate-500 font-semibold uppercase mr-3">TOTAL PRESUPUESTO:</span>
              <span className="text-lg font-bold font-mono text-slate-900">${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Observaciones */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Notas / Términos del Presupuesto</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs resize-none"
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-700 font-medium text-xs rounded-xl"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm"
          >
            {budget ? 'Guardar Cambios' : 'Emitir Presupuesto'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
