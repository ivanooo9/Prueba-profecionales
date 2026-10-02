import React from 'react';
import { Modal } from '../ui/Modal';
import { DentalConsent } from '../../types';
import { CheckCircle2, ShieldCheck, Printer, Calendar, User, FileText, Ban } from 'lucide-react';

interface ConsentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  consent: DentalConsent | null;
}

export const ConsentDetailModal: React.FC<ConsentDetailModalProps> = ({
  isOpen,
  onClose,
  consent,
}) => {
  if (!consent) return null;

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SIGNED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> FIRMADO (INMUTABLE)
          </span>
        );
      case 'ISSUED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            EMITIDO (PENDIENTE DE FIRMA)
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
            <Ban className="w-3.5 h-3.5" /> CANCELADO
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-800 border border-slate-200">
            BORRADOR (DRAFT)
          </span>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Expediente de Consentimiento Informado"
      subtitle={`Documento Clínico Oficial #${consent.id}`}
      maxWidth="2xl"
    >
      <div className="space-y-4 text-left">
        {/* Encabezado y Estado */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado Documental</div>
            <div className="mt-1">{getStatusBadge(consent.status)}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400 font-semibold">FECHA DE REGISTRO</div>
            <div className="text-xs font-bold text-slate-800">
              {new Date(consent.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Título y Datos del Paciente */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            {consent.title}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500">Paciente (Snapshot):</span>
              <div className="font-bold text-slate-900">{consent.patientNameSnapshot}</div>
              {consent.patientIdNumberSnapshot && (
                <div className="text-[11px] text-slate-600">CI/DNI: {consent.patientIdNumberSnapshot}</div>
              )}
            </div>

            <div>
              <span className="text-slate-500">Plantilla de Origen:</span>
              <div className="font-semibold text-slate-800">
                {consent.template ? `${consent.template.name} (v${consent.templateVersion || 1})` : 'Redacción clínica directa'}
              </div>
              {consent.treatmentPlan && (
                <div className="text-[11px] text-cyan-700">Plan: {consent.treatmentPlan.title}</div>
              )}
              {consent.treatmentItem && (
                <div className="text-[11px] text-slate-600">Procedimiento: {consent.treatmentItem.procedureName}</div>
              )}
            </div>
          </div>
        </div>

        {/* Cuerpo del Documento (Snapshot Inmutable) */}
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-cyan-600" />
            Contenido Clínico e Información Consentida
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto text-slate-800">
            {consent.contentSnapshot}
          </div>
        </div>

        {/* Sección de Firmas y Trazabilidad */}
        {consent.status === 'SIGNED' && (
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Suscripciones y Evidencia de Aceptación
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Firma Paciente */}
              <div className="bg-white border border-emerald-100 rounded-lg p-3 text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Firma del Paciente</div>
                {consent.patientSignatureData ? (
                  <img
                    src={consent.patientSignatureData}
                    alt="Firma del paciente"
                    className="h-16 mx-auto my-1 object-contain"
                  />
                ) : (
                  <div className="h-12 flex items-center justify-center text-xs text-slate-400 italic">
                    Aceptación informada registrada
                  </div>
                )}
                <div className="border-t border-slate-200 pt-1 text-xs font-bold text-slate-900">
                  {consent.signedByPatientName}
                </div>
                <div className="text-[10px] text-slate-500">
                  {consent.patientSignedAt ? new Date(consent.patientSignedAt).toLocaleString() : ''}
                </div>
              </div>

              {/* Firma Profesional */}
              <div className="bg-white border border-emerald-100 rounded-lg p-3 text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Profesional Responsable</div>
                {consent.professionalSignatureData ? (
                  <img
                    src={consent.professionalSignatureData}
                    alt="Firma del profesional"
                    className="h-16 mx-auto my-1 object-contain"
                  />
                ) : (
                  <div className="h-12 flex items-center justify-center text-xs text-emerald-700 font-semibold">
                    Certificación Profesional
                  </div>
                )}
                <div className="border-t border-slate-200 pt-1 text-xs font-bold text-slate-900">
                  {consent.signedByProfessionalName}
                </div>
                <div className="text-[10px] text-slate-500">
                  {consent.professionalSignedAt ? new Date(consent.professionalSignedAt).toLocaleString() : ''}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Motivo de Cancelación */}
        {consent.status === 'CANCELLED' && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Ban className="w-3.5 h-3.5 text-rose-600" />
              Documento Cancelado
            </div>
            <div>
              <strong>Fecha:</strong> {consent.cancelledAt ? new Date(consent.cancelledAt).toLocaleString() : 'N/A'}
            </div>
            <div>
              <strong>Motivo:</strong> {consent.cancellationReason || 'Sin motivo especificado'}
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-xl transition flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
};
