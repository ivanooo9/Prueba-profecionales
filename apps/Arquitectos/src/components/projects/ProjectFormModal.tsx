import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Project, Client, ProjectType, ProjectStatus, ProjectPriority } from '../../types';

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Partial<Project>) => void;
  clients: Client[];
  initialData?: Project | null;
}

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  clients,
  initialData
}) => {
  const [formData, setFormData] = useState<Partial<Project>>({
    name: '',
    clientId: '',
    type: 'Vivienda',
    location: '',
    approxAreaM2: 250,
    levelsCount: 2,
    leadArchitect: 'Arq. Esteban Guarderas',
    startDate: new Date().toISOString().split('T')[0],
    targetDeliveryDate: '',
    status: 'Planificación',
    priority: 'Media',
    estimatedBudget: 150000,
    approvedBudget: 0,
    clientRequirements: '',
    description: '',
    notes: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
    } else {
      setFormData({
        name: '',
        clientId: clients[0]?.id || '',
        type: 'Vivienda',
        location: '',
        approxAreaM2: 250,
        levelsCount: 2,
        leadArchitect: 'Arq. Esteban Guarderas',
        startDate: new Date().toISOString().split('T')[0],
        targetDeliveryDate: '',
        status: 'Planificación',
        priority: 'Media',
        estimatedBudget: 150000,
        approvedBudget: 0,
        clientRequirements: '',
        description: '',
        notes: ''
      });
    }
  }, [initialData, clients, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.clientId) return;
    await onSave(formData);
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
              disabled={Boolean(initialData)}
              value={formData.clientId || ''}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              <option value="">Seleccione un cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
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

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Arquitecto Responsable</label>
            <input
              type="text"
              placeholder="Arq. Nombre Apellido"
              value={formData.leadArchitect || ''}
              onChange={(e) => setFormData({ ...formData, leadArchitect: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            />
          </div>

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
              value={formData.targetDeliveryDate || ''}
              onChange={(e) => setFormData({ ...formData, targetDeliveryDate: e.target.value })}
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

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Presupuesto Estimado ($)</label>
            <input
              type="number"
              min="0"
              value={formData.estimatedBudget || ''}
              onChange={(e) => setFormData({ ...formData, estimatedBudget: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Presupuesto Aprobado ($)</label>
            <input
              type="number"
              min="0"
              value={formData.approvedBudget || 0}
              onChange={(e) => setFormData({ ...formData, approvedBudget: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500 font-mono"
            />
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
