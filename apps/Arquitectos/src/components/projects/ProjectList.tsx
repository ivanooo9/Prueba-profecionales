import React, { useState } from 'react';
import { Project, Client, ProjectType, ProjectStatus } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { PriorityBadge } from '../ui/PriorityBadge';
import { ProgressBar } from '../ui/ProgressBar';
import { EmptyState } from '../ui/EmptyState';
import {
  Building2,
  Plus,
  Search,
  LayoutGrid,
  List,
  MapPin,
  User,
  ExternalLink,
  Edit,
  Trash2
} from 'lucide-react';

interface ProjectListProps {
  projects: Project[];
  clients: Client[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectProject: (project: Project) => void;
  onOpenCreateModal: () => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (id: string | number) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  clients,
  searchQuery,
  onSearchChange,
  onSelectProject,
  onOpenCreateModal,
  onEditProject,
  onDeleteProject
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'all' || p.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Filter and Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar proyecto, código o cliente..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="all">Todos los Tipos</option>
            <option value="Vivienda">Vivienda</option>
            <option value="Edificio">Edificio</option>
            <option value="Remodelación">Remodelación</option>
            <option value="Diseño interior">Diseño interior</option>
            <option value="Comercial">Comercial</option>
            <option value="Urbanismo">Urbanismo</option>
            <option value="Otro">Otro</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="all">Todos los Estados</option>
            <option value="Planificación">Planificación</option>
            <option value="Diseño">Diseño</option>
            <option value="En desarrollo">En desarrollo</option>
            <option value="En revisión">En revisión</option>
            <option value="En construcción">En construcción</option>
            <option value="Finalizado">Finalizado</option>
            <option value="Archivado">Archivado</option>
          </select>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-white shadow-2xs text-arch-600' : 'text-slate-500'
              }`}
              title="Vista de Tarjetas"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'table' ? 'bg-white shadow-2xs text-arch-600' : 'text-slate-500'
              }`}
              title="Vista de Tabla"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-arch-600 hover:bg-arch-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo Proyecto
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filteredProjects.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No se encontraron proyectos"
          description="Intente modificar los filtros de búsqueda o registre un nuevo proyecto arquitectónico."
          actionLabel="Crear Proyecto"
          onAction={onOpenCreateModal}
        />
      ) : viewMode === 'grid' ? (
        /* Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((proj) => (
            <div
              key={proj.id}
              className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group"
            >
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                    {proj.code}
                  </span>
                  <StatusBadge status={proj.status} size="sm" />
                </div>

                <div>
                  <h3
                    onClick={() => onSelectProject(proj)}
                    className="text-base font-bold text-slate-900 group-hover:text-arch-600 cursor-pointer transition-colors line-clamp-1"
                  >
                    {proj.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                    <User className="w-3.5 h-3.5" />
                    <span className="truncate font-medium">{proj.clientName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{proj.location}</span>
                </div>

                <div className="pt-2">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-slate-500 font-medium">Progreso</span>
                    <span className="font-mono font-bold text-slate-700">{proj.progress}%</span>
                  </div>
                  <ProgressBar progress={proj.progress} showLabel={false} size="sm" />
                </div>
              </div>

              <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="font-mono">
                  <span className="text-[10px] text-slate-400 block uppercase">Presupuesto</span>
                  <span className="font-bold text-slate-800">${proj.estimatedBudget.toLocaleString()}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEditProject(proj)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteProject(proj.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onSelectProject(proj)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 font-semibold text-white bg-arch-600 hover:bg-arch-700 rounded-lg shadow-2xs transition-colors"
                  >
                    <span>Ver Detalle</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Nombre del Proyecto</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Progreso</th>
                  <th className="py-3 px-4">Presupuesto</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{p.code}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => onSelectProject(p)}
                        className="font-bold text-slate-900 hover:text-arch-600 text-left transition-colors"
                      >
                        {p.name}
                      </button>
                      <p className="text-[11px] text-slate-500 truncate max-w-xs">{p.location}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{p.clientName}</td>
                    <td className="py-3 px-4 text-slate-600">{p.type}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={p.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 w-32">
                      <ProgressBar progress={p.progress} size="sm" />
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      ${p.estimatedBudget.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => onSelectProject(p)}
                        className="px-2.5 py-1 text-arch-600 bg-arch-50 hover:bg-arch-100 font-semibold rounded transition-colors"
                      >
                        Ver Detalle
                      </button>
                      <button
                        onClick={() => onEditProject(p)}
                        className="p-1 text-slate-400 hover:text-slate-700"
                        title="Editar"
                      >
                        <Edit className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
