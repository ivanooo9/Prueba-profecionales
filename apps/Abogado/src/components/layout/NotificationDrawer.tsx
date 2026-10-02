import React from 'react';
import { X, CheckCheck, BellRing, AlertTriangle, Clock, Gavel, CheckSquare, Trash2, Folder } from 'lucide-react';
import { SystemNotification, NavigationTab } from '../../types';

export interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: SystemNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNavigate: (tab: NavigationTab) => void;
  onDismiss?: (id: string) => void;
  onSelectCase?: (caseId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onNavigate,
  onDismiss,
  onSelectCase,
}) => {
  if (!isOpen) return null;

  const getIcon = (type: SystemNotification['type']) => {
    switch (type) {
      case 'deadline_overdue':
        return <AlertTriangle className="w-5 h-5 text-rose-600 stroke-[2.5]" />;
      case 'deadline_approaching':
        return <Clock className="w-5 h-5 text-amber-600 stroke-[2.5]" />;
      case 'hearing_today':
        return <Gavel className="w-5 h-5 text-blue-600 stroke-[2.5]" />;
      case 'task_overdue':
        return <CheckSquare className="w-5 h-5 text-rose-500 stroke-[2.5]" />;
      default:
        return <BellRing className="w-5 h-5 text-sky-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col justify-between">
          {/* Drawer Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                <BellRing className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Alertas e Alertas Internas</h3>
                <p className="text-[11px] text-slate-500">Notificaciones del Sistema Jurídico</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onMarkAllAsRead}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition"
                title="Marcar todas como leídas"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <BellRing className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-semibold">No hay notificaciones pendientes</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    onMarkAsRead(n.id);
                    if (n.legalCaseId && onSelectCase) {
                      onSelectCase(String(n.legalCaseId));
                    } else if (n.targetId && onSelectCase) {
                      onSelectCase(n.targetId);
                    } else {
                      onNavigate(n.linkTab);
                    }
                    onClose();
                  }}
                  className={`p-3.5 rounded-xl border transition cursor-pointer relative group ${
                    n.read
                      ? 'bg-slate-50/60 border-slate-200/70 opacity-75'
                      : 'bg-white border-slate-300 shadow-xs ring-1 ring-slate-900/5'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">{getIcon(n.type)}</div>
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {n.title}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                          {n.date.includes(' ') ? n.date.split(' ')[1] : n.date}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                      {(n.caseNumber || n.caseTitle) && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded-md font-medium w-fit">
                          <Folder className="w-3 h-3 shrink-0" />
                          <span className="truncate">{n.caseNumber ? `${n.caseNumber} — ` : ''}{n.caseTitle || ''}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {onDismiss && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDismiss(n.id);
                      }}
                      className="absolute top-3 right-3 p-1 rounded-md text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition opacity-0 group-hover:opacity-100"
                      title="Descartar notificación"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 text-center text-xs text-slate-500">
            Las notificaciones son generadas automáticamente por las reglas de plazos procesales.
          </div>
        </div>
      </div>
    </div>
  );
};
