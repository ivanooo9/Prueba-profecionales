import React, { useState } from 'react';
import {
  Briefcase,
  Search,
  Plus,
  Filter,
  Eye,
  Edit,
  LayoutGrid,
  List as ListIcon,
  Scale,
  Calendar,
  Building,
} from 'lucide-react';
import { LegalCase, LegalArea, CaseStatus, Priority } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { PriorityBadge } from '../ui/PriorityBadge';
import { EmptyState } from '../ui/EmptyState';

export interface CaseListProps {
  cases: LegalCase[];
  onOpenNewCaseModal: () => void;
  onEditCase: (caseItem: LegalCase) => void;
  onSelectCaseDetail: (caseId: string) => void;
}

export const CaseList: React.FC<CaseListProps> = ({
  cases,
  onOpenNewCaseModal,
  onEditCase,
  onSelectCaseDetail,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('todas');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.courtName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesArea = selectedArea === 'todas' ? true : c.legalArea === selectedArea;
    const matchesStatus = selectedStatus === 'todos' ? true : c.status === selectedStatus;

    return matchesSearch && matchesArea && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-slate-800" />
            Expedientes y Casos Judiciales
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Centro de gestión procesal y seguimiento de juicios
          </p>
        </div>

        <button
          onClick={onOpenNewCaseModal}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Aperturar Caso</span>
        </button>
      </div>

      {/* Filter & View Switcher */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nro. expediente, título o cliente..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="todas">Todas las Áreas</option>
              <option value="Civil">Civil</option>
              <option value="Penal">Penal</option>
              <option value="Laboral">Laboral</option>
              <option value="Familia">Familia</option>
              <option value="Mercantil">Mercantil</option>
              <option value="Administrativo">Administrativo</option>
              <option value="Constitucional">Constitucional</option>
            </select>
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="todos">Todos los Estados</option>
            <option value="Nuevo">Nuevo</option>
            <option value="En proceso">En proceso</option>
            <option value="En espera">En espera</option>
            <option value="Audiencia">Audiencia</option>
            <option value="Cerrado">Cerrado</option>
            <option value="Archivado">Archivado</option>
          </select>

          {/* Grid / Table View Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'table' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-500'
              }`}
              title="Vista de Tabla"
            >
              <ListIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-500'
              }`}
              title="Vista de Tarjetas"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {filteredCases.length === 0 ? (
        <EmptyState
          title="No se encontraron expedientes"
          description="Ajuste los criterios de búsqueda o aperture un nuevo caso en el sistema."
          actionLabel="Aperturar Caso"
          onAction={onOpenNewCaseModal}
          icon={Briefcase}
        />
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="p-4">Expediente / Caso</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Área & Trámite</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4">Prioridad</th>
                  <th className="p-4">Abogado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCases.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50/80 transition cursor-pointer"
                    onClick={() => onSelectCaseDetail(c.id)}
                  >
                    <td className="p-4">
                      <span className="text-[11px] font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 block w-fit mb-1">
                        {c.caseNumber}
                      </span>
                      <div className="font-bold text-slate-900 leading-snug">{c.title}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{c.courtName}</div>
                    </td>
                    <td className="p-4 font-semibold text-slate-800">{c.clientName}</td>
                    <td className="p-4">
                      <span className="font-bold text-slate-900 block">{c.legalArea}</span>
                      <span className="text-[11px] text-slate-500">{c.processType}</span>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="p-4">
                      <PriorityBadge priority={c.priority} />
                    </td>
                    <td className="p-4 text-slate-600 font-medium">{c.assignedLawyer}</td>
                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onEditCase(c)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                          title="Editar Caso"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onSelectCaseDetail(c.id)}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Expediente</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCases.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelectCaseDetail(c.id)}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 hover:border-slate-300 hover:shadow-sm transition cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {c.caseNumber}
                  </span>
                  <StatusBadge status={c.status} size="sm" />
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug mb-1">
                  {c.title}
                </h3>
                <p className="text-xs text-slate-700 font-semibold mb-3">{c.clientName}</p>

                <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-bold text-[10px] uppercase">Área</span>
                    <span className="font-bold text-slate-800">{c.legalArea}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-bold text-[10px] uppercase">Juzgado</span>
                    <span className="font-medium text-slate-700 truncate max-w-[160px]">
                      {c.courtName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-bold text-[10px] uppercase">Cuantía</span>
                    <span className="font-mono font-bold text-slate-900">
                      {c.claimAmount || 'Sin cuantía'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <PriorityBadge priority={c.priority} />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCaseDetail(c.id);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs flex items-center gap-1 transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver Expediente</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
