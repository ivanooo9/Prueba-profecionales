import React from 'react';
import { Menu, Calendar, Building2 } from 'lucide-react';
import { UserSession, Organization } from '../../services/api/organizationApi';

export interface TopHeaderProps {
  onOpenMobileMenu: () => void;
  currentUser?: UserSession | null;
  activeOrganization?: Organization | null;
  userOrganizations?: Organization[];
  onSelectOrganization?: (orgId: number) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onOpenMobileMenu,
  currentUser,
  activeOrganization,
  userOrganizations = [],
  onSelectOrganization,
}) => {
  const currentDateFormatted = new Intl.DateTimeFormat('es-EC', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between shadow-2xs">
      {/* Left: Mobile Toggle & Context Info */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Calendar className="w-4 h-4 text-indigo-500 shrink-0 hidden sm:block" />
          <span className="capitalize text-slate-700 font-semibold truncate hidden sm:inline">
            {currentDateFormatted}
          </span>
        </div>
      </div>

      {/* Right: Organization selector & User Info */}
      <div className="flex items-center gap-3">
        {userOrganizations.length > 1 && onSelectOrganization ? (
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={activeOrganization?.id ?? ''}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val) onSelectOrganization(val);
              }}
              aria-label="Seleccionar institución"
              className="bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              {!activeOrganization && (
                <option value="" disabled>
                  -- Seleccionar institución --
                </option>
              )}
              {userOrganizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        ) : activeOrganization ? (
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700">
            <Building2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>{activeOrganization.name}</span>
          </div>
        ) : null}

        {currentUser ? (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
              {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
            </div>
            <div className="hidden md:block text-left text-xs">
              <span className="block font-bold text-slate-800 leading-tight">{currentUser.name}</span>
              <span className="block text-[10px] text-slate-400 leading-tight">{currentUser.email}</span>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
};
