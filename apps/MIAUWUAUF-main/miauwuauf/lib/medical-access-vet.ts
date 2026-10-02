import prisma from "@/lib/prisma"

/**
 * El veterinario ya atiende a esta mascota: cita o registro con `petId` + `vetId`,
 * o filas antiguas sin `petId` pero con `mascota` = nombre de la mascota.
 */
export async function vetHasCareRelationship(
  petId: string,
  vetId: string
): Promise<boolean> {
  const [lastAppt, lastDx, lastTx, lastPv, lastVa] = await Promise.all([
    prisma.appointment.findFirst({ where: { petId }, orderBy: { createdAt: "desc" } }),
    prisma.diagnosis.findFirst({ where: { petId }, orderBy: { createdAt: "desc" } }),
    prisma.treatment.findFirst({ where: { petId }, orderBy: { createdAt: "desc" } }),
    prisma.preventive.findFirst({ where: { petId }, orderBy: { createdAt: "desc" } }),
    prisma.vaccination.findFirst({ where: { petId }, orderBy: { createdAt: "desc" } }),
  ])

  const records = [
    lastAppt ? { vetId: lastAppt.vetId, date: lastAppt.createdAt } : null,
    lastDx ? { vetId: lastDx.vetId, date: lastDx.createdAt } : null,
    lastTx ? { vetId: lastTx.vetId, date: lastTx.createdAt } : null,
    lastPv ? { vetId: lastPv.vetId, date: lastPv.createdAt } : null,
    lastVa ? { vetId: lastVa.vetId, date: lastVa.createdAt } : null,
  ].filter(Boolean) as { vetId: string; date: Date }[]

  if (records.length === 0) {
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      select: { nombre: true }
    })
    if (!pet?.nombre?.trim()) return false
    const n = pet.nombre.trim()
    const legacyWhere = { mascota: n, petId: null }
    const [dxN, txN, pvN, vaN] = await Promise.all([
      prisma.diagnosis.findFirst({ where: legacyWhere, orderBy: { createdAt: "desc" } }),
      prisma.treatment.findFirst({ where: legacyWhere, orderBy: { createdAt: "desc" } }),
      prisma.preventive.findFirst({ where: legacyWhere, orderBy: { createdAt: "desc" } }),
      prisma.vaccination.findFirst({ where: legacyWhere, orderBy: { createdAt: "desc" } }),
    ])
    const legacyRecords = [
      dxN ? { vetId: dxN.vetId, date: dxN.createdAt } : null,
      txN ? { vetId: txN.vetId, date: txN.createdAt } : null,
      pvN ? { vetId: pvN.vetId, date: pvN.createdAt } : null,
      vaN ? { vetId: vaN.vetId, date: vaN.createdAt } : null,
    ].filter(Boolean) as { vetId: string; date: Date }[]

    if (legacyRecords.length === 0) return false

    legacyRecords.sort((a, b) => b.date.getTime() - a.date.getTime())
    return legacyRecords[0].vetId === vetId
  }

  records.sort((a, b) => b.date.getTime() - a.date.getTime())
  return records[0].vetId === vetId
}
