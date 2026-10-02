export const PROFESSIONAL_MODULE_CODE = {
  MEDICINE: "MEDICINE",
  DENTISTRY: "DENTISTRY",
  LEGAL: "LEGAL",
  ARCHITECTURE: "ARCHITECTURE",
  VETERINARY: "VETERINARY",
  TEACHING: "TEACHING",
} as const;

export type ProfessionalModuleCode =
  (typeof PROFESSIONAL_MODULE_CODE)[keyof typeof PROFESSIONAL_MODULE_CODE];

export const VALID_PROFESSIONAL_MODULE_CODES = Object.values(PROFESSIONAL_MODULE_CODE);

export const PROFESSIONAL_MODULE_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;

export type ProfessionalModuleStatus =
  (typeof PROFESSIONAL_MODULE_STATUS)[keyof typeof PROFESSIONAL_MODULE_STATUS];

export const ORGANIZATION_MODULE_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;

export type OrganizationModuleStatus =
  (typeof ORGANIZATION_MODULE_STATUS)[keyof typeof ORGANIZATION_MODULE_STATUS];

export interface DefaultModuleDefinition {
  code: ProfessionalModuleCode;
  name: string;
  description: string;
}

export const DEFAULT_PROFESSIONAL_MODULES: DefaultModuleDefinition[] = [
  {
    code: PROFESSIONAL_MODULE_CODE.MEDICINE,
    name: "Medicina General",
    description: "Módulo de gestión clínica, historias clínicas, consultas y recetas médicas.",
  },
  {
    code: PROFESSIONAL_MODULE_CODE.DENTISTRY,
    name: "Odontología",
    description: "Módulo odontológico, odontograma y planes de tratamiento dental.",
  },
  {
    code: PROFESSIONAL_MODULE_CODE.LEGAL,
    name: "Gestión Jurídica",
    description: "Módulo para bufetes, expedientes jurídicos y clientes legales.",
  },
  {
    code: PROFESSIONAL_MODULE_CODE.ARCHITECTURE,
    name: "Arquitectura",
    description: "Módulo de proyectos arquitectónicos, planos y seguimiento de obras.",
  },
  {
    code: PROFESSIONAL_MODULE_CODE.VETERINARY,
    name: "Veterinaria",
    description: "Módulo de pacientes veterinarios, historiales y fichas de mascotas.",
  },
  {
    code: PROFESSIONAL_MODULE_CODE.TEACHING,
    name: "Gestión Académica",
    description: "Módulo para docentes, estudiantes, cursos y calificaciones.",
  },
];
