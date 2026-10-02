import React from 'react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  CalendarDays,
  FileBarChart,
  Settings,
  GraduationCap as TeacherLogoIcon,
  X,
} from 'lucide-react';
import { NavigationTab } from '../../types/teacher';
import { UserSession, Organization } from '../../services/api/organizationApi';

export interface SidebarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onOpenQuickAttendance: () => void;
  onOpenQuickGrade: () => void;
  totalStudents: number;
  courseCount: number;
  todaysClassesCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  currentUser?: UserSession | null;
  activeOrganization?: Organization | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  totalStudents,
  courseCount,
  todaysClassesCount,
  isOpenMobile,
  onCloseMobile,
  currentUser,
  activeOrganization,
}) => {
  const menuItems = [
    {
      id: 'dashboard' as NavigationTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'students' as NavigationTab,
      label: 'Estudiantes',
      icon: Users,
      badge: `${totalStudents} total`,
    },
    {
      id: 'courses' as NavigationTab,
      label: 'Cursos y Materias',
      icon: BookOpen,
      badge: `${courseCount} cursos`,
    },
    {
      id: 'attendance' as NavigationTab,
      label: 'Asistencia',
      icon: ClipboardCheck,
      badge: 'Hoy',
    },
    {
      id: 'grades' as NavigationTab,
      label: 'Calificaciones',
      icon: GraduationCap,
      badge: null,
    },
    {
      id: 'classes' as NavigationTab,
      label: 'Horario de Clases',
      icon: CalendarDays,
      badge: `${todaysClassesCount} hoy`,
    },
    {
      id: 'reports' as NavigationTab,
      label: 'Reportes',
      icon: FileBarChart,
      badge: null,
    },
    {
      id: 'settings' as NavigationTab,
      label: 'Configuración',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-slate-200 z-50 flex flex-col justify-between transition-transform duration-300 ease-in-out shadow-xs lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-500 text-white rounded-xl shadow-md shadow-brand-500/20 flex items-center justify-center">
              <TeacherLogoIcon className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-slate-900 tracking-tight">
                  PROFESORES
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                DOCENTE V1.0
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Cerrar menú"
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Gestión Académica
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 border border-brand-200/80 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-brand-500' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      isActive
                        ? 'bg-brand-500 text-white'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Action Buttons & Teacher Profile */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          {/* Teacher Profile Footer */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center font-extrabold text-xs text-brand-700 shrink-0">
              {currentUser?.name ? currentUser.name.substring(0, 2).toUpperCase() : 'US'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 truncate">
                {currentUser?.name || 'Usuario'}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                {activeOrganization?.name || 'Sin institución seleccionada'}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
