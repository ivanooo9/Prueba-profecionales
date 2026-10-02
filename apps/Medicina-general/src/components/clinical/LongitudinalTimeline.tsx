import React from 'react';
import { Calendar, FileText, Pill, Activity, ShieldCheck } from 'lucide-react';
import type { TimelineEvent } from '../../services/clinical/clinicalSelectors';

export interface LongitudinalTimelineProps {
  events: TimelineEvent[];
  onOpenSoapModal?: (patientId: string, consultationId?: string) => void;
  onOpenPrescriptionModal?: (patientId: string, consultationId?: string, prescriptionId?: string) => void;
}

export const LongitudinalTimeline: React.FC<LongitudinalTimelineProps> = ({
  events,
  onOpenSoapModal,
  onOpenPrescriptionModal,
}) => {
  if (events.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500">
        <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm font-semibold">No se registran eventos clínicos anteriores en este expediente.</p>
      </div>
    );
  }

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'CONSULTATION':
        return <FileText className="w-4 h-4 text-sky-600" />;
      case 'PRESCRIPTION':
        return <Pill className="w-4 h-4 text-amber-600" />;
      case 'LAB_RESULT':
        return <Activity className="w-4 h-4 text-emerald-600" />;
      case 'IMAGING':
      case 'DOCUMENT':
      default:
        return <ShieldCheck className="w-4 h-4 text-purple-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Calendar className="w-4 h-4 text-sky-600" />
          <span>Historial Clínico Longitudinal ({events.length} Registros)</span>
        </h3>
        <span className="text-xs text-slate-500 font-mono">Orden Cronológico Descendente</span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {events.map((evt) => (
          <div key={evt.id} className="relative group">
            {/* Dot Icon */}
            <div className="absolute -left-6 top-1.5 p-1 rounded-full bg-white border border-slate-300 group-hover:border-sky-500 transition shadow-xs">
              {getEventIcon(evt.type)}
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 hover:border-slate-300 transition shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono text-sky-700 font-bold">
                    {new Date(evt.date).toLocaleString('es-EC')}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span>{evt.title}</span>
                    {evt.badgeText && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border bg-slate-100 text-slate-700 border-slate-200">
                        {evt.badgeText}
                      </span>
                    )}
                  </h4>
                  {evt.subtitle && <p className="text-[11px] text-slate-500">{evt.subtitle}</p>}
                </div>

                {/* Quick actions per event */}
                <div className="flex items-center gap-2">
                  {evt.type === 'CONSULTATION' && onOpenSoapModal && (
                    <button
                      onClick={() => onOpenSoapModal(evt.patientId, evt.id)}
                      className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-[11px] border border-sky-200 transition"
                    >
                      Ver Detalle SOAP
                    </button>
                  )}
                  {evt.type === 'PRESCRIPTION' && onOpenPrescriptionModal && (
                    <button
                      onClick={() => onOpenPrescriptionModal(evt.patientId, undefined, evt.id)}
                      className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold text-[11px] border border-amber-200 transition"
                    >
                      Ver Receta SRI
                    </button>
                  )}
                </div>
              </div>

              {evt.description && (
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono whitespace-pre-wrap">
                  {evt.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
