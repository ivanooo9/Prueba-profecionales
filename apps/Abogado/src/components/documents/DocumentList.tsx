import React, { useState } from 'react';
import {
  FileText,
  Search,
  Plus,
  Filter,
  FileCode,
  FileCheck,
} from 'lucide-react';
import { LegalDocument, LegalCase } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { EmptyState } from '../ui/EmptyState';

export interface DocumentListProps {
  documents: LegalDocument[];
  cases: LegalCase[];
  onOpenNewDocumentModal: () => void;
  onSelectCase: (caseId: string) => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  cases,
  onOpenNewDocumentModal,
  onSelectCase,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('todos');

  const filteredDocs = documents.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.description || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'todos' ? true : d.type === typeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-slate-800" />
            Repositorio de Documentos Legal
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro de metadatos de escritos, demandas, providencias y contratos
          </p>
        </div>

        <button
          onClick={onOpenNewDocumentModal}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Documento</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por documento o nro. expediente..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="todos">Todas las Categorías</option>
            <option value="Demanda">Demanda</option>
            <option value="Contestación">Contestación</option>
            <option value="Providencia">Providencia</option>
            <option value="Prueba">Prueba</option>
            <option value="Sentencia">Sentencia</option>
            <option value="Contrato">Contrato</option>
          </select>
        </div>
      </div>

      {/* Document List */}
      {filteredDocs.length === 0 ? (
        <EmptyState
          title="No hay documentos registrados"
          description="Añada metadatos de las piezas procesales del despacho."
          actionLabel="Registrar Documento"
          onAction={onOpenNewDocumentModal}
          icon={FileText}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 hover:border-slate-300 hover:shadow-sm transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    onClick={() => onSelectCase(doc.caseId)}
                    className="text-[11px] font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 cursor-pointer hover:underline"
                  >
                    {doc.caseNumber}
                  </span>
                  <StatusBadge status={doc.status} size="sm" />
                </div>

                <div className="flex items-start gap-3 my-2">
                  <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                    <FileCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 leading-snug">{doc.name}</h3>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded inline-block mt-1">
                      {doc.type} &bull; .{doc.fileExtension}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-2">
                  {doc.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 mt-4">
                <span>Ingresado: {doc.uploadDate}</span>
                <span>Por: {doc.uploadedBy}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
