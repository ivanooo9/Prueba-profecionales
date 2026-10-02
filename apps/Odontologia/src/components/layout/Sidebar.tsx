import React from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Activity,
  Receipt,
  FolderOpen,
  BarChart3,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { ActiveView } from '../../types';
import { UserSession, Organization } from '../../services/api/organizationApi';

const ToothIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M7.2 4.1C8.4 3.3 9.5 4 12 4s3.6-.7 4.8.1c2.1 1.4 2.2 4.1 1.7 6.4-.5 2.1-1.4 3.3-1.8 5.7-.3 1.8-.8 4.3-2.2 4.3-1.2 0-1.5-1.7-2.5-4.3-.4-1.1-1.6-1.1-2 0-1 2.6-1.3 4.3-2.5 4.3-1.4 0-1.9-2.5-2.2-4.3-.4-2.4-1.3-3.6-1.8-5.7-.5-2.3-.4-5 1.7-6.4Z" />
    <path d="M8.5 7.2c.8-.5 1.7-.5 2.5 0M13 7.2c.8-.5 1.7-.5 2.5 0" />
  </svg>
);

interface SidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
  currentUser?: UserSession | null;
  activeOrganization?: Organization | null;
}

interface NavItem {
  id: ActiveView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  isOpenMobile,
  setIsOpenMobile,
  currentUser,
  activeOrganization,
}) => {
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'patients', label: 'Pacientes', icon: Users },
    { id: 'agenda', label: 'Agenda', icon: CalendarDays },
    { id: 'treatments', label: 'Tratamientos', icon: Activity },
    { id: 'budgets', label: 'Presupuestos', icon: Receipt },
    { id: 'documents', label: 'Archivos', icon: FolderOpen },
    { id: 'reports', label: 'Reportes', icon: BarChart3 }
  ];

  const handleNavClick = (view: ActiveView) => {
    setActiveView(view);
    setIsOpenMobile(false);
  };

  return (
    <>
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpenMobile(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-slate-900 text-white z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col border-r border-slate-800`}
      >
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-cyan-950/50">
            <ToothIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-white tracking-wide">OdontoCare Pro</h1>
            <p className="text-[11px] text-cyan-400 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Consultorio Dental
            </p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Gestión diaria
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id || (activeView === 'patient-detail' && item.id === 'patients');

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-600/90 text-white font-semibold shadow-sm shadow-cyan-900/30'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-80" />}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-400 text-xs">
              {(() => {
                if (!currentUser?.name) return 'OD';
                const parts = currentUser.name.trim().split(/\s+/);
                if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
                return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
              })()}
            </div>
            <div className="text-left overflow-hidden">
              <div className="text-xs font-semibold text-white truncate">
                {currentUser?.name || 'Profesional Odontológico'}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {activeOrganization?.name || (currentUser?.role ? `Rol: ${currentUser.role}` : 'Consultorio Dental')}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
