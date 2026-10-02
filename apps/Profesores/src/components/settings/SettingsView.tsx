import React from 'react';
import { Settings, User, Building2, Bell, BookOpen, ShieldCheck } from 'lucide-react';
import { UserSession, Organization } from '../../services/api/organizationApi';

export interface SettingsViewProps {
  currentUser?: UserSession | null;
  activeOrganization?: Organization | null;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  activeOrganization,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-600" />
          Configuración e Información del Portal
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Información de la sesión activa, entidad educativa y políticas de evaluación institucional.
        </p>
      </div>

      {/* Main Settings Panel */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6 max-w-3xl">
        {/* Section 1: Teacher Profile */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <User className="w-4 h-4 text-indigo-600" />
            Perfil del Profesional Autenticado
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nombre Completo</label>
              <input
                type="text"
                readOnly
                value={currentUser?.name || 'Docente'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Correo Institucional / Acceso</label>
              <input
                type="email"
                readOnly
                value={currentUser?.email || '—'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Rol en Plataforma</label>
              <input
                type="text"
                readOnly
                value={currentUser?.role || 'PROFESSIONAL'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium cursor-not-allowed uppercase"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Institución Activa</label>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium">
                <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">{activeOrganization?.name || 'Institución Educativa'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Notifications Policy */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Bell className="w-4 h-4 text-indigo-600" />
            Alertas Académicas y Reglas Factuales
          </h2>

          <div className="space-y-3 text-xs text-slate-600">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Alertas Derivadas de Hechos Reales
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                El sistema calcula automáticamente las alertas en el Dashboard a partir de inasistencias reales y calificaciones registradas en PostgreSQL, sin persistencia redundante.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Evaluation Standards */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            Parámetros y Escalas de Evaluación
          </h2>

          <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs text-slate-700 space-y-2">
            <p className="text-[11px] leading-relaxed">
              <strong>Escala Dinámica por Actividad:</strong> Cada actividad o evaluación define su propio puntaje máximo (<code className="font-mono text-indigo-700 font-bold">maxScore</code>), garantizando flexibilidad curricular y soporte para distintas escalas institucionales.
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Las calificaciones y asistencias se resguardan permanentemente con integridad referencial <code className="font-mono text-slate-700">RESTRICT</code>, asegurando el historial académico ante cualquier cambio administrativo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
