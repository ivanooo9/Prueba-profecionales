import React, { useState } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  CreditCard,
  Settings,
  Stethoscope,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import { useClinicalStore } from '../../services/clinical/clinicalStore';

export type NavigationTab = 'dashboard' | 'agenda' | 'patients' | 'history' | 'billing' | 'settings';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
}) => {
  const [onlyDoctorMode, setOnlyDoctorMode] = useState<boolean>(false);
  const currentUser = useClinicalStore((state) => state.currentUser);

  const todayKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  const todayActivitiesCount = useClinicalStore((s) => {
    const cons = s.consultations.filter((c) => c.date?.slice(0, 10) === todayKey).length;
    const apts = s.appointments.filter((a) => a.date === todayKey).length;
    const tasks = s.followUpTasks.filter((t) => t.dueDate?.slice(0, 10) === todayKey).length;
    const prevs = s.preventiveItems.filter((p) => (p.dueDate?.slice(0, 10) === todayKey || p.completedAt?.slice(0, 10) === todayKey)).length;
    return cons + apts + tasks + prevs;
  });

  const clinicalItems: { id: NavigationTab; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'agenda', label: 'Agenda', icon: Calendar, badge: todayActivitiesCount > 0 ? `${todayActivitiesCount} hoy` : undefined },
    { id: 'patients', label: 'Pacientes', icon: Users },
    { id: 'history', label: 'Expedientes', icon: FileText },
  ];

  const adminItems: { id: NavigationTab; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'billing', label: 'Facturación', icon: CreditCard, badge: 'SRI' },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-slate-950 border-r border-slate-800 z-50 flex flex-col justify-between transition-transform duration-300 ease-in-out shadow-xl ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
      >
        <div>
          {/* Header Marca */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-cyan-500 text-slate-950 rounded-xl shadow-md shadow-cyan-500/20">
                <Stethoscope className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <span className="font-extrabold text-sm tracking-tight block text-white">
                  <span className="text-white">MEDICINA GENERAL</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/30">
                  ESTACIÓN CLÍNICA
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Menú Nivel 1: Médico */}
          <div className="px-3 py-4 space-y-1">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Atención Médica
            </div>
            {clinicalItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${isActive
                      ? 'bg-cyan-400/15 text-cyan-300 border border-cyan-400/30 shadow-xs font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-300' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${isActive ? 'bg-cyan-400/20 text-cyan-200' : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Menú Nivel 2: Administración */}
            {!onlyDoctorMode && (
              <div className="pt-4 space-y-1">
                <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Administración
                </div>
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab(item.id);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${isActive
                          ? 'bg-cyan-400/15 text-cyan-300 border border-cyan-400/30 shadow-xs font-bold'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-300' : 'text-slate-500'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-500 border border-slate-700">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer: Modo Médico & Perfil Profesional */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-3">
          <button
            onClick={() => setOnlyDoctorMode(!onlyDoctorMode)}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] font-medium text-slate-500 hover:bg-slate-900 transition cursor-pointer"
          >
            <span>{onlyDoctorMode ? 'Mostrar Administración' : 'Ocultar Administración'}</span>
            {onlyDoctorMode ? <EyeOff className="w-3.5 h-3.5 text-sky-600" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          <div className="flex items-center gap-2.5 px-1 pt-1">
            <div className="w-9 h-9 rounded-full bg-cyan-400/15 border border-cyan-400/30 flex items-center justify-center font-bold text-xs text-cyan-300">
              {currentUser?.name
                ? currentUser.name
                    .split(' ')
                    .filter(Boolean)
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()
                : 'MD'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">
                {currentUser?.name || 'Dr. Profesional'}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                {currentUser?.role || 'Médico General'}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};