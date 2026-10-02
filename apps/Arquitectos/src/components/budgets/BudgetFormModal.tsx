import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Budget, Project, BudgetItem } from '../../types';
import { Plus, Trash2 } from 'lucide-react';

interface BudgetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (budget: Partial<Budget>) => void;
  projects: Project[];
  defaultProjectId?: string;
  initialData?: Budget | null;
}

export const BudgetFormModal: React.FC<BudgetFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  projects,
  defaultProjectId,
  initialData
}) => {
  const [formData, setFormData] = useState<{
    name: string;
    projectId: string | number;
    status: string;
    notes: string;
    items: Array<{
      description: string;
      category: string;
      quantity: number;
      unitPrice: number;
    }>;
  }>({
    name: '',
    projectId: defaultProjectId || String(projects[0]?.id || ''),
    status: 'Borrador',
    notes: '',
    items: [
      { description: 'Estudios preliminares y anteproyecto', category: 'Diseño', quantity: 1, unitPrice: 2500 },
      { description: 'Planos ejecutivos y memorias técnicas', category: 'Documentación', quantity: 1, unitPrice: 4500 },
    ]
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || `Presupuesto ${initialData.projectName}`,
        projectId: initialData.projectId,
        status: initialData.status || 'Borrador',
        notes: initialData.notes || '',
        items: initialData.items && initialData.items.length > 0
          ? initialData.items.map((it) => ({
              description: it.description,
              category: it.category || 'General',
              quantity: it.quantity,
              unitPrice: it.unitPrice,
            }))
          : [
              { description: 'Honorarios profesionales', category: 'General', quantity: 1, unitPrice: initialData.estimatedAmount || 5000 },
            ],
      });
    } else {
      setFormData({
        name: 'Presupuesto General de Obra',
        projectId: defaultProjectId || String(projects[0]?.id || ''),
        status: 'Borrador',
        notes: '',
        items: [
          { description: 'Estudios preliminares y anteproyecto', category: 'Diseño', quantity: 1, unitPrice: 2500 },
          { description: 'Planos ejecutivos y memorias técnicas', category: 'Documentación', quantity: 1, unitPrice: 4500 },
        ],
      });
    }
  }, [initialData, defaultProjectId, projects, isOpen]);

  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { description: '', category: 'General', quantity: 1, unitPrice: 0 },
      ],
    }));
  };

  const handleRemoveDraftItem = (index: number) => {
    if (formData.items.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setFormData((prev) => {
      const nextItems = [...prev.items];
      nextItems[index] = { ...nextItems[index], [field]: value };
      return { ...prev, items: nextItems };
    });
  };

  const totalCalculated = formData.items.reduce(
    (sum, it) => sum + (Number(it.quantity || 0) * Number(it.unitPrice || 0)),
    0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId || !formData.name.trim()) return;

    onSave({
      name: formData.name.trim(),
      projectId: formData.projectId,
      status: formData.status,
      notes: formData.notes.trim() || undefined,
      estimatedAmount: Number(totalCalculated.toFixed(2)),
      approvedAmount: formData.status === 'Aprobado' ? Number(totalCalculated.toFixed(2)) : 0,
      items: formData.items.filter((it) => it.description.trim().length > 0) as BudgetItem[],
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Actualizar Presupuesto' : 'Registrar Nuevo Presupuesto'}
      subtitle="Defina las partidas y montos reales del presupuesto"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nombre del Presupuesto *</label>
            <input
              type="text"
              required
              placeholder="Ej. Presupuesto Arquitectónico Integral"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Proyecto Asociado *</label>
            <select
              required
              value={formData.projectId || ''}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            >
              <option value="">Seleccione proyecto...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Estado</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            >
              <option value="Borrador">Borrador</option>
              <option value="Presentado">Presentado</option>
              <option value="Aprobado">Aprobado</option>
              <option value="Rechazado">Rechazado</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notas u Observaciones</label>
            <input
              type="text"
              placeholder="Detalles sobre términos o alcance..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            />
          </div>
        </div>

        {/* Rubros del Presupuesto */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="block font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Rubros / Partidas Presupuestarias
            </label>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-arch-600 hover:text-arch-700"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar Rubro
            </button>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {formData.items.map((item, idx) => {
              const subtotal = (Number(item.quantity || 0) * Number(item.unitPrice || 0)).toFixed(2);
              return (
                <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex-1 min-w-[140px]">
                    <input
                      type="text"
                      required
                      placeholder="Descripción del rubro..."
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="text"
                      placeholder="Categoría"
                      value={item.category}
                      onChange={(e) => handleItemChange(idx, 'category', e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                    />
                  </div>
                  <div className="w-16">
                    <input
                      type="number"
                      min="0.0001"
                      step="any"
                      placeholder="Cant."
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono text-right"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="P. Unit ($)"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono text-right"
                    />
                  </div>
                  <div className="w-24 text-right font-mono font-bold text-slate-800">
                    ${subtotal}
                  </div>
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDraftItem(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                      title="Eliminar fila del borrador"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end items-center gap-3 pt-2 text-xs font-bold text-slate-800">
            <span>Total Presupuestado Calculado:</span>
            <span className="font-mono text-base text-arch-700">${totalCalculated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-5 py-2 font-semibold text-white bg-arch-600 hover:bg-arch-700 rounded-lg shadow-xs transition-colors"
          >
            {initialData ? 'Guardar Cambios' : 'Registrar Presupuesto'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
