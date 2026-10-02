import { 
  Patient, 
  Appointment, 
  ClinicalHistory, 
  ToothCondition, 
  Treatment, 
  EvolutionEntry, 
  Budget, 
  DocumentItem, 
  Diagnosis,
  AlertItem
} from '../types';

export const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'PAT-001',
    names: 'María Belén',
    surnames: 'González Aguirre',
    identification: '1104829104',
    birthDate: '1998-05-14', // 28 años
    gender: 'Femenino',
    phone: '0992834102',
    email: 'maria.gonzalez@email.com',
    address: 'Av. 10 de Agosto N24-102 y Orellana, Quito',
    emergencyContact: {
      name: 'Carlos González (Padre)',
      phone: '0984123984',
      relationship: 'Padre'
    },
    medicalNotes: 'Sensibilidad en cuadrante superior derecho al frío.',
    status: 'En tratamiento',
    createdAt: '2026-01-15',
    lastVisit: '2026-08-20',
    nextAppointment: '2026-09-01',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
  },
  {
    id: 'PAT-002',
    names: 'Carlos Eduardo',
    surnames: 'Benítez Mendoza',
    identification: '1723491823',
    birthDate: '1988-11-22', // 37 años
    gender: 'Masculino',
    phone: '0987123491',
    email: 'carlos.benitez@empresa.ec',
    address: 'Calle Los Alisos E8-23, Cumbayá',
    emergencyContact: {
      name: 'Laura Mendoza (Esposa)',
      phone: '0991823746',
      relationship: 'Esposa'
    },
    medicalNotes: 'Hipertensión controlada con Enalapril 10mg.',
    status: 'Activo',
    createdAt: '2026-02-10',
    lastVisit: '2026-08-15',
    nextAppointment: '2026-08-31',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
  },
  {
    id: 'PAT-003',
    names: 'Ana Sofía',
    surnames: 'Morales Cárdenas',
    identification: '0918273645',
    birthDate: '2001-03-08', // 25 años
    gender: 'Femenino',
    phone: '0995647382',
    email: 'ana.morales@universidad.edu.ec',
    address: 'Cdla. Kennedy Norte Mz 10 Sol 4, Guayaquil',
    emergencyContact: {
      name: 'Lucía Cárdenas (Madre)',
      phone: '0983746519',
      relationship: 'Madre'
    },
    medicalNotes: 'Alergia a la Penicilina. Usar Macrólidos si requiere antibiótico.',
    status: 'En tratamiento',
    createdAt: '2026-03-01',
    lastVisit: '2026-08-28',
    nextAppointment: '2026-09-05',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
  },
  {
    id: 'PAT-004',
    names: 'Roberto Javier',
    surnames: 'Lasso Proaño',
    identification: '1102938475',
    birthDate: '1975-09-30', // 50 años
    gender: 'Masculino',
    phone: '0991029384',
    email: 'roberto.lasso@consultora.com',
    address: 'Av. República del Salvador y Moscú, Quito',
    emergencyContact: {
      name: 'Andrea Lasso (Hija)',
      phone: '0981928374',
      relationship: 'Hija'
    },
    medicalNotes: 'Bruxismo nocturno severo. Requiere placa miorrelajante.',
    status: 'Activo',
    createdAt: '2026-04-12',
    lastVisit: '2026-08-10',
    nextAppointment: '2026-09-10',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
  },
  {
    id: 'PAT-005',
    names: 'Lucía Fernanda',
    surnames: 'Valencia Espinoza',
    identification: '1719283746',
    birthDate: '1992-07-19', // 34 años
    gender: 'Femenino',
    phone: '0983827164',
    email: 'lucia.valencia@estudio.ec',
    address: 'Sector La Carolina, Calle Rumipamba E2-19',
    emergencyContact: {
      name: 'Mateo Espinoza (Hermano)',
      phone: '0993847261',
      relationship: 'Hermano'
    },
    medicalNotes: 'Paciente ansioso durante procedimientos dentales. Requiere anestesia profunda.',
    status: 'En tratamiento',
    createdAt: '2026-05-02',
    lastVisit: '2026-08-25',
    nextAppointment: '2026-09-02',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150'
  },
  {
    id: 'PAT-006',
    names: 'Fernando José',
    surnames: 'Paredes Jaramillo',
    identification: '1103948576',
    birthDate: '1985-02-14', // 41 años
    gender: 'Masculino',
    phone: '0982736451',
    email: 'fernando.paredes@tech.ec',
    address: 'Urb. Miravalle 2, Calle B Lote 14',
    emergencyContact: {
      name: 'Verónica Jaramillo (Esposa)',
      phone: '0994837261',
      relationship: 'Esposa'
    },
    medicalNotes: 'Ninguna condición sistémica de riesgo.',
    status: 'Activo',
    createdAt: '2026-05-20',
    lastVisit: '2026-07-18',
    nextAppointment: '2026-09-12'
  },
  {
    id: 'PAT-007',
    names: 'Gabriel Alejandro',
    surnames: 'Torres Castro',
    identification: '0923847162',
    birthDate: '2005-12-03', // 20 años
    gender: 'Masculino',
    phone: '0993746528',
    email: 'gabriel.torres@estudiante.ec',
    address: 'Urdesa Central, Calle 5ta #112, Guayaquil',
    emergencyContact: {
      name: 'Marco Torres (Padre)',
      phone: '0982938471',
      relationship: 'Padre'
    },
    medicalNotes: 'Ortodoncia en progreso (brackets metálicos).',
    status: 'En tratamiento',
    createdAt: '2026-06-01',
    lastVisit: '2026-08-22',
    nextAppointment: '2026-09-08'
  },
  {
    id: 'PAT-008',
    names: 'Elena Cristina',
    surnames: 'Ríos Viteri',
    identification: '1709283741',
    birthDate: '1968-08-25', // 58 años
    gender: 'Femenino',
    phone: '0981928375',
    email: 'elena.rios@arte.ec',
    address: 'Barrio La Floresta, Madrid E12-40',
    emergencyContact: {
      name: 'Daniel Viteri (Hijo)',
      phone: '0991827364',
      relationship: 'Hijo'
    },
    medicalNotes: 'Osteoporosis tratada con Bifosfonatos (precaución al extraer).',
    status: 'Activo',
    createdAt: '2026-06-15',
    lastVisit: '2026-08-12',
    nextAppointment: '2026-09-15'
  },
  {
    id: 'PAT-009',
    names: 'Diego Sebastían',
    surnames: 'Cordero Vaca',
    identification: '1105948372',
    birthDate: '1995-04-18', // 31 años
    gender: 'Masculino',
    phone: '0992837465',
    email: 'diego.cordero@arquitectura.com',
    address: 'Av. Eloy Alfaro y Portugal, Quito',
    emergencyContact: {
      name: 'Paola Vaca (Madre)',
      phone: '0983746529',
      relationship: 'Madre'
    },
    medicalNotes: 'Evaluación para blanqueamiento dental.',
    status: 'Activo',
    createdAt: '2026-07-02',
    lastVisit: '2026-08-19',
    nextAppointment: '2026-09-03'
  },
  {
    id: 'PAT-010',
    names: 'Valeria Nicole',
    surnames: 'Salgado Andrade',
    identification: '1728374651',
    birthDate: '2000-10-12', // 25 años
    gender: 'Femenino',
    phone: '0984736251',
    email: 'valeria.salgado@design.ec',
    address: 'Sector González Suárez, E6-104',
    emergencyContact: {
      name: 'Nathalia Andrade (Hermana)',
      phone: '0992837416',
      relationship: 'Hermana'
    },
    medicalNotes: 'Sensibilidad gingival leve.',
    status: 'Activo',
    createdAt: '2026-07-20',
    lastVisit: '2026-08-27',
    nextAppointment: '2026-09-18'
  }
];

export const INITIAL_ODONTOGRAMS: Record<string, ToothCondition[]> = {
  'PAT-001': [
    { pieceNumber: 16, state: 'Caries', surfaces: { occlusal: true, mesial: true }, notes: 'Caries profundas ocluso-mesial', suggestedTreatment: 'Restauración Resina Compuesta' },
    { pieceNumber: 21, state: 'Restauracion', surfaces: { occlusal: true }, notes: 'Resina estética previa en buen estado' },
    { pieceNumber: 36, state: 'Ausente', notes: 'Extraído hace 3 años' },
    { pieceNumber: 46, state: 'Corona', notes: 'Corona metal-porcelana ajustada' },
    { pieceNumber: 24, state: 'Tratamiento', notes: 'Tratamiento de conducto (endodoncia) en proceso', suggestedTreatment: 'Endodoncia Unirradicular' },
    { pieceNumber: 38, state: 'Extraccion_Indicada', notes: 'Tercer molar retenido con pericoronaritis', suggestedTreatment: 'Cirugía de Tercer Molar' }
  ],
  'PAT-002': [
    { pieceNumber: 18, state: 'Ausente', notes: 'Extraído por falta de espacio' },
    { pieceNumber: 26, state: 'Caries', surfaces: { occlusal: true, distal: true }, notes: 'Caries cavitada grado 2', suggestedTreatment: 'Restauración en Resina' },
    { pieceNumber: 47, state: 'Restauracion', surfaces: { occlusal: true }, notes: 'Amalgama antigua adaptada' }
  ],
  'PAT-003': [
    { pieceNumber: 11, state: 'Fractura', surfaces: { occlusal: true, mesial: true }, notes: 'Fractura del borde incisal por traumatismo', suggestedTreatment: 'Carilla / Reconstrucción Estética' },
    { pieceNumber: 27, state: 'Caries', surfaces: { occlusal: true }, notes: 'Incipiente en fisuras' },
    { pieceNumber: 37, state: 'Restauracion', surfaces: { occlusal: true } }
  ]
};

export const INITIAL_CLINICAL_HISTORIES: Record<string, ClinicalHistory> = {
  'PAT-001': {
    patientId: 'PAT-001',
    medicalBackground: 'Ninguna enfermedad sistémica diagnosticada. Presión arterial normal 115/75 mmHg.',
    allergies: 'Sin alergias medicamentosas conocidas (NSAMC).',
    currentMedication: 'Ninguna.',
    dentalBackground: 'Tratamientos de restauración previos a los 22 años. Limpiezas anuales regulares.',
    chiefComplaint: 'Molestia intensa al masticar dulces y bebidas frías en el lado derecho superior.',
    evaluationNotes: 'Se observa lesión cariosa profunda en molar 16 con afectación oclusal y mesial. Encías levemente inflamadas en sector posterior inferior.',
    diagnosisSummary: 'Caries dental profunda en pieza 16 (K02.1). Gingivitis marginal localizada.',
    updatedAt: '2026-08-20'
  },
  'PAT-002': {
    patientId: 'PAT-002',
    medicalBackground: 'Hipertensión arterial estadio I en control.',
    allergies: 'Alergia moderada al polen.',
    currentMedication: 'Enalapril 10mg / día.',
    dentalBackground: 'Extracción de terceros molares superiores hace 5 años.',
    chiefComplaint: 'Revisión periódica de rutina y limpieza dental.',
    evaluationNotes: 'Placa bacteriana moderada en piezas anteroinferiores. Caries en molar 26.',
    diagnosisSummary: 'Caries oclusodistal pieza 26. Tartrectomía indicada.',
    updatedAt: '2026-08-15'
  },
  'PAT-003': {
    patientId: 'PAT-003',
    medicalBackground: 'Saludable.',
    allergies: 'ALERGIA CONFIRMADA A LA PENICILINA (Reacción urticariana).',
    currentMedication: 'Anticonceptivos orales.',
    dentalBackground: 'Fractura de diente incisivo 11 tras accidente deportivo.',
    chiefComplaint: 'Desea reparar la estética del diente frontal que se fracturó.',
    evaluationNotes: 'Pieza 11 presenta fractura de ángulo mesio-incisal sin compromiso pulpar evidente.',
    diagnosisSummary: 'Fractura coronaria no complicada de pieza 11.',
    updatedAt: '2026-08-28'
  }
};

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'APT-101',
    patientId: 'PAT-001',
    patientName: 'María Belén González',
    date: '2026-08-31',
    time: '09:00',
    durationMinutes: 45,
    type: 'Restauración',
    dentist: 'Dra. Sofía Mendoza (Odontóloga General)',
    status: 'Confirmada',
    notes: 'Realización de restauración en resina compósita pieza 16.',
    treatmentId: 'TRT-201'
  },
  {
    id: 'APT-102',
    patientId: 'PAT-002',
    patientName: 'Carlos Eduardo Benítez',
    date: '2026-08-31',
    time: '10:30',
    durationMinutes: 30,
    type: 'Limpieza',
    dentist: 'Dr. Alejandro Silva (Higienista / Odontólogo)',
    status: 'Programada',
    notes: 'Profilaxis ultrasónica y fluorización.',
    treatmentId: 'TRT-202'
  },
  {
    id: 'APT-103',
    patientId: 'PAT-005',
    patientName: 'Lucía Fernanda Valencia',
    date: '2026-08-31',
    time: '14:30',
    durationMinutes: 60,
    type: 'Endodoncia',
    dentist: 'Dr. Roberto Dávila (Endodoncista)',
    status: 'En espera',
    notes: 'Primera sesión de instrumentación canal pieza 24.'
  },
  {
    id: 'APT-104',
    patientId: 'PAT-003',
    patientName: 'Ana Sofía Morales',
    date: '2026-09-01',
    time: '11:00',
    durationMinutes: 60,
    type: 'Evaluación',
    dentist: 'Dra. Sofía Mendoza (Odontóloga General)',
    status: 'Confirmada',
    notes: 'Toma de impresión para reconstrucción estético-carilla pieza 11.'
  },
  {
    id: 'APT-105',
    patientId: 'PAT-007',
    patientName: 'Gabriel Alejandro Torres',
    date: '2026-09-01',
    time: '16:00',
    durationMinutes: 45,
    type: 'Ortodoncia',
    dentist: 'Dra. Valeria Rivas (Ortodoncista)',
    status: 'Programada',
    notes: 'Control mensual y cambio de arcos superiores.'
  },
  {
    id: 'APT-106',
    patientId: 'PAT-004',
    patientName: 'Roberto Javier Lasso',
    date: '2026-09-02',
    time: '15:00',
    durationMinutes: 45,
    type: 'Control',
    dentist: 'Dra. Sofía Mendoza (Odontóloga General)',
    status: 'Programada',
    notes: 'Prueba y entrega de placa de relajación bruxista.'
  },
  {
    id: 'APT-107',
    patientId: 'PAT-009',
    patientName: 'Diego Sebastían Cordero',
    date: '2026-09-03',
    time: '10:00',
    durationMinutes: 60,
    type: 'Limpieza',
    dentist: 'Dr. Alejandro Silva (Higienista / Odontólogo)',
    status: 'Confirmada',
    notes: 'Sesión 1 de blanqueamiento dental en consultorio.'
  }
];

export const INITIAL_TREATMENTS: Treatment[] = [
  {
    id: 'TRT-201',
    patientId: 'PAT-001',
    patientName: 'María Belén González',
    title: 'Restauración Estética Molar 16',
    description: 'Eliminación de tejido cariado oclusal y mesial, aislamiento absoluto y reconstrucción con resina nanoparticulada.',
    pieceNumbers: [16],
    startDate: '2026-08-20',
    targetDate: '2026-09-05',
    progress: 80,
    status: 'En progreso',
    estimatedCost: 85.00,
    dentist: 'Dra. Sofía Mendoza'
  },
  {
    id: 'TRT-202',
    patientId: 'PAT-002',
    patientName: 'Carlos Eduardo Benítez',
    title: 'Profilaxis Profunda y Restauración 26',
    description: 'Destartraje ultrasónico completo, pulido coronario y obturación en resina de pieza 26.',
    pieceNumbers: [26],
    startDate: '2026-08-15',
    targetDate: '2026-08-31',
    progress: 50,
    status: 'En progreso',
    estimatedCost: 110.00,
    dentist: 'Dr. Alejandro Silva'
  },
  {
    id: 'TRT-203',
    patientId: 'PAT-003',
    patientName: 'Ana Sofía Morales',
    title: 'Reconstrucción Estética Incisivo 11',
    description: 'Biseles estéticos, estratificación de resinas compósitas de esmalte y dentina con guía de silicona.',
    pieceNumbers: [11],
    startDate: '2026-08-28',
    targetDate: '2026-09-10',
    progress: 30,
    status: 'En progreso',
    estimatedCost: 140.00,
    dentist: 'Dra. Sofía Mendoza'
  },
  {
    id: 'TRT-204',
    patientId: 'PAT-004',
    patientName: 'Roberto Javier Lasso',
    title: 'Tratamiento Oclusal Miorrelajante',
    description: 'Impresión digital, confección de placa acrílica rígida de descarga nocturna y ajuste oclusal.',
    pieceNumbers: [],
    startDate: '2026-08-10',
    targetDate: '2026-09-02',
    progress: 90,
    status: 'En progreso',
    estimatedCost: 220.00,
    dentist: 'Dra. Sofía Mendoza'
  },
  {
    id: 'TRT-205',
    patientId: 'PAT-007',
    patientName: 'Gabriel Alejandro Torres',
    title: 'Ortodoncia Correctiva Convencional',
    description: 'Tratamiento de alineación y nivelación con aparatología fija metálica Roth .022.',
    pieceNumbers: [],
    startDate: '2026-06-01',
    targetDate: '2027-12-01',
    progress: 25,
    status: 'En progreso',
    estimatedCost: 950.00,
    dentist: 'Dra. Valeria Rivas'
  }
];

export const INITIAL_EVOLUTION_ENTRIES: EvolutionEntry[] = [
  {
    id: 'EVO-301',
    patientId: 'PAT-001',
    date: '2026-08-20',
    consultationType: 'Consulta Inicial / Diagnóstico',
    procedureDone: 'Evaluación clínica completa, toma de radiografía periapical pieza 16. Limpieza superficial.',
    piecesInvolved: [16],
    notes: 'Se confirma caries cavitada sin compromiso radicular. Se programa restauración para el 31 de agosto.',
    dentist: 'Dra. Sofía Mendoza',
    outcomeStatus: 'Evolución favorable'
  },
  {
    id: 'EVO-302',
    patientId: 'PAT-002',
    date: '2026-08-15',
    consultationType: 'Evaluación y Diagnóstico',
    procedureDone: 'Revisión general y registro de odontograma inicial.',
    piecesInvolved: [26],
    notes: 'Se advierte al paciente sobre la necesidad de tratar la pieza 26 antes de que avance la caries.',
    dentist: 'Dr. Alejandro Silva',
    outcomeStatus: 'En seguimiento'
  },
  {
    id: 'EVO-303',
    patientId: 'PAT-003',
    date: '2026-08-28',
    consultationType: 'Urgencia Estética',
    procedureDone: 'Pulido de bordes filosos de pieza 11 fracturada. Aplicación de desensibilizante dentinario.',
    piecesInvolved: [11],
    notes: 'Paciente asintomática sin sensibilidad a la percusión. Se entrega presupuesto para reconstrucción.',
    dentist: 'Dra. Sofía Mendoza',
    outcomeStatus: 'Tratamiento iniciado'
  }
];

export const INITIAL_BUDGETS: Budget[] = [
  {
    id: 'BUD-401',
    patientId: 'PAT-001',
    patientName: 'María Belén González',
    title: 'Plan de Restauración Molar y Limpieza',
    date: '2026-08-20',
    items: [
      { id: 'ITM-1', description: 'Restauración Resina Ocluso-Mesial Pieza 16', pieceNumber: '16', price: 50.00 },
      { id: 'ITM-2', description: 'Profilaxis Profunda y Fluoración', price: 35.00 }
    ],
    totalAmount: 85.00,
    status: 'Aprobado',
    notes: 'Aprobado por el paciente en consulta. Cancelación 50% al inicio.'
  },
  {
    id: 'BUD-402',
    patientId: 'PAT-003',
    patientName: 'Ana Sofía Morales',
    title: 'Reconstrucción Estética Sector Anterior',
    date: '2026-08-28',
    items: [
      { id: 'ITM-3', description: 'Reconstrucción de Ángulo Incisal Pieza 11', pieceNumber: '11', price: 95.00 },
      { id: 'ITM-4', description: 'Pulido y Microabrasión Estética', price: 45.00 }
    ],
    totalAmount: 140.00,
    status: 'Enviado',
    notes: 'Presupuesto enviado por correo electrónico para revisión del apoderado.'
  },
  {
    id: 'BUD-403',
    patientId: 'PAT-004',
    patientName: 'Roberto Javier Lasso',
    title: 'Placa Miorrelajante y Ajuste Oclusal',
    date: '2026-08-10',
    items: [
      { id: 'ITM-5', description: 'Placa Rígida para Bruxismo Nocturno', price: 180.00 },
      { id: 'ITM-6', description: 'Sesión de Ajuste y Calibración Oclusal', price: 40.00 }
    ],
    totalAmount: 220.00,
    status: 'Aprobado',
    notes: 'Placa confeccionada en laboratorio en acrílico termocurado.'
  }
];

export const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: 'DOC-501',
    patientId: 'PAT-001',
    patientName: 'María Belén González',
    title: 'Radiografía Periapical Pieza 16',
    type: 'Radiografía',
    date: '2026-08-20',
    description: 'Confirmación radiográfica de cámara pulpar libre en molar 16.',
    fileName: 'RX_Periapical_P16_Gonzalez.png',
    fileSize: '2.4 MB'
  },
  {
    id: 'DOC-502',
    patientId: 'PAT-003',
    patientName: 'Ana Sofía Morales',
    title: 'Fotografía Clínica Inicial Pieza 11',
    type: 'Fotografía',
    date: '2026-08-28',
    description: 'Registro fotográfico pre-operatorio de fractura incisal.',
    fileName: 'Foto_Clinica_P11_Morales.jpg',
    fileSize: '4.1 MB'
  },
  {
    id: 'DOC-503',
    patientId: 'PAT-004',
    patientName: 'Roberto Javier Lasso',
    title: 'Consentimiento Informado Tratamiento Bruxismo',
    type: 'Consentimiento',
    date: '2026-08-10',
    description: 'Documento firmado para confección y uso de plano oclusal.',
    fileName: 'Consentimiento_Lasso_Signed.pdf',
    fileSize: '1.2 MB'
  }
];

export const INITIAL_DIAGNOSES: Diagnosis[] = [
  {
    id: 'DX-601',
    patientId: 'PAT-001',
    date: '2026-08-20',
    title: 'Caries Dentinaria Profunda',
    pieceNumber: 16,
    description: 'Caries activa en caras oclusal y mesial de pieza 16.',
    dentist: 'Dra. Sofía Mendoza',
    status: 'Activo'
  },
  {
    id: 'DX-602',
    patientId: 'PAT-003',
    date: '2026-08-28',
    title: 'Fractura Coronaria de Esmalte y Dentina',
    pieceNumber: 11,
    description: 'Traumatismo dental sin exposición pulpar directa.',
    dentist: 'Dra. Sofía Mendoza',
    status: 'Activo'
  }
];

export const INITIAL_ALERTS: AlertItem[] = [
  {
    id: 'ALT-701',
    title: 'Cita Próxima en 30 minutos',
    description: 'María Belén González — Restauración Molar 16',
    timeAgo: 'Hace 5 min',
    type: 'appointment',
    severity: 'urgent',
    patientId: 'PAT-001'
  },
  {
    id: 'ALT-702',
    title: 'Seguimiento Pendiente',
    description: 'Ana Sofía Morales — Confirmar aprobación de presupuesto #BUD-402',
    timeAgo: 'Hace 2 horas',
    type: 'budget',
    severity: 'normal',
    patientId: 'PAT-003'
  },
  {
    id: 'ALT-703',
    title: 'Tratamiento en Progreso (80%)',
    description: 'Roberto Javier Lasso — Placa miorrelajante lista para entrega',
    timeAgo: 'Ayer',
    type: 'treatment',
    severity: 'normal',
    patientId: 'PAT-004'
  }
];
