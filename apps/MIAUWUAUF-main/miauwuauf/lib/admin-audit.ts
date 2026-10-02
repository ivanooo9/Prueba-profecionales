import prisma from "@/lib/prisma";

type AdminAuditAction =
  | "create"
  | "update"
  | "delete"
  | "status_change"
  | "adoption_delivered";

type AdminAuditEntity =
  | "usuario"
  | "veterinario"
  | "adopcion"
  | "mascota_refugio"
  | "mascota_usuario";

type AdminAuditInput = {
  action: AdminAuditAction;
  entity: AdminAuditEntity;
  title: string;
  message: string;
  entityId?: string;
  actorId?: string;
  actorName?: string;
  actorEmail?: string;
  metadata?: Record<string, unknown>;
};

export async function writeAdminAudit(input: AdminAuditInput) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true },
    });

    if (admins.length === 0) return;

    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: "admin_audit",
        title: input.title,
        message: input.message,
        metadata: {
          audit: true,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId ?? null,
          actorId: input.actorId ?? null,
          actorName: input.actorName ?? null,
          actorEmail: input.actorEmail ?? null,
          ...(input.metadata ?? {}),
        },
      })),
    });
  } catch (error) {
    console.error("Error writing admin audit log:", error);
  }
}
