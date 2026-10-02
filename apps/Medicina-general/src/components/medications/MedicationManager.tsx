import React, { useState } from 'react';
import { Pill, Plus } from 'lucide-react';
import type { Medication } from '../../types/clinical.types';
import { DataTable } from '../ui/DataTable';

export interface MedicationManagerProps {
  medications: Medication[];
  onOpenPrescriptionModal?: () => void;
}

type MedicationFilter = 'ALL' | 'ACTIVE' | 'SUSPENDED';

export const MedicationManager: React.FC<MedicationManagerProps> = ({
  medications,
  onOpenPrescriptionModal,
}) => {
  const [filter, setFilter] = useState<MedicationFilter>('ACTIVE');
  const filterOptions: MedicationFilter[] = ['ALL', 'ACTIVE', 'SUSPENDED'];

  const filteredMeds = medications.filter((m) => filter === 'ALL' || m.status === filter);

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5">
          <Pill className="w-5 h-5 text-amber-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Gestión de Cuadro Farmacológico & Tratamientos</h3>
            <p className="text-xs text-slate-500">Tratamientos activos, posología e historial de prescripciones</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {filterOptions.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === cat
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent'
              }`}
            >
              {cat === 'ALL' ? 'Todos' : cat === 'ACTIVE' ? 'Activos' : 'Suspendidos'}
            </button>
          ))}

          {onOpenPrescriptionModal && (
            <button
              onClick={onOpenPrescriptionModal}
              className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 transition ml-2 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Emitir Receta SRI</span>
            </button>
          )}
        </div>
      </div>

      {/* Medications Table */}
      <DataTable<Medication>
        columns={[
          {
            header: 'Fármaco Prescrito',
            cell: (r) => (
              <div>
                <div className="font-bold text-slate-900 text-xs">{r.name}</div>
                {r.activeIngredient && (
                  <div className="text-[10px] text-slate-500 font-mono">{r.activeIngredient}</div>
                )}
              </div>
            ),
          },
          {
            header: 'Posología & Vía',
            cell: (r) => (
              <div className="font-mono text-xs text-amber-800 font-medium">
                <span>{r.dose}</span> | <span>{r.frequency}</span> ({r.route})
              </div>
            ),
          },
          {
            header: 'Duración & Fecha Inicio',
            cell: (r) => (
              <div className="text-xs text-slate-700 font-mono">
                <div>Desde: {r.startDate}</div>
                <div className="text-[10px] text-slate-500">Duración: {r.duration || 'Continuo'}</div>
              </div>
            ),
          },
          {
            header: 'Indicación Médica',
            cell: (r) => <span className="text-xs text-slate-700">{r.indication || 'Según prescripción'}</span>,
          },
          {
            header: 'Estado',
            cell: (r) => {
              const statusStyles: Record<string, string> = {
                ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                SUSPENDED: 'bg-rose-50 text-rose-700 border-rose-200',
                COMPLETED: 'bg-slate-100 text-slate-600 border-slate-200',
              };
              return (
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusStyles[r.status]}`}>
                  {r.status === 'ACTIVE' ? 'ACTIVO' : r.status === 'SUSPENDED' ? 'SUSPENDIDO' : 'FINALIZADO'}
                </span>
              );
            },
          },
        ]}
        data={filteredMeds}
      />
    </div>
  );
};
