import React, { useState } from 'react';
import { Search, UserCheck, FileText, Plus, Filter, Activity, Eye } from 'lucide-react';
import { DataTable } from '../ui/DataTable';
import { useClinicalStore } from '../../services/clinical/clinicalStore';
import { calculateAge } from '../../services/clinical/clinicalSelectors';
import type { Patient } from '../../types/clinical.types';

export interface PatientRecordsViewProps {
  onOpenSoapModal: (patientId: string) => void;
  onOpenPrescriptionModal: (patientId: string) => void;
  onOpenRegistration: () => void;
  onSelectPatient?: (patientId: string) => void;
}

export const PatientRecordsView: React.FC<PatientRecordsViewProps> = ({
  onOpenSoapModal,
  onOpenPrescriptionModal,
  onOpenRegistration,
  onSelectPatient,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const { patients, diagnoses, consultations } = useClinicalStore((state) => state);

  const filteredData = patients.filter((p) => {
    const patientDiagnoses = diagnoses.filter((d) => d.patientId === p.id);
    const primaryDiag = patientDiagnoses.find((d) => d.type === 'PRIMARY')?.description || '';
    const phone = p.phone || '';

    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      primaryDiag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phone.includes(searchTerm);

    const matchesCategory = selectedCategory === 'ALL' || p.status === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <UserCheck className="w-5 h-5 text-sky-600" />
            <span>Directorio de Pacientes & Expedientes Clínicos</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gestión integral de historias clínicas electrónicas, diagnósticos CIE-10 y fichas de salud
          </p>
        </div>

        <button
          onClick={onOpenRegistration}
          className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-2 transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span> Nuevo Paciente</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por paciente, CIE-10 o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          {['ALL', 'CRÓNICO', 'CONTROLADO', 'EN ESPERA', 'ALERTA VITAL', 'ALTA'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-sky-50 text-sky-700 border border-sky-200'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent'
              }`}
            >
              {cat === 'ALL' ? 'Todos' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Patient Table */}
      <DataTable<Patient>
        columns={[
          {
            header: 'Paciente',
            cell: (r) => (
              <div
                onClick={() => onSelectPatient && onSelectPatient(r.id)}
                className="cursor-pointer group"
              >
                <div className="font-bold text-slate-900 text-xs group-hover:text-sky-600 transition flex items-center gap-1.5">
                  <span>{r.name}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {calculateAge(r.birthDate)} años | {r.gender === 'FEMALE' ? 'Femenino' : 'Masculino'} | Grupo {r.bloodType || 'No registrado'}
                </div>
              </div>
            ),
          },
          {
            header: 'Diagnóstico Principal (CIE-10)',
            cell: (r) => {
              const pDiagnoses = diagnoses.filter((d) => d.patientId === r.id);
              const primary = pDiagnoses.find((d) => d.type === 'PRIMARY') || pDiagnoses[0];
              return (
                <span className="font-mono text-xs text-sky-800 font-medium">
                  {primary ? primary.description : 'Z00.0 - Examen General'}
                </span>
              );
            },
          },
          {
            header: 'Teléfono',
            cell: (r) => <span className="font-mono text-slate-700 text-xs">{r.phone || 'N/A'}</span>,
          },
          {
            header: 'Última Consulta',
            cell: (r) => {
              const pConsultations = consultations
                .filter((c) => c.patientId === r.id)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              const last = pConsultations[0];
              return (
                <span className="text-slate-500 text-xs">
                  {last ? new Date(last.date).toLocaleDateString('es-EC') : 'Reciente'}
                </span>
              );
            },
          },
          {
            header: 'Estado Clínico',
            cell: (r) => {
              const colors: Record<string, string> = {
                'CRÓNICO': 'bg-amber-50 text-amber-700 border-amber-200',
                'CONTROLADO': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                'EN ESPERA': 'bg-sky-50 text-sky-700 border-sky-200',
                'ALERTA VITAL': 'bg-rose-50 text-rose-700 border-rose-200',
                'ALTA': 'bg-slate-100 text-slate-700 border-slate-200',
              };
              return (
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${colors[r.status]}`}>
                  {r.status}
                </span>
              );
            },
          },
          {
            header: 'Acciones Rápidas',
            cell: (r) => (
              <div className="flex items-center gap-2">
                {onSelectPatient && (
                  <button
                    onClick={() => onSelectPatient(r.id)}
                    className="px-2 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-[11px] border border-sky-200 transition flex items-center gap-1"
                    title="Ver Perfil Clínico Completo"
                  >
                    <Eye className="w-3 h-3" /> Ver Ficha
                  </button>
                )}
                <button
                  onClick={() => onOpenSoapModal(r.id)}
                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-[11px] border border-slate-200 transition flex items-center gap-1"
                >
                  <FileText className="w-3 h-3 text-sky-600" /> SOAP
                </button>
                <button
                  onClick={() => onOpenPrescriptionModal(r.id)}
                  className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold text-[11px] border border-amber-200 transition flex items-center gap-1"
                >
                  <Activity className="w-3 h-3" /> Receta
                </button>
              </div>
            ),
          },
        ]}
        data={filteredData}
      />
    </div>
  );
};
