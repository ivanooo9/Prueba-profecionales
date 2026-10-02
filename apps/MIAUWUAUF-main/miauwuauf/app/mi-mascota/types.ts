import { Diagnostico, Tratamiento, Preventivo, Vacuna, Cita, ExamData } from "../../lib/admin-service"

export type TabType = "mis-mascotas" | "vacunacion" | "historial" | "eventos" | "acogida" | "gps" | "perfil" | "citas" | "compras" | "mi-cuenta"

export interface MascotaUsuario {
  id: string | number
  nombre: string
  raza: string
  edad: string
  peso: string
  tipo: string
  color: string
  sexo: string
  esterilizado: string
  foto?: string
  fechaNacimiento?: string
  descripcion?: string
  alergias?: string
  vetId?: string | number
  assignedVetId?: string | number
  qrEnabled?: boolean
}

export interface Veterinario {
  id: string
  name: string
  specialty?: string
  phone?: string
  image?: string
  clinicName?: string
  address?: string
}

export interface PerroAdopcion {
  id: string
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
}

export interface SolicitudAdopcion {
  id: string | number
  perroId: string | number
  perroNombre: string
  fecha: string
  createdAt?: string
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
  otrasMascotas?: string
  detallesOtrasMascotas?: string
  experienciaMascotas?: string
  motivoAdopcion?: string
  cubrirGastos: string
  aceptaResponsabilidad: boolean
  aceptaSeguimiento: boolean
  perro: PerroAdopcion
}

export interface DBNotification {
  id: string
  userId: string
  type: "info" | "warning" | "success" | "error"
  title: string
  message: string
  read: boolean
  createdAt: string
}

export interface NotificationItem {
  id: string
  title: string
  msg: string
  type: "warning" | "info" | "success" | "error"
  isDb?: boolean
}

export interface InscritoEvento {
  id: string | number
  userId?: string
  nombre: string
  email?: string
  userImage?: string
  mascota?: string
  mascotaId?: string
  fecha?: string
}

export interface Evento {
  id: string | number
  titulo: string
  descripcion: string
  fecha: string
  hora: string
  lugar: string
  tipo: string
  maximo: number
  image?: string
  inscritos: InscritoEvento[]
}

export interface ConfirmModalState {
  isOpen: boolean
  title: string
  description: string
  onConfirm: () => void
}

export type { Diagnostico, Tratamiento, Preventivo, Vacuna, Cita, ExamData }
