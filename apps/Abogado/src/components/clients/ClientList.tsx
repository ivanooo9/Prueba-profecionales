import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  Briefcase,
  Building2,
  User,
  Filter,
  ChevronRight,
} from 'lucide-react';
import { Client, ClientType, ClientStatus, LegalCase } from '../../types';
import { EmptyState } from '../ui/EmptyState';

export interface ClientListProps {
  clients: Client[];
  cases: LegalCase[];
  onOpenNewClientModal: () => void;
  onEditClient: (client: Client) => void;
  onSelectClientDetail: (client: Client) => void;
  onSelectCase: (caseId: string) => void;
}

export const ClientList: React.FC<ClientListProps> = ({
  clients,
  cases,
  onOpenNewClientModal,
  onEditClient,
  onSelectClientDetail,
  onSelectCase,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('todos');

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.identification.includes(searchTerm) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      selectedTypeFilter === 'todos'
        ? true
        : c.clientType === selectedTypeFilter;

    return matchesSearch && matchesType;
  });

  const getClientCaseCount = (clientId: string) => {
    return cases.filter((c) => c.clientId === clientId).length;
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-slate-800" />
            Directorio de Clientes
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestión de Personas Naturales y Jurídicas del despacho jurídico
          </p>
        </div>

        <button
          onClick={onOpenNewClientModal}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, RUC o cédula..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="todos">Todos los Tipos</option>
            <option value="persona_natural">Persona Natural</option>
            <option value="persona_juridica">Persona Jurídica</option>
          </select>
        </div>
      </div>

      {/* Clients Cards Grid */}
      {filteredClients.length === 0 ? (
        <EmptyState
          title="No se encontraron clientes"
          description="Intente modificar el filtro de búsqueda o registre un nuevo cliente en el sistema."
          actionLabel="Registrar Cliente"
          onAction={onOpenNewClientModal}
          icon={Users}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            const caseCount = getClientCaseCount(client.id);
            const isCompany = client.clientType === 'persona_juridica';

            return (
              <div
                key={client.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-2.5 rounded-xl border ${
                          isCompany
                            ? 'bg-slate-100 text-slate-800 border-slate-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {isCompany ? (
                          <Building2 className="w-5 h-5" />
                        ) : (
                          <User className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] font-mono font-semibold uppercase text-slate-400">
                          {isCompany ? 'Persona Jurídica' : 'Persona Natural'}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 leading-snug">
                          {client.name}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600 mb-4">
                    <div className="flex items-center gap-2 font-mono text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="font-bold text-slate-500">
                        {client.identificationType.toUpperCase()}:
                      </span>
                      <span className="font-semibold text-slate-900">
                        {client.identification}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{client.email || 'Sin correo registrado'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-mono">{client.phone || 'Sin teléfono'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-800 font-semibold">
                    <Briefcase className="w-4 h-4 text-slate-500" />
                    <span>{caseCount} expediente(s)</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEditClient(client)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onSelectClientDetail(client)}
                      className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs flex items-center gap-1 transition"
                    >
                      <span>Ver Perfil</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
