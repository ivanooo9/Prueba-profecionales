import { z } from "zod";

// --- Validaciones para Mascotas ---
export const PetCreateSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(50),
  raza: z.string().min(1, "La raza es obligatoria").max(50),
  edad: z.string().min(1, "La edad es obligatoria"),
  peso: z.string().optional().default(""),
  tipo: z.string().min(1, "El tipo es obligatorio").default("perro"),
  color: z.string().optional().default(""),
  sexo: z.string().optional().default(""),
  esterilizado: z.union([z.boolean(), z.string()]).transform(val => 
    typeof val === "string" ? val.toLowerCase() === "si" || val.toLowerCase() === "true" ? "si" : "no" : val ? "si" : "no"
  ).optional().default("no"),
  foto: z.string().optional().or(z.literal("")).default(""),
  fechaNacimiento: z.string().optional().or(z.literal("")).default(""),
  descripcion: z.string().optional(),
  alergias: z.string().optional(),
});

export const PetUpdateSchema = PetCreateSchema.extend({
  id: z.string().min(1, "El ID de la mascota es requerido para actualizar"),
});

// --- Validaciones para Diagnósticos ---
export const DiagnosisCreateSchema = z.object({
  mascota: z.string().optional(),
  diagnostico: z.string().optional(),
  notas: z.string().optional(),
  petId: z.string().optional(),
  appointmentId: z.string().optional(),
  
  // Nuevos campos extendidos
  motivoConsulta: z.string().optional(),
  fRespiratoria: z.string().optional(),
  fCardiaca: z.string().optional(),
  temperatura: z.string().optional(),
  pulso: z.string().optional(),
  tiempoLlenado: z.string().optional(),
  ganglios: z.string().optional(),
  mucosas: z.string().optional(),
  actitud: z.string().optional(),
  sistemas: z.any().optional(),
  hallazgosClinicos: z.string().optional(),
  listaProblemas: z.string().optional(),
  diagnosticosDiferenciales: z.string().optional(),
  examenesComplementarios: z.any().optional(),
  hallazgosPruebas: z.string().optional(),
  examIds: z.array(z.string()).optional(),
});

// --- Validaciones para Tratamientos ---
export const TreatmentCreateSchema = z.object({
  mascota: z.string().optional(),
  medicamento: z.string().optional(),
  dosis: z.string().optional(),
  duracion: z.string().optional(),
  notas: z.string().optional(),
  petId: z.string().optional(),
  appointmentId: z.string().optional(),
});

// --- Validaciones para Preventivos ---
export const PreventiveCreateSchema = z.object({
  mascota: z.string().optional(),
  tipo: z.string().optional(),
  proximaFecha: z.string().optional(),
  dosis: z.number().int().optional(),
  notas: z.string().max(5000).optional(),
  petId: z.string().optional(),
  appointmentId: z.string().optional(),
});

// --- Validaciones para Vacunaciones ---
export const VaccinationCreateSchema = z.object({
  mascota: z.string().optional(),
  dosis: z.string().optional(),
  vacunaId: z.string().optional(),
  proximaFecha: z.string().optional(),
  periodicidad: z.string().optional(),
  notas: z.string().max(5000).optional(),
  petId: z.string().optional(),
  appointmentId: z.string().optional(),
});

// --- Validaciones para Usuarios (Ecuador) ---
export const UserRegisterSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(100),
  email: z.string().email("Email inválido"),
  telefono: z.string().min(7, "Teléfono inválido").max(15),
  cedula: z.string().regex(/^\d{10}$/, "La cédula debe tener exactamente 10 dígitos numéricos"),
  city: z.string().min(1, "La ciudad es obligatoria").max(50),
  address: z.string().min(5, "La dirección debe ser más detallada").max(200),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});


// --- Utilidad para parsear errores de Zod formatados ---
export const formatZodError = (error: z.ZodError) => {
  return error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
};
