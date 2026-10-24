import { 
  Patient, 
  Appointment, 
  ClinicalHistory, 
  ToothCondition, 
  DentalToothEvent,
  Treatment, 
  EvolutionEntry, 
  Budget, 
  DocumentItem, 
  Diagnosis,
  AlertItem,
  BudgetStatus,
  AppointmentStatus,
  AppointmentType,
  DentistryProfessional,
  TreatmentStatus,
  Prescription,
  PrescriptionStatus,
  DentalProcedure,
  DentalTreatmentPlan,
  DentalTreatmentItem,
  DentalBudget,
  DentalBudgetItem,
  DentalPayment,
  DentalBudgetStatus,
  DentalTreatmentExecution,
  CreateTreatmentExecutionInput
} from '../types';

import { 
  INITIAL_PATIENTS, 
  INITIAL_APPOINTMENTS, 
  INITIAL_CLINICAL_HISTORIES, 
  INITIAL_ODONTOGRAMS, 
  INITIAL_TREATMENTS, 
  INITIAL_EVOLUTION_ENTRIES, 
  INITIAL_BUDGETS, 
  INITIAL_DOCUMENTS, 
  INITIAL_DIAGNOSES, 
  INITIAL_ALERTS 
} from '../data/mockData';
import { dentistryApi } from './api/dentistryApi';
import {
  mapApiPatientToDentalPatient,
  mapDentalPatientToApiInput,
  mapDentalPatientToApiUpdate,
} from './api/mappers';

type Listener = () => void;

type StoredBudgetItem = {
  id: string;
  description: string;
  pieceNumber?: number | string;
  price?: number;
  unitCost?: number;
  quantity?: number;
  total?: number;
};

type StoredBudget = Omit<Budget, 'items'> & {
  items: StoredBudgetItem[];
};

class DentalService {
  private currentOrganizationId: number | null = null;
  private patients: Patient[] = [];
  private appointments: Appointment[];
  private clinicalHistories: Record<string, ClinicalHistory>;
  private odontograms: Record<string, ToothCondition[]>;
  private treatments: Treatment[];
  private evolutionEntries: EvolutionEntry[];
  private budgets: Budget[];
  private documents: DocumentItem[];
  private diagnoses: Diagnosis[];
  private alerts: AlertItem[];
  private prescriptions: Prescription[];
  private dentalProcedures: DentalProcedure[] = [];
  private dentalTreatmentPlans: Record<string, DentalTreatmentPlan[]> = {};
  private allRealTreatmentPlans: DentalTreatmentPlan[] = [];
  private realBudgets: Record<string, DentalBudget[]> = {};
  private allRealBudgets: DentalBudget[] = [];
  private realPrescriptions: Record<string, Prescription[]> = {};
  private realDocuments: Record<string, DocumentItem[]> = {};
  private allRealDocuments: DocumentItem[] = [];
  private hasLoadedAllRealDocuments = false;
  private mockFileBlobs: Map<string, { blob: Blob; fileName: string; mimeType: string }> = new Map();
  private listeners: Set<Listener> = new Set();

  constructor() {
    // Los pacientes ahora provienen exclusivamente de la API compartida del Core
    this.patients = [];
    this.appointments = this.loadFromStorage('odonto_appointments', INITIAL_APPOINTMENTS);
    this.clinicalHistories = this.loadFromStorage('odonto_histories', INITIAL_CLINICAL_HISTORIES);
    this.odontograms = this.loadFromStorage('odonto_odontograms', INITIAL_ODONTOGRAMS);
    this.treatments = this.loadFromStorage('odonto_treatments', INITIAL_TREATMENTS);
    this.evolutionEntries = this.loadFromStorage('odonto_evolutions', INITIAL_EVOLUTION_ENTRIES);
    this.budgets = this.loadBudgets();
    this.documents = this.loadFromStorage('odonto_documents', INITIAL_DOCUMENTS);
    this.diagnoses = this.loadFromStorage('odonto_diagnoses', INITIAL_DIAGNOSES);
    this.alerts = this.loadFromStorage('odonto_alerts', INITIAL_ALERTS);
    this.prescriptions = this.loadFromStorage('odonto_prescriptions', []);
  }

  private loadFromStorage<T>(key: string, fallback: T): T {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch {
      return fallback;
    }
  }

  private saveToStorage<T>(key: string, data: T) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }

  private loadBudgets(): Budget[] {
    const storedBudgets = this.loadFromStorage<StoredBudget[]>('odonto_budgets', INITIAL_BUDGETS);
    let requiresMigration = false;

    const budgets = storedBudgets.map(budget => ({
      ...budget,
      items: budget.items.map(item => {
        const storedPrice = typeof item.price === 'number' && Number.isFinite(item.price)
          ? item.price
          : typeof item.total === 'number' && Number.isFinite(item.total)
            ? item.total
            : typeof item.unitCost === 'number' && Number.isFinite(item.unitCost)
              ? item.unitCost
              : 0;

        if (item.price === undefined || item.unitCost !== undefined || item.quantity !== undefined || item.total !== undefined) {
          requiresMigration = true;
        }

        return {
          id: item.id,
          description: item.description,
          pieceNumber: item.pieceNumber === undefined ? undefined : String(item.pieceNumber),
          price: Math.max(0, storedPrice)
        };
      })
    }));

    if (requiresMigration) {
      this.saveToStorage('odonto_budgets', budgets);
    }

    return budgets;
  }

  private notify() {
    this.listeners.forEach(listener => listener());
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // --- ORGANIZACIÓN Y PACIENTES COMPARTIDOS ---
  public setOrganizationId(orgId: number) {
    this.currentOrganizationId = orgId;
  }

  public getOrganizationId(): number | null {
    return this.currentOrganizationId;
  }

  public async loadPatients(organizationId?: number): Promise<Patient[]> {
    const orgId = organizationId || this.currentOrganizationId;
    if (!orgId) return this.patients;
    this.currentOrganizationId = orgId;

    try {
      const apiPatients = await dentistryApi.getPatients(orgId);
      this.patients = apiPatients.map(mapApiPatientToDentalPatient);
      this.notify();
      return this.patients;
    } catch (error) {
      console.error('[dentalService.loadPatients] Error loading patients from API:', error);
      return this.patients;
    }
  }

  public getPatients(): Patient[] {
    return [...this.patients];
  }

  public getPatientById(id: string): Patient | undefined {
    const patient = this.patients.find(p => p.id === id);
    if (patient) return patient;
    // Fallback exclusivo para datos mock legacy de appointments/treatments no migrados aún
    if (id.startsWith('PAT-')) {
      return INITIAL_PATIENTS.find(p => p.id === id);
    }
    return undefined;
  }

  public async addPatient(
    patientData: Omit<Patient, 'id' | 'createdAt'>,
    organizationId?: number
  ): Promise<Patient> {
    const orgId = organizationId || this.currentOrganizationId;
    if (!orgId) {
      throw new Error('No hay una organización activa seleccionada para registrar el paciente.');
    }

    const payload = mapDentalPatientToApiInput(patientData);
    const apiPatient = await dentistryApi.createPatient(orgId, payload);
    const newPatient = mapApiPatientToDentalPatient(apiPatient);

    this.patients = [newPatient, ...this.patients.filter(p => p.id !== newPatient.id)];
    this.notify();
    return newPatient;
  }

  public async updatePatient(
    id: string,
    updates: Partial<Patient>,
    organizationId?: number
  ): Promise<Patient | undefined> {
    const orgId = organizationId || this.currentOrganizationId;
    if (!orgId) {
      const index = this.patients.findIndex(p => p.id === id);
      if (index !== -1) {
        this.patients[index] = { ...this.patients[index], ...updates };
        this.notify();
        return this.patients[index];
      }
      return undefined;
    }

    try {
      const payload = mapDentalPatientToApiUpdate(updates);
      const apiPatient = await dentistryApi.updatePatient(orgId, id, payload);
      const updatedPatient = mapApiPatientToDentalPatient(apiPatient);

      const index = this.patients.findIndex(p => p.id === id);
      if (index !== -1) {
        this.patients[index] = updatedPatient;
      } else {
        this.patients = [updatedPatient, ...this.patients];
      }
      this.notify();
      return updatedPatient;
    } catch (error) {
      console.error('[dentalService.updatePatient] Error updating patient in API:', error);
      throw error;
    }
  }

  // --- CLINICAL HISTORY / DENTAL RECORD ---
  public getClinicalHistory(patientId: string): ClinicalHistory {
    if (!this.clinicalHistories[patientId]) {
      const isLegacy = patientId.startsWith('PAT-');
      this.clinicalHistories[patientId] = isLegacy
        ? {
            patientId,
            medicalBackground: 'Sin antecedentes médicos de importancia.',
            allergies: 'Sin alergias conocidas.',
            currentMedication: 'Ninguna.',
            dentalBackground: 'Sin procedimientos quirúrgicos previos.',
            chiefComplaint: 'Evaluación general y profilaxis.',
            evaluationNotes: 'Sin hallazgos patológicos en tejidos blandos.',
            diagnosisSummary: 'Paciente sano / evaluación inicial.',
            updatedAt: new Date().toISOString().split('T')[0]
          }
        : {
            patientId,
            medicalBackground: '',
            allergies: '',
            currentMedication: '',
            dentalBackground: '',
            chiefComplaint: '',
            evaluationNotes: '',
            diagnosisSummary: '',
            updatedAt: new Date().toISOString().split('T')[0]
          };
    }
    return { ...this.clinicalHistories[patientId] };
  }

  public async loadDentalRecord(patientId: string): Promise<ClinicalHistory> {
    const isLegacy = patientId.startsWith('PAT-');
    if (!isLegacy && this.currentOrganizationId) {
      try {
        const record = await dentistryApi.getDentalRecord(this.currentOrganizationId, patientId);
        if (record) {
          const loaded: ClinicalHistory = {
            patientId,
            medicalBackground: record.medicalBackground || '',
            allergies: record.allergies || '',
            currentMedication: record.currentMedication || '',
            dentalBackground: record.dentalBackground || '',
            chiefComplaint: record.chiefComplaint || '',
            evaluationNotes: record.evaluationNotes || '',
            diagnosisSummary: record.diagnosisSummary || '',
            updatedAt: record.updatedAt ? record.updatedAt.split('T')[0] : new Date().toISOString().split('T')[0]
          };
          this.clinicalHistories[patientId] = loaded;
          this.syncPatientClinicalData(patientId, {
            allergies: record.allergies || '',
            medicalBackground: record.medicalBackground || '',
            currentMedication: record.currentMedication || '',
          });
          this.notify();
          return loaded;
        } else {
          const empty: ClinicalHistory = {
            patientId,
            medicalBackground: '',
            allergies: '',
            currentMedication: '',
            dentalBackground: '',
            chiefComplaint: '',
            evaluationNotes: '',
            diagnosisSummary: '',
            updatedAt: new Date().toISOString().split('T')[0]
          };
          this.clinicalHistories[patientId] = empty;
          return empty;
        }
      } catch (err) {
        console.error('[dentalService.loadDentalRecord] Error loading DentalRecord from API:', err);
      }
    }
    return this.getClinicalHistory(patientId);
  }

  private syncPatientClinicalData(patientId: string, data: { allergies?: string; medicalBackground?: string; currentMedication?: string }) {
    const patientIdx = this.patients.findIndex(p => p.id === patientId);
    if (patientIdx !== -1) {
      const rawAllergies = (data.allergies || '').trim();
      let medicalNotes: string | undefined = undefined;
      if (rawAllergies && !/^(ningun[oa]|niega|sin alergia|no refiere|no presenta|negativ[oa]|no\b)/i.test(rawAllergies)) {
        medicalNotes = rawAllergies.startsWith('Alergias') ? rawAllergies : `Alergias: ${rawAllergies}`;
      }
      this.patients[patientIdx] = {
        ...this.patients[patientIdx],
        medicalNotes,
        anamnesis: {
          ...(this.patients[patientIdx].anamnesis || {}),
          allergies: data.allergies !== undefined ? (data.allergies || undefined) : this.patients[patientIdx].anamnesis?.allergies,
          currentMedications: data.currentMedication !== undefined ? (data.currentMedication || undefined) : this.patients[patientIdx].anamnesis?.currentMedications,
          personalMedicalHistory: data.medicalBackground !== undefined ? (data.medicalBackground || undefined) : this.patients[patientIdx].anamnesis?.personalMedicalHistory,
        }
      };
    }
  }

  public async updateClinicalHistory(patientId: string, history: Partial<ClinicalHistory>): Promise<ClinicalHistory> {
    const isLegacy = patientId.startsWith('PAT-');
    if (!isLegacy && this.currentOrganizationId) {
      try {
        const record = await dentistryApi.saveDentalRecord(this.currentOrganizationId, patientId, {
          dentalBackground: history.dentalBackground,
          chiefComplaint: history.chiefComplaint,
          evaluationNotes: history.evaluationNotes,
          diagnosisSummary: history.diagnosisSummary,
          allergies: history.allergies,
          medicalBackground: history.medicalBackground,
          currentMedication: history.currentMedication,
        });

        const updated: ClinicalHistory = {
          ...(this.clinicalHistories[patientId] || {}),
          ...history,
          patientId,
          dentalBackground: record.dentalBackground || '',
          chiefComplaint: record.chiefComplaint || '',
          evaluationNotes: record.evaluationNotes || '',
          diagnosisSummary: record.diagnosisSummary || '',
          allergies: record.allergies || '',
          medicalBackground: record.medicalBackground || '',
          currentMedication: record.currentMedication || '',
          updatedAt: record.updatedAt ? record.updatedAt.split('T')[0] : new Date().toISOString().split('T')[0]
        };
        this.clinicalHistories[patientId] = updated;
        this.syncPatientClinicalData(patientId, {
          allergies: record.allergies || '',
          medicalBackground: record.medicalBackground || '',
          currentMedication: record.currentMedication || '',
        });
        this.notify();
        return updated;
      } catch (err) {
        console.error('[dentalService.updateClinicalHistory] Error saving DentalRecord to API:', err);
        throw err;
      }
    }

    const existing = this.getClinicalHistory(patientId);
    const updated: ClinicalHistory = {
      ...existing,
      ...history,
      patientId,
      updatedAt: new Date().toISOString().split('T')[0]
    };
    this.clinicalHistories[patientId] = updated;
    this.syncPatientClinicalData(patientId, {
      allergies: history.allergies,
      medicalBackground: history.medicalBackground,
      currentMedication: history.currentMedication,
    });
    this.saveToStorage('odonto_histories', this.clinicalHistories);
    this.notify();
    return updated;
  }

  // --- ODONTOGRAM (DentalToothSnapshot) ---
  public getOdontogram(patientId: string): ToothCondition[] {
    return [...(this.odontograms[patientId] || [])];
  }

  public async loadOdontogram(patientId: string): Promise<ToothCondition[]> {
    const isLegacy = patientId.startsWith('PAT-');
    if (!isLegacy && this.currentOrganizationId) {
      try {
        const snapshots = await dentistryApi.getOdontogram(this.currentOrganizationId, patientId);
        const conditions: ToothCondition[] = snapshots.map((s: any) => ({
          pieceNumber: s.pieceNumber,
          state: s.state,
          surfaces: s.surfaces,
          notes: s.notes,
          suggestedTreatment: s.suggestedTreatment,
          updatedAt: s.updatedAt,
        }));

        this.odontograms[patientId] = conditions;
        this.notify();
        return conditions;
      } catch (err) {
        console.error('[dentalService.loadOdontogram] Error loading from API:', err);
        return this.odontograms[patientId] || [];
      }
    }

    if (!this.odontograms[patientId] && isLegacy) {
      this.odontograms[patientId] = INITIAL_ODONTOGRAMS[patientId] || [];
    }
    return this.getOdontogram(patientId);
  }

  public async updateToothCondition(patientId: string, condition: ToothCondition): Promise<ToothCondition[]> {
    const isLegacy = patientId.startsWith('PAT-');
    if (!isLegacy && this.currentOrganizationId) {
      try {
        const savedTooth = await dentistryApi.saveToothCondition(
          this.currentOrganizationId,
          patientId,
          condition.pieceNumber,
          {
            state: condition.state,
            surfaces: condition.surfaces,
            notes: condition.notes,
            suggestedTreatment: condition.suggestedTreatment,
          }
        );

        const current = this.odontograms[patientId] || [];
        const index = current.findIndex(c => c.pieceNumber === savedTooth.pieceNumber);
        
        let updated: ToothCondition[];
        if (index >= 0) {
          updated = [...current];
          updated[index] = savedTooth;
        } else {
          updated = [...current, savedTooth];
        }

        this.odontograms[patientId] = updated;
        this.notify();
        return updated;
      } catch (err) {
        console.error('[dentalService.updateToothCondition] Error saving tooth to API:', err);
        throw err;
      }
    }

    const current = this.odontograms[patientId] || [];
    const index = current.findIndex(c => c.pieceNumber === condition.pieceNumber);
    
    let updated: ToothCondition[];
    if (index >= 0) {
      updated = [...current];
      updated[index] = { ...updated[index], ...condition, updatedAt: new Date().toISOString().split('T')[0] };
    } else {
      updated = [...current, { ...condition, updatedAt: new Date().toISOString().split('T')[0] }];
    }

    this.odontograms[patientId] = updated;
    this.saveToStorage('odonto_odontograms', this.odontograms);
    this.notify();
    return updated;
  }

  // --- TOOTH HISTORY (DentalToothEvent) ---
  public async getToothHistory(patientId: string, toothNumber: number): Promise<DentalToothEvent[]> {
    const isLegacy = patientId.startsWith('PAT-');
    if (!isLegacy && this.currentOrganizationId) {
      try {
        return await dentistryApi.getToothHistory(this.currentOrganizationId, patientId, toothNumber);
      } catch (err) {
        console.error('[dentalService.getToothHistory] Error loading tooth history from API:', err);
        return [];
      }
    }
    // Para legacy PAT-* se retorna lista vacía de forma controlada sin fabricar datos falsos
    return [];
  }

  public async getOdontogramHistory(patientId: string): Promise<DentalToothEvent[]> {
    const isLegacy = patientId.startsWith('PAT-');
    if (!isLegacy && this.currentOrganizationId) {
      try {
        return await dentistryApi.getOdontogramHistory(this.currentOrganizationId, patientId);
      } catch (err) {
        console.error('[dentalService.getOdontogramHistory] Error loading odontogram history from API:', err);
        return [];
      }
    }
    return [];
  }

  // --- APPOINTMENTS ---
  public async loadAppointments(organizationId?: number): Promise<Appointment[]> {
    const orgId = organizationId || this.currentOrganizationId;
    if (!orgId) return this.appointments;
    this.currentOrganizationId = orgId;

    try {
      const apiAppointments = await dentistryApi.getAppointments(orgId);
      if (Array.isArray(apiAppointments)) {
        this.appointments = apiAppointments.map((apt: any): Appointment => {
          const scheduledDate = new Date(apt.scheduledAt);
          let dateStr = '';
          let timeStr = '';
          if (!isNaN(scheduledDate.getTime())) {
            try {
              const formatter = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/Guayaquil',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              });
              const parts = formatter.formatToParts(scheduledDate);
              const partMap: Record<string, string> = {};
              for (const p of parts) partMap[p.type] = p.value;
              dateStr = `${partMap.year}-${partMap.month}-${partMap.day}`;
              timeStr = `${partMap.hour}:${partMap.minute}`;
            } catch {
              dateStr = scheduledDate.toISOString().split('T')[0];
              timeStr = scheduledDate.toISOString().split('T')[1].substring(0, 5);
            }
          }

          const mapStatus = (st: string): AppointmentStatus => {
            switch (st) {
              case 'SCHEDULED': return 'Programada';
              case 'CONFIRMED': return 'Confirmada';
              case 'IN_PROGRESS': return 'En espera';
              case 'COMPLETED': return 'Atendida';
              case 'CANCELLED': return 'Cancelada';
              case 'NO_SHOW': return 'No asistió';
              default: return (st as AppointmentStatus) || 'Programada';
            }
          };

          const mapType = (tp: string): AppointmentType => {
            switch (tp) {
              case 'CONSULTATION': return 'Consulta';
              case 'CLEANING': return 'Limpieza';
              case 'EVALUATION': return 'Evaluación';
              case 'RESTORATION': return 'Restauración';
              case 'ENDODONTICS': return 'Endodoncia';
              case 'ORTHODONTICS': return 'Ortodoncia';
              case 'EXTRACTION': return 'Extracción';
              case 'CONTROL': return 'Control';
              default: return (tp as AppointmentType) || 'Otro';
            }
          };

          return {
            id: String(apt.id),
            patientId: String(apt.patientId),
            patientName: apt.patient?.name || 'Paciente',
            date: dateStr,
            time: timeStr,
            durationMinutes: apt.durationMinutes || 45,
            type: mapType(apt.type),
            dentist: apt.dentistName || apt.professionalUser?.name || 'Odontólogo',
            professionalUserId: apt.professionalUserId,
            status: mapStatus(apt.status),
            notes: apt.notes || '',
            treatmentPlanId: apt.treatmentPlanId || undefined,
            treatmentItemId: apt.treatmentItemId || undefined,
            treatmentPlanTitle: apt.treatmentPlan?.title,
            treatmentItemProcedure: apt.treatmentItem?.procedureName,
            cancellationReason: apt.cancellationReason || undefined,
            cancelledAt: apt.cancelledAt || undefined,
            createdAt: apt.createdAt,
          };
        });
        this.saveToStorage('odonto_appointments', this.appointments);
        this.notify();
      }
      return this.appointments;
    } catch (error) {
      console.error('[dentalService.loadAppointments] Error loading appointments from API:', error);
      return this.appointments;
    }
  }

  public getAppointments(): Appointment[] {
    return [...this.appointments];
  }

  public getAppointmentsByPatient(patientId: string): Appointment[] {
    return this.appointments.filter(a => a.patientId === patientId);
  }

  public async getProfessionals(organizationId?: number): Promise<DentistryProfessional[]> {
    const orgId = organizationId || this.currentOrganizationId;
    if (!orgId) return [];
    try {
      return await dentistryApi.getDentistryProfessionals(orgId);
    } catch (err) {
      console.error('[dentalService.getProfessionals] Error:', err);
      return [];
    }
  }

  public async addAppointment(apt: Omit<Appointment, 'id'>): Promise<Appointment> {
    const todayStr = new Date().toLocaleDateString('en-CA');
    if (apt.date && apt.date < todayStr) {
      throw new Error('La fecha de la cita no puede ser anterior a hoy.');
    }
    const orgId = this.currentOrganizationId;
    const isNumericPatient = !apt.patientId.startsWith('PAT-') && !isNaN(Number(apt.patientId));

    if (orgId && isNumericPatient && apt.professionalUserId) {
      const mapStatusToBackend = (st: AppointmentStatus | string): string => {
        switch (st) {
          case 'Programada': return 'SCHEDULED';
          case 'Confirmada': return 'CONFIRMED';
          case 'En espera': return 'IN_PROGRESS';
          case 'Atendida': return 'COMPLETED';
          case 'Cancelada': return 'CANCELLED';
          case 'No asistió': return 'NO_SHOW';
          default: return st || 'SCHEDULED';
        }
      };

      const mapTypeToBackend = (tp: AppointmentType | string): string => {
        switch (tp) {
          case 'Consulta': return 'CONSULTATION';
          case 'Limpieza': return 'CLEANING';
          case 'Evaluación': return 'EVALUATION';
          case 'Restauración': return 'RESTORATION';
          case 'Endodoncia': return 'ENDODONTICS';
          case 'Ortodoncia': return 'ORTHODONTICS';
          case 'Extracción': return 'EXTRACTION';
          case 'Control': return 'CONTROL';
          default: return 'OTHER';
        }
      };

      const payload = {
        patientId: Number(apt.patientId),
        professionalUserId: apt.professionalUserId,
        treatmentPlanId: apt.treatmentPlanId || null,
        treatmentItemId: apt.treatmentItemId || null,
        title: apt.type,
        reason: apt.notes || null,
        type: mapTypeToBackend(apt.type),
        notes: apt.notes || null,
        scheduledAt: `${apt.date}T${apt.time}:00-05:00`,
        durationMinutes: apt.durationMinutes || 45,
        status: mapStatusToBackend(apt.status),
      };

      const created = await dentistryApi.createAppointment(orgId, payload);
      const newApt: Appointment = {
        id: String(created.id),
        patientId: String(created.patientId),
        patientName: created.patient?.name || apt.patientName,
        date: apt.date,
        time: apt.time,
        durationMinutes: created.durationMinutes,
        type: apt.type,
        dentist: created.dentistName || created.professionalUser?.name || apt.dentist,
        professionalUserId: created.professionalUserId,
        status: apt.status,
        notes: created.notes || '',
        treatmentPlanId: created.treatmentPlanId || undefined,
        treatmentItemId: created.treatmentItemId || undefined,
        treatmentPlanTitle: created.treatmentPlan?.title,
        treatmentItemProcedure: created.treatmentItem?.procedureName,
        createdAt: created.createdAt,
      };

      this.appointments = [newApt, ...this.appointments];
      this.saveToStorage('odonto_appointments', this.appointments);
      this.updatePatient(apt.patientId, { nextAppointment: apt.date });
      this.notify();
      return newApt;
    }

    // Fallback local para mocks legacy o sin backend
    const newId = `APT-${String(this.appointments.length + 101).padStart(3, '0')}`;
    const newApt: Appointment = { ...apt, id: newId };
    this.appointments = [newApt, ...this.appointments];
    this.updatePatient(apt.patientId, { nextAppointment: apt.date });
    this.saveToStorage('odonto_appointments', this.appointments);
    this.notify();
    return newApt;
  }

  public async updateAppointmentStatus(id: string, status: AppointmentStatus, cancellationReason?: string): Promise<void> {
    const orgId = this.currentOrganizationId;
    const isApiId = !id.startsWith('APT-') && !isNaN(Number(id));

    if (orgId && isApiId) {
      const mapStatusToBackend = (st: AppointmentStatus | string): string => {
        switch (st) {
          case 'Programada': return 'SCHEDULED';
          case 'Confirmada': return 'CONFIRMED';
          case 'En espera': return 'IN_PROGRESS';
          case 'Atendida': return 'COMPLETED';
          case 'Cancelada': return 'CANCELLED';
          case 'No asistió': return 'NO_SHOW';
          default: return st || 'SCHEDULED';
        }
      };

      const backendStatus = mapStatusToBackend(status);
      const updated = await dentistryApi.updateAppointmentStatus(orgId, id, backendStatus, cancellationReason);
      const apt = this.appointments.find(a => a.id === id);
      if (apt) {
        apt.status = status;
        if (updated.cancellationReason) apt.cancellationReason = updated.cancellationReason;
        if (updated.cancelledAt) apt.cancelledAt = updated.cancelledAt;
        if (status === 'Atendida') {
          this.updatePatient(apt.patientId, { lastVisit: apt.date });
        }
      }
      this.saveToStorage('odonto_appointments', this.appointments);
      this.notify();
      return;
    }

    const apt = this.appointments.find(a => a.id === id);
    if (apt) {
      apt.status = status;
      if (status === 'Atendida') {
        this.updatePatient(apt.patientId, { lastVisit: apt.date });
      }
      if (cancellationReason) apt.cancellationReason = cancellationReason;
      this.saveToStorage('odonto_appointments', this.appointments);
      this.notify();
    }
  }

  public async cancelAppointment(id: string, reason: string): Promise<void> {
    return this.updateAppointmentStatus(id, 'Cancelada', reason);
  }

  // --- TREATMENTS ---
  public getTreatments(): Treatment[] {
    return [...this.treatments];
  }

  public getTreatmentsByPatient(patientId: string): Treatment[] {
    return this.treatments.filter(t => t.patientId === patientId);
  }

  public addTreatment(trt: Omit<Treatment, 'id'>): Treatment {
    const todayStr = new Date().toLocaleDateString('en-CA');
    if (trt.targetDate && trt.targetDate < todayStr) {
      throw new Error('La fecha estimada de finalización no puede ser anterior a hoy.');
    }
    const newId = `TRT-${String(this.treatments.length + 201).padStart(3, '0')}`;
    const newTrt: Treatment = { ...trt, id: newId };
    this.treatments = [newTrt, ...this.treatments];
    
    // Set patient status to 'En tratamiento'
    this.updatePatient(trt.patientId, { status: 'En tratamiento' });

    this.saveToStorage('odonto_treatments', this.treatments);
    this.notify();
    return newTrt;
  }

  public updateTreatmentProgress(id: string, progress: number, status?: TreatmentStatus): void {
    const trt = this.treatments.find(t => t.id === id);
    if (trt) {
      trt.progress = progress;
      if (status) {
        trt.status = status;
      } else if (progress === 100) {
        trt.status = 'Completado';
      }
      this.saveToStorage('odonto_treatments', this.treatments);
      this.notify();
    }
  }

  // --- PROCEDIMIENTOS DEL CATÁLOGO (DentalProcedure) ---
  public async loadProcedures(force = false): Promise<DentalProcedure[]> {
    if (!this.currentOrganizationId) return this.dentalProcedures;
    if (this.dentalProcedures.length > 0 && !force) return this.dentalProcedures;

    try {
      this.dentalProcedures = await dentistryApi.getProcedures(this.currentOrganizationId);
      this.notify();
      return this.dentalProcedures;
    } catch (err) {
      console.error('[dentalService.loadProcedures] Error loading procedures:', err);
      return this.dentalProcedures;
    }
  }

  public getProcedures(): DentalProcedure[] {
    return [...this.dentalProcedures];
  }

  public async createProcedure(data: {
    code?: string;
    name: string;
    category?: string;
    defaultPrice?: number;
    estimatedDurationMin?: number;
  }): Promise<DentalProcedure> {
    if (!this.currentOrganizationId) throw new Error('No hay organización activa');
    const created = await dentistryApi.createProcedure(this.currentOrganizationId, data);
    this.dentalProcedures = [created, ...this.dentalProcedures];
    this.notify();
    return created;
  }

  public async updateProcedure(procedureId: number, data: {
    code?: string;
    name?: string;
    category?: string;
    defaultPrice?: number;
    estimatedDurationMin?: number;
    isActive?: boolean;
  }): Promise<DentalProcedure> {
    if (!this.currentOrganizationId) throw new Error('No hay organización activa');
    const updated = await dentistryApi.updateProcedure(this.currentOrganizationId, procedureId, data);
    const idx = this.dentalProcedures.findIndex(p => p.id === procedureId);
    if (idx >= 0) {
      this.dentalProcedures[idx] = updated;
    } else {
      this.dentalProcedures.push(updated);
    }
    this.notify();
    return updated;
  }

  public async seedDefaultProcedures(): Promise<{ createdCount: number; skippedCount: number; totalCount: number }> {
    if (!this.currentOrganizationId) throw new Error('No hay organización activa');
    const res = await dentistryApi.seedDefaultProcedures(this.currentOrganizationId);
    await this.loadProcedures(true);
    this.notify();
    return res;
  }

  // --- PLANES DE TRATAMIENTO REALES (DentalTreatmentPlan) ---
  public async loadRealTreatmentPlans(patientId: string): Promise<DentalTreatmentPlan[]> {
    const isLegacy = patientId.startsWith('PAT-');
    if (isLegacy || !this.currentOrganizationId) return [];

    try {
      const plans = await dentistryApi.getTreatmentPlans(this.currentOrganizationId, patientId);
      this.dentalTreatmentPlans[patientId] = plans;
      this.notify();
      return plans;
    } catch (err) {
      console.error('[dentalService.loadRealTreatmentPlans] Error loading treatment plans:', err);
      return this.dentalTreatmentPlans[patientId] || [];
    }
  }

  public getRealTreatmentPlans(patientId: string): DentalTreatmentPlan[] {
    return this.dentalTreatmentPlans[patientId] || [];
  }

  public async loadAllRealTreatmentPlans(organizationId?: number): Promise<DentalTreatmentPlan[]> {
    const orgId = organizationId || this.currentOrganizationId;
    if (!orgId) return [];
    this.currentOrganizationId = orgId;
    try {
      const plans = await dentistryApi.getAllTreatmentPlans(orgId);
      this.allRealTreatmentPlans = plans;
      this.notify();
      return plans;
    } catch (err) {
      console.error('[dentalService.loadAllRealTreatmentPlans] Error loading all treatment plans:', err);
      return this.allRealTreatmentPlans || [];
    }
  }

  public getAllRealTreatmentPlans(): DentalTreatmentPlan[] {
    return this.allRealTreatmentPlans || [];
  }

  public async createRealTreatmentPlan(patientId: string, data: {
    title: string;
    notes?: string;
    status?: string;
  }): Promise<DentalTreatmentPlan> {
    if (!this.currentOrganizationId) throw new Error('No hay organización activa');
    const created = await dentistryApi.createTreatmentPlan(this.currentOrganizationId, patientId, data);
    const current = this.dentalTreatmentPlans[patientId] || [];
    this.dentalTreatmentPlans[patientId] = [created, ...current];
    this.notify();
    return created;
  }

  public async updateRealTreatmentPlan(patientId: string, planId: number, data: {
    title?: string;
    notes?: string;
    status?: string;
  }): Promise<DentalTreatmentPlan> {
    if (!this.currentOrganizationId) throw new Error('No hay organización activa');
    const updated = await dentistryApi.updateTreatmentPlan(this.currentOrganizationId, planId, data);
    const current = this.dentalTreatmentPlans[patientId] || [];
    const idx = current.findIndex(p => p.id === planId);
    if (idx >= 0) {
      current[idx] = { ...current[idx], ...updated };
      this.dentalTreatmentPlans[patientId] = [...current];
    }
    this.notify();
    return updated;
  }

  public async addRealTreatmentItem(patientId: string, planId: number, data: {
    procedureId?: number;
    procedureName?: string;
    toothNumber?: number | null;
    quantity?: number;
    unitPrice?: number;
    discount?: number;
    notes?: string;
    status?: string;
  }): Promise<DentalTreatmentItem> {
    if (!this.currentOrganizationId) throw new Error('No hay organización activa');
    const item = await dentistryApi.addTreatmentItem(this.currentOrganizationId, patientId, planId, data);
    await this.loadRealTreatmentPlans(patientId);
    return item;
  }

  public async updateRealTreatmentItem(patientId: string, planId: number, itemId: number, data: {
    toothNumber?: number | null;
    quantity?: number;
    unitPrice?: number;
    discount?: number;
    notes?: string;
    status?: string;
  }): Promise<DentalTreatmentItem> {
    if (!this.currentOrganizationId) throw new Error('No hay organización activa');
    const item = await dentistryApi.updateTreatmentItem(this.currentOrganizationId, patientId, planId, itemId, data);
    await this.loadRealTreatmentPlans(patientId);
    return item;
  }

  public async deleteRealTreatmentItem(patientId: string, planId: number, itemId: number): Promise<boolean> {
    if (!this.currentOrganizationId) throw new Error('No hay organización activa');
    await dentistryApi.deleteTreatmentItem(this.currentOrganizationId, patientId, planId, itemId);
    await this.loadRealTreatmentPlans(patientId);
    return true;
  }

  // --- FASE 8: EJECUCIÓN CLÍNICA Y EVOLUCIÓN DE TRATAMIENTOS ---
  public async loadItemExecutions(
    patientId: string,
    planId: number,
    itemId: number
  ): Promise<DentalTreatmentExecution[]> {
    if (!this.currentOrganizationId) throw new Error('No hay organización activa');
    return await dentistryApi.getItemExecutions(this.currentOrganizationId, patientId, planId, itemId);
  }

  public async recordTreatmentExecution(
    patientId: string,
    planId: number,
    itemId: number,
    data: CreateTreatmentExecutionInput
  ): Promise<{
    execution: DentalTreatmentExecution;
    itemStatus: string;
    planStatus: string;
    odontogram?: any;
  }> {
    if (!this.currentOrganizationId) throw new Error('No hay organización activa');
    const result = await dentistryApi.createItemExecution(
      this.currentOrganizationId,
      patientId,
      planId,
      itemId,
      data
    );

    // Recargar planes de tratamiento y odontograma para mantener el estado sincronizado
    await this.loadRealTreatmentPlans(patientId);
    if (result.odontogram) {
      await this.loadOdontogram(patientId);
    }
    this.notify();
    return result;
  }

  public async loadPatientExecutions(patientId: string): Promise<DentalTreatmentExecution[]> {
    if (!this.currentOrganizationId) throw new Error('No hay organización activa');
    return await dentistryApi.getPatientExecutions(this.currentOrganizationId, patientId);
  }

  // --- EVOLUTION ---
  public getEvolution(patientId: string): EvolutionEntry[] {
    return this.evolutionEntries.filter(e => e.patientId === patientId);
  }

  public addEvolutionEntry(entry: Omit<EvolutionEntry, 'id'>): EvolutionEntry {
    const newId = `EVO-${String(this.evolutionEntries.length + 301).padStart(3, '0')}`;
    const newEntry: EvolutionEntry = { ...entry, id: newId };
    this.evolutionEntries = [newEntry, ...this.evolutionEntries];
    this.saveToStorage('odonto_evolutions', this.evolutionEntries);
    this.notify();
    return newEntry;
  }

  // --- DIAGNOSES ---
  public getDiagnoses(patientId: string): Diagnosis[] {
    return this.diagnoses.filter(d => d.patientId === patientId);
  }

  public addDiagnosis(diag: Omit<Diagnosis, 'id'>): Diagnosis {
    const newId = `DX-${String(this.diagnoses.length + 601).padStart(3, '0')}`;
    const newDiag: Diagnosis = { ...diag, id: newId };
    this.diagnoses = [newDiag, ...this.diagnoses];
    this.saveToStorage('odonto_diagnoses', this.diagnoses);
    this.notify();
    return newDiag;
  }

  // --- BUDGETS ---
  public getBudgets(): Budget[] {
    return [...this.budgets];
  }

  public getBudgetsByPatient(patientId: string): Budget[] {
    return this.budgets.filter(b => b.patientId === patientId);
  }

  public addBudget(budget: Omit<Budget, 'id'>): Budget {
    const newId = `BUD-${String(this.budgets.length + 401).padStart(3, '0')}`;
    const newBudget: Budget = { ...budget, id: newId };
    this.budgets = [newBudget, ...this.budgets];
    this.saveToStorage('odonto_budgets', this.budgets);
    this.notify();
    return newBudget;
  }

  public updateBudget(id: string, updates: Partial<Omit<Budget, 'id'>>): Budget | undefined {
    const index = this.budgets.findIndex(budget => budget.id === id);
    if (index === -1) return undefined;

    this.budgets[index] = { ...this.budgets[index], ...updates };
    this.saveToStorage('odonto_budgets', this.budgets);
    this.notify();
    return this.budgets[index];
  }

  public updateBudgetStatus(id: string, status: BudgetStatus): void {
    const b = this.budgets.find(item => item.id === id);
    if (b) {
      b.status = status;
      this.saveToStorage('odonto_budgets', this.budgets);
      this.notify();
    }
  }

  // --- PRESUPUESTOS FORMALES REALES (DentalBudget - Fase 7) ---
  public async loadRealBudgets(patientId: string): Promise<DentalBudget[]> {
    const isLegacy = patientId.startsWith('PAT-');
    if (isLegacy || !this.currentOrganizationId) return [];

    try {
      const budgets = await dentistryApi.getBudgets(this.currentOrganizationId, patientId);
      this.realBudgets[patientId] = budgets;
      this.notify();
      return budgets;
    } catch (err) {
      console.error('[dentalService.loadRealBudgets] Error loading budgets:', err);
      return this.realBudgets[patientId] || [];
    }
  }

  public getRealBudgets(patientId: string): DentalBudget[] {
    return this.realBudgets[patientId] || [];
  }

  public async loadAllRealBudgets(organizationId?: number): Promise<DentalBudget[]> {
    const orgId = organizationId || this.currentOrganizationId;
    if (!orgId) return [];
    this.currentOrganizationId = orgId;
    try {
      const budgets = await dentistryApi.getAllBudgets(orgId);
      this.allRealBudgets = budgets;
      this.notify();
      return budgets;
    } catch (err) {
      console.error('[dentalService.loadAllRealBudgets] Error loading all budgets:', err);
      return this.allRealBudgets || [];
    }
  }

  public getAllRealBudgets(): DentalBudget[] {
    return this.allRealBudgets || [];
  }

  public async createRealBudgetFromPlan(
    patientId: string,
    planId: number,
    data: { title?: string; discount?: number; notes?: string }
  ): Promise<DentalBudget> {
    if (!this.currentOrganizationId) throw new Error('No hay organización activa');
    const created = await dentistryApi.createBudgetFromPlan(this.currentOrganizationId, patientId, planId, data);
    await this.loadRealBudgets(patientId);
    return created;
  }

  public async updateRealBudget(
    patientId: string,
    budgetId: number,
    data: { status?: string; notes?: string; discount?: number }
  ): Promise<DentalBudget> {
    if (!this.currentOrganizationId) throw new Error('No hay organización activa');
    const updated = await dentistryApi.updateBudget(this.currentOrganizationId, patientId, budgetId, data);
    await this.loadRealBudgets(patientId);
    return updated;
  }

  public async recordRealPayment(
    patientId: string,
    budgetId: number,
    data: { amount: number; paymentMethod?: string; reference?: string; notes?: string }
  ): Promise<{ payment: DentalPayment; budget: DentalBudget; previousPaid: number; newPaid: number; balance: number }> {
    if (!this.currentOrganizationId) throw new Error('No hay organización activa');
    const result = await dentistryApi.recordPayment(this.currentOrganizationId, patientId, budgetId, data);
    await this.loadRealBudgets(patientId);
    return result;
  }

  public async getRealPayments(patientId: string, budgetId: number): Promise<DentalPayment[]> {
    if (!this.currentOrganizationId) return [];
    return dentistryApi.getPayments(this.currentOrganizationId, patientId, budgetId);
  }

  // --- PRESCRIPTIONS (Fase 9: Real & Local Fallback) ---
  public async loadRealPrescriptions(patientId: string): Promise<Prescription[]> {
    if (!this.currentOrganizationId || patientId.startsWith('PAT-')) {
      return this.getPrescriptionsByPatient(patientId);
    }
    try {
      const list = await dentistryApi.getPrescriptions(this.currentOrganizationId, patientId);
      this.realPrescriptions[patientId] = list;
      this.notify();
      return list;
    } catch (err) {
      console.error('[dentalService.loadRealPrescriptions] Error:', err);
      return this.realPrescriptions[patientId] || [];
    }
  }

  public getPrescriptionsByPatient(patientId: string): Prescription[] {
    if (!patientId.startsWith('PAT-') && this.realPrescriptions[patientId]) {
      return this.realPrescriptions[patientId];
    }
    return this.prescriptions.filter(prescription => String(prescription.patientId) === String(patientId));
  }

  public async createRealPrescription(patientId: string, data: any): Promise<Prescription> {
    if (!this.currentOrganizationId || patientId.startsWith('PAT-')) {
      return this.addPrescription({ ...data, patientId });
    }
    const created = await dentistryApi.createPrescription(this.currentOrganizationId, patientId, data);
    await this.loadRealPrescriptions(patientId);
    return created;
  }

  public async updateRealPrescription(patientId: string, prescriptionId: number | string, data: any): Promise<Prescription> {
    if (!this.currentOrganizationId || patientId.startsWith('PAT-')) {
      const updated = this.updatePrescription(String(prescriptionId), data);
      if (!updated) throw new Error('Receta no encontrada.');
      return updated;
    }
    const updated = await dentistryApi.updatePrescription(this.currentOrganizationId, patientId, prescriptionId, data);
    await this.loadRealPrescriptions(patientId);
    return updated;
  }

  public async issueRealPrescription(patientId: string, prescriptionId: number | string, signedBy?: string): Promise<Prescription> {
    if (!this.currentOrganizationId || patientId.startsWith('PAT-')) {
      this.updatePrescriptionStatus(String(prescriptionId), 'issued');
      const rx = this.prescriptions.find(p => String(p.id) === String(prescriptionId));
      if (!rx) throw new Error('Receta no encontrada.');
      return rx;
    }
    const issued = await dentistryApi.issuePrescription(this.currentOrganizationId, patientId, prescriptionId, signedBy);
    await this.loadRealPrescriptions(patientId);
    return issued;
  }

  public async cancelRealPrescription(patientId: string, prescriptionId: number | string, reason: string): Promise<Prescription> {
    if (!this.currentOrganizationId || patientId.startsWith('PAT-')) {
      this.updatePrescriptionStatus(String(prescriptionId), 'cancelled');
      const rx = this.prescriptions.find(p => String(p.id) === String(prescriptionId));
      if (!rx) throw new Error('Receta no encontrada.');
      return rx;
    }
    const cancelled = await dentistryApi.cancelPrescription(this.currentOrganizationId, patientId, prescriptionId, reason);
    await this.loadRealPrescriptions(patientId);
    return cancelled;
  }

  public addPrescription(prescription: Omit<Prescription, 'id'>): Prescription {
    const newId = `RX-${new Date().getFullYear()}-${String(this.prescriptions.length + 1).padStart(5, '0')}`;
    const newPrescription: Prescription = { ...prescription, id: newId };
    this.prescriptions = [newPrescription, ...this.prescriptions];
    this.saveToStorage('odonto_prescriptions', this.prescriptions);
    this.notify();
    return newPrescription;
  }

  public updatePrescription(id: string, updates: Partial<Omit<Prescription, 'id'>>): Prescription | undefined {
    const index = this.prescriptions.findIndex(prescription => String(prescription.id) === String(id));
    if (index === -1) return undefined;

    this.prescriptions[index] = { ...this.prescriptions[index], ...updates };
    this.saveToStorage('odonto_prescriptions', this.prescriptions);
    this.notify();
    return this.prescriptions[index];
  }

  public updatePrescriptionStatus(id: string, status: PrescriptionStatus): void {
    const issuedAt = (status === 'issued' || status === 'ISSUED') ? new Date().toISOString() : undefined;
    this.updatePrescription(id, { status, issuedAt });
  }

  // --- DOCUMENTS (Fase 9: Real & Local Fallback) ---
  public async loadRealDocuments(patientId?: string): Promise<DocumentItem[]> {
    if (!this.currentOrganizationId) {
      return patientId ? this.getDocumentsByPatient(patientId) : this.getDocuments();
    }
    try {
      const docs = await dentistryApi.getDocuments(
        this.currentOrganizationId,
        patientId && !patientId.startsWith('PAT-') ? patientId : undefined
      );
      if (patientId) {
        this.realDocuments[patientId] = docs;
      } else {
        this.allRealDocuments = docs;
        this.hasLoadedAllRealDocuments = true;
      }
      this.notify();
      return docs;
    } catch (err) {
      console.error('[dentalService.loadRealDocuments] Error:', err);
      if (patientId) {
        return this.realDocuments[patientId] || [];
      }
      return this.hasLoadedAllRealDocuments ? this.allRealDocuments : this.documents;
    }
  }

  public getDocuments(): DocumentItem[] {
    if (this.currentOrganizationId && this.hasLoadedAllRealDocuments) {
      return [...this.allRealDocuments];
    }
    return [...this.documents];
  }

  public getDocumentsByPatient(patientId: string): DocumentItem[] {
    if (!patientId.startsWith('PAT-') && this.realDocuments[patientId]) {
      return this.realDocuments[patientId];
    }
    return this.documents.filter(d => String(d.patientId) === String(patientId));
  }

  public async createRealDocument(patientId: string, data: any, localMeta?: any): Promise<DocumentItem> {
    if (!this.currentOrganizationId || patientId.startsWith('PAT-')) {
      let file: File | undefined = localMeta?.file;
      let title = localMeta?.title;
      let type = localMeta?.type || 'Radiografía';
      let date = localMeta?.date || new Date().toISOString().split('T')[0];
      let description = localMeta?.description || '';
      let fileName = localMeta?.fileName;
      let fileSize = localMeta?.fileSize || '1.0 MB';
      let mimeType = localMeta?.mimeType || 'application/octet-stream';

      if (typeof FormData !== 'undefined' && data instanceof FormData) {
        file = (data.get('file') as File) || file;
        title = (data.get('title') as string) || title;
        type = (data.get('type') as any) || type;
        date = (data.get('date') as string) || date;
        description = (data.get('description') as string) || description;
        fileName = (data.get('fileName') as string) || file?.name || fileName;
        mimeType = (data.get('mimeType') as string) || file?.type || mimeType;
        if (file) {
          fileSize = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
        }
      }

      const patient = this.getPatientById(patientId);
      const newDoc = this.addDocument({
        patientId,
        patientName: patient ? `${patient.names} ${patient.surnames}` : 'Paciente',
        title: title || 'Documento Clínico',
        type,
        date,
        description,
        fileName: fileName || (file ? file.name : `${title}.pdf`),
        fileSize,
      });

      if (file) {
        this.mockFileBlobs.set(String(newDoc.id), {
          blob: file,
          fileName: newDoc.fileName || file.name,
          mimeType: file.type || mimeType,
        });
      }

      if (this.hasLoadedAllRealDocuments) {
        this.allRealDocuments = [newDoc, ...this.allRealDocuments];
      }
      this.notify();
      return newDoc;
    }

    const created = await dentistryApi.createDocument(this.currentOrganizationId, patientId, data);
    await this.loadRealDocuments(patientId);
    await this.loadRealDocuments();
    return created;
  }

  public async deleteRealDocument(documentId: number | string, patientId?: string): Promise<void> {
    const docIdStr = String(documentId);
    this.mockFileBlobs.delete(docIdStr);

    if (!this.currentOrganizationId || docIdStr.startsWith('DOC-')) {
      this.documents = this.documents.filter(d => String(d.id) !== docIdStr);
      this.allRealDocuments = this.allRealDocuments.filter(d => String(d.id) !== docIdStr);
      this.saveToStorage('odonto_documents', this.documents);
      this.notify();
      return;
    }
    await dentistryApi.deleteDocument(this.currentOrganizationId, documentId);
    if (patientId) {
      await this.loadRealDocuments(patientId);
    }
    await this.loadRealDocuments();
  }

  public async downloadRealDocument(documentId: number | string): Promise<Blob> {
    const docIdStr = String(documentId);

    // 1. Documentos demostrativos locales (inician con 'DOC-' o sin organización activa)
    if (docIdStr.startsWith('DOC-') || !this.currentOrganizationId) {
      if (this.mockFileBlobs.has(docIdStr)) {
        return this.mockFileBlobs.get(docIdStr)!.blob;
      }

      const doc = this.documents.find(d => String(d.id) === docIdStr);
      const title = doc?.title || 'Documento Clínico';
      const patient = doc?.patientName || 'Paciente';
      const fileName = (doc?.fileName || '').toLowerCase();

      if (fileName.endsWith('.png') || doc?.type === 'Radiografía' || doc?.type === 'RADIOGRAPHY') {
        return createDemoImageBlob(title, patient, 'image/png');
      } else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || doc?.type === 'Fotografía' || doc?.type === 'PHOTOGRAPHY') {
        return createDemoImageBlob(title, patient, 'image/jpeg');
      } else {
        return createDemoPdfBlob(title, patient);
      }
    }

    // 2. Documentos clínicos reales de base de datos en organización activa
    try {
      return await dentistryApi.downloadDocument(this.currentOrganizationId, documentId);
    } catch (err: any) {
      if (
        err?.response?.status === 404 ||
        err?.message?.includes('404') ||
        err?.code === 'FILE_NOT_FOUND' ||
        err?.message?.includes('no está disponible')
      ) {
        throw new Error('El documento no cuenta con un archivo físico disponible en el servidor.');
      }
      throw err;
    }
  }

  public addDocument(doc: Omit<DocumentItem, 'id'>): DocumentItem {
    const newId = `DOC-${String(this.documents.length + 501).padStart(3, '0')}`;
    const newDoc: DocumentItem = { ...doc, id: newId };
    this.documents = [newDoc, ...this.documents];
    this.saveToStorage('odonto_documents', this.documents);
    this.notify();
    return newDoc;
  }

  // --- METRICS & ALERTS ---
  public getAlerts(): AlertItem[] {
    return [...this.alerts];
  }

  public getDashboardMetrics() {
    const activeTreatments = this.treatments.filter(t => t.status === 'En progreso').length;
    const today = new Date();
    const todayStr = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0')
    ].join('-');
    const todayAppointments = this.appointments.filter(a => a.date === todayStr).length;
    const pendingAppointments = this.appointments.filter(a => a.status === 'Programada' || a.status === 'En espera').length;
    const pendingBudgets = this.budgets.filter(b => b.status === 'Pendiente' || b.status === 'Enviado').length;

    return {
      totalPatients: this.patients.length,
      todayAppointments,
      pendingAppointments,
      activeTreatments,
      pendingBudgets,
      totalBudgetsApproved: this.budgets.filter(b => b.status === 'Aprobado').reduce((acc, b) => acc + b.totalAmount, 0)
    };
  }
}

function createDemoImageBlob(title: string, patient: string, mime: string): Promise<Blob> {
  return new Promise((resolve) => {
    if (typeof document !== 'undefined') {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, 800, 600);

          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 4;
          ctx.strokeRect(20, 20, 760, 560);

          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 24px sans-serif';
          ctx.fillText('ODONTOCARE PRO - ARCHIVO CLÍNICO', 50, 80);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 20px sans-serif';
          ctx.fillText(title, 50, 140);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '16px sans-serif';
          ctx.fillText(`Paciente: ${patient}`, 50, 190);
          ctx.fillText(`Fecha: ${new Date().toISOString().split('T')[0]}`, 50, 220);
          ctx.fillText('Archivo demostrativo precargado en OdontoCare Pro', 50, 260);

          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          for (let x = 50; x < 750; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 300);
            ctx.lineTo(x, 530);
            ctx.stroke();
          }
          for (let y = 300; y < 550; y += 50) {
            ctx.beginPath();
            ctx.moveTo(50, y);
            ctx.lineTo(750, y);
            ctx.stroke();
          }

          canvas.toBlob((b) => {
            if (b) return resolve(b);
            resolve(fallbackBinaryBlob(mime));
          }, mime);
          return;
        }
      } catch {
        // En caso de fallo con canvas, usa fallback binario
      }
    }
    resolve(fallbackBinaryBlob(mime));
  });
}

function fallbackBinaryBlob(mime: string): Blob {
  if (mime === 'image/jpeg') {
    const minimalJpg = new Uint8Array([
      255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 1, 1, 1, 0, 72, 0, 72, 0, 0, 255, 219, 0, 67, 0, 8, 6, 6, 7, 6, 5, 8, 7, 7, 7, 9, 9, 8, 10, 12, 20, 13, 12, 11, 11, 12, 25, 18, 19, 15, 20, 29, 26, 31, 30, 29, 26, 28, 28, 32, 36, 46, 39, 32, 34, 44, 35, 28, 28, 40, 55, 41, 44, 48, 49, 52, 52, 52, 31, 39, 57, 61, 56, 50, 60, 46, 51, 52, 50, 255, 192, 0, 11, 8, 0, 1, 0, 1, 1, 1, 17, 0, 255, 218, 0, 8, 1, 1, 0, 0, 63, 0, 191, 255, 217
    ]);
    return new Blob([minimalJpg], { type: 'image/jpeg' });
  }
  const minimalPng = new Uint8Array([
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84, 120, 156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130
  ]);
  return new Blob([minimalPng], { type: 'image/png' });
}

function createDemoPdfBlob(title: string, patient: string): Blob {
  const cleanTitle = title.replace(/[()\r\n]/g, '');
  const cleanPatient = patient.replace(/[()\r\n]/g, '');
  const content = `%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>>>> endobj
4 0 obj <</Length 200>> stream
BT
/F1 18 Tf
50 720 Td
(ODONTOCARE PRO - EXPEDIENTE CLINICO) Tj
/F1 12 Tf
0 -30 Td
(Documento: ${cleanTitle}) Tj
0 -20 Td
(Paciente: ${cleanPatient}) Tj
0 -20 Td
(Fecha: ${new Date().toISOString().split('T')[0]}) Tj
ET
endstream
endobj
5 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000495 00000 n 
trailer <</Size 6 /Root 1 0 R>>
startxref
574
%%EOF`;
  return new Blob([content], { type: 'application/pdf' });
}

export const dentalService = new DentalService();
