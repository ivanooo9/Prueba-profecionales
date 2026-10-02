import type { ClinicalState } from './clinicalStore';
import type {
  Patient,
  Allergy,
  ClinicalAlert,
  Diagnosis,
  VitalSigns,
  Consultation,
  Medication,
  Prescription,
  LabResult,
  ImagingStudy,
  ClinicalDocument,
  FollowUpTask,
  Appointment,
  PreventiveItem,
  ClinicalNotification,
} from '../../types/clinical.types';

// Helper: Calculate age from birthDate
export function calculateAge(birthDate: string): number {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : 0;
}

// Patient queries
export const getPatientById = (state: ClinicalState, patientId: string): Patient | undefined =>
  state.patients.find((p) => p.id === patientId);

export const getPatientAllergies = (state: ClinicalState, patientId: string): Allergy[] =>
  state.allergies.filter((a) => a.patientId === patientId);

export const getPatientAlerts = (state: ClinicalState, patientId: string): ClinicalAlert[] => {
  const alerts: ClinicalAlert[] = [];
  const patient = getPatientById(state, patientId);
  if (!patient) return alerts;

  // 1. Alertas explícitas en el estado
  state.alerts
    .filter((a) => a.patientId === patientId && a.active)
    .forEach((a) => alerts.push(a));

  // 2. Alertas de alergias activas
  const allergies = getPatientAllergies(state, patientId);
  allergies.forEach((alg) => {
    if (alg.status === 'ACTIVE') {
      alerts.push({
        id: `alert-alg-${alg.id}`,
        patientId,
        type: 'ALLERGY',
        severity: alg.severity === 'SEVERE' ? 'CRITICAL' : 'HIGH',
        title: `Alergia Registrada: ${alg.substance}`,
        description: alg.reaction
          ? `Reacción reportada: ${alg.reaction}. Precaución con prescripciones.`
          : 'Alergia medicamentosa o a sustancia reportada. Verificar incompatibilidad.',
        createdAt: alg.recordedAt,
        active: true,
      });
    }
  });

  // Alergias registradas en texto anamnésico libre si no están ya agregadas
  if (allergies.length === 0 && patient.anamnesis?.allergies) {
    const rawAllergies = patient.anamnesis.allergies.trim();
    if (
      rawAllergies &&
      rawAllergies.toLowerCase() !== 'ninguna' &&
      rawAllergies.toLowerCase() !== 'no' &&
      rawAllergies.toLowerCase() !== 'no refiere' &&
      rawAllergies.toLowerCase() !== 'ninguno'
    ) {
      alerts.push({
        id: `alert-alg-anamnesis-${patientId}`,
        patientId,
        type: 'ALLERGY',
        severity: 'HIGH',
        title: `Alergias en Anamnesis: ${rawAllergies}`,
        description: 'Verificar incompatibilidades farmacológicas antes de prescribir medicamentos.',
        createdAt: patient.updatedAt || patient.createdAt,
        active: true,
      });
    }
  }

  // 3. Alertas por signos vitales anormales recientes
  const latestVitals = getLatestVitalSigns(state, patientId);
  if (latestVitals) {
    const sys = latestVitals.bloodPressureSystolic;
    const dia = latestVitals.bloodPressureDiastolic;
    if (sys !== undefined && dia !== undefined) {
      if (sys >= 160 || dia >= 100) {
        alerts.push({
          id: `alert-bp-crit-${latestVitals.id}`,
          patientId,
          type: 'VITAL_RISK',
          severity: 'CRITICAL',
          title: 'Crisis Hipertensiva',
          description: `Presión arterial registrada: ${sys}/${dia} mmHg. Requiere intervención inmediata.`,
          createdAt: latestVitals.measuredAt,
          active: true,
        });
      } else if (sys >= 140 || dia >= 90) {
        alerts.push({
          id: `alert-bp-high-${latestVitals.id}`,
          patientId,
          type: 'VITAL_RISK',
          severity: 'HIGH',
          title: 'Hipertensión Arterial Grado 1/2',
          description: `Presión arterial elevada: ${sys}/${dia} mmHg. Monitorear cifras tensionales.`,
          createdAt: latestVitals.measuredAt,
          active: true,
        });
      }
    }

    if (latestVitals.temperatureC !== undefined && latestVitals.temperatureC >= 38.0) {
      alerts.push({
        id: `alert-temp-${latestVitals.id}`,
        patientId,
        type: 'VITAL_RISK',
        severity: latestVitals.temperatureC >= 39.0 ? 'CRITICAL' : 'HIGH',
        title: 'Fiebre Registrada',
        description: `Temperatura corporal: ${latestVitals.temperatureC}°C. Evaluar foco infeccioso.`,
        createdAt: latestVitals.measuredAt,
        active: true,
      });
    }

    if (latestVitals.spo2 !== undefined && latestVitals.spo2 < 93) {
      alerts.push({
        id: `alert-spo2-${latestVitals.id}`,
        patientId,
        type: 'VITAL_RISK',
        severity: 'CRITICAL',
        title: 'Desaturación / Hipoxemia',
        description: `SpO2 registrada: ${latestVitals.spo2}%. Administrar oxigenoterapia según protocolo.`,
        createdAt: latestVitals.measuredAt,
        active: true,
      });
    }
  }

  // 4. Alertas por seguimientos clínicos urgentes o vencidos
  const todayStr = getLocalDateKey(new Date());
  const pendingFollowUps = getPatientFollowUps(state, patientId).filter(
    (t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS' || t.status === 'OVERDUE'
  );
  pendingFollowUps.forEach((task) => {
    const isOverdue = task.dueDate.slice(0, 10) < todayStr || task.status === 'OVERDUE';
    if (task.priority === 'URGENT' || isOverdue) {
      alerts.push({
        id: `alert-fu-${task.id}`,
        patientId,
        type: 'FOLLOW_UP',
        severity: task.priority === 'URGENT' ? 'CRITICAL' : 'HIGH',
        title: isOverdue ? `Seguimiento Vencido: ${task.title}` : `Seguimiento Urgente: ${task.title}`,
        description: `Vencimiento: ${task.dueDate.slice(0, 10)}. Prioridad: ${task.priority}.`,
        createdAt: task.dueDate,
        active: true,
      });
    }
  });

  // 5. Alertas por controles preventivos vencidos o pendientes
  const overduePreventions = getPatientPreventiveItems(state, patientId).filter(
    (p) => p.status === 'OVERDUE' || (p.dueDate && p.dueDate < todayStr && p.status === 'PENDING')
  );
  overduePreventions.forEach((item) => {
    alerts.push({
      id: `alert-prev-${item.id}`,
      patientId,
      type: 'CLINICAL_WARNING',
      severity: 'MEDIUM',
      title: `Prevención Pendiente/Vencida: ${item.title}`,
      description: `Tipo: ${item.type}. Fecha límite: ${item.dueDate || 'Sin fecha'}.`,
      createdAt: item.dueDate || new Date().toISOString(),
      active: true,
    });
  });

  return alerts;
};

export const getAllClinicalAlerts = (state: ClinicalState): ClinicalAlert[] => {
  const allAlerts: ClinicalAlert[] = [];
  const seenIds = new Set<string>();

  for (const patient of state.patients) {
    const pAlerts = getPatientAlerts(state, patient.id);
    for (const a of pAlerts) {
      if (!seenIds.has(a.id)) {
        seenIds.add(a.id);
        allAlerts.push(a);
      }
    }
  }

  // Alertas generales sin paciente asociado
  state.alerts.forEach((alt) => {
    if (alt.active && !seenIds.has(alt.id)) {
      seenIds.add(alt.id);
      allAlerts.push(alt);
    }
  });

  return allAlerts;
};

export const getPatientDiagnoses = (state: ClinicalState, patientId: string): Diagnosis[] =>
  state.diagnoses.filter((d) => d.patientId === patientId);

export const getPatientVitals = (state: ClinicalState, patientId: string): VitalSigns[] =>
  state.vitalSigns
    .filter((v) => v.patientId === patientId)
    .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());

export const getLatestVitalSigns = (state: ClinicalState, patientId: string): VitalSigns | undefined =>
  getPatientVitals(state, patientId)[0];

export const getPatientConsultations = (state: ClinicalState, patientId: string): Consultation[] =>
  state.consultations
    .filter((c) => c.patientId === patientId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export const getPatientMedications = (state: ClinicalState, patientId: string): Medication[] =>
  state.medications.filter((m) => m.patientId === patientId);

export const getPatientActiveMedications = (state: ClinicalState, patientId: string): Medication[] =>
  state.medications.filter((m) => m.patientId === patientId && m.status === 'ACTIVE');

export const getPatientPrescriptions = (state: ClinicalState, patientId: string): Prescription[] =>
  state.prescriptions.filter((p) => p.patientId === patientId);

export const getPatientLabs = (state: ClinicalState, patientId: string): LabResult[] =>
  state.labResults.filter((l) => l.patientId === patientId);

export const getPatientImagingStudies = (state: ClinicalState, patientId: string): ImagingStudy[] =>
  state.imagingStudies.filter((i) => i.patientId === patientId);

export const getPatientDocuments = (state: ClinicalState, patientId: string): ClinicalDocument[] =>
  state.documents.filter((d) => d.patientId === patientId);

export const getPatientFollowUps = (state: ClinicalState, patientId: string): FollowUpTask[] =>
  state.followUpTasks.filter((t) => t.patientId === patientId);

export const getPatientAppointments = (state: ClinicalState, patientId: string): Appointment[] =>
  state.appointments.filter((a) => a.patientId === patientId);

export const getPatientPreventiveItems = (state: ClinicalState, patientId: string): PreventiveItem[] =>
  state.preventiveItems.filter((p) => p.patientId === patientId);

export const getLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getSystemNotifications = (state: ClinicalState): ClinicalNotification[] => {
  const today = getLocalDateKey(new Date());
  const patientNames = new Map(state.patients.map((patient) => [patient.id, patient.name]));
  const notifications: ClinicalNotification[] = [];

  // 1. Citas programadas
  state.appointments
    .filter((appointment) => appointment.date >= today && appointment.status !== 'CANCELLED')
    .forEach((appointment) => {
      notifications.push({
        id: `appointment:${appointment.id}`,
        type: 'APPOINTMENT',
        title: 'Cita próxima',
        message: `${patientNames.get(appointment.patientId) || 'Paciente'} · ${appointment.date} ${appointment.startTime}`,
        patientId: appointment.patientId,
        createdAt: `${appointment.date}T${appointment.startTime}:00`,
        read: state.readNotificationIds.includes(`appointment:${appointment.id}`),
      });
    });

  // 2. Tareas de seguimiento
  state.followUpTasks
    .filter((task) => task.status === 'PENDING' || task.status === 'IN_PROGRESS' || task.status === 'OVERDUE')
    .forEach((task) => {
      notifications.push({
        id: `follow-up:${task.id}`,
        type: 'FOLLOW_UP',
        title: task.priority === 'URGENT' ? 'Seguimiento clínico urgente' : 'Seguimiento clínico pendiente',
        message: `${patientNames.get(task.patientId) || 'Paciente'} · ${task.title}`,
        patientId: task.patientId,
        createdAt: task.dueDate,
        read: state.readNotificationIds.includes(`follow-up:${task.id}`),
      });
    });

  // 3. Controles preventivos pendientes o vencidos
  state.preventiveItems
    .filter((item) => item.status === 'PENDING' || item.status === 'OVERDUE' || item.status === 'DUE')
    .forEach((item) => {
      notifications.push({
        id: `prevention:${item.id}`,
        type: 'CLINICAL_ALERT',
        title: item.status === 'OVERDUE' ? 'Prevención médica vencida' : 'Control preventivo pendiente',
        message: `${patientNames.get(item.patientId) || 'Paciente'} · ${item.title} (${item.type})`,
        patientId: item.patientId,
        createdAt: item.dueDate || new Date().toISOString(),
        read: state.readNotificationIds.includes(`prevention:${item.id}`),
      });
    });

  // 4. Consultas médicas registradas hoy
  state.consultations
    .filter((c) => c.date.slice(0, 10) === today)
    .forEach((c) => {
      notifications.push({
        id: `consultation:${c.id}`,
        type: 'CLINICAL_ALERT',
        title: c.status === 'SIGNED' ? 'Consulta médica firmada' : 'Consulta médica registrada',
        message: `${patientNames.get(c.patientId) || 'Paciente'} · ${c.reason || 'Atención clínica'}`,
        patientId: c.patientId,
        createdAt: c.date,
        read: state.readNotificationIds.includes(`consultation:${c.id}`),
      });
    });

  // 5. Alertas clínicas activas sintetizadas
  const computedAlerts = getAllClinicalAlerts(state);
  computedAlerts.forEach((alert) => {
    notifications.push({
      id: `clinical-alert:${alert.id}`,
      type: 'CLINICAL_ALERT',
      title: alert.title,
      message: `${patientNames.get(alert.patientId) || 'Paciente'} · ${alert.description}`,
      patientId: alert.patientId,
      createdAt: alert.createdAt,
      read: state.readNotificationIds.includes(`clinical-alert:${alert.id}`),
    });
  });

  return notifications.sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime());
};

// Combined Timeline Event interface
export interface TimelineEvent {
  id: string;
  patientId: string;
  date: string;
  type: 'CONSULTATION' | 'PRESCRIPTION' | 'LAB_RESULT' | 'IMAGING' | 'DOCUMENT';
  title: string;
  subtitle?: string;
  description?: string;
  badgeText?: string;
  badgeColor?: string;
  data: Consultation | Prescription | LabResult | ImagingStudy | ClinicalDocument;
}

export const getPatientTimeline = (state: ClinicalState, patientId: string): TimelineEvent[] => {
  const events: TimelineEvent[] = [];

  // Consultations
  getPatientConsultations(state, patientId).forEach((c) => {
    events.push({
      id: c.id,
      patientId,
      date: c.date,
      type: 'CONSULTATION',
      title: `Consulta Médica: ${c.reason}`,
      subtitle: c.signedBy || c.createdBy,
      description: c.assessment || c.subjective,
      badgeText: c.status,
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      data: c,
    });
  });

  // Prescriptions
  getPatientPrescriptions(state, patientId).forEach((p) => {
    events.push({
      id: p.id,
      patientId,
      date: p.issuedAt || p.createdAt,
      type: 'PRESCRIPTION',
      title: `Receta Electrónica SRI #${p.id.toUpperCase()}`,
      subtitle: `Clave Acceso: ${p.sriAccessKey ? 'VÁLIDA' : 'N/A'}`,
      badgeText: p.status === 'SIGNED' ? 'FIRMADO SRI' : p.status,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      data: p,
    });
  });

  // Labs
  getPatientLabs(state, patientId).forEach((l) => {
    events.push({
      id: l.id,
      patientId,
      date: l.resultDate,
      type: 'LAB_RESULT',
      title: `Examen de Laboratorio: ${l.testName}`,
      subtitle: `${l.items.length} pruebas registradas`,
      badgeText: l.status,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      data: l,
    });
  });

  getPatientImagingStudies(state, patientId).forEach((study) => {
    events.push({
      id: study.id,
      patientId,
      date: study.performedAt,
      type: 'IMAGING',
      title: `Imagenología: ${study.studyType}`,
      subtitle: study.status,
      description: study.report,
      badgeText: study.status,
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      data: study,
    });
  });

  getPatientDocuments(state, patientId).forEach((document) => {
    events.push({
      id: document.id,
      patientId,
      date: document.date,
      type: 'DOCUMENT',
      title: document.title,
      subtitle: document.type,
      badgeText: 'DOCUMENTO',
      badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      data: document,
    });
  });

  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
