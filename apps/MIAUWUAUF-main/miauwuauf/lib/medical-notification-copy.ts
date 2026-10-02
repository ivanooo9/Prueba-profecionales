const MAX_NOTE_LEN = 320;
const MAX_DIAGNOSTICO_LEN = 400;

export function truncateMedicalText(
  text: string | null | undefined,
  max = MAX_NOTE_LEN,
): string {
  const t = (text ?? "").trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

/** Genera el bloque de texto con la ubicación del consultorio del vet */
function buildVetLocationBlock(params: {
  clinicName?: string | null;
  address?: string | null;
  phone?: string | null;
}): string {
  const { clinicName, address, phone } = params;
  if (!clinicName && !address) return "";
  const lines: string[] = ["", "— Consultorio del Veterinario —"];
  if (clinicName) lines.push(`Clínica: ${clinicName}`);
  if (address) {
    lines.push(`Dirección: ${address}`);
    const query = encodeURIComponent(clinicName ? `${clinicName}, ${address}` : address);
    lines.push(`Ver en mapa: https://www.google.com/maps/search/?api=1&query=${query}`);
  }
  if (phone) lines.push(`Teléfono: ${phone}`);
  return lines.join("\n");
}

export function buildTreatmentOwnerNotificationMessage(params: {
  vetName: string;
  petName: string;
  medicamento: string;
  dosis: string;
  duracion: string;
  notas: string | null | undefined;
  clinicName?: string | null;
  address?: string | null;
  phone?: string | null;
}): string {
  const { vetName, petName, medicamento, dosis, duracion, notas, clinicName, address, phone } = params;
  const note = truncateMedicalText(notas, MAX_NOTE_LEN);
  const lines = [
    `El veterinario ${vetName} ha registrado un tratamiento para ${petName}.`,
    "",
    `Medicamento: ${medicamento}`,
    `Dosis: ${dosis}`,
    `Duración: ${duracion}`,
  ];
  if (note) {
    lines.push("");
    lines.push(`Indicaciones: ${note}`);
  }
  const locationBlock = buildVetLocationBlock({ clinicName, address, phone });
  if (locationBlock) lines.push(locationBlock);
  lines.push("");
  lines.push("Puedes ver el historial completo en Mi mascota.");
  return lines.join("\n");
}

export function buildDiagnosisOwnerNotificationMessage(params: {
  vetName: string;
  petName: string;
  diagnostico: string;
  notas: string | null | undefined;
  motivoConsulta?: string | null;
  examenes?: string | null;
  clinicName?: string | null;
  address?: string | null;
  phone?: string | null;
}): string {
  const { vetName, petName, diagnostico, notas, motivoConsulta, examenes, clinicName, address, phone } = params;
  const dx = truncateMedicalText(diagnostico, MAX_DIAGNOSTICO_LEN);
  const note = truncateMedicalText(notas, MAX_NOTE_LEN);

  const lines = [
    `El veterinario ${vetName} ha registrado un diagnóstico para ${petName}.`,
    "",
  ];

  if (motivoConsulta) {
    lines.push(`Motivo de consulta: ${truncateMedicalText(motivoConsulta, 100)}`);
  }

  lines.push(`Diagnóstico: ${dx}`);

  if (examenes && examenes.length > 0) {
    lines.push(`Exámenes solicitados: ${examenes}`);
  }

  if (note) {
    lines.push("");
    lines.push(`Notas / recomendaciones: ${note}`);
  }

  const locationBlock = buildVetLocationBlock({ clinicName, address, phone });
  if (locationBlock) lines.push(locationBlock);

  lines.push("");
  lines.push("Revisa el detalle completo en Mi mascota.");
  return lines.join("\n");
}

export function buildVaccinationOwnerNotificationMessage(params: {
  vetName: string;
  petName: string;
  vacunaId: string;
  dosis: string;
  proximaFecha: string | null | undefined;
  notas: string | null | undefined;
  clinicName?: string | null;
  address?: string | null;
  phone?: string | null;
}): string {
  const note = truncateMedicalText(params.notas, MAX_NOTE_LEN);
  const lines = [
    `El veterinario ${params.vetName} ha registrado una vacuna para ${params.petName}.`,
    "",
    `Vacuna: ${params.vacunaId}`,
    `Dosis: ${params.dosis}`,
  ];
  if (params.proximaFecha) {
    lines.push(`Próxima dosis: ${params.proximaFecha}`);
    lines.push("(Se agendó cita de refuerzo pendiente cuando aplica.)");
  }
  if (note) {
    lines.push("");
    lines.push(`Observaciones: ${note}`);
  }
  const locationBlock = buildVetLocationBlock({
    clinicName: params.clinicName,
    address: params.address,
    phone: params.phone,
  });
  if (locationBlock) lines.push(locationBlock);
  lines.push("");
  lines.push("Puedes ver el carnet completo en Mi mascota.");
  return lines.join("\n");
}

export function buildPreventiveOwnerNotificationMessage(params: {
  vetName: string;
  petName: string;
  tipo: string;
  proximaFecha: string;
  dosis: number;
  notas: string | null | undefined;
  clinicName?: string | null;
  address?: string | null;
  phone?: string | null;
}): string {
  const note = truncateMedicalText(params.notas, MAX_NOTE_LEN);
  const lines = [
    `El veterinario ${params.vetName} ha registrado un control preventivo para ${params.petName}.`,
    "",
    `Tipo: ${params.tipo}`,
    `Próximo control: ${params.proximaFecha}`,
    `Dosis #${params.dosis}`,
  ];
  if (note) {
    lines.push("");
    lines.push(`Observaciones: ${note}`);
  }
  const locationBlock = buildVetLocationBlock({
    clinicName: params.clinicName,
    address: params.address,
    phone: params.phone,
  });
  if (locationBlock) lines.push(locationBlock);
  lines.push("");
  lines.push("Revisa el historial en Mi mascota.");
  return lines.join("\n");
}
