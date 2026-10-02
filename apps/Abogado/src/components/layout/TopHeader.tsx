import React, { useState } from 'react';
import { Menu, Search, Bell, ShieldCheck, Scale } from 'lucide-react';
import { SystemNotification } from '../../types';

export interface TopHeaderProps {
  onOpenMobileSidebar: () => void;
  onOpenNotificationDrawer: () => void;
  notifications: SystemNotification[];
  unreadCount?: number;
  onGlobalSearch: (term: string) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onOpenMobileSidebar,
  onOpenNotificationDrawer,
  notifications,
  unreadCount: propUnreadCount,
  onGlobalSearch,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Fuente de verdad: LegalNotificationService.getUnreadCount() provisto por Core API
  const unreadCount = typeof propUnreadCount === 'number' ? propUnreadCount : notifications.filter((n) => !n.read).length;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    onGlobalSearch(e.target.value);
  };

  const todayStr = new Date().toLocaleDateString('es-EC', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200/80 px-4 lg:px-8 py-3.5 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        {/* Mobile menu button */}
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar */}
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Buscar por nro. expediente, cliente, causa o juzgado..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Today's Date */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/70 border border-slate-200 text-xs font-medium text-slate-700">
          <Scale className="w-4 h-4 text-slate-700" />
          <span className="capitalize">{todayStr}</span>
        </div>

        {/* Status Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-700">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Sistema Jurídico Activo</span>
        </div>

        {/* Notifications Bell */}
        <button
          onClick={onOpenNotificationDrawer}
          className="relative p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200/80"
          title="Notificaciones del Sistema"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center border border-white shadow-xs">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
