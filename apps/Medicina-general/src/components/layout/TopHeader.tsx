import React, { useState, useRef, useEffect } from 'react';
import { Menu, Bell, Plus, Building2, ChevronDown, Check, AlertTriangle, Loader2 } from 'lucide-react';
import type { ClinicalNotification } from '../../types/clinical.types';
import { clinicalStore, useClinicalStore } from '../../services/clinical/clinicalStore';
import { OrganizationModal } from '../organization/OrganizationModal';

export interface TopHeaderProps {
  onOpenMobileMenu: () => void;
  onOpenPatient: () => void;
  onOpenConsultation: () => void;
  notifications: ClinicalNotification[];
  onMarkNotificationRead: (notificationId: string) => void;
  onMarkAllNotificationsRead: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onOpenMobileMenu,
  onOpenPatient,
  onOpenConsultation,
  notifications,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
}) => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [isEnablingModule, setIsEnablingModule] = useState(false);
  const orgDropdownRef = useRef<HTMLDivElement>(null);

  const { activeOrganization, userOrganizations, isMedicineEnabled, isLoading } = useClinicalStore(
    (state) => ({
      activeOrganization: state.activeOrganization,
      userOrganizations: state.userOrganizations,
      isMedicineEnabled: state.isMedicineEnabled,
      isLoading: state.isLoading,
    })
  );

  const unreadNotificationsCount = notifications.filter((notification) => !notification.read).length;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target as Node)) {
        setIsOrgDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectOrg = async (orgId: number) => {
    setIsOrgDropdownOpen(false);
    if (activeOrganization?.id !== orgId) {
      await clinicalStore.switchOrganization(orgId);
    }
  };

  const handleEnableModule = async () => {
    if (!activeOrganization) return;
    setIsEnablingModule(true);
    try {
      await clinicalStore.enableMedicineModule(activeOrganization.id);
    } catch (e) {
      console.error(e);
    } finally {
      setIsEnablingModule(false);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-3 shadow-xs">
      <div className="max-w-[1600px] mx-auto w-full flex items-center justify-between gap-3 sm:gap-4">
        <div className="flex shrink-0 items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Selector de Organización Multi-Tenant */}
          <div className="relative" ref={orgDropdownRef}>
            {userOrganizations.length === 0 ? (
              <button
                type="button"
                onClick={() => setIsOrgModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-sky-50 border border-sky-200 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100 transition shadow-xs"
              >
                <Building2 className="w-4 h-4 text-sky-600" />
                <span>+ Crear Organización</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsOrgDropdownOpen((open) => !open)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800 transition shadow-xs"
                title="Cambiar organización activa"
              >
                <Building2 className="w-4 h-4 text-sky-600" />
                <span className="max-w-[160px] sm:max-w-[240px] truncate font-bold">
                  {activeOrganization?.name || 'Seleccionar Organización'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>
            )}

            {isOrgDropdownOpen && (
              <div className="absolute left-0 top-11 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Organizaciones del Usuario
                  </span>
                </div>
                <div className="max-h-60 overflow-y-auto py-1 space-y-1">
                  {userOrganizations.map((org) => {
                    const isSelected = activeOrganization?.id === org.id;
                    return (
                      <button
                        key={org.id}
                        type="button"
                        onClick={() => handleSelectOrg(org.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition ${
                          isSelected
                            ? 'bg-sky-50 text-sky-800 font-bold border border-sky-100'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Building2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-sky-600' : 'text-slate-400'}`} />
                          <span className="truncate">{org.name}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-sky-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                <div className="pt-1.5 mt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOrgDropdownOpen(false);
                      setIsOrgModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-sky-700 hover:bg-sky-50 rounded-xl transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nueva Organización</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Alerta de módulo Medicina Inactivo para el tenant activo */}
          {activeOrganization && !isMedicineEnabled && !isLoading && (
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Módulo Medicina inactivo</span>
              <button
                type="button"
                onClick={handleEnableModule}
                disabled={isEnablingModule}
                className="font-bold underline text-amber-900 hover:text-amber-950 flex items-center gap-1"
              >
                {isEnablingModule ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Activar ahora'}
              </button>
            </div>
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            onClick={onOpenPatient}
            className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-2.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-sky-700 sm:px-3"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Paciente</span>
          </button>

          <button
            onClick={onOpenConsultation}
            className="flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-2.5 py-2 text-xs font-bold text-sky-700 transition hover:bg-sky-100 sm:px-3"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nueva consulta</span>
          </button>

          {/* Notifications Bell */}
          <button
            type="button"
            onClick={() => setIsNotificationsOpen((isOpen) => !isOpen)}
            className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition"
            title="Notificaciones Clínicas"
            aria-label="Notificaciones"
            aria-expanded={isNotificationsOpen}
          >
            <Bell className="w-4 h-4 text-slate-600" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-mono text-[9px] font-bold flex items-center justify-center border-2 border-white">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-4 top-16 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-900">Notificaciones</h3>
                {unreadNotificationsCount > 0 && (
                  <button type="button" onClick={onMarkAllNotificationsRead} className="text-[10px] font-semibold text-sky-700 hover:text-sky-900">
                    Marcar todas como leídas
                  </button>
                )}
              </div>
              <div className="max-h-80 space-y-2 overflow-y-auto pt-2">
                {notifications.length === 0 ? (
                  <p className="px-2 py-5 text-center text-xs text-slate-500">No tienes notificaciones pendientes.</p>
                ) : notifications.map((notification) => (
                  <button
                    type="button"
                    key={notification.id}
                    onClick={() => onMarkNotificationRead(notification.id)}
                    className={`w-full rounded-lg border p-2 text-left transition ${notification.read ? 'border-slate-100 bg-white' : 'border-sky-100 bg-sky-50/60 hover:bg-sky-50'}`}
                  >
                    <span className="block text-xs font-bold text-slate-900">{notification.title}</span>
                    <span className="mt-0.5 block text-[11px] text-slate-600">{notification.message}</span>
                    {notification.read && <span className="mt-1 block text-[10px] text-slate-400">Leída</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <OrganizationModal
        isOpen={isOrgModalOpen}
        onClose={() => setIsOrgModalOpen(false)}
      />
    </header>
  );
};
