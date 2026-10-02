import React from 'react';
import { Modal } from '../ui/Modal';
import { Client, LegalCase } from '../../types';
import { Mail, Phone, MapPin, Building2, Briefcase, FileText, Calendar } from 'lucide-react';

export interface ClientDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  clientCases: LegalCase[];
  onSelectCase: (caseId: string) => void;
}

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({
  isOpen,
  onClose,
  client,
  clientCases,
  onSelectCase,
}) => {
  if (!client) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Perfil de Cliente: ${client.name}`}
      subtitle={`Ficha de información general y expedientes asociados`}
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Header Summary Card */}
        <div className="p-4 rounded-2xl bg-indigo-900 text-white flex items-start justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase bg-indigo-800 text-indigo-200 px-2 py-0.5 rounded font-bold">
              {client.clientType === 'persona_juridica' ? 'Persona Jurídica' : 'Persona Natural'}
            </span>
            <h2 className="text-xl font-extrabold mt-1">{client.name}</h2>
            <p className="text-xs text-indigo-200 mt-0.5 font-mono">
              {client.identificationType.toUpperCase()}: {client.identification}
            </p>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black">{clientCases.length}</span>
            <span className="text-[10px] text-indigo-200 block font-semibold uppercase">
              Casos Asociados
            </span>
          </div>
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-slate-700 font-bold">
              <Mail className="w-4 h-4 text-indigo-600" />
              <span>Correo Electrónico</span>
            </div>
            <p className="text-slate-900 font-medium">{client.email || 'No registrado'}</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-slate-700 font-bold">
              <Phone className="w-4 h-4 text-indigo-600" />
              <span>Teléfono Directo</span>
            </div>
            <p className="text-slate-900 font-mono font-medium">{client.phone || 'No registrado'}</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 sm:col-span-2">
            <div className="flex items-center gap-2 text-slate-700 font-bold">
              <MapPin className="w-4 h-4 text-indigo-600" />
              <span>Dirección Domiciliaria / Procesal</span>
            </div>
            <p className="text-slate-900 font-medium">{client.address || 'Sin dirección registrada'}</p>
          </div>
        </div>

        {/* Corporate Legal Rep info if applicable */}
        {client.clientType === 'persona_juridica' && (
          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs">
            <h4 className="font-bold text-indigo-900 flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-indigo-700" />
              Información Empresarial
            </h4>
            <p className="text-indigo-800">
              <strong>Representante Legal:</strong> {client.legalRepresentative || 'No especificado'}
            </p>
          </div>
        )}

        {/* Associated Cases List */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-indigo-600" />
            Expedientes y Procesos Judiciales ({clientCases.length})
          </h3>

          {clientCases.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
              Este cliente no posee expedientes activos registrados.
            </div>
          ) : (
            <div className="space-y-2">
              {clientCases.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    onClose();
                    onSelectCase(c.id);
                  }}
                  className="p-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition cursor-pointer flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {c.caseNumber}
                      </span>
                      <span className="text-[10px] font-bold text-slate-600">{c.legalArea}</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 mt-1">{c.title}</h4>
                    <p className="text-[11px] text-slate-500">{c.courtName}</p>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {c.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Client Notes */}
        {client.notes && (
          <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs">
            <h4 className="font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Observaciones Internas
            </h4>
            <p className="text-slate-600">{client.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
};
