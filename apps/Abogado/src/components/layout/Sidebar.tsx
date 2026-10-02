import React, { useState } from 'react';
import {
  Home,
  Briefcase,
  Users,
  Calendar,
  FileText,
  BarChart3,
  Plus,
  Scale,
  X,
  Eye,
  EyeOff
} from 'lucide-react';

export type LegalNavigationTab =
  | 'dashboard'
  | 'cases'
  | 'clients'
  | 'agenda'
  | 'deadlines'
  | 'hearings'
  | 'tasks'
  | 'documents'
  | 'reports'
  | 'calendar';

interface SidebarProps {
  currentView: LegalNavigationTab;
  onNavigate: (view: LegalNavigationTab) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenNewCase: () => void;
  onOpenNewTask: () => void;
  urgentCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isOpen,
  onClose,
  onOpenNewCase,
  onOpenNewTask,
  urgentCount = 0,
}) => {
  const [onlyLawyerMode, setOnlyLawyerMode] = useState<boolean>(false);

  const mainItems: { id: LegalNavigationTab; label: string; icon: React.ElementType; badge?: string; badgeColor?: string }[] = [
    { id: 'dashboard', label: 'Inicio', icon: Home, badge: urgentCount > 0 ? `${urgentCount} urgente` : undefined, badgeColor: 'bg-rose-100 text-rose-700' },
    { id: 'cases', label: 'Casos / Expedientes', icon: Briefcase },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'agenda', label: 'Agenda (Audiencias)', icon: Calendar },
    { id: 'documents', label: 'Documentos', icon: FileText },
  ];

  const secondaryItems: { id: LegalNavigationTab; label: string; icon: React.ElementType }[] = [
    { id: 'reports', label: 'Reportes y Métricas', icon: BarChart3 },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-slate-900 border-r border-slate-800 text-slate-200 z-50 flex flex-col justify-between transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
      >
        <div>
          {/* Header Marca */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl shadow-xs">
                <Scale className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <span className="font-black text-sm text-white tracking-tight block">
                  LEGAL SUITE
                </span>
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  CENTRO JURÍDICO
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

          {/* Menú Nivel 1 */}
          <div className="px-3 py-4 space-y-1">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Despacho Jurídico
            </div>
            {mainItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${isActive
                      ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-slate-950 text-amber-400' : item.badgeColor || 'bg-slate-800 text-slate-300'
                      }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Menú Nivel 2 */}
            {!onlyLawyerMode && (
              <div className="pt-4 space-y-1 border-t border-slate-800/80 mt-4">
                <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Gestión y Métricas
                </div>
                {secondaryItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${isActive
                          ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-3">
          <button
            onClick={() => setOnlyLawyerMode(!onlyLawyerMode)}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <span>{onlyLawyerMode ? 'Mostrar Administración' : 'Modo Litigación'}</span>
            {onlyLawyerMode ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-slate-500" />}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onOpenNewCase}
              className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span> Caso</span>
            </button>
            <button
              onClick={onOpenNewTask}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition border border-slate-700 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Tarea</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};