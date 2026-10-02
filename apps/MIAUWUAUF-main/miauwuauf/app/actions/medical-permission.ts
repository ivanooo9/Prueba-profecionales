"use server"

import { revalidatePath } from "next/cache"
import { randomBytes } from "crypto"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { createNotification } from "@/lib/notification"
import { respondByOwner } from "@/lib/medical-permission-respond"
import { vetHasCareRelationship } from "@/lib/medical-access-vet"

function newResponseToken() {
  return randomBytes(32).toString("hex")
}

/**
 * El veterinario solicita permiso al dueño para ver el historial clínico de la mascota.
 */
export async function requestMedicalAccess(petId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { ok: false as const, error: "Debes iniciar sesión." }
  }
  const role = session.user.role
  if (role !== "veterinario") {
    return { ok: false as const, error: "Solo los veterinarios pueden solicitar acceso al historial." }
  }
  if (!petId) {
    return { ok: false as const, error: "Mascota no válida." }
  }

  const [pet, vet] = await Promise.all([
    prisma.pet.findUnique({ where: { id: petId }, include: { user: { select: { id: true, name: true, email: true } } } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, email: true } })
  ])
  if (!pet?.user) {
    return { ok: false as const, error: "Mascota no encontrada o sin dueño." }
  }
  if (pet.assignedVetId && pet.assignedVetId === session.user.id) {
    return { ok: true as const, status: "ACCEPTED" as const, permissionId: null }
  }
  if (await vetHasCareRelationship(petId, session.user.id)) {
    return { ok: true as const, status: "ACCEPTED" as const, permissionId: null }
  }
  if (pet.userId === session.user.id) {
    return { ok: false as const, error: "No aplica: eres el dueño de esta mascota." }
  }
  if (!vet) {
    return { ok: false as const, error: "Cuenta no encontrada." }
  }

  const token = newResponseToken()

  const existing = await prisma.medicalPermission.findUnique({
    where: { petId_vetId: { petId, vetId: session.user.id } }
  })
  if (existing?.status === "ACCEPTED") {
    return { ok: true as const, status: "ACCEPTED" as const, permissionId: existing.id }
  }

  const perm = await prisma.medicalPermission.upsert({
    where: { petId_vetId: { petId, vetId: session.user.id } },
    create: {
      petId,
      vetId: session.user.id,
      status: "PENDING",
      responseToken: token
    },
    update: {
      status: "PENDING",
      responseToken: token
    }
  })

  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
  const vetName = vet.name || vet.email || "Un veterinario"
  const inAppUrl = `${appUrl}/mi-mascota?openNotifications=1`
  const linkAccept = `${appUrl}/api/medical-permission/respond-link?p=${encodeURIComponent(perm.id)}&d=accept&t=${encodeURIComponent(perm.responseToken)}`
  const linkReject = `${appUrl}/api/medical-permission/respond-link?p=${encodeURIComponent(perm.id)}&d=reject&t=${encodeURIComponent(perm.responseToken)}`

  const owner = pet.user
  if (owner?.id) {
    await createNotification({
      userId: owner.id,
      type: "medical_access_request",
      title: "Solicitud de acceso al historial clínico",
      message: `${vetName} ha pedido permiso para revisar el historial de ${pet.nombre}. Acepta o rechaza en el centro de notificaciones o desde el correo que te enviamos.`,
      actionUrl: inAppUrl,
      actionText: "Abrir notificaciones",
      sendEmailFlag: !!owner.email,
      userEmail: owner.email || undefined,
      emailSubject: `Permiso al historial de ${pet.nombre} – MIAUWUAUF`,
      metadata: {
        permissionId: perm.id,
        petId,
        petName: pet.nombre,
        vetName,
        vetId: vet.id,
        medicalInAppUrl: inAppUrl,
        medicalLinkAccept: linkAccept,
        medicalLinkReject: linkReject
      }
    })
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/veterinario")
  revalidatePath(`/dashboard/veterinario/mascotas/${petId}/ficha-medica`)
  revalidatePath("/mi-mascota")

  return { ok: true as const, status: "PENDING" as const, permissionId: perm.id }
}

/**
 * El dueño acepta o rechaza la solicitud (desde la campana / UI).
 */
export async function respondToAccessRequest(permissionId: string, accept: boolean) {
  const session = await auth()
  if (!session?.user?.id) {
    return { ok: false as const, error: "Debes iniciar sesión." }
  }

  const r = await respondByOwner(permissionId, session.user.id, accept)
  if (!r.ok) {
    if (r.error === "not_found") {
      return { ok: false as const, error: "Solicitud no encontrada o no tienes permiso." }
    }
    return { ok: false as const, error: "Esta solicitud ya fue respondida." }
  }

  // revalidatePath: respondByOwner ya invalida rutas (incl. ficha del vet)
  return { ok: true as const, status: r.status }
}
