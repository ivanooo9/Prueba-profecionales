import { Patient, PatientAnamnesis } from '../../types';
import { ApiPatient, CreateDentistryPatientInput, UpdateDentistryPatientInput } from './dentistryApi';

/**
 * Heurística segura para extraer nombres y apellidos a partir del nombre completo canónico.
 * 
 * Reglas de partición documentadas:
 * - 0 o 1 palabra: todo a `names`, `surnames` vacío.
 * - 2 palabras: primera palabra a `names`, segunda a `surnames` (ej: "Ivan" y "Peralta").
 * - 3 palabras: primera palabra a `names`, dos siguientes a `surnames` (ej: "Ivan" y "Peralta Romero").
 * - 4 o más palabras: primeras 2 palabras a `names`, restantes a `surnames` (ej: "Ivan Andres" y "Peralta Romero").
 * 
 * Garantía: `${names} ${surnames}`.trim() recompone EXACTAMENTE el nombre canónico original sin pérdida de palabras.
 */
export function parseNamesSurnames(fullName: string): { names: string; surnames: string } {
  const trimmed = (fullName || '').trim();
  if (!trimmed) return { names: '', surnames: '' };

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { names: parts[0], surnames: '' };
  }
  if (parts.length === 2) {
    return { names: parts[0], surnames: parts[1] };
  }
  if (parts.length === 3) {
    return { names: parts[0], surnames: `${parts[1]} ${parts[2]}` };
  }
  // 4 o más palabras (típico formato latino: 2 nombres + 2 apellidos)
  return {
    names: `${parts[0]} ${parts[1]}`,
    surnames: parts.slice(2).join(' '),
  };
}

/**
 * Mapea una entidad ApiPatient del backend a la interfaz Patient del frontend de Odontología.
 */
export function mapApiPatientToDentalPatient(api: ApiPatient): Patient {
  const { names, surnames } = parseNamesSurnames(api.name);

  let mappedGender: 'Femenino' | 'Masculino' | 'Otro' = 'Otro';
  if (api.gender === 'FEMALE') mappedGender = 'Femenino';
  else if (api.gender === 'MALE') mappedGender = 'Masculino';

  let mappedStatus: 'Activo' | 'Inactivo' | 'En tratamiento' = 'Activo';
  if (api.status === 'EN ESPERA' || api.status === 'CRÓNICO') {
    mappedStatus = 'En tratamiento';
  } else if (api.status === 'INACTIVE' || api.status === 'ALTA') {
    mappedStatus = 'Inactivo';
  }

  let anamnesis: PatientAnamnesis | undefined = undefined;
  if (api.record) {
    anamnesis = {
      height: api.record.heightCm ? String(api.record.heightCm) : undefined,
      weight: api.record.weightKg ? String(api.record.weightKg) : undefined,
      bloodType: api.record.bloodType || api.bloodType || undefined,
      allergies: api.record.allergies || undefined,
      currentDiseases: api.record.currentIllnesses || undefined,
      chronicDiseases: api.record.chronicDiseases || undefined,
      currentMedications: api.record.currentMedications || undefined,
      personalMedicalHistory: api.record.personalHistory || undefined,
      familyHistory: api.record.familyHistory || undefined,
      previousSurgeries: api.record.previousSurgeries || undefined,
      previousHospitalizations: api.record.hospitalizations || undefined,
      tobaccoUse: api.record.tobaccoUse || undefined,
      alcoholUse: api.record.alcoholUse || undefined,
      pregnancyStatus:
        api.record.pregnancyStatus === 'YES'
          ? 'Sí'
          : api.record.pregnancyStatus === 'NO'
          ? 'No'
          : undefined,
      gestationWeeks: api.record.gestationalWeeks ? String(api.record.gestationalWeeks) : undefined,
      breastfeeding:
        api.record.breastfeeding === 'YES'
          ? 'Sí'
          : api.record.breastfeeding === 'NO'
          ? 'No'
          : undefined,
    };
  }

  return {
    id: String(api.id),
    names,
    surnames,
    identification: api.idNumber || '',
    birthDate: api.birthDate ? api.birthDate.split('T')[0] : '',
    gender: mappedGender,
    phone: api.phone || '',
    email: api.email || '',
    address: api.address || '',
    emergencyContact: {
      name: api.emergencyContact?.name || '',
      phone: api.emergencyContact?.phone || '',
      relationship: api.emergencyContact?.relationship || 'Familiar',
    },
    anamnesis,
    medicalNotes: api.record?.allergies ? `Alergias registradas: ${api.record.allergies}` : undefined,
    status: mappedStatus,
    createdAt: api.createdAt ? api.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
  };
}

/**
 * Mapea los datos del formulario frontend al payload de creación para el Core.
 */
export function mapDentalPatientToApiInput(
  patient: Partial<Patient>
): CreateDentistryPatientInput {
  const name =
    patient.names && patient.surnames
      ? `${patient.names.trim()} ${patient.surnames.trim()}`
      : (patient.names || patient.surnames || '').trim();

  let gender = 'UNSPECIFIED';
  if (patient.gender === 'Femenino') gender = 'FEMALE';
  else if (patient.gender === 'Masculino') gender = 'MALE';

  let status = 'CONTROLADO';
  if (patient.status === 'En tratamiento') status = 'EN ESPERA';
  else if (patient.status === 'Inactivo') status = 'INACTIVE';

  return {
    name,
    idNumber: patient.identification ? patient.identification.trim() : null,
    birthDate: patient.birthDate ? patient.birthDate : null,
    gender,
    bloodType: patient.anamnesis?.bloodType ? patient.anamnesis.bloodType.trim() : null,
    phone: patient.phone ? patient.phone.trim() : null,
    email: patient.email ? patient.email.trim() : null,
    address: patient.address ? patient.address.trim() : null,
    emergencyContact: patient.emergencyContact || null,
    status,
  };
}

/**
 * Mapea las actualizaciones del formulario al payload de actualización para el Core.
 */
export function mapDentalPatientToApiUpdate(
  updates: Partial<Patient>
): UpdateDentistryPatientInput {
  const result: UpdateDentistryPatientInput = {};

  if (updates.names !== undefined || updates.surnames !== undefined) {
    result.name =
      updates.names && updates.surnames
        ? `${updates.names.trim()} ${updates.surnames.trim()}`
        : (updates.names || updates.surnames || '').trim();
  }

  if (updates.identification !== undefined) {
    result.idNumber = updates.identification ? updates.identification.trim() : null;
  }

  if (updates.birthDate !== undefined) {
    result.birthDate = updates.birthDate ? updates.birthDate : null;
  }

  if (updates.gender !== undefined) {
    result.gender =
      updates.gender === 'Femenino'
        ? 'FEMALE'
        : updates.gender === 'Masculino'
        ? 'MALE'
        : 'UNSPECIFIED';
  }

  if (updates.phone !== undefined) {
    result.phone = updates.phone ? updates.phone.trim() : null;
  }

  if (updates.email !== undefined) {
    result.email = updates.email ? updates.email.trim() : null;
  }

  if (updates.address !== undefined) {
    result.address = updates.address ? updates.address.trim() : null;
  }

  if (updates.emergencyContact !== undefined) {
    result.emergencyContact = updates.emergencyContact || null;
  }

  if (updates.status !== undefined) {
    result.status =
      updates.status === 'En tratamiento'
        ? 'EN ESPERA'
        : updates.status === 'Inactivo'
        ? 'INACTIVE'
        : 'CONTROLADO';
  }

  return result;
}
