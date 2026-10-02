import { STORAGE_KEYS } from "./constants"

// interfaces.ts (internal to service or exported)
export interface ExamData {
  id?: string
  mascota: string
  fecha: string
  titulo: string
  descripcion?: string
  fileUrl: string
  fileType: string
  fileName?: string
  vetId?: string
  petId?: string
  veterinario?: string
  diagnosisId?: string
  createdAt?: string | Date
}

export interface AnamnesicoData {
  id?: string
  petId: string
  ultimaDesparasitacion?: string
  vacunas?: string
  enfermedadesAnteriores?: string
  tratamientos?: string
  evolucion?: string
  alimentacion?: string
  historiaReproductiva?: string
  ultimoCelo?: string
  fechaUltimoParto?: string
}

export interface SolicitudAdmin {
  id: string | number
  perroId: string | number
  perroNombre: string
  fecha: string
  estado: "pendiente" | "entrevista" | "aprobada" | "rechazada" | "entregada"
  nombreCompleto: string
  cedula: string
  email: string
  telefono: string
  direccion: string
  tipoVivienda: string
  tienePatio: string
  viviendaPropia: string
  personasHogar: string
  hayNinos: string
  otrasMascotas?: boolean
  detallesOtrasMascotas?: string
  experienciaMascotas?: boolean
  motivoAdopcion?: string
  cubrirGastos: string
  perro: {
    nombre: string
    raza: string
    edad: string
    foto: string
  }
  observacion?: string
  shelterPet?: PerroAdopcion
  user?: {
    name?: string
    email?: string
  }
  createdAt?: string
}

export interface PerroAdopcion {
  id: string | number
  nombre: string
  raza: string
  edad: string
  peso: string
  sexo: string
  color: string
  vacunado: boolean
  esterilizado: boolean
  descripcion: string
  hogarRecomendado: string
  foto: string
  estado: "disponible" | "en_proceso" | "adoptado"
  especie?: string
  dueno?: string
  ultimaVisita?: string
}

export interface Mascota {
  id: string | number
  nombre: string
  name?: string // Compatibilidad
  raza: string
  edad: string
  peso: string
  sexo?: string
  color?: string
  esterilizado?: string | boolean
  fechaNacimiento?: string
  ultimaVisita?: string
  tipo: string
  especie?: string
  dueno?: string
  foto?: string
  imageUrl?: string
  image?: string
  descripcion?: string
  alergias?: string
  qrEnabled?: boolean
  userId?: string
  /** Veterinario de confianza (mismo id de User veterinario) — desbloquea historial automáticamente */
  assignedVetId?: string
  assignedVet?: {
    name?: string | null
  }
  user?: {
    name: string
    email: string
    phone?: string
    cedula?: string
  }
  createdAt?: string
}

export interface UsuarioRaw {
  id: string
  name: string
  email: string
  phone?: string
  cedula?: string
  role: string
  pets?: Mascota[]
  estado?: string
  image?: string
  city?: string
  address?: string
  clinicName?: string
}

export interface UserRaw {
  id: string;
  name: string;
  email: string;
  role: string;
  pets?: Mascota[];
  phone?: string;
  cedula?: string;
  city?: string;
  address?: string;
  clinicName?: string;
  articulos?: number;
}

export interface UsuarioAdmin {
  id: string | number
  name: string
  nombre?: string // Compatibilidad UI
  email: string
  mascota?: string
  mascotas?: Mascota[]
  estado: string
  specialty?: string
  especialidad?: string // Compatibilidad UI
  phone?: string
  telefono?: string // Compatibilidad UI
  cedula?: string
  city?: string
  address?: string
  clinicName?: string
  createdAt?: string
  image?: string
}

export interface Veterinario {
  id: string | number
  name: string
  nombre?: string // Compatibilidad UI
  email: string
  specialty: string
  especialidad?: string // Compatibilidad UI
  estado: string
  password?: string
  phone?: string
  telefono?: string // Compatibilidad UI
  cedula?: string
  city?: string
  address?: string
  clinicName?: string
  createdAt?: string
  image?: string
}

export interface EventoInscrito {
  id: string | number
  nombre: string
  mascota?: string
  mascotaId?: string
  fecha?: string
  email?: string
  telefono?: string
}

export interface Evento {
  id: string | number
  titulo: string
  fecha: string
  hora: string
  lugar: string
  descripcion: string
  tipo: string
  maximo: number
  image?: string
  inscritos: EventoInscrito[]
}

export interface Blogger {
  id: string | number
  nombre: string
  email: string
  estado: string
  phone?: string
  telefono?: string
  cedula?: string
  city?: string
  address?: string
  articulos?: number
}

export interface BlogPost {
  id: string | number
  title: string
  slug?: string
  excerpt: string
  content?: string
  author: string
  date: string
  category: string
  image: string
  images?: string[]
}

export interface Cita {
  id: string | number
  mascota: string
  dueno: string
  fecha: string
  hora: string
  tipo: string
  estado: "pendiente" | "confirmada" | "completada" | "cancelada" | "rechazada"
  veterinario?: string
  motivo?: string
  petId?: string
  vetId?: string | number
  createdAt?: string
  updatedAt?: string
}

export interface Diagnostico {
  id: string
  mascota: string
  fecha: string
  diagnostico: string
  notas?: string
  petId?: string
  vetId?: string
  veterinario?: string
  vet?: { name: string | null }
  
  motivoConsulta?: string
  fRespiratoria?: string
  fCardiaca?: string
  temperatura?: string
  pulso?: string
  tiempoLlenado?: string
  ganglios?: string
  mucosas?: string
  actitud?: string
  sistemas?: any
  hallazgosClinicos?: string
  listaProblemas?: string
  diagnosticosDiferenciales?: string
  examenesComplementarios?: any
  hallazgosPruebas?: string
  
  createdAt?: string
  updatedAt?: string
}

export interface Tratamiento {
  id: string | number
  mascota: string
  medicamento: string
  dosis: string
  duracion: string
  estado: "activo" | "completado"
  /** Algunos registros antiguos solo tienen createdAt */
  fecha?: string
  petId?: string
  vet?: { name: string }
  vetId?: string | number
  veterinario?: string
  notas?: string
  createdAt?: string
  updatedAt?: string
}

export interface Preventivo {
  id: string | number
  mascota: string
  tipo: string
  fecha: string
  proximaFecha: string
  dosis: number
  petId?: string
  vet?: { name: string }
  vetId?: string | number
  veterinario?: string
  notas?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface Vacuna {
  id: string | number
  mascota: string
  dosis: string
  fecha: string
  vacunaId: string
  proximaFecha: string
  petId?: string
  vet?: { name: string }
  vetId?: string | number
  veterinario: string
  periodicidad?: string
  notas?: string | null
  createdAt?: string
}

export interface HistoryItem {
  id: string | number
  mascota: string
  dueno?: string
  /** Algunos registros (p. ej. tratamientos) solo tienen createdAt */
  fecha?: string
  tipo: string
  descripcion: string
  // Optional clinical detail fields
  diagnostico?: string
  notas?: string | null
  medicamento?: string
  dosis?: string | number
  duracion?: string
  proximaFecha?: string
  vacunaId?: string
  vet?: { name: string | null }
  veterinario?: string
  createdAt?: string
  petId?: string
  motivo?: string
}

// --- Event Data Types ---

export interface TiendaProducto {
  id: string // Changed to string for MongoDB
  slug?: string
  displayId?: number | null
  productCode?: string
  nombre: string
  precio: number
  categoria: string // Changed from union to string for dynamic categories
  subcategoria?: string
  marca?: string
  stock: number
  foto: string
  imagenes?: string[]
  descripcion?: string
  etiqueta?: string
  descuento?: number
  descuentoDias?: number
  descuentoValidoHasta?: string | Date
  especificaciones?: Record<string, string | number | boolean>
}

export interface CategoryStore {
  id: string
  nombre: string
  icon?: string
}

export interface SubcategoryStore {
  id: string
  nombre: string
  categoryId: string
  category?: { nombre: string }
}

export interface Plan {
  id: string
  name: string
  price: string
  description: string
  features: string[]
  badge: string
  color: string
  sectionId: string
  billingCycle?: string
  createdAt?: string
  updatedAt?: string
}

export interface PlanFormData {
  id?: string
  name: string
  price: string
  description: string
  features: string[]
  badge: string
  color: string
  sectionId: string
  billingCycle: string
}

export interface TechFeature {
  id: string
  iconName: string
  title: string
  description: string
  color: string
  bg: string
  order: number
  customIcon?: string
}

export interface SectionContent {
  id?: string
  sectionId: string
  badge?: string
  title?: string
  subtitle?: string
}

export interface CartItem extends TiendaProducto {
  quantity: number
}

export interface ProductoFormData {
  nombre: string
  precio: string
  categoria: TiendaProducto["categoria"]
  subcategoria: string
  marca: string
  stock: string
  foto: string
  imagenes: string[]
  descripcion: string
  etiqueta: string
  descuento: string
  descuentoDias: string
}

export interface EventRegistrationAPI {
  user?: {
    name?: string
    email?: string
    phone?: string
    cedula?: string
  }
  createdAt: string
  petName?: string
  mascotaId?: string
}

// --- Data Service ---

export const AdminService = {
  // Generic Getter
  get: <T>(key: string, defaultValue: T): T => {
    if (typeof window === "undefined") return defaultValue;
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    try {
      return JSON.parse(item);
    } catch {
      return defaultValue;
    }
  },

  // Generic Setter
  set: <T>(key: string, value: T): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(value));
  },

  // --- Veterinarios ---
  getVets: async (): Promise<Veterinario[]> => {
    try {
      const res = await fetch("/api/vets");
      if (!res.ok) throw new Error("Failed to fetch vets");
      return await res.json();
    } catch (error) {
      console.error("AdminService.getVets error:", error);
      return [];
    }
  },
  saveVets: async (vet: Partial<Veterinario>): Promise<Veterinario | null> => {
    try {
      const res = await fetch("/api/admin/vets", {
        method: vet.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vet)
      })
      if (!res.ok) throw new Error("Failed to save vet")
      return await res.json()
    } catch (error) {
      console.error("AdminService.saveVets error:", error)
      return null
    }
  },
  
  // --- Usuarios ---
  getUsers: async (): Promise<UsuarioAdmin[]> => {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const rawUsers = await res.json() as UsuarioRaw[];
      return rawUsers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        cedula: u.cedula,
        city: u.city,
        address: u.address,
        mascotas: u.pets || [],
        estado: u.estado || "activo",
        image: u.image,
        mascota: u.pets && u.pets.length > 0 
          ? `${u.pets[0].nombre}${u.pets.length > 1 ? ` (+${u.pets.length - 1})` : ''}` 
          : "Sin mascotas"
      })) as UsuarioAdmin[];
    } catch (error) {
      console.error("AdminService.getUsers error:", error);
      return [];
    }
  },
  deleteUser: async (id: string | number): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" })
      return res.ok
    } catch (error) {
      console.error("AdminService.deleteUser error:", error)
      return false
    }
  },

  // --- Eventos ---
  getEvents: async (): Promise<Evento[]> => {
    try {
      const res = await fetch("/api/events")
      if (!res.ok) throw new Error("Failed to fetch events")
      return await res.json()
    } catch (error) {
      console.error("AdminService.getEvents error:", error)
      return []
    }
  },
  saveEvents: async (event: Partial<Evento>): Promise<Evento | null> => {
    try {
      const isEditing = !!event.id
      const res = await fetch("/api/events", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event)
      })
      if (!res.ok) throw new Error(`Failed to ${isEditing ? 'update' : 'create'} event`)
      return await res.json()
    } catch (error) {
      console.error("AdminService.saveEvents error:", error)
      return null
    }
  },
  deleteEvent: async (id: string | number): Promise<boolean> => {
    try {
      const res = await fetch(`/api/events?id=${id}`, { method: "DELETE" })
      return res.ok
    } catch (error) {
      console.error("AdminService.deleteEvent error:", error)
      return false
    }
  },

  // --- Adopciones (Solicitudes) ---
  getAdoptions: async (): Promise<SolicitudAdmin[]> => {
    try {
      // Usamos la ruta de admin para ver todas las solicitudes
      const res = await fetch("/api/admin/requests")
      if (!res.ok) throw new Error("Failed to fetch adoptions")
      return await res.json()
    } catch (error) {
      console.error("AdminService.getAdoptions error:", error)
      return []
    }
  },
  updateAdoptionStatus: async (id: string | number, estado: string, observacion?: string): Promise<SolicitudAdmin | null> => {
    try {
      const res = await fetch("/api/admin/requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, estado, observacion })
      })
      if (!res.ok) throw new Error("Failed to update adoption status")
      return await res.json()
    } catch (error) {
      console.error("AdminService.updateAdoptionStatus error:", error)
      return null
    }
  },
  saveAdoptions: (adoptions: SolicitudAdmin[]) => AdminService.set(STORAGE_KEYS.ADOPTIONS, adoptions),
  
  // --- Pets for Adoption (Shelter Pets) ---
  getPetsForAdoption: async (): Promise<PerroAdopcion[]> => {
    try {
      const res = await fetch("/api/shelter-pets")
      if (!res.ok) throw new Error("Failed to fetch shelter pets")
      return await res.json()
    } catch (error) {
      console.error("AdminService.getPetsForAdoption error:", error)
      return []
    }
  },
  savePetsForAdoption: async (pet: Partial<PerroAdopcion>): Promise<PerroAdopcion | null> => {
    try {
      const isEditing = !!pet.id
      const res = await fetch("/api/shelter-pets", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pet)
      })
      if (!res.ok) throw new Error(`Failed to ${isEditing ? 'update' : 'create'} shelter pet`)
      return await res.json()
    } catch (error) {
      console.error("AdminService.savePetsForAdoption error:", error)
      return null
    }
  },
  deleteShelterPet: async (id: string | number): Promise<boolean> => {
    try {
      const res = await fetch(`/api/shelter-pets?id=${id}`, { method: "DELETE" })
      return res.ok
    } catch (error) {
      console.error("AdminService.deleteShelterPet error:", error)
      return false
    }
  },

  // --- Bloggers ---
  getBloggers: async (): Promise<Blogger[]> => {
    try {
      const res = await fetch("/api/admin/users")
      if (!res.ok) throw new Error("Failed to fetch bloggers")
      const users = await res.json() as UserRaw[]
      return users.filter(u => u.role === "bloguer").map(u => ({
        id: u.id,
        nombre: u.name,
        email: u.email,
        phone: u.phone,
        telefono: u.phone,
        cedula: u.cedula,
        city: u.city,
        address: u.address,
        estado: "activo",
        articulos: u.articulos || 0
      }))
    } catch (error) {
      console.error("AdminService.getBloggers error:", error)
      return []
    }
  },
  saveBloggers: async (blogger: Partial<Blogger> & { password?: string }): Promise<Blogger | null> => {
    try {
      const isEditing = !!blogger.id
      const res = await fetch(isEditing ? `/api/admin/users?id=${blogger.id}` : "/api/register", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...blogger, role: "bloguer" })
      })
      if (!res.ok) throw new Error("Failed to save blogger")
      return await res.json()
    } catch (error) {
      console.error("AdminService.saveBloggers error:", error)
      return null
    }
  },

  // --- Blog Posts ---
  getBlogPosts: async (): Promise<BlogPost[]> => {
    try {
      const res = await fetch("/api/blog")
      if (!res.ok) throw new Error("Failed to fetch posts")
      return await res.json()
    } catch (error) {
      console.error("AdminService.getBlogPosts error:", error)
      return []
    }
  },
  saveBlogPosts: async (post: Partial<BlogPost>): Promise<BlogPost | null> => {
    try {
      const isEditing = !!post.id
      const { id: postId, ...payload } = post
      const url = isEditing ? `/api/blog/${encodeURIComponent(String(postId))}` : "/api/blog"
      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEditing ? payload : post),
      })
      if (!res.ok) throw new Error(`Failed to ${isEditing ? "update" : "create"} post`)
      return await res.json()
    } catch (error) {
      console.error("AdminService.saveBlogPosts error:", error)
      return null
    }
  },
  deleteBlogPost: async (id: string | number): Promise<boolean> => {
    try {
      const res = await fetch(`/api/blog/${encodeURIComponent(String(id))}`, { method: "DELETE" })
      return res.ok
    } catch (error) {
      console.error("AdminService.deleteBlogPost error:", error)
      return false
    }
  },

  // --- Patients (Mascotas) ---
  getPatients: async (): Promise<Mascota[]> => {
    try {
      const res = await fetch("/api/dashboard/patients");
      if (!res.ok) throw new Error("Failed to fetch pets");
      return await res.json();
    } catch (error) {
      console.error("AdminService.getPatients error:", error);
      return [];
    }
  },
  getPetById: async (id: string): Promise<Mascota | null> => {
    try {
      const res = await fetch(`/api/pets/${id}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (error) {
      console.error("AdminService.getPetById error:", error);
      return null;
    }
  },
  createPatient: async (patient: Partial<Mascota>): Promise<Mascota | null> => {
    try {
      const res = await fetch("/api/pets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patient),
      });
      if (!res.ok) throw new Error("Failed to create pet");
      return await res.json();
    } catch (error) {
      console.error("AdminService.createPatient error:", error);
      return null;
    }
  },
  registerPatient: async (data: { 
    owner: { name: string; email: string; phone: string; cedula: string }, 
    pet: Partial<Mascota>,
    isNewOwner?: boolean
  }): Promise<{ user: { id: string; name: string; email: string }; pet: Mascota }> => {
    try {
      const res = await fetch("/api/admin/register-patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to register patient");
      }
      return await res.json();
    } catch (error) {
      console.error("AdminService.registerPatient error:", error);
      if (error instanceof Error) throw error;
      if (typeof error === "string") throw new Error(error);
      throw new Error("Error al registrar paciente");
    }
  },
  savePatients: () => {
    // Deprecated: No longer updating in bulk via array
    console.warn("AdminService.savePatients is deprecated. Use createPatient instead.")
  },

  // --- Citas ---
  getCitas: async (): Promise<Cita[]> => {
    try {
      const res = await fetch("/api/appointments");
      if (!res.ok) throw new Error("Failed to fetch appointments");
      return await res.json();
    } catch (error) {
      console.error("AdminService.getCitas error:", error);
      return [];
    }
  },
  createAppointment: async (appointment: Partial<Cita>): Promise<Cita | null> => {
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appointment),
      });
      if (!res.ok) throw new Error("Failed to create appointment");
      return await res.json();
    } catch (error) {
      console.error("AdminService.createAppointment error:", error);
      return null;
    }
  },
  saveCitas: () => {
    // Deprecated
    console.warn("AdminService.saveCitas is deprecated. Use createAppointment instead.")
  },

  // --- Diagnosticos ---
  getDiagnosticos: async (): Promise<Diagnostico[]> => {
    try {
      const res = await fetch("/api/diagnoses");
      if (!res.ok) throw new Error("Failed to fetch diagnoses");
      return await res.json();
    } catch (error) {
      console.error("AdminService.getDiagnosticos error:", error);
      return [];
    }
  },
  saveDiagnostico: async (diagnostico: Partial<Diagnostico> & { appointmentId?: string }): Promise<Diagnostico | null> => {
    try {
      const res = await fetch("/api/diagnoses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(diagnostico),
      });
      if (!res.ok) throw new Error("Failed to save diagnosis");
      return await res.json();
    } catch (error) {
      console.error("AdminService.saveDiagnostico error:", error);
      return null;
    }
  },
  // --- Exámenes ---
  getExams: async (): Promise<ExamData[]> => {
    try {
      const res = await fetch("/api/exams");
      if (!res.ok) throw new Error("Failed to fetch exams");
      return await res.json();
    } catch (error) {
      console.error("AdminService.getExams error:", error);
      return [];
    }
  },
  saveExam: async (exam: Omit<ExamData, "id"> | ExamData): Promise<ExamData | null> => {
    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exam),
      });
      if (!res.ok) throw new Error("Failed to save exam");
      return await res.json();
    } catch (error) {
      console.error("AdminService.saveExam error:", error);
      return null;
    }
  },
  deleteExam: async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/exams/${id}`, { method: "DELETE" });
      return res.ok;
    } catch (error) {
      console.error("AdminService.deleteExam error:", error);
      return false;
    }
  },


  // --- Anamnesicos ---
  getAnamnesico: async (petId: string): Promise<AnamnesicoData | null> => {
    try {
      const res = await fetch(`/api/anamnesicos?petId=${petId}`);
      if (!res.ok) throw new Error("Failed to fetch anamnesico");
      const data = await res.json();
      return Object.keys(data).length > 0 ? data : null;
    } catch (error) {
      console.error("AdminService.getAnamnesico error:", error);
      return null;
    }
  },
  saveAnamnesico: async (data: AnamnesicoData): Promise<AnamnesicoData | null> => {
    try {
      const res = await fetch("/api/anamnesicos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save anamnesico");
      return await res.json();
    } catch (error) {
      console.error("AdminService.saveAnamnesico error:", error);
      return null;
    }
  },

  // --- Tratamientos ---
  getTratamientos: async (): Promise<Tratamiento[]> => {
    try {
      const res = await fetch("/api/treatments");
      if (!res.ok) throw new Error("Failed to fetch treatments");
      return await res.json();
    } catch (error) {
      console.error("AdminService.getTratamientos error:", error);
      return [];
    }
  },
  saveTratamiento: async (tratamiento: Partial<Tratamiento> & { appointmentId?: string }): Promise<Tratamiento | null> => {
    try {
      const res = await fetch("/api/treatments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tratamiento),
      });
      if (!res.ok) throw new Error("Failed to save treatment");
      return await res.json();
    } catch (error) {
      console.error("AdminService.saveTratamiento error:", error);
      return null;
    }
  },

  // --- Preventivos ---
  getPreventivos: async (): Promise<Preventivo[]> => {
    try {
      const res = await fetch("/api/preventives");
      if (!res.ok) throw new Error("Failed to fetch preventives");
      return await res.json();
    } catch (error) {
      console.error("AdminService.getPreventivos error:", error);
      return [];
    }
  },
  savePreventivo: async (preventivo: Partial<Preventivo> & { appointmentId?: string }): Promise<Preventivo | null> => {
    try {
      const res = await fetch("/api/preventives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preventivo),
      });
      if (!res.ok) throw new Error("Failed to save preventive");
      return await res.json();
    } catch (error) {
      console.error("AdminService.savePreventivo error:", error);
      return null;
    }
  },

  // --- Vacunas ---
  getVacunaciones: async (): Promise<Vacuna[]> => {
    try {
      const res = await fetch("/api/vaccinations");
      if (!res.ok) throw new Error("Failed to fetch vaccinations");
      return await res.json();
    } catch (error) {
      console.error("AdminService.getVacunaciones error:", error);
      return [];
    }
  },
  saveVacunacion: async (vacuna: Partial<Vacuna> & { appointmentId?: string }): Promise<Vacuna | null> => {
    try {
      const res = await fetch("/api/vaccinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vacuna),
      });
      if (!res.ok) throw new Error("Failed to save vaccination");
      return await res.json();
    } catch (error) {
      console.error("AdminService.saveVacunacion error:", error);
      return null;
    }
  },

  // --- Tienda (Now using API instead of localStorage) ---
  getProducts: async (): Promise<TiendaProducto[]> => {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      return await res.json();
    } catch (error) {
      console.error("AdminService.getProducts error:", error);
      return [];
    }
  },

  saveProducts: async (product: Partial<TiendaProducto>): Promise<TiendaProducto | null> => {
    try {
      const isEditing = !!product.id;
      const url = isEditing ? `/api/products/${product.id}` : "/api/products";
      const method = isEditing ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      });

      if (!res.ok) throw new Error(`Failed to ${method} product`);
      return await res.json();
    } catch (error) {
      console.error("AdminService.saveProducts error:", error);
      return null;
    }
  },

  deleteProduct: async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch (error) {
      console.error("AdminService.deleteProduct error:", error);
      return false;
    }
  },

  getProductById: async (id: string): Promise<TiendaProducto | null> => {
    try {
      const res = await fetch(`/api/products/${id}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (error) {
      console.error("AdminService.getProductById error:", error);
      return null;
    }
  },

  // --- Categorías de Tienda ---
  getCategories: async (): Promise<CategoryStore[]> => {
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return await res.json();
    } catch (error) {
      console.error("AdminService.getCategories error:", error);
      return [];
    }
  },

  saveCategory: async (category: Partial<CategoryStore>): Promise<CategoryStore | null> => {
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(category),
      });
      if (!res.ok) throw new Error("Failed to save category");
      return await res.json();
    } catch (error) {
      console.error("AdminService.saveCategory error:", error);
      return null;
    }
  },
  deleteCategory: async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      });
      if (res.ok) return { success: true };
      const data = await res.json();
      return { success: false, error: data.error || "Error al eliminar" };
    } catch (error) {
      console.error("AdminService.deleteCategory error:", error);
      return { success: false, error: "Error de conexión" };
    }
  },

  checkout: async (cart: CartItem[], total: number): Promise<{ id: string } | null> => {
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart, total }),
      });
      if (!res.ok) throw new Error("Checkout failed");
      return await res.json();
    } catch (error) {
      console.error("AdminService.checkout error:", error);
      return null;
    }
  },

  // --- Planes de Proteccion ---
  getPlans: async (): Promise<Plan[]> => {
    try {
      const res = await fetch("/api/plans");
      if (!res.ok) throw new Error("Failed to fetch plans");
      return await res.json();
    } catch (error) {
      console.error("AdminService.getPlans error:", error);
      return [];
    }
  },

  savePlan: async (plan: Partial<Plan>): Promise<Plan | null> => {
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan),
      });
      if (!res.ok) throw new Error("Failed to save plan");
      return await res.json();
    } catch (error) {
      console.error("AdminService.savePlan error:", error);
      return null;
    }
  },

  deletePlan: async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/plans?id=${id}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch (error) {
      console.error("AdminService.deletePlan error:", error);
      return false;
    }
  },

  getTechFeatures: async (): Promise<TechFeature[]> => {
    try {
      const res = await fetch("/api/tech-features");
      if (!res.ok) return [];
      return await res.json();
    } catch (error) {
      console.error("AdminService.getTechFeatures error:", error);
      return [];
    }
  },

  saveTechFeature: async (feature: Partial<TechFeature>): Promise<TechFeature | null> => {
    try {
      const res = await fetch("/api/tech-features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feature),
      });
      if (!res.ok) throw new Error("Failed to save tech feature");
      return await res.json();
    } catch (error) {
      console.error("AdminService.saveTechFeature error:", error);
      return null;
    }
  },

  deleteTechFeature: async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/tech-features?id=${id}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch (error) {
      console.error("AdminService.deleteTechFeature error:", error);
      return false;
    }
  },

  getSectionContent: async (sectionId: string): Promise<SectionContent | null> => {
    try {
      const res = await fetch(`/api/section-content?sectionId=${sectionId}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (error) {
      console.error("AdminService.getSectionContent error:", error);
      return null;
    }
  },

  saveSectionContent: async (content: SectionContent): Promise<SectionContent | null> => {
    try {
      const res = await fetch("/api/section-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      if (!res.ok) throw new Error("Failed to save section content");
      return await res.json();
    } catch (error) {
      console.error("AdminService.saveSectionContent error:", error);
      return null;
    }
  },

  getAllSections: async (): Promise<SectionContent[]> => {
    try {
      const res = await fetch("/api/section-content");
      if (!res.ok) throw new Error("Failed to fetch all sections");
      return await res.json();
    } catch (error) {
      console.error("AdminService.getAllSections error:", error);
      return [];
    }
  },

  // --- Subcategorías ---
  getSubcategories: async (categoryId?: string): Promise<SubcategoryStore[]> => {
    try {
      const url = categoryId ? `/api/subcategories?categoryId=${categoryId}` : "/api/subcategories";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch subcategories");
      return await res.json();
    } catch (error) {
      console.error("AdminService.getSubcategories error:", error);
      return [];
    }
  },

  saveSubcategory: async (data: { nombre: string; categoryId: string }): Promise<SubcategoryStore | null> => {
    try {
      const res = await fetch("/api/subcategories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save subcategory");
      return await res.json();
    } catch (error) {
      console.error("AdminService.saveSubcategory error:", error);
      return null;
    }
  },

  deleteSubcategory: async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/subcategories?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) return { success: true };
      const data = await res.json();
      return { success: false, error: data.error || "Error al eliminar" };
    } catch (error) {
      console.error("AdminService.deleteSubcategory error:", error);
      return { success: false, error: "Error de conexión" };
    }
  },

  deleteSection: async (sectionId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/section-content?sectionId=${sectionId}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch (error) {
      console.error("AdminService.deleteSection error:", error);
      return false;
    }
  },
};
