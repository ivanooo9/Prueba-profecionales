import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { ProceduralDeadline, LegalCase, Priority, DeadlineStatus } from '../../types';

export interface DeadlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (deadlineData: Omit<ProceduralDeadline, 'id' | 'createdAt'>) => void;
  cases: LegalCase[];
  defaultCaseId?: string;
}

export const DeadlineModal: React.FC<DeadlineModalProps> = ({
  isOpen,
  onClose,
  onSave,
  cases,
  defaultCaseId,
}) => {
  const [formData, setFormData] = useState({
    caseId: '',
    caseNumber: '',
    caseTitle: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'Alta' as Priority,
    status: 'Pendiente' as DeadlineStatus,
    responsible: 'Dr. Alejandro Benítez',
    notes: '',
  });

  useEffect(() => {
    if (cases.length > 0) {
      const selected = defaultCaseId
        ? cases.find((c) => c.id === defaultCaseId) || cases[0]
        : cases[0];

      setFormData((prev) => ({
        ...prev,
        caseId: selected.id,
        caseNumber: selected.caseNumber,
        caseTitle: selected.title,
        responsible: selected.assignedLawyer,
      }));
    }
  }, [isOpen, defaultCaseId, cases]);

  const handleCaseChange = (caseId: string) => {
    const selected = cases.find((c) => c.id === caseId);
    if (selected) {
      setFormData({
        ...formData,
        caseId: selected.id,
        caseNumber: selected.caseNumber,
        caseTitle: selected.title,
        responsible: selected.assignedLawyer,
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.caseId) return;
    onSave(formData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Plazo Procesal Perentorio"
      subtitle="Asignación de término fatal con alerta visual de vencimiento"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Expediente / Caso Vinculado *
          </label>
          <select
            required
            value={formData.caseId}
            onChange={(e) => handleCaseChange(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
          >
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.caseNumber} - {c.title} ({c.clientName})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Descripción del Plazo o Acto Procesal *
          </label>
          <input
            type="text"
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Ej. Contestación de demanda, Recurso de Apelación, Impugnación pericial"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Fecha Límite (Vencimiento de Término) *
            </label>
            <input
              type="date"
              required
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full px-3 py-2 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Prioridad
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
            >
              <option value="Baja">Baja</option>
              <option value="Media">Media</option>
              <option value="Alta">Alta</option>
              <option value="Urgente">Urgente</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Estado Inicial
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as DeadlineStatus })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
            >
              <option value="Pendiente">Pendiente</option>
              <option value="En progreso">En progreso</option>
              <option value="Cumplido">Cumplido</option>
              <option value="Vencido">Vencido</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Abogado Responsable
            </label>
            <input
              type="text"
              value={formData.responsible}
              onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Observaciones o Indicaciones de Término
          </label>
          <textarea
            rows={2}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Ej. Término fatal de 3 días contados desde la notificación del 20 de agosto..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm"
          >
            Guardar Plazo Procesal
          </button>
        </div>
      </form>
    </Modal>
  );
};
