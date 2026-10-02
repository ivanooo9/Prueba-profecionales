import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Deliverable, Project, DeliverableType, DeliverableStatus } from '../../types';

interface DeliverableFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (deliv: Partial<Deliverable>) => void;
  projects: Project[];
  defaultProjectId?: string | number;
  initialData?: Deliverable | null;
}

export const DeliverableFormModal: React.FC<DeliverableFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  projects,
  defaultProjectId,
  initialData
}) => {
  const [formData, setFormData] = useState<Partial<Deliverable>>({
    projectId: defaultProjectId || String(projects[0]?.id || ''),
    name: '',
    type: 'Planos',
    assignedTo: 'Arq. Esteban Guarderas',
    dueDate: new Date().toISOString().split('T')[0],
    status: 'Pendiente',
    notes: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
    } else {
      setFormData({
        projectId: defaultProjectId || String(projects[0]?.id || ''),
        name: '',
        type: 'Planos',
        assignedTo: 'Arq. Esteban Guarderas',
        dueDate: new Date().toISOString().split('T')[0],
        status: 'Pendiente',
        notes: ''
      });
    }
  }, [initialData, defaultProjectId, projects, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.projectId) return;
    onSave(formData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Editar Entregable' : 'Registrar Nuevo Entregable'}
      subtitle="Defina el objeto de entrega, fecha límite y estado para el proyecto"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
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

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Nombre del Entregable *</label>
          <input
            type="text"
            required
            placeholder="Ej: Planos Arquitectónicos 1:50 o Renders 3D"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tipo de Entregable</label>
            <select
              value={formData.type || 'Planos'}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as DeliverableType })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            >
              <option value="Planos">Planos</option>
              <option value="Modelos 3D">Modelos 3D</option>
              <option value="Renders">Renders</option>
              <option value="Memorias">Memorias</option>
              <option value="Presentaciones">Presentaciones</option>
              <option value="Documentación técnica">Documentación técnica</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Responsable</label>
            <input
              type="text"
              value={formData.assignedTo || ''}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Fecha Límite</label>
            <input
              type="date"
              value={formData.dueDate || ''}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Estado de Aprobación</label>
            <select
              value={formData.status || 'Pendiente'}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as DeliverableStatus })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            >
              <option value="Pendiente">Pendiente</option>
              <option value="En desarrollo">En desarrollo</option>
              <option value="En revisión">En revisión</option>
              <option value="Aprobado">Aprobado</option>
              <option value="Entregado">Entregado</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Notas / Observaciones</label>
          <textarea
            rows={2}
            placeholder="Comentarios sobre formato, escala o especificaciones..."
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
          />
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
            {initialData ? 'Guardar Cambios' : 'Crear Entregable'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
