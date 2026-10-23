import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Task, Project, ProjectPriority, TaskStatus, ArchitectureAssignableUser } from '../../types';
import { OrganizationUserSelect } from '../ui/OrganizationUserSelect';
import { getTodayCalendarDate } from '../../utils/dateUtils';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  projects: Project[];
  assignableUsers: ArchitectureAssignableUser[];
  defaultProjectId?: string | number;
  initialData?: Task | null;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  projects,
  assignableUsers,
  defaultProjectId,
  initialData
}) => {
  const todayStr = getTodayCalendarDate();
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Task>>({
    projectId: defaultProjectId || String(projects[0]?.id || ''),
    title: '',
    description: '',
    assignedToUserId: undefined,
    priority: 'Media',
    status: 'Pendiente',
    dueDate: getTodayCalendarDate()
  });

  useEffect(() => {
    setError(null);
    if (initialData) {
      setFormData({ ...initialData });
    } else {
      setFormData({
        projectId: defaultProjectId || String(projects[0]?.id || ''),
        title: '',
        description: '',
        assignedToUserId: undefined,
        priority: 'Media',
        status: 'Pendiente',
        dueDate: getTodayCalendarDate()
      });
    }
  }, [initialData, defaultProjectId, projects, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.projectId) return;
    if (formData.dueDate && formData.dueDate < todayStr) {
      setError('La fecha límite no puede ser anterior a hoy.');
      return;
    }
    setError(null);
    const taskData = { ...formData };
    delete taskData.assignedTo;
    if (initialData && String(initialData.assignedToUserId || '') === String(formData.assignedToUserId || '')) {
      delete taskData.assignedToUserId;
    } else {
      taskData.assignedToUserId = formData.assignedToUserId ? Number(formData.assignedToUserId) : null;
    }
    onSave(taskData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Editar Tarea' : 'Crear Nueva Tarea'}
      subtitle="Asigne una tarea operativa a un proyecto arquitectónico"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700">
            {error}
          </div>
        )}
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
          <label className="block font-semibold text-slate-700 mb-1">Título de la Tarea *</label>
          <input
            type="text"
            required
            placeholder="Ej: Levantar medidas de fachada posterior"
            value={formData.title || ''}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <OrganizationUserSelect
            label="Responsable"
            users={assignableUsers}
            value={formData.assignedToUserId}
            currentName={initialData?.assignedTo}
            optional
            onChange={(userId) => setFormData({ ...formData, assignedToUserId: userId ? Number(userId) : undefined })}
          />

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Fecha Límite</label>
            <input
              type="date"
              min={todayStr}
              value={formData.dueDate || ''}
              onChange={(e) => {
                setError(null);
                setFormData({ ...formData, dueDate: e.target.value });
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Prioridad</label>
            <select
              value={formData.priority || 'Media'}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as ProjectPriority })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            >
              <option value="Baja">Baja</option>
              <option value="Media">Media</option>
              <option value="Alta">Alta</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Estado</label>
            <select
              value={formData.status || 'Pendiente'}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            >
              <option value="Pendiente">Pendiente</option>
              <option value="En progreso">En progreso</option>
              <option value="Completada">Completada</option>
              <option value="Atrasada">Atrasada</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Descripción de la Tarea</label>
          <textarea
            rows={2}
            placeholder="Instrucciones o notas adicionales..."
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
            {initialData ? 'Guardar Cambios' : 'Crear Tarea'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
