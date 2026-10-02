import React, { useState, useEffect } from 'react';
import { DentalConsent } from '../../types';
import { dentistryApi } from '../../services/api/dentistryApi';
import { dentalService } from '../../services/dentalService';
import { EmptyState } from '../ui/EmptyState';
import { ConsentModal } from './ConsentModal';
import { SignConsentModal } from './SignConsentModal';
import { ConsentDetailModal } from './ConsentDetailModal';
import {
  FileCheck,
  Plus,
  FileText,
  CheckCircle2,
  Clock,
  Ban,
  Edit3,
  Send,
  PenTool,
  Eye,
  AlertCircle,
} from 'lucide-react';

interface ConsentListProps {
  patientIdFilter?: string;
}

export const ConsentList: React.FC<ConsentListProps> = ({ patientIdFilter }) => {
  const [consents, setConsents] = useState<DentalConsent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [consentToEdit, setConsentToEdit] = useState<DentalConsent | null>(null);
  const [consentToSign, setConsentToSign] = useState<DentalConsent | null>(null);
  const [consentToView, setConsentToView] = useState<DentalConsent | null>(null);

  const orgId = dentalService.getOrganizationId() || 11;
  const numPatientId = patientIdFilter ? parseInt(patientIdFilter, 10) : undefined;

  const loadConsents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dentistryApi.getConsents(orgId, {
        patientId: numPatientId && !isNaN(numPatientId) ? numPatientId : undefined,
      });
      setConsents(data);
    } catch (err: any) {
      console.error('Error al cargar consentimientos:', err);
      setError(err.message || 'Error al cargar consentimientos informados.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConsents();
  }, [patientIdFilter, orgId]);

  const handleIssueConsent = async (consent: DentalConsent) => {
    if (!window.confirm(`¿Confirma emitir formalmente el consentimiento "${consent.title}"?\n\nAl emitirlo, el texto y datos del paciente quedarán congelados de forma permanente para su firma.`)) {
      return;
    }

    try {
      await dentistryApi.issueConsent(orgId, consent.id);
      await loadConsents();
    } catch (err: any) {
      alert(err.message || 'Error al emitir el consentimiento.');
    }
  };

  const handleCancelConsent = async (consent: DentalConsent) => {
    const reason = window.prompt(
      `Ingrese el motivo obligatorio para cancelar el consentimiento "${consent.title}":`
    );
    if (!reason || !reason.trim()) {
      if (reason !== null) alert('El motivo de cancelación es obligatorio.');
      return;
    }

    try {
      await dentistryApi.cancelConsent(orgId, consent.id, reason.trim());
      await loadConsents();
    } catch (err: any) {
      alert(err.message || 'Error al cancelar el consentimiento.');
    }
  };

  const filteredConsents = consents.filter((c) => {
    if (statusFilter === 'ALL') return true;
    return c.status === statusFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SIGNED':
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Firmado
          </span>
        );
      case 'ISSUED':
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Emitido
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
            <Ban className="w-3 h-3" /> Cancelado
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            Borrador
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header y Acciones */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-cyan-600" />
            Consentimientos Informados Odontológicos
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Plantillas versionadas, snapshots inmutables y suscripción con trazabilidad clínica
          </p>
        </div>

        <button
          onClick={() => {
            setConsentToEdit(null);
            setIsCreateModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" /> Nuevo Consentimiento
        </button>
      </div>

      {/* Filtros de estado */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'ALL', label: 'Todos' },
          { id: 'DRAFT', label: 'Borradores' },
          { id: 'ISSUED', label: 'Emitidos' },
          { id: 'SIGNED', label: 'Firmados' },
          { id: 'CANCELLED', label: 'Cancelados' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition ${
              statusFilter === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label} ({tab.id === 'ALL' ? consents.length : consents.filter((c) => c.status === tab.id).length})
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Listado de Consentimientos */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
          Cargando consentimientos informados...
        </div>
      ) : filteredConsents.length === 0 ? (
        <EmptyState
          title="Sin consentimientos registrados"
          description={
            statusFilter === 'ALL'
              ? 'No hay consentimientos informados generados para este paciente.'
              : `No hay consentimientos en estado ${statusFilter}.`
          }
          icon={<FileText className="w-8 h-8 text-slate-400" />}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredConsents.map((consent) => (
            <div
              key={consent.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-cyan-300 transition space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400">#{consent.id}</span>
                    <h4 className="text-sm font-bold text-slate-900">{consent.title}</h4>
                    {getStatusBadge(consent.status)}
                  </div>
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                    <span>
                      <strong>Paciente:</strong> {consent.patientNameSnapshot}
                    </span>
                    {consent.template && (
                      <span className="text-cyan-700 font-medium">
                        Plantilla: {consent.template.name} (v{consent.templateVersion || 1})
                      </span>
                    )}
                    <span>
                      <strong>Fecha:</strong> {new Date(consent.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Acciones por Estado */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Visualización siempre disponible */}
                  <button
                    onClick={() => setConsentToView(consent)}
                    className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> Ver
                  </button>

                  {/* Acciones en DRAFT */}
                  {consent.status === 'DRAFT' && (
                    <>
                      <button
                        onClick={() => {
                          setConsentToEdit(consent);
                          setIsCreateModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 text-xs font-semibold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-lg transition flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Editar
                      </button>
                      <button
                        onClick={() => handleIssueConsent(consent)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition flex items-center gap-1 shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" /> Emitir
                      </button>
                      <button
                        onClick={() => handleCancelConsent(consent)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-lg transition"
                      >
                        Cancelar
                      </button>
                    </>
                  )}

                  {/* Acciones en ISSUED */}
                  {consent.status === 'ISSUED' && (
                    <>
                      <button
                        onClick={() => setConsentToSign(consent)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition flex items-center gap-1 shadow-xs"
                      >
                        <PenTool className="w-3.5 h-3.5" /> Firmar
                      </button>
                      <button
                        onClick={() => handleCancelConsent(consent)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-lg transition"
                      >
                        Cancelar
                      </button>
                    </>
                  )}

                  {/* Estado SIGNED (terminal) */}
                  {consent.status === 'SIGNED' && (
                    <span className="text-[11px] text-emerald-700 font-semibold px-2 py-1 bg-emerald-50 rounded-lg">
                      Suscrito legalmente
                    </span>
                  )}
                </div>
              </div>

              {/* Extracto de contenido snapshot */}
              <div className="text-xs text-slate-600 font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-2">
                {consent.contentSnapshot}
              </div>

              {/* Trazabilidad adicional */}
              {(consent.treatmentPlan || consent.appointment || consent.signedByPatientName) && (
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                  {consent.treatmentPlan && (
                    <span className="bg-slate-100 px-2 py-0.5 rounded-md">
                      Plan: {consent.treatmentPlan.title}
                    </span>
                  )}
                  {consent.appointment && (
                    <span className="bg-slate-100 px-2 py-0.5 rounded-md">
                      Cita: {new Date(consent.appointment.scheduledAt).toLocaleDateString()}
                    </span>
                  )}
                  {consent.signedByPatientName && (
                    <span className="text-emerald-700 font-medium">
                      Firmado por: {consent.signedByPatientName} ({consent.patientSignedAt ? new Date(consent.patientSignedAt).toLocaleDateString() : ''})
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modales */}
      <ConsentModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setConsentToEdit(null);
        }}
        patientId={patientIdFilter || '11'}
        consentToEdit={consentToEdit}
        onSaved={loadConsents}
      />

      {consentToSign && (
        <SignConsentModal
          isOpen={true}
          onClose={() => setConsentToSign(null)}
          consent={consentToSign}
          onSigned={loadConsents}
        />
      )}

      {consentToView && (
        <ConsentDetailModal
          isOpen={true}
          onClose={() => setConsentToView(null)}
          consent={consentToView}
        />
      )}
    </div>
  );
};
