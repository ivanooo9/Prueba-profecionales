import React, { useState } from 'react';
import { Client, Project } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';
import {
  Users,
  Plus,
  Search,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Edit,
  Trash2,
  ExternalLink
} from 'lucide-react';

interface ClientListProps {
  clients: Client[];
  projects: Project[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenCreateModal: () => void;
  onEditClient: (client: Client) => void;
  onDeleteClient: (id: string | number) => void;
  onSelectProject: (project: Project) => void;
}

export const ClientList: React.FC<ClientListProps> = ({
  clients,
  projects,
  searchQuery,
  onSearchChange,
  onOpenCreateModal,
  onEditClient,
  onDeleteClient,
  onSelectProject
}) => {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedClientForProfile, setSelectedClientForProfile] = useState<Client | null>(null);

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.taxId.includes(searchQuery) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = typeFilter === 'all' || c.type === typeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Search & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar cliente, RUC, correo o contacto..."
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
            <option value="Persona">Persona</option>
            <option value="Empresa">Empresa</option>
          </select>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-arch-600 hover:bg-arch-700 rounded-lg shadow-xs transition-colors self-end sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nuevo Cliente
        </button>
      </div>

      {/* Client List Grid */}
      {filteredClients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No se encontraron clientes"
          description="Cree un nuevo cliente para asociarle proyectos arquitectónicos."
          actionLabel="Registrar Cliente"
          onAction={onOpenCreateModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => {
            const clientProjects = projects.filter((p) => p.clientId === client.id);
            return (
              <div
                key={client.id}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded-full">
                      {client.type}
                    </span>
                    <StatusBadge status={client.status} size="sm" />
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">{client.name}</h3>
                    {client.contactPerson && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Contacto: <strong className="text-slate-700">{client.contactPerson}</strong>
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-slate-400 font-mono" />
                      <span className="font-mono text-[11px]">RUC/CI: {client.taxId || 'N/A'}</span>
                    </div>
                    {client.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono text-[11px]">{client.phone}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate font-mono text-[11px]">{client.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => setSelectedClientForProfile(client)}
                    className="font-semibold text-arch-700 hover:text-arch-800 flex items-center gap-1"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{clientProjects.length} Proyectos</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditClient(client)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
                      title="Editar Cliente"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteClient(client.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      title="Eliminar Cliente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Client Profile Modal showing linked projects */}
      {selectedClientForProfile && (
        <Modal
          isOpen={!!selectedClientForProfile}
          onClose={() => setSelectedClientForProfile(null)}
          title={`Perfil del Cliente — ${selectedClientForProfile.name}`}
          subtitle="Información completa y historial de proyectos asociados"
          maxWidth="2xl"
        >
          <div className="space-y-6 text-xs">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <p className="text-slate-500 font-medium">Razón Social / Nombre</p>
                <p className="font-bold text-slate-900 mt-0.5">{selectedClientForProfile.name}</p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">RUC / Cédula</p>
                <p className="font-mono font-bold text-slate-900 mt-0.5">{selectedClientForProfile.taxId}</p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Teléfono</p>
                <p className="font-mono text-slate-800 mt-0.5">{selectedClientForProfile.phone}</p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Correo Electrónico</p>
                <p className="font-mono text-slate-800 mt-0.5">{selectedClientForProfile.email}</p>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-3 text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-arch-600" />
                <span>Proyectos Asociados ({projects.filter((p) => p.clientId === selectedClientForProfile.id).length})</span>
              </h4>

              {projects.filter((p) => p.clientId === selectedClientForProfile.id).length === 0 ? (
                <p className="text-slate-500 text-xs py-4 text-center">Este cliente no tiene proyectos registrados actualmente.</p>
              ) : (
                <div className="space-y-3">
                  {projects
                    .filter((p) => p.clientId === selectedClientForProfile.id)
                    .map((p) => (
                      <div
                        key={p.id}
                        className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between hover:border-arch-300 transition-colors"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{p.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{p.code} • {p.type} • {p.location}</p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedClientForProfile(null);
                            onSelectProject(p);
                          }}
                          className="px-3 py-1 bg-arch-50 text-arch-700 hover:bg-arch-100 font-semibold rounded text-xs inline-flex items-center gap-1"
                        >
                          <span>Ver</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
