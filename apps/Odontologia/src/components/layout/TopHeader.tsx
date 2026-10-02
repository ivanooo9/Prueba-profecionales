import React, { useState } from 'react';
import { Menu, Search, Bell, UserPlus, CalendarPlus, Building2 } from 'lucide-react';
import { dentalService } from '../../services/dentalService';
import { Patient } from '../../types';
import { UserSession, Organization } from '../../services/api/organizationApi';

interface TopHeaderProps {
  onToggleMobile: () => void;
  onOpenNewPatient: () => void;
  onOpenNewAppointment: () => void;
  onSelectPatient: (patientId: string) => void;
  currentUser?: UserSession | null;
  activeOrganization?: Organization | null;
  userOrganizations?: Organization[];
  onSelectOrganization?: (orgId: number) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onToggleMobile,
  onOpenNewPatient,
  onOpenNewAppointment,
  onSelectPatient,
  currentUser,
  activeOrganization,
  userOrganizations,
  onSelectOrganization,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showAlertsPopover, setShowAlertsPopover] = useState(false);

  const patients = dentalService.getPatients();
  const alerts = dentalService.getAlerts();

  const filteredPatients = searchQuery.trim()
    ? patients.filter(
        p =>
          `${p.names} ${p.surnames}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.identification.includes(searchQuery)
      )
    : [];

  const handleSelectSearchResult = (patient: Patient) => {
    onSelectPatient(patient.id);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onToggleMobile}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg lg:hidden shrink-0"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              onBlur={() => window.setTimeout(() => setShowSearchResults(false), 150)}
              placeholder="Buscar paciente..."
              className="w-full pl-9 pr-4 py-2 bg-slate-100/80 border border-transparent focus:border-cyan-500 focus:bg-white rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
            />

            {showSearchResults && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 max-h-64 overflow-y-auto">
                {filteredPatients.length > 0 ? (
                  filteredPatients.map(patient => (
                    <button
                      key={patient.id}
                      onMouseDown={() => handleSelectSearchResult(patient)}
                      className="w-full text-left px-3 py-2 hover:bg-cyan-50 transition-colors"
                    >
                      <div className="text-xs font-bold text-slate-800">
                        {patient.names} {patient.surnames}
                      </div>
                      <div className="text-[10px] text-slate-500">CI: {patient.identification} · {patient.phone}</div>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-3 text-xs text-slate-500">No se encontraron pacientes.</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {userOrganizations && userOrganizations.length > 1 && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100/90 rounded-xl border border-slate-200 text-xs shadow-xs">
              <Building2 className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
              <select
                value={activeOrganization?.id || ''}
                onChange={(e) => onSelectOrganization?.(Number(e.target.value))}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer pr-1"
                aria-label="Seleccionar organización"
              >
                {userOrganizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {userOrganizations && userOrganizations.length === 1 && activeOrganization && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100/90 rounded-xl border border-slate-200 text-xs text-slate-700 shadow-xs">
              <Building2 className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
              <span className="font-semibold truncate max-w-[170px]" title={activeOrganization.name}>
                {activeOrganization.name}
              </span>
            </div>
          )}

          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={onOpenNewPatient}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5 text-cyan-400" /> Paciente
            </button>
            <button
              onClick={onOpenNewAppointment}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-medium text-xs rounded-xl transition-colors"
            >
              <CalendarPlus className="w-3.5 h-3.5" /> Nueva cita
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowAlertsPopover(!showAlertsPopover)}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl relative transition-colors"
              aria-label="Ver alertas"
            >
              <Bell className="w-5 h-5" />
              {alerts.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </button>

            {showAlertsPopover && (
              <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-2rem))] bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                  <div className="text-xs font-bold text-slate-800">Alertas</div>
                  <span className="text-[10px] bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-full font-bold">
                    {alerts.length}
                  </span>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {alerts.slice(0, 6).map(alert => (
                    <button
                      key={alert.id}
                      onClick={() => {
                        if (alert.patientId) onSelectPatient(alert.patientId);
                        setShowAlertsPopover(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs ${
                        alert.severity === 'urgent'
                          ? 'bg-rose-50/70 border-rose-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="font-semibold text-slate-800">{alert.title}</div>
                      <p className="text-[11px] text-slate-600 mt-1">{alert.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
