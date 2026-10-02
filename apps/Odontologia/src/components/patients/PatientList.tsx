import React, { useState } from 'react';
import { Patient } from '../../types';
import { dentalService } from '../../services/dentalService';
import { SearchFilter } from '../ui/SearchFilter';
import { StatusBadge } from '../ui/StatusBadge';
import { EmptyState } from '../ui/EmptyState';
import { UserPlus, Eye, Edit2, Phone, Calendar, UserCheck } from 'lucide-react';

interface PatientListProps {
  onSelectPatient: (patientId: string) => void;
  onOpenNewPatientModal: () => void;
}

export const PatientList: React.FC<PatientListProps> = ({
  onSelectPatient,
  onOpenNewPatientModal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const patients = dentalService.getPatients();

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return '--';
    const birth = new Date(birthDate);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const filteredPatients = patients.filter(p => {
    const matchesQuery = 
      `${p.names} ${p.surnames}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.identification.includes(searchQuery) ||
      p.phone.includes(searchQuery);

    const matchesStatus = !statusFilter || p.status === statusFilter;

    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Directorio de Pacientes</h2>
          <p className="text-xs text-slate-500 mt-1">
            Gestión integral de expedientes clínicos y datos de contacto ({patients.length} registrados).
          </p>
        </div>

        <button
          onClick={onOpenNewPatientModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs rounded-xl shadow-sm shadow-cyan-600/20 transition-all self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nuevo Paciente</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <SearchFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder="Buscar por nombre, apellidos, cédula o teléfono..."
          filterOptions={[
            { label: 'Activo', value: 'Activo' },
            { label: 'En tratamiento', value: 'En tratamiento' },
            { label: 'Inactivo', value: 'Inactivo' }
          ]}
          selectedFilter={statusFilter}
          onFilterChange={setStatusFilter}
        />
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredPatients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Paciente</th>
                  <th className="py-3.5 px-4">Identificación</th>
                  <th className="py-3.5 px-4">Contacto</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4">Última Consulta</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                {filteredPatients.map(patient => (
                  <tr 
                    key={patient.id} 
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => onSelectPatient(patient.id)}
                  >
                    {/* Paciente */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {patient.avatarUrl ? (
                          <img 
                            src={patient.avatarUrl} 
                            alt={patient.names} 
                            className="w-9 h-9 rounded-full object-cover border border-slate-200" 
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-cyan-100 text-cyan-800 font-bold flex items-center justify-center text-xs">
                            {patient.names.charAt(0)}{patient.surnames.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-cyan-600 transition-colors">
                            {patient.names} {patient.surnames}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {calculateAge(patient.birthDate)} años · {patient.gender}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* CI */}
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      {patient.identification}
                    </td>

                    {/* Contacto */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono">{patient.phone}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[160px]">
                        {patient.email}
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="py-3.5 px-4">
                      <StatusBadge status={patient.status} />
                    </td>

                    {/* Última Consulta */}
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                      {patient.lastVisit || 'Sin registro'}
                    </td>

                    {/* Acciones */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onSelectPatient(patient.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-cyan-50 hover:text-cyan-700 text-slate-700 font-semibold text-xs rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Perfil</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<UserCheck className="w-8 h-8" />}
            title="No se encontraron pacientes"
            description="Intente modificar el término de búsqueda o filtro seleccionado."
            actionLabel="Registrar Nuevo Paciente"
            onAction={onOpenNewPatientModal}
          />
        )}
      </div>
    </div>
  );
};
