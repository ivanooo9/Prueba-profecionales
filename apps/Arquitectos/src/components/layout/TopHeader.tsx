import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  Menu,
  Compass
} from 'lucide-react';
import type { Project } from '../../types';
import type { ArchitectNavTab } from './Sidebar';
import { architectureService } from '../../services/architectureService';

interface NotificationData {
  id: string;
  title: string;
  message?: string;
  time?: string;
}

interface TopHeaderProps {
  currentSection?: ArchitectNavTab;
  onOpenMobileNav?: () => void;
  notifications?: NotificationData[];
  onSelectProject?: (project: Project) => void;
  onQuickAction?: (action: string) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentSection = 'dashboard',
  onOpenMobileNav = () => { },
  notifications = [],
  onSelectProject = () => { },
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Project[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchTerm.trim().length > 1) {
      try {
        const allProjects = architectureService.getProjects() || [];
        const filtered = allProjects.filter((p: Project) => {
          const name = p.name || '';
          const code = p.code || '';
          const client = p.clientName || '';
          const query = searchTerm.toLowerCase();
          return (
            name.toLowerCase().includes(query) ||
            code.toLowerCase().includes(query) ||
            client.toLowerCase().includes(query)
          );
        });
        setSearchResults(filtered);
        setIsSearchOpen(true);
      } catch {
        setSearchResults([]);
      }
    } else {
      setSearchResults([]);
      setIsSearchOpen(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const safeNotifications = Array.isArray(notifications) ? notifications : [];

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-3 shadow-xs">
      <div className="max-w-[1600px] mx-auto w-full flex items-center justify-between gap-2 sm:gap-4">

        {/* Lado izquierdo */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileNav}
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 transition cursor-pointer"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold text-white tracking-tight capitalize">
                {currentSection === 'dashboard' ? 'Centro de Operaciones' : currentSection}
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                • Taller Activo
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 hidden md:block">
              Gestión arquitectónica, cronogramas de diseño y supervisión de obra
            </p>
          </div>
        </div>

        {/* Lado derecho */}
        <div className="flex items-center gap-3">

          {/* Buscador Global */}
          <div className="relative w-36 sm:w-64 lg:w-80" ref={searchRef}>
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar proyecto, código, cliente..."
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:bg-slate-800 transition"
            />

            {isSearchOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden max-h-72 overflow-y-auto">
                {searchResults.length > 0 ? (
                  searchResults.map((p) => {
                    const pName = p.name || 'Proyecto';
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          onSelectProject(p);
                          setIsSearchOpen(false);
                          setSearchTerm('');
                        }}
                        className="p-3 hover:bg-slate-700/60 cursor-pointer border-b border-slate-700/50 last:border-0 transition"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-amber-400 font-bold">{p.code || 'PRJ'}</span>
                          <span className="text-[10px] text-slate-400 capitalize">{String(p.status)}</span>
                        </div>
                        <div className="text-xs font-bold text-white truncate">{pName}</div>
                        <div className="text-[10px] text-slate-400 truncate">{p.clientName}</div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-xs text-slate-400 text-center">
                    No se encontraron proyectos para "{searchTerm}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notificaciones */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 transition cursor-pointer"
              title="Notificaciones"
            >
              <Bell className="w-4 h-4" />
              {safeNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-mono text-[9px] font-bold flex items-center justify-center border-2 border-slate-900">
                  {safeNotifications.length}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                  <span className="text-xs font-bold text-white">Notificaciones del Estudio</span>
                  <span className="text-[10px] font-mono text-amber-400">{safeNotifications.length} nuevas</span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {safeNotifications.length > 0 ? (
                    safeNotifications.map((notif) => (
                      <div key={notif.id} className="p-2.5 bg-slate-900/60 rounded-lg text-xs border border-slate-700/50">
                        <div className="font-bold text-slate-200">{notif.title}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{notif.message || notif.time}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 text-center py-3">
                      No hay notificaciones pendientes
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};