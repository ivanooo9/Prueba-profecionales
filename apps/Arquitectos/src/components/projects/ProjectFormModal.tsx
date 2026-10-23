import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Project, Client, ProjectType, ProjectStatus, ProjectPriority, ArchitectureAssignableUser } from '../../types';
import { OrganizationUserSelect } from '../ui/OrganizationUserSelect';
import { getTodayCalendarDate } from '../../utils/dateUtils';

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Partial<Project>) => void;
  clients: Client[];
  assignableUsers: ArchitectureAssignableUser[];
  initialData?: Project | null;
}

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  clients = [],
  assignableUsers = [],
  initialData
}) => {
  const todayStr = getTodayCalendarDate();
  const [error, setError] = useState<string | null>(null);

  // Para nuevos proyectos solo clientes activos; para edición preservar el cliente asignado históricamente
  const availableClients = initialData
    ? clients
    : (clients || []).filter((c) => c && c.status === 'Activo');

  const [formData, setFormData] = useState<Partial<Project>>({
    name: '',
    clientId: '',
    type: 'Vivienda',
    location: '',
    approxAreaM2: 250,
    levelsCount: 2,
    leadArchitectUserId: undefined,
    startDate: getTodayCalendarDate(),
    targetDeliveryDate: '',
    status: 'Planificación',
    priority: 'Media',
    clientRequirements: '',
    description: '',
    notes: ''
  });

  useEffect(() => {
    setError(null);
    if (initialData) {
      setFormData({ ...initialData });
    } else {
      const firstActiveClient = (clients || []).find((c) => c && c.status === 'Activo');
      setFormData({
        name: '',
        clientId: firstActiveClient?.id || '',
        type: 'Vivienda',
        location: '',
        approxAreaM2: 250,
        levelsCount: 2,
        leadArchitectUserId: undefined,
        startDate: getTodayCalendarDate(),
        targetDeliveryDate: '',
        status: 'Planificación',
        priority: 'Media',
        clientRequirements: '',
        description: '',
        notes: ''
      });
    }
  }, [initialData, clients, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.clientId) return;
    if (formData.targetDeliveryDate && formData.targetDeliveryDate < todayStr) {
      setError('La fecha estimada de entrega no puede ser anterior a hoy.');
      return;
    }
    setError(null);

    const projectData = { ...formData };
    delete projectData.estimatedBudget;
    delete projectData.approvedBudget;
    delete projectData.leadArchitect;
    if (initialData && String(initialData.leadArchitectUserId || '') === String(formData.leadArchitectUserId || '')) {
      delete projectData.leadArchitectUserId;
    } else if (projectData.leadArchitectUserId != null) {
      projectData.leadArchitectUserId = Number(projectData.leadArchitectUserId);
    }
    await onSave(projectData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Editar Proyecto Arquitectónico' : 'Nuevo Proyecto Arquitectónico'}
      subtitle="Complete la información clave para registrar el proyecto"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">Nombre del Proyecto *</label>
            <input
              type="text"
              required
              placeholder="Ej: Residencia Unifamiliar Casa Sol"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Cliente * {initialData && '(Inmutable)'}</label>
            <select
              required
              disabled={Boolean(initialData) || (!initialData && availableClients.length === 0)}
              value={formData.clientId || ''}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              <option value="">{availableClients.length === 0 ? 'Sin clientes activos disponibles' : 'Seleccione un cliente'}</option>
              {availableClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type}){c.status !== 'Activo' ? ' (Inactivo)' : ''}
                </option>
              ))}
            </select>
            {!initialData && availableClients.length === 0 && (
              <p className="text-amber-600 text-[11px] mt-1 font-medium">
                No hay clientes activos disponibles. Debe registrar o activar un cliente antes de crear un nuevo proyecto.
              </p>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tipo de Proyecto</label>
            <select
              value={formData.type || 'Vivienda'}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as ProjectType })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            >
              <option value="Vivienda">Vivienda</option>
              <option value="Edificio">Edificio</option>
              <option value="Remodelación">Remodelación</option>
              <option value="Diseño interior">Diseño interior</option>
              <option value="Comercial">Comercial</option>
              <option value="Urbanismo">Urbanismo</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ubicación / Ciudad</label>
            <input
              type="text"
              placeholder="Ej: Cumbayá, Quito"
              value={formData.location || ''}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            />
          </div>

          <OrganizationUserSelect
            label="Arquitecto Responsable *"
            users={assignableUsers}
            value={formData.leadArchitectUserId}
            currentName={initialData?.leadArchitect}
            responsibleOnly
            onChange={(userId) => setFormData({ ...formData, leadArchitectUserId: userId ? Number(userId) : undefined })}
          />

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Área Aproximada (m²)</label>
            <input
              type="number"
              min="1"
              value={formData.approxAreaM2 || ''}
              onChange={(e) => setFormData({ ...formData, approxAreaM2: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Número de Niveles</label>
            <input
              type="number"
              min="1"
              value={formData.levelsCount || ''}
              onChange={(e) => setFormData({ ...formData, levelsCount: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Fecha de Inicio</label>
            <input
              type="date"
              value={formData.startDate || ''}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Fecha Estimada de Entrega</label>
            <input
              type="date"
              min={todayStr}
              value={formData.targetDeliveryDate || ''}
              onChange={(e) => {
                setError(null);
                setFormData({ ...formData, targetDeliveryDate: e.target.value });
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Estado</label>
            <select
              value={formData.status || 'Planificación'}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            >
              <option value="Planificación">Planificación</option>
              <option value="Diseño">Diseño</option>
              <option value="En desarrollo">En desarrollo</option>
              <option value="En revisión">En revisión</option>
              <option value="En construcción">En construcción</option>
              <option value="Finalizado">Finalizado</option>
              <option value="Archivado">Archivado</option>
            </select>
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

          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">Requerimientos del Cliente</label>
            <textarea
              rows={2}
              placeholder="Especificaciones o deseos del cliente..."
              value={formData.clientRequirements || ''}
              onChange={(e) => setFormData({ ...formData, clientRequirements: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">Descripción del Proyecto</label>
            <textarea
              rows={2}
              placeholder="Resumen del alcance arquitectónico..."
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            />
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
            {initialData ? 'Guardar Cambios' : 'Crear Proyecto'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
