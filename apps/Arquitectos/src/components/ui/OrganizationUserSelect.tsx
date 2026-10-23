import React from 'react';
import type { ArchitectureAssignableUser } from '../../types';

interface OrganizationUserSelectProps {
  users: ArchitectureAssignableUser[];
  value?: number | string | null;
  onChange: (userId: string) => void;
  optional?: boolean;
  currentName?: string;
  responsibleOnly?: boolean;
  label: string;
}

export const OrganizationUserSelect: React.FC<OrganizationUserSelectProps> = ({
  users,
  value,
  onChange,
  optional = false,
  currentName,
  responsibleOnly = false,
  label,
}) => {
  const availableUsers = users.filter((user) => !responsibleOnly || user.canBeResponsible);
  const selectedId = value == null ? '' : String(value);
  const existingUnavailable = selectedId && !availableUsers.some((user) => String(user.id) === selectedId);

  return (
    <div>
      <label className="block font-semibold text-slate-700 mb-1">{label}</label>
      <select
        value={selectedId}
        required={!optional}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-arch-500/20 focus:border-arch-500"
      >
        <option value="">{optional ? 'Sin asignar' : 'Seleccione un responsable...'}</option>
        {existingUnavailable && (
          <option value={selectedId}>
            {currentName || `Usuario #${selectedId}`} (asignación histórica)
          </option>
        )}
        {availableUsers.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name} ({user.email})
          </option>
        ))}
      </select>
    </div>
  );
};