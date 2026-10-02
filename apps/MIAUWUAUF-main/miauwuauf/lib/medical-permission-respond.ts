import { randomBytes } from "crypto"
import { revalidatePath } from "next/cache"
import prisma from "@/lib/prisma"
import { createNotification } from "@/lib/notification"

function revalidateMedicalPaths(petId: string) {
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/veterinario")
  revalidatePath("/mi-mascota")
  revalidatePath(`/dashboard/veterinario/mascotas/${petId}/ficha-medica`)
}

function newResponseToken() {
  return randomBytes(32).toString("hex")
}

async function notifyVetOutcome(
  vetId: string,
  accept: boolean,
  petName: string,
  ownerName: string
) {
  await createNotification({
    userId: vetId,
    type: "success",
    title: accept ? "Acceso al historial aceptado" : "Solicitud de acceso rechazada",
    message: accept
      ? `${ownerName} aceptó que revises el historial de ${petName}.`
      : `${ownerName} rechazó el acceso al historial de ${petName}.`,
    actionUrl: "/dashboard?tab=mascotas",
    actionText: "Abrir mis mascotas (panel vet)",
    sendEmailFlag: false
  })
}

/**
 * Responde la solicitud validando el token (correo, sin sesión).
 */
export async function respondByToken(permissionId: string, token: string, accept: boolean) {
  const perm = await prisma.medicalPermission.findUnique({
    where: { id: permissionId },
    include: {
      pet: { include: { user: { select: { name: true, email: true } } } },
      vet: { select: { id: true } }
    }
  })
  if (!perm || perm.responseToken !== token) {
    return { ok: false as const, error: "invalid" as const }
  }
  if (perm.status !== "PENDING") {
    return { ok: false as const, error: "not_pending" as const }
  }

  const status = accept ? "ACCEPTED" : "REJECTED"
  await prisma.medicalPermission.update({
    where: { id: perm.id },
    data: { status, responseToken: newResponseToken() }
  })

  const ownerName = perm.pet.user?.name || perm.pet.user?.email || "El dueño"
  if (perm.vetId) {
    await notifyVetOutcome(perm.vetId, accept, perm.pet.nombre, ownerName)
  }
  revalidateMedicalPaths(perm.petId)
  return { ok: true as const }
}

/**
 * Responde la solicitud con el dueño autenticado.
 */
export async function respondByOwner(permissionId: string, ownerUserId: string, accept: boolean) {
  const perm = await prisma.medicalPermission.findFirst({
    where: { id: permissionId, pet: { userId: ownerUserId } },
    include: { pet: { select: { nombre: true, user: { select: { name: true, email: true } } } }, vet: { select: { id: true } } }
  })
  if (!perm) {
    return { ok: false as const, error: "not_found" as const }
  }
  if (perm.status !== "PENDING") {
    return { ok: false as const, error: "not_pending" as const }
  }

  const status = accept ? "ACCEPTED" : "REJECTED"
  await prisma.medicalPermission.update({
    where: { id: perm.id },
    data: { status, responseToken: newResponseToken() }
  })

  const u = await prisma.user.findUnique({ where: { id: ownerUserId }, select: { name: true, email: true } })
  const ownerName = u?.name || u?.email || "El dueño"
  if (perm.vetId) {
    await notifyVetOutcome(perm.vetId, accept, perm.pet.nombre, ownerName)
  }
  revalidateMedicalPaths(perm.petId)
  return { ok: true as const, status: status as "ACCEPTED" | "REJECTED" }
}
