import React, { useState } from 'react';
import { Deliverable, Project } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { EmptyState } from '../ui/EmptyState';
import {
  PackageCheck,
  Plus,
  Search,
  Calendar,
  User,
  Edit,
  CheckCircle,
  FileCheck
} from 'lucide-react';

interface DeliverableListProps {
  deliverables: Deliverable[];
  projects: Project[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenCreateModal: () => void;
  onEditDeliverable: (deliv: Deliverable) => void;
}

export const DeliverableList: React.FC<DeliverableListProps> = ({
  deliverables,
  projects,
  searchQuery,
  onSearchChange,
  onOpenCreateModal,
  onEditDeliverable,
}) => {
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredDeliverables = deliverables.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.type.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProject = projectFilter === 'all' || String(d.projectId) === String(projectFilter);
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;

    return matchesSearch && matchesProject && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar entregable, tipo o proyecto..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            />
          </div>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 max-w-[200px]"
          >
            <option value="all">Todos los Proyectos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="all">Todos los Estados</option>
            <option value="Pendiente">Pendiente</option>
            <option value="En desarrollo">En desarrollo</option>
            <option value="En revisión">En revisión</option>
            <option value="Aprobado">Aprobado</option>
            <option value="Entregado">Entregado</option>
          </select>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-arch-600 hover:bg-arch-700 rounded-lg shadow-xs transition-colors self-end sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nuevo Entregable
        </button>
      </div>

      {/* Deliverable Matrix Grid */}
      {filteredDeliverables.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title="No hay entregables registrados"
          description="Cree un entregable para dar seguimiento a planos, renders y documentos finales."
          actionLabel="Registrar Entregable"
          onAction={onOpenCreateModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredDeliverables.map((d) => (
            <div
              key={d.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-all duration-200 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-arch-50 text-arch-700 rounded-md font-mono">
                    {d.type}
                  </span>
                  <StatusBadge status={d.status} size="sm" />
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug">{d.name}</h3>

                <p className="text-xs text-slate-600 font-medium">
                  Proyecto: <span className="text-slate-800 font-bold">{d.projectName}</span>
                </p>

                {d.notes && (
                  <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                    "{d.notes}"
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4 text-slate-500 font-mono">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {d.assignedTo}
                  </span>
                  <span className="flex items-center gap-1 font-bold text-slate-700">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {d.dueDate}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEditDeliverable(d)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
