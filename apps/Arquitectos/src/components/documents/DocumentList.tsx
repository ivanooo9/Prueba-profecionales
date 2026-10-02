import React, { useState } from 'react';
import { DocumentMetadata, Project } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { EmptyState } from '../ui/EmptyState';
import {
  FileText,
  Plus,
  Search,
  Download,
  Clock,
  Edit,
  FileCode,
  Layers
} from 'lucide-react';

interface DocumentListProps {
  documents: DocumentMetadata[];
  projects: Project[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenCreateModal: () => void;
  onEditDocument: (doc: DocumentMetadata) => void;
  onViewVersions: (doc: DocumentMetadata) => void;
  onDownloadDocument: (doc: DocumentMetadata) => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  projects,
  searchQuery,
  onSearchChange,
  onOpenCreateModal,
  onEditDocument,
  onViewVersions,
  onDownloadDocument,
}) => {
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesProject = projectFilter === 'all' || String(doc.projectId) === projectFilter;
    const matchesType =
      typeFilter === 'all' ||
      doc.type === typeFilter ||
      doc.documentType === typeFilter;

    return matchesSearch && matchesProject && matchesType;
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
              placeholder="Buscar por nombre de plano o proyecto..."
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
              <option key={p.id} value={String(p.id)}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="all">Todos los Tipos</option>
            <option value="Plano">Plano</option>
            <option value="Render">Render</option>
            <option value="Memoria">Memoria</option>
            <option value="Permiso">Permiso</option>
            <option value="Especificación">Especificación</option>
            <option value="Contrato">Contrato</option>
            <option value="Presupuesto">Presupuesto</option>
            <option value="Informe">Informe</option>
            <option value="Otro">Otro</option>
          </select>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-arch-600 hover:bg-arch-700 rounded-lg shadow-xs transition-colors self-end sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nuevo Documento
        </button>
      </div>

      {/* Document Table */}
      {filteredDocs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No hay documentos técnicos registrados"
          description="Registre planos, renders, memorias y documentación vinculada a sus proyectos."
          actionLabel="Registrar Documento"
          onAction={onOpenCreateModal}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Nombre del Documento</th>
                  <th className="py-3 px-4">Proyecto / Etapa</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Versión</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocs.map((doc) => {
                  const versionNum = doc.currentVersion?.versionNumber || 1;
                  const totalVersions = doc.versionsCount || doc.versions?.length || (doc.currentVersion ? 1 : 0);

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <FileCode className="w-4 h-4 text-arch-600 shrink-0" />
                          <div>
                            <p className="font-bold text-slate-900 font-mono">{doc.name}</p>
                            {doc.description && (
                              <p className="text-[11px] text-slate-500 truncate max-w-xs">{doc.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800">{doc.projectName}</p>
                        {doc.stageName && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                            <Layers className="w-3 h-3 text-slate-400" />
                            {doc.stageName}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-600">
                        {doc.type || doc.documentType || 'Plano'}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => onViewVersions(doc)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-mono font-bold text-[11px] transition-colors cursor-pointer"
                          title="Ver historial de versiones"
                        >
                          <Clock className="w-3 h-3 text-slate-400" />
                          v{versionNum}
                          <span className="text-[10px] text-slate-500 font-normal">
                            ({totalVersions} {totalVersions === 1 ? 'versión' : 'versiones'})
                          </span>
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={doc.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {totalVersions > 0 && (
                          <button
                            onClick={() => onDownloadDocument(doc)}
                            className="p-1.5 text-slate-500 hover:text-arch-600 hover:bg-slate-100 rounded transition-colors cursor-pointer inline-flex items-center"
                            title="Descargar archivo vigente"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onViewVersions(doc)}
                          className="p-1.5 text-slate-500 hover:text-arch-600 hover:bg-slate-100 rounded transition-colors cursor-pointer inline-flex items-center"
                          title="Historial de versiones y subir nueva"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEditDocument(doc)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer inline-flex items-center"
                          title="Editar metadatos"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
